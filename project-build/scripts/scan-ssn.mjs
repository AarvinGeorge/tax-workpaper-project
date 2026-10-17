// Fails if any file under the given folders contains one of the packet's real SSN-shaped values (full form).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const packet = readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8');
const real = new Set(packet.match(/\b\d{3}-\d{2}-\d{4}\b/g) || []);
const forms = [...real].flatMap((r) => [r, r.replace(/-/g, '')]);
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'tests', 'scripts'];
let hits = 0;
const walk = (p) => { const s = statSync(p); if (s.isDirectory()) { if (/node_modules|\.next/.test(p)) return; for (const f of readdirSync(p)) walk(path.join(p, f)); return; }
  const t = readFileSync(p, 'utf8'); for (const f of forms) if (t.includes(f)) { hits++; console.log('real SSN-shaped value in', p, '(ends', f.slice(-4) + ')'); } };
for (const r of roots) walk(r);
console.log('ssn scan: values', real.size, 'hits', hits); process.exit(hits ? 1 : 0);
