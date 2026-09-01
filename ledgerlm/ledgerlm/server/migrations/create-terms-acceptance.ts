import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";
import {
  CURRENT_TERMS_DOCUMENT_HASH,
  CURRENT_TERMS_EFFECTIVE_DATE,
  CURRENT_TERMS_ISSUED_BY,
  CURRENT_TERMS_VERSION,
} from "@shared/legalTerms";

export async function createTermsAcceptanceTables(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS terms_versions (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        version       VARCHAR(50) NOT NULL UNIQUE,
        effective_date TIMESTAMPTZ NOT NULL,
        issued_by     VARCHAR(200) NOT NULL,
        document_hash VARCHAR(200) NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS terms_acceptances (
        id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        terms_version_id VARCHAR NOT NULL REFERENCES terms_versions(id) ON DELETE RESTRICT,
        accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address      VARCHAR(45),
        user_agent      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT terms_acceptances_user_version_unique
          UNIQUE (user_id, terms_version_id)
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS terms_acceptances_user_id_idx
        ON terms_acceptances (user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS terms_acceptances_version_id_idx
        ON terms_acceptances (terms_version_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS terms_acceptances_accepted_at_idx
        ON terms_acceptances (accepted_at DESC)
    `);

    await db.execute(sql`
      INSERT INTO terms_versions (
        version, effective_date, issued_by, document_hash, is_active
      )
      VALUES (
        ${CURRENT_TERMS_VERSION},
        ${CURRENT_TERMS_EFFECTIVE_DATE}::date,
        ${CURRENT_TERMS_ISSUED_BY},
        ${CURRENT_TERMS_DOCUMENT_HASH},
        true
      )
      ON CONFLICT (version) DO UPDATE SET
        effective_date = EXCLUDED.effective_date,
        issued_by = EXCLUDED.issued_by,
        document_hash = EXCLUDED.document_hash,
        is_active = true
    `);

    logger.info("terms_versions and terms_acceptances tables ready");
  } catch (err) {
    logger.error({ err }, "createTermsAcceptanceTables failed");
  }
}