const express = require('express');
const crypto = require('node:crypto');
const oracledb = require('oracledb');
const { promisify } = require('node:util');
const { getConnection } = require('../database');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const adminRegistrationCode = process.env.ADMIN_REGISTRATION_CODE || '';
const veterinarianRegistrationCode = process.env.VETERINARIAN_REGISTRATION_CODE || '';
const SESSION_COOKIE = 'vetwise_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const PASSWORD_BYTES = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_SALT = Buffer.alloc(16, 83);
const adminRegistrationEnabled = Buffer.byteLength(adminRegistrationCode, 'utf8') >= 16;
const veterinarianRegistrationEnabled =
  Buffer.byteLength(veterinarianRegistrationCode, 'utf8') >= 16;
const sessions = new Map();
const authAttempts = new Map();

function safeEqual(first, second) {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length &&
    crypto.timingSafeEqual(firstBytes, secondBytes);
}

function publicAccount(account) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    title: account.title,
    role: account.role,
    initials: account.initials,
    ...(account.role === 'veterinarian' ? { veterinarianId: account.veterinarianId } : {})
  };
}

function accountFromRow(row) {
  return {
    id: row.ACCOUNT_ID,
    email: row.EMAIL,
    name: row.FULL_NAME,
    title: row.TITLE,
    role: row.ACCOUNT_ROLE.toLowerCase(),
    initials: row.INITIALS,
    salt: row.PASSWORD_SALT,
    passwordHash: row.PASSWORD_HASH,
    ...(row.VETERINARIAN_ID === null ? {} : { veterinarianId: row.VETERINARIAN_ID })
  };
}

function readCookie(request, cookieName) {
  const cookieHeader = request.headers.cookie || '';
  const prefix = `${cookieName}=`;
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : '';
}

