import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');
const exts = new Set(['.jsx', '.js']);

// Order matters: longer/more specific patterns first.
const REPLACEMENTS = [
  // Solid fills → accent token (light = navy, dark = white plate, already themed)
  [/\bbg-blue-700\b/g, 'bg-accent'],
  [/\bbg-blue-600\b/g, 'bg-accent'],
  [/\bbg-blue-500\b/g, 'bg-accent'],
  // Hover fills
  [/\bhover:bg-blue-700\b/g, 'hover:bg-accent-hover'],
  [/\bhover:bg-blue-600\b/g, 'hover:bg-accent-hover'],
  [/\bhover:bg-blue-500\b/g, 'hover:bg-accent-hover'],
  // Soft plates
  [/\bbg-blue-50\b/g, 'bg-accent-soft'],
  [/\bbg-blue-100\b/g, 'bg-slate-100'],
  [/\bbg-blue-200\b/g, 'bg-slate-200'],
  // Text
  [/\btext-blue-900\b/g, 'text-slate-900'],
  [/\btext-blue-800\b/g, 'text-slate-800'],
  [/\btext-blue-700\b/g, 'text-accent'],
  [/\btext-blue-600\b/g, 'text-accent'],
  [/\btext-blue-500\b/g, 'text-accent'],
  [/\btext-blue-400\b/g, 'text-accent'],
  // Borders
  [/\bborder-blue-500\b/g, 'border-accent'],
  [/\bborder-blue-400\b/g, 'border-accent'],
  [/\bborder-blue-300\b/g, 'border-slate-300'],
  [/\bborder-blue-200\b/g, 'border-slate-200'],
  [/\bborder-blue-100\b/g, 'border-slate-200'],
  // Rings
  [/\bring-blue-500\b/g, 'ring-accent'],
  [/\bring-blue-400\b/g, 'ring-accent'],
  [/\bring-blue-100\b/g, 'ring-accent'],
  // Focus ring shortcuts
  [/\bfocus:ring-blue-500\b/g, 'focus:ring-accent'],
  [/\bfocus:ring-blue-400\b/g, 'focus:ring-accent'],
  // Shadow tint
  [/\bshadow-blue-\d{3}\b/g, 'shadow-slate-200'],
  // from-/to- gradient stops (shouldn't exist but catch any)
  [/\bfrom-blue-\d{3}\b/g, 'from-slate-100'],
  [/\bto-blue-\d{3}\b/g, 'to-slate-200'],
];

let filesChanged = 0;
let totalSubs = 0;
const changedFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      const content = fs.readFileSync(full, 'utf8');
      let next = content;
      let fileSubs = 0;
      for (const [re, rep] of REPLACEMENTS) {
        next = next.replace(re, (m) => { fileSubs++; return rep; });
      }
      if (next !== content) {
        fs.writeFileSync(full, next);
        filesChanged++;
        totalSubs += fileSubs;
        changedFiles.push(path.relative(SRC, full));
      }
    }
  }
}

walk(SRC);
console.log(`Changed ${filesChanged} files, ${totalSubs} substitutions.`);
changedFiles.slice(0, 40).forEach(f => console.log('  ' + f));
if (changedFiles.length > 40) console.log(`  … and ${changedFiles.length - 40} more`);
