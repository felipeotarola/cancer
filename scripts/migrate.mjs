import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
process.loadEnvFile('.env');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL for the Supabase Auth project is required');
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });
try {
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(hashtext('opencancer:migrations'))`;
    await tx`create table if not exists public.cancer_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
    await tx`alter table public.cancer_migrations enable row level security`;
    await tx`revoke all on public.cancer_migrations from anon, authenticated`;
    for (const name of (await readdir('migrations')).filter(n => n.endsWith('.sql')).sort()) {
      const source = await readFile(`migrations/${name}`, 'utf8');
      const checksum = createHash('sha256').update(source).digest('hex');
      const [existing] = await tx`select checksum from public.cancer_migrations where name = ${name}`;
      if (existing) {
        if (existing.checksum !== checksum) throw new Error(`Changed migration: ${name}`);
        continue;
      }
      await tx.unsafe(source);
      await tx`insert into public.cancer_migrations (name, checksum) values (${name}, ${checksum})`;
      console.log(`Applied ${name}`);
    }
  });
} catch (error) { console.error('Migration failed:', error.code ?? error.name); process.exitCode = 1; }
finally { await sql.end({ timeout: 5 }); }