function setSession(account, response) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  sessions.set(token, { account: publicAccount(account), expiresAt });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`);
}

function getSessionAccount(request) {
  const token = readCookie(request, SESSION_COOKIE);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.account;
}

function rateLimit(request, response, next) {
  const now = Date.now();
  const key = `${request.ip}:${request.path}`;
  const activeAttempts = (authAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (activeAttempts.length >= 10) {
    response.setHeader('Retry-After', '900');
    return response.status(429).json({ errors: ['Too many attempts. Try again in 15 minutes.'] });
  }
  activeAttempts.push(now);
  authAttempts.set(key, activeAttempts);
  for (const [attemptKey, times] of authAttempts) {
    if (times.every((time) => now - time >= 15 * 60 * 1000)) authAttempts.delete(attemptKey);
  }
  return next();
}

const validEmail = (email) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function initialsFor(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function splitVeterinarianName(name) {
  const cleaned = name.replace(/^Dr\.?\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length < 2) return null;
  return [parts.slice(0, -1).join(' '), parts.at(-1)];
}

router.get('/options', (request, response) => {
  response.json({ adminRegistrationEnabled, veterinarianRegistrationEnabled });
});

router.get('/me', (request, response) => {
  const account = getSessionAccount(request);
  if (!account) {
    response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return response.json({ user: null });
  }
  return response.json({ user: account });
});

router.post('/register', rateLimit, async (request, response) => {
  const body = request.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || '').trim().toLowerCase();
  const specialty = String(body.specialty || '').trim();
  const licenseNumber = String(body.licenseNumber || '').trim();
  const phone = String(body.phone || '').trim();
  const veterinarianNameParts = role === 'veterinarian' ? splitVeterinarianName(name) : null;
  const errors = [];

  if (!name || name.length > 80) errors.push('Enter a name of 1 to 80 characters.');
  if (!validEmail(email)) errors.push('Enter a valid email address (maximum 254 characters).');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) {
    errors.push('Choose a password with at least 12 characters and no more than 128 bytes.');
  }
  if (!['admin', 'veterinarian'].includes(role)) errors.push('Choose administrator or veterinarian.');
  if (role === 'veterinarian') {
    if (!specialty || specialty.length > 60) {
      errors.push('Enter a veterinarian specialty of 1 to 60 characters.');
    }
    if (!veterinarianNameParts ||
        veterinarianNameParts.some((part) => part.length > 50)) {
      errors.push('Enter a veterinarian first and last name of 50 characters or fewer.');
    }
    if (!licenseNumber || licenseNumber.length > 50) {
      errors.push('Enter a license number of 1 to 50 characters.');
    }
    if (!phone || phone.length > 30) errors.push('Enter a work phone number of 1 to 30 characters.');
    if (email.length > 100) errors.push('A veterinarian email address must be 100 characters or fewer.');
  }
  if (role === 'admin') {
    const submittedCode = String(body.invitationCode || '');
    if (!adminRegistrationEnabled || !safeEqual(submittedCode, adminRegistrationCode)) {
      return response.status(403).json({ errors: ['A valid administrator invitation code is required.'] });
    }
  }
  if (role === 'veterinarian') {
    const submittedCode = String(body.invitationCode || '');
    if (!veterinarianRegistrationEnabled ||
        !safeEqual(submittedCode, veterinarianRegistrationCode)) {
      return response.status(403).json({ errors: ['A valid staff invitation code is required.'] });
    }
  }
  if (errors.length) return response.status(400).json({ errors });

  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  const account = {
    id: crypto.randomUUID(),
    email,
    name,
    title: role === 'admin' ? 'Clinic administrator' : `Veterinarian · ${specialty}`,
    role,
    initials: initialsFor(name),
    salt: salt.toString('base64url'),
    passwordHash: passwordHash.toString('base64url')
  };
  const connection = await getConnection();
  try {
    let veterinarianId = null;
    if (role === 'veterinarian') {
      const [firstName, lastName] = veterinarianNameParts;
      const veterinarianResult = await connection.execute(
        `INSERT INTO veterinarians (
             first_name, last_name, license_number, phone, email, specialty
         )
         VALUES (
             :first_name, :last_name, :license_number, :phone, :email, :specialty
         )
         RETURNING veterinarian_id INTO :veterinarian_id`,
        {
          first_name: firstName,
          last_name: lastName,
          license_number: licenseNumber,
          phone,
          email,
          specialty,
          veterinarian_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      veterinarianId = veterinarianResult.outBinds.veterinarian_id[0];
      account.veterinarianId = veterinarianId;
    }

    await connection.execute(
      `INSERT INTO staff_accounts (
           account_id, email, full_name, title, account_role, initials,
           password_salt, password_hash, specialty, veterinarian_id
       )
       VALUES (
           :account_id, :email, :full_name, :title, :account_role, :initials,
           :password_salt, :password_hash, :specialty, :veterinarian_id
       )`,
      {
        account_id: account.id,
        email: account.email,
        full_name: account.name,
        title: account.title,
        account_role: account.role.toUpperCase(),
        initials: account.initials,
        password_salt: account.salt,
        password_hash: account.passwordHash,
        specialty: role === 'veterinarian' ? specialty : null,
        veterinarian_id: veterinarianId
      }
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.errorNum === 1) {
      return response.status(409).json({
        errors: ['An account with that email or license number already exists.']
      });
    }
    throw error;
  } finally {
    await connection.close();
  }

  setSession(account, response);
  return response.status(201).json({ user: publicAccount(account) });
});

router.post('/login', rateLimit, async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase();
  const password = String(request.body?.password || '');
  if (Buffer.byteLength(password, 'utf8') > 128) {
    return response.status(401).json({ errors: ['Email or password is incorrect.'] });
  }
  const connection = await getConnection();
  let result;
  try {
    result = await connection.execute(
      `SELECT account_id,
              email,
              full_name,
              title,
              account_role,
              initials,
              password_salt,
              password_hash,
              veterinarian_id
       FROM staff_accounts
       WHERE email = :email`,
      { email }
    );
  } finally {
    await connection.close();
  }
  const accountRow = result.rows[0];
  const salt = accountRow ? Buffer.from(accountRow.PASSWORD_SALT, 'base64url') : DUMMY_SALT;
  const hash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  const passwordMatches = accountRow
    ? safeEqual(hash, Buffer.from(accountRow.PASSWORD_HASH, 'base64url'))
    : false;
  if (!accountRow || !passwordMatches) {
    return response.status(401).json({ errors: ['Email or password is incorrect.'] });
  }
  const account = accountFromRow(accountRow);
  setSession(account, response);
  return response.json({ user: publicAccount(account) });
});

router.post('/logout', (request, response) => {
  sessions.delete(readCookie(request, SESSION_COOKIE));
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response.json({ ok: true });
});

function requireAuth(request, response, next) {
  const account = getSessionAccount(request);
  if (!account) return response.status(401).json({ errors: ['Sign in to continue.'] });
  request.user = account;
  return next();
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ errors: ['Your account cannot perform this action.'] });
    }
    return next();
  };
}

module.exports = { router, requireAuth, requireRole };
