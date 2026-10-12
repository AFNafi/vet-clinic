// Sanity check: every id and class the console script queries must exist in
// index.html. Run with: node check_dom.js
const fs = require('fs');
const html = fs.readFileSync(`${__dirname}/public/index.html`, 'utf8');
const js = fs.readFileSync(`${__dirname}/public/js/main.js`, 'utf8');

const ids = [...new Set([...js.matchAll(/querySelector\('#([A-Za-z-]+)'\)/g)].map((m) => m[1]))];
const missingIds = ids.filter((id) => !html.includes(`id="${id}"`));

const classes = [...new Set([...js.matchAll(/querySelectorAll\('\.([A-Za-z-]+)'\)/g)].map((m) => m[1]))];
const missingClasses = classes.filter((c) => !new RegExp(`class="[^"]*\\b${c}\\b`).test(html));

console.log(`ids referenced: ${ids.length}, missing: ${missingIds.length ? missingIds.join(', ') : 'none'}`);
console.log(`classes referenced: ${classes.length}, missing: ${missingClasses.length ? missingClasses.join(', ') : 'none'}`);
process.exit(missingIds.length || missingClasses.length ? 1 : 0);
