/* Dark mode spends colour on three things: red (wrong or overdue), amber (needs
   attention soon), emerald (settled). Everything else resolves to the
   black-and-white ground.

   Nothing in the palette can enforce that on its own - a hue class is just a
   class, and nothing stops a new page from reaching for bg-violet-100. What
   holds it is index.css, which points the off-budget families at the neutral
   ramp under :root[data-theme="dark"]. So check one is: every hue this app uses
   is in the budget, or remapped there.

   Check two is the bug that keeps coming back - a colour that inverts carrying
   text that does not. bg-orange-500 goes near-white in dark; the text-white
   beside it stays white, and the label disappears. Any off-budget fill written
   with text-white has to be in the plate rule that flips both.

   A source check, not a rendered one, on purpose: the rendered page only shows
   the screens you happen to open. */

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const BUDGET = new Set(["red", "amber", "emerald"]);

/* Neutrals are the ground itself, so they are never off-budget. */
const NEUTRAL = new Set(["slate", "gray", "grey", "zinc", "neutral", "stone"]);

/* Not every <utility>-<word>-<number> is a colour: bg-opacity-50 and its
   siblings match the same shape and are not hues. */
const NOT_A_HUE = new Set(["opacity"]);

/* Utilities that paint. `ring`, `divide` and `shadow` are here because a
   coloured focus ring or glow reads as loudly as a filled chip.

   Literals, not patterns built from strings: escapes in a built pattern have to
   survive one layer more than they look like they do, and a regex that quietly
   matches nothing reports a clean budget. */
const HUE_CLASS =
  /\b(?:bg|text|border|from|via|to|ring|divide|shadow|accent|decoration|outline|caret|placeholder|fill|stroke)-([a-z]+)-(\d{2,3})\b/g;
const REMAP = /--c-([a-z]+)-\d{2,3}:\s*var\(--c-slate-\d{2,3}\)/g;
const PLATE_FILL = /\.(bg-[a-z]+-\d{2,3})/g;
/* A fill and a text-white in the same class string. */
const WHITE_ON_FILL =
  /class[nN]ame=\{?["`'][^"`']*\}?/g;

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = await Promise.all(entries.map(async (entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [path] : [];
  }));
  return out.flat();
}

const css = await readFile(resolve("src/index.css"), "utf8");

/* Families pointed at the neutral ramp. */
const remapped = new Set([...css.matchAll(REMAP)].map((m) => m[1]));

/* Fills that flip their own text with them. The rule is the one that paints a
   slate-900 plate and sets a colour in the same block. */
const plated = new Set();
for (const rule of css.split("}")) {
  if (!rule.includes("background-color: rgb(var(--c-slate-900))")) continue;
  for (const [, cls] of rule.matchAll(PLATE_FILL)) plated.add(cls);
}

const files = await sourceFiles(resolve("src"));
const offBudget = new Map();
const unplated = new Map();

const isOffBudget = (hue) =>
  !BUDGET.has(hue) && !NEUTRAL.has(hue) && !NOT_A_HUE.has(hue);

await Promise.all(files.map(async (file) => {
  const source = await readFile(file, "utf8");
  const where = file.split(/[\\/]src[\\/]/)[1] ?? file;

  for (const [, hue] of source.matchAll(HUE_CLASS)) {
    if (!isOffBudget(hue) || remapped.has(hue)) continue;
    offBudget.set(hue, (offBudget.get(hue) ?? new Set()).add(where));
  }

  for (const [attr] of source.matchAll(WHITE_ON_FILL)) {
    if (!attr.includes("text-white")) continue;
    for (const [, cls, hue, step] of attr.matchAll(/(bg-([a-z]+)-(\d{3}))/g)) {
      if (!isOffBudget(hue) || Number(step) < 400 || plated.has(cls)) continue;
      unplated.set(cls, (unplated.get(cls) ?? new Set()).add(where));
    }
  }
}));

console.log(`Budget hues:        ${[...BUDGET].join(", ")}`);
console.log(`Remapped in dark:   ${[...remapped].sort().join(", ") || "none"}`);
console.log(`Plated fills:       ${[...plated].sort().join(", ") || "none"}`);
console.log(`Source files:       ${files.length}`);

const report = (label, map, hint) => {
  if (map.size === 0) {
    console.log(`${label}: none`);
    return false;
  }
  console.log(`${label}: ${map.size}`);
  for (const [key, where] of [...map].sort()) {
    console.log(`- ${key}: ${[...where].sort().slice(0, 3).join(", ")}`);
  }
  console.log(`  ${hint}`);
  return true;
};

const bad = [
  report("Off-budget hues", offBudget,
    'Use a budget hue, or point the family at the neutral ramp in src/index.css.'),
  report("Fills with unflipped text-white", unplated,
    'Add it to the plate rule in src/index.css, or the label turns white on white.'),
].some(Boolean);

if (bad) process.exitCode = 1;
