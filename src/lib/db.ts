import postgres from "postgres";

const globalDb = globalThis as unknown as { sql?: ReturnType<typeof postgres>; schemaReady?: Promise<void> };

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL chưa được cấu hình.");
  if (!globalDb.sql) globalDb.sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 5 });
  return globalDb.sql;
}

export async function ensureSchema() {
  if (!globalDb.schemaReady) {
    const sql = db();
    globalDb.schemaReady = (async () => {
      await sql`
        create table if not exists licenses (
          id text primary key,
          customer_name text not null,
          email text not null unique,
          key_hash text not null unique,
          key_last4 text not null,
          status text not null default 'active',
          max_devices integer not null default 1,
          created_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists activations (
          id text primary key,
          license_id text not null references licenses(id) on delete cascade,
          device_hash text not null,
          device_name text not null,
          platform text not null,
          activated_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now(),
          unique (license_id, device_hash)
        )`;
    })().catch((error) => {
      globalDb.schemaReady = undefined;
      throw error;
    });
  }
  return globalDb.schemaReady;
}
