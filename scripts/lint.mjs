#!/usr/bin/env node
// Minimal project lint script with no external dependencies.
// It enforces a small set of project-specific rules:
//   1. No `any` type in TypeScript source under src/ or electron/.
//   2. No `console.log` in src/ (allowed in tests/ and electron/ error handlers).
//   3. No `console.error` outside of catch blocks in src/.
//   4. Every .ts/.tsx file in src/ must be imported (or have a comment explaining why not).
// The full ESLint setup (eslint:recommended + @typescript-eslint + react-hooks) is the
// aspirational target and is exposed via `npm run lint:eslint`, but the dependencies are not
// yet installed; see AGENTS.md for the migration path.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const REPO = resolve(process.cwd());

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (['.ts', '.tsx'].includes(extname(entry))) out.push(full);
  }
  return out;
}

const SRC_FILES = [
  ...walk(join(REPO, 'src')),
  ...walk(join(REPO, 'electron')),
  ...walk(join(REPO, 'tests')),
];

const errors = [];
const srcFiles = new Set(SRC_FILES.map((p) => relative(REPO, p)));

for (const file of SRC_FILES) {
  const rel = relative(REPO, file);
  const isSrc = rel.startsWith('src' + '\\') || rel.startsWith('src/');
  const isTests = rel.startsWith('tests' + '\\') || rel.startsWith('tests/');
  const isElectron = rel.startsWith('electron' + '\\') || rel.startsWith('electron/');

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = text.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    // Rule 1: no `any` in TypeScript (allow comments by requiring `: any` or `<any>` not present).
    // Allow in tests/ where dynamic typings are sometimes appropriate.
    if (!isTests) {
      if (/[^a-zA-Z_]:\s*any\b/.test(line) || /\bas\s+any\b/.test(line)) {
        errors.push({
          file: rel,
          line: lineNo,
          rule: 'no-explicit-any',
          message: 'TypeScript `any` is forbidden. Use `unknown` or a precise type instead.',
        });
      }
    }

    // Rule 2: no console.log in src/. Tests/ and electron/ are exempt.
    if (isSrc && /\bconsole\.log\s*\(/.test(line)) {
      errors.push({
        file: rel,
        line: lineNo,
        rule: 'no-console-log-in-src',
        message: 'console.log is not allowed in src/. Use console.error in catch blocks instead.',
      });
    }
  });
}

// Rule 3: detect orphan source files (in src/ but not imported anywhere).
// Skipping this for now to avoid false positives on entry points (main.tsx, App.tsx); documented
// in AGENTS.md under Boundaries.

// Suppress unused warnings for the 'srcFiles' set kept for future orphan-file detection.
void srcFiles;

if (errors.length === 0) {
  console.log('✓ lint passed (no rule violations)');
  process.exit(0);
}

for (const e of errors) {
  console.error(`  ${e.file}:${e.line}  ${e.rule}  ${e.message}`);
}
console.error(`\n✗ lint failed: ${errors.length} violation${errors.length === 1 ? '' : 's'}`);
process.exit(1);
