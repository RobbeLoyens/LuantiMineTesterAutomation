import 'dotenv/config';
import { Pool } from 'pg';

export interface ExpectedMetadata {
  package_name: string;
  latest_version: string;
  screenshots: number;
  dependencies: number;
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export async function getExpectedMetadata(packageName: string): Promise<ExpectedMetadata> {
  const result = await pool.query<ExpectedMetadata>(
    `
      SELECT package_name, latest_version, screenshots, dependencies
      FROM package_metadata
      WHERE package_name = $1
      LIMIT 1
    `,
    [packageName],
  );

  if (result.rows.length === 0) {
    throw new Error(`No metadata found for package: ${packageName}`);
  }

  return result.rows[0];
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}