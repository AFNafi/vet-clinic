const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { veterinarians, persistClinicData } = require('../data/clinic');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const accountsPath = process.env.AUTH_STORE_PATH ||
  path.join(__dirname, '..', 'data', 'staff-accounts.json');
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

let accounts = fs.existsSync(accountsPath)
  ? JSON.parse(fs.readFileSync(accountsPath, 'utf8'))
  : [];
const sessions = new Map();
const authAttempts = new Map();

function canonicalName(name) {
  return String(name).replace(/^Dr\.?\s+/i, '').trim().toLowerCase();
}

function nextVeterinarianId() {
  return veterinarians.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
}

function ensureVeterinarianProfile(account) {
  if (account.role !== 'veterinarian') return { profile: null, created: false, changed: false };

  const email = account.email.toLowerCase();
  let profile = veterinarians.find((item) =>
    item.accountId === account.id || item.email?.toLowerCase() === email);
  if (!profile) {
    profile = veterinarians.find((item) =>
      !item.email && canonicalName(item.name) === canonicalName(account.name));
  }

  let changed = false;
  let created = false;
  if (!profile) {
    const id = Number.isInteger(account.veterinarianId) &&
      !veterinarians.some((item) => item.id === account.veterinarianId)
      ? account.veterinarianId
      : nextVeterinarianId();
    profile = {
      id,
      name: /^Dr\.?\s/i.test(account.name) ? account.name : `Dr. ${account.name}`,
      email,
      specialty: account.specialty ||
        account.title.split('·')[1]?.trim() ||
        'General Practice',
      accountId: account.id
    };
    veterinarians.push(profile);
    created = true;
    changed = true;
  } else {
    if (!profile.email) {
      profile.email = email;
      changed = true;
    }
    if (profile.accountId !== account.id) {
      profile.accountId = account.id;
      changed = true;
    }
  }

  if (account.veterinarianId !== profile.id) {
    account.veterinarianId = profile.id;
    changed = true;
  }
  return { profile, created, changed };
}

function getVeterinarianRoster() {
  const veterinarianAccounts = accounts.filter((account) => account.role === 'veterinarian');
  return veterinarians
    .filter((profile) => veterinarianAccounts.some((account) =>
      profile.accountId === account.id ||
      profile.email?.toLowerCase() === account.email.toLowerCase() ||
      (account.veterinarianId === profile.id &&
        canonicalName(profile.name) === canonicalName(account.name))))
    .map(({ id, name, email, specialty }) => ({ id, name, email, specialty }));
}

let rosterChanged = false;
for (const account of accounts) {
  const { changed } = ensureVeterinarianProfile(account);
  rosterChanged ||= changed;
}
if (rosterChanged) {
  persistClinicData();
  persistAccounts();
}

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

function persistAccounts() {
  fs.mkdirSync(path.dirname(accountsPath), { recursive: true });
  const temporaryPath = `${accountsPath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, accountsPath);
  fs.chmodSync(accountsPath, 0o600);
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
  sessions.set(token, { accountId: account.id, expiresAt });
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
  const account = accounts.find((item) => item.id === session.accountId);
  return account || null;
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

router.get('/options', (request, response) => {
  response.json({ adminRegistrationEnabled, veterinarianRegistrationEnabled });
});

router.get('/me', (request, response) => {
  const account = getSessionAccount(request);
  if (!account) {
    response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return response.json({ user: null });
  }
  return response.json({ user: publicAccount(account) });
});

router.post('/register', rateLimit, async (request, response) => {
  const body = request.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || '').trim().toLowerCase();
  const specialty = String(body.specialty || '').trim();
  const errors = [];

  if (!name || name.length > 80) errors.push('Enter a name of 1 to 80 characters.');
  if (!validEmail(email)) errors.push('Enter a valid email address (maximum 254 characters).');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) {
    errors.push('Choose a password with at least 12 characters and no more than 128 bytes.');
  }
  if (!['admin', 'veterinarian'].includes(role)) errors.push('Choose administrator or veterinarian.');
  if (role === 'veterinarian' && (!specialty || specialty.length > 60)) {
    errors.push('Enter a veterinarian specialty of 1 to 60 characters.');
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
  if (accounts.some((account) => account.email === email)) {
    return response.status(409).json({ errors: ['An account with that email already exists.'] });
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  if (accounts.some((account) => account.email === email)) {
    return response.status(409).json({ errors: ['An account with that email already exists.'] });
  }

  const account = {
    id: crypto.randomUUID(),
    email,
    name,
    title: role === 'admin' ? 'Clinic administrator' : `Veterinarian · ${specialty}`,
    role,
    initials: initialsFor(name),
    ...(role === 'veterinarian' ? { specialty } : {}),
    salt: salt.toString('base64url'),
    passwordHash: passwordHash.toString('base64url')
  };
  accounts.push(account);
  const veterinarianProfile = ensureVeterinarianProfile(account);
  try {
    if (veterinarianProfile.profile) persistClinicData();
    persistAccounts();
  } catch (error) {
    accounts = accounts.filter((item) => item.id !== account.id);
    if (veterinarianProfile.created) {
      veterinarians.splice(veterinarians.indexOf(veterinarianProfile.profile), 1);
      try {
        persistClinicData();
        persistAccounts();
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
    }
    throw error;
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
  const account = accounts.find((item) => item.email === email);
  const salt = account ? Buffer.from(account.salt, 'base64url') : DUMMY_SALT;
  const hash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  const passwordMatches = account
    ? safeEqual(hash, Buffer.from(account.passwordHash, 'base64url'))
    : false;
  if (!account || !passwordMatches) {
    return response.status(401).json({ errors: ['Email or password is incorrect.'] });
  }
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
  request.user = publicAccount(account);
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

module.exports = { router, requireAuth, requireRole, getVeterinarianRoster };
