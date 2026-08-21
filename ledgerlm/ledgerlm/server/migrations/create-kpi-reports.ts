import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Persists report snapshots only. KPI source values stay in the governed
 * fact/plan layers and are re-read whenever a user runs a new report.
 */
export async function createKpiReportsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cube_kpi_reports (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      cube_id VARCHAR(255) NOT NULL REFERENCES cubes(id) ON DELETE CASCADE,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      request JSONB NOT NULL,
      report JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cube_kpi_reports_user_created_idx
      ON cube_kpi_reports(user_id, created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cube_kpi_reports_cube_idx
      ON cube_kpi_reports(cube_id)
  `);
  console.log("✅ cube_kpi_reports table ready");
}