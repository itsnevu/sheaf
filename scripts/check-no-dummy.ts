import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const SRC = join(process.cwd(), "src");

const SKIP_DIRS = new Set(["node_modules", ".next", "dist"]);
const SKIP_PATTERNS = [/[\\/]tests[\\/]/, /[\\/]scripts[\\/]/, /\.test\.tsx?$/];

const BANNED: { label: string; pattern: RegExp }[] = [
  { label: "faker import", pattern: /from\s+['"](@faker-js\/faker|faker)['"]/i },
  { label: "lorem ipsum", pattern: /lorem\s+ipsum/i },
  {
    label: "placeholder address",
    pattern: /0x(0{8,}|1234(?:1234)+|dead(?:dead)+|beef(?:beef)+|cafe(?:cafe)+)/i,
  },
  { label: "TODO: replace with real data", pattern: /TODO:\s*replace\s+with\s+real/i },
  { label: "placeholder marker", pattern: /\bplaceholder\b/i },
  { label: "dummy marker", pattern: /\bdummy\b/i },
];

// Only flag hardcoded fake metrics in TSX render output, not in logic
const TSX_BANNED: { label: string; pattern: RegExp }[] = [
  { label: "hardcoded dollar amount in JSX", pattern: />\s*\$\d{1,3}(,\d{3})+(\.\d{2})?\s*</ },
  { label: "hardcoded comma number in JSX", pattern: />\s*\d{1,3}(,\d{3}){2,}\s*</ },
];

// Lines matching these are false positives (comments, CSS props, code fallbacks, etc.)
const FALSE_POSITIVE = [
  /check-no-dummy/,
  /placeholder.*color/i,
  /::placeholder/,
  /placeholder[:=]/,
  /aria-placeholder/,
  /placeholder["']\s*:/,
  /\/\/.*placeholder/i,       // code comments mentioning "placeholder"
  /\/\*.*placeholder.*\*\//i, // block comments mentioning "placeholder"
  /\*\s.*placeholder/i,       // JSDoc lines mentioning "placeholder"
  /\|\|\s*["']0x0+["']/,      // fallback || "0x000..."
  /\?\?\s*["']0x0+["']/,      // fallback ?? "0x000..."
  /PLACEHOLDER\s*:/,          // TypeScript Record key named PLACEHOLDER
  /process\.env\.\w+\s*\|\|/, // env var fallback to zero address
];

type Violation = { file: string; line: number; label: string; text: string };

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      const ext = extname(full);
      if ([".ts", ".tsx", ".js", ".jsx", ".css"].includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

function shouldSkip(filePath: string): boolean {
  const rel = relative(process.cwd(), filePath);
  return SKIP_PATTERNS.some((p) => p.test(rel));
}

function isFalsePositive(line: string): boolean {
  if (/raqio:real-data-ok/.test(line)) return true;
  return FALSE_POSITIVE.some((p) => p.test(line));
}

const violations: Violation[] = [];

for (const filePath of walk(SRC)) {
  if (shouldSkip(filePath)) continue;

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
  const rel = relative(process.cwd(), filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isFalsePositive(line)) continue;

    for (const rule of BANNED) {
      if (rule.pattern.test(line)) {
        violations.push({ file: rel, line: i + 1, label: rule.label, text: line.trim() });
      }
    }

    if (isTsx) {
      for (const rule of TSX_BANNED) {
        if (rule.pattern.test(line)) {
          violations.push({ file: rel, line: i + 1, label: rule.label, text: line.trim() });
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n  REAL DATA ONLY: ${violations.length} violation(s) found\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.label}]`);
    console.error(`    ${v.text.slice(0, 120)}\n`);
  }
  process.exit(1);
} else {
  console.log("  REAL DATA ONLY: clean");
}
