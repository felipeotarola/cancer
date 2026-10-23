import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
let sql = "begin;\nselect pg_advisory_xact_lock(hashtext('opencancer:migrations'));\ncreate table public.cancer_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now());\nalter table public.cancer_migrations enable row level security;\nrevoke all on public.cancer_migrations from anon, authenticated;\n";
for (const name of (await readdir('migrations')).filter(n => n.endsWith('.sql')).sort()) {
  const source = await readFile(`migrations/${name}`, 'utf8');
  sql += source + `\ninsert into public.cancer_migrations (name, checksum) values ('${name}', '${createHash('sha256').update(source).digest('hex')}');\n`;
}
sql += 'commit;\nselect tablename, rowsecurity from pg_tables where schemaname = \'public\' and tablename like \'cancer_%\' order by tablename;\n';
await mkdir('supabase', { recursive: true });
await writeFile('supabase/install.sql', sql);
console.log('Prepared supabase/install.sql for first-time installation in the SQL editor');
