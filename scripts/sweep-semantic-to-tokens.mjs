import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');
const exts = new Set(['.jsx', '.js']);

// Families → semantic tokens. Order: variant prefixes first, then shades high→low
// so `bg-emerald-600` is never half-matched by a `bg-emerald-6` prefix.
const FAMILIES = [
  { hues: ['emerald', 'green'], soft: 'bg-success-soft', solid: 'bg-success', text: 'text-success', border: 'border-success-border', ring: 'ring-success', hoverSolid: 'hover:bg-success' },
  { hues: ['amber', 'yellow'], soft: 'bg-warning-soft', solid: 'bg-warning', text: 'text-warning', border: 'border-warning-border', ring: 'ring-warning', hoverSolid: 'hover:bg-warning' },
  { hues: ['red', 'rose'], soft: 'bg-danger-soft', solid: 'bg-danger', text: 'text-danger', border: 'border-danger-border', ring: 'ring-danger', hoverSolid: 'hover:bg-danger' },
  { hues: ['orange'], soft: 'bg-warning-soft', solid: 'bg-accent', text: 'text-warning', border: 'border-warning-border', ring: 'ring-warning', hoverSolid: 'hover:bg-accent-hover' },
  // Decorative hues: never a status. Plates → info-soft (neutral), text → info,
  // solid fills were action buttons (Stock's purple, SaleReturn) → accent.
  { hues: ['violet', 'purple', 'indigo', 'cyan', 'sky', 'teal', 'pink', 'fuchsia'], soft: 'bg-info-soft', solid: 'bg-accent', text: 'text-info', border: 'border-info-border', ring: 'ring-accent', hoverSolid: 'hover:bg-accent-hover' },
];

const rules = [];
for (const f of FAMILIES) {
  for (const hue of f.hues) {
    // hover/focus variants first
    for (const n of [900, 800, 700, 600, 500, 400, 300, 200, 100, 50]) {
      rules.push([new RegExp(`\\bhover:bg-${hue}-${n}\\b`, 'g'), n >= 400 ? f.hoverSolid : `hover:${f.soft}`]);
      rules.push([new RegExp(`\\bfocus:ring-${hue}-${n}\\b`, 'g'), `focus:${f.ring}`]);
      rules.push([new RegExp(`\\bfocus:border-${hue}-${n}\\b`, 'g'), `focus:${f.border}`]);
      rules.push([new RegExp(`\\bring-${hue}-${n}\\b`, 'g'), f.ring]);
      rules.push([new RegExp(`\\bdivide-${hue}-${n}\\b`, 'g'), f.border.replace('border-', 'divide-')]);
      rules.push([new RegExp(`\\bborder-${hue}-${n}\\b`, 'g'), f.border]);
      rules.push([new RegExp(`\\bborder-t-${hue}-${n}\\b`, 'g'), f.border.replace('border-', 'border-t-')]);
      rules.push([new RegExp(`\\btext-${hue}-${n}\\b`, 'g'), f.text]);
      rules.push([new RegExp(`\\bbg-${hue}-${n}\\b`, 'g'), n <= 200 ? f.soft : f.solid]);
    }
  }
}

let filesChanged = 0;
let totalSubs = 0;
const perFamily = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      // Print/invoice templates keep literal hex by design — but they use style
      // attrs, not classes, so no exclusion needed. ConfirmDialog tone chips are
      // intentional class strings; they still sweep cleanly.
      const content = fs.readFileSync(full, 'utf8');
      let next = content;
      let fileSubs = 0;
      for (const [re, rep] of rules) {
        next = next.replace(re, (m) => {
          fileSubs++;
          const fam = rep.replace(/^(bg|text|border|ring|divide|hover:bg|focus:ring|focus:border|hover)-?/, '').split('-')[0];
          perFamily[fam] = (perFamily[fam] || 0) + 1;
          return rep;
        });
      }
      if (next !== content) {
        fs.writeFileSync(full, next);
        filesChanged++;
        totalSubs += fileSubs;
      }
    }
  }
}

walk(SRC);
console.log(`Changed ${filesChanged} files, ${totalSubs} substitutions.`);
console.log('By target token family:', perFamily);
