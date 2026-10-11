const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const docsDirectory = __dirname;
const pageBreak = '<!-- PAGE BREAK -->';
const maximumLinesPerPage = 54;
const maximumCharactersPerLine = 78;

const guides = [
  {
    source: 'user-guide.md',
    output: 'user-guide.pdf',
    label: 'USER GUIDE'
  },
  {
    source: 'technical-handover.md',
    output: 'technical-handover.pdf',
    label: 'TECHNICAL HANDOVER'
  }
];

function printableAscii(value) {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/·/g, '|')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');
}

function cleanMarkdown(line) {
  return line
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 <$2>')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*[-+]\s+/, '  * ')
    .replace(/^(\s*)(\d+)\.\s+/, '$1$2. ')
    .replace(/^\s*>\s?/, '  ');
}

function wrapLine(line, limit = maximumCharactersPerLine) {
  if (!line.trim()) return [''];

  const indentation = line.match(/^\s*/)[0];
  const words = line.trim().split(/\s+/);
  const output = [];
  let current = indentation;

  for (const word of words) {
    const candidate = current.trimEnd()
      ? `${current.trimEnd()} ${word}`
      : `${current}${word}`;
    if (candidate.length > limit && current.trimEnd()) {
      output.push(current);
      current = `${indentation}${word}`;
    } else {
      current = candidate;
    }
  }
  output.push(current);
  return output;
}

function pageText(markdown, label, pageNumber, pageCount) {
  const sourceLines = markdown.trim().split(/\r?\n/);
  const lines = [];
  let paragraph = [];
  let inCodeBlock = false;
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    lines.push(...wrapLine(paragraph.join(' ')));
    paragraph = [];
  };

  for (const sourceLine of sourceLines) {
    if (sourceLine.trim().startsWith('```')) {
      flushParagraph();
      inCodeBlock = !inCodeBlock;
      lines.push('');
      continue;
    }
    if (inCodeBlock || sourceLine.startsWith('    ')) {
      flushParagraph();
      lines.push(...wrapLine(sourceLine.replace(/^ {4}/, ''), maximumCharactersPerLine - 4)
        .map((line) => `    ${line}`));
      continue;
    }
    if (!sourceLine.trim()) {
      flushParagraph();
      lines.push('');
      continue;
    }

    const line = cleanMarkdown(sourceLine);
    if (/^( {0,2}\* | {0,2}\d+\. |#{1,6}\s)/.test(sourceLine) ||
        sourceLine.startsWith('#')) {
      flushParagraph();
      lines.push(...wrapLine(line));
      if (sourceLine.startsWith('#')) lines.push('');
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();

  const header = `VETWISE CLINIC | ${label} | PAGE ${String(pageNumber).padStart(2, '0')} OF ${pageCount}`;
  const outputLines = [header, '-'.repeat(Math.min(header.length, maximumCharactersPerLine)), '', ...lines];
  if (outputLines.length > maximumLinesPerPage) {
    throw new Error(
      `${label} page ${pageNumber} contains ${outputLines.length} lines; ` +
      `maximum is ${maximumLinesPerPage}. Shorten or split that page.`
    );
  }
  return outputLines.join('\n');
}

function convertToPdf(text, temporaryTextPath, label) {
  fs.writeFileSync(temporaryTextPath, text, { mode: 0o600 });
  const result = spawnSync(
    'cupsfilter',
    ['-i', 'text/plain', '-m', 'application/pdf', temporaryTextPath],
    { encoding: null, maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout?.length) {
    const details = result.stderr?.toString('utf8').trim();
    throw new Error(`${label} PDF conversion failed${details ? `: ${details}` : '.'}`);
  }
  return result.stdout;
}

function buildGuide(guide) {
  const sourcePath = path.join(docsDirectory, guide.source);
  const outputPath = path.join(docsDirectory, guide.output);
  const source = printableAscii(fs.readFileSync(sourcePath, 'utf8'));
  const pages = source.split(pageBreak).map((page) => page.trim()).filter(Boolean);
  if (pages.length === 0) throw new Error(`${guide.source} does not contain any pages.`);

  const temporaryTextPath = path.join(
    docsDirectory,
    `.${guide.output}.${process.pid}.tmp.txt`
  );
  try {
    const text = pages.map((page, index) =>
      pageText(page, guide.label, index + 1, pages.length)).join('\f');
    const pdf = convertToPdf(text, temporaryTextPath, guide.label);
    fs.writeFileSync(outputPath, pdf, { mode: 0o644 });
    console.log(`${guide.output}: ${pages.length} source pages, ${pdf.length} bytes`);
  } finally {
    if (fs.existsSync(temporaryTextPath)) fs.unlinkSync(temporaryTextPath);
  }
}

for (const guide of guides) buildGuide(guide);
