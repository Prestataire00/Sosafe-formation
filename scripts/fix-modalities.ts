/**
 * One-shot script: set all programs and sessions modality to "presentiel"
 * Run with: npx tsx scripts/fix-modalities.ts
 */
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Fix programs
    const progResult = await client.query(
      `UPDATE programs SET modality = 'presentiel' WHERE modality != 'presentiel' RETURNING id, title, modality`
    );
    console.log(`Programs updated: ${progResult.rowCount}`);
    progResult.rows.forEach((r: any) => console.log(`  - ${r.title}`));

    // Fix sessions
    const sessResult = await client.query(
      `UPDATE sessions SET modality = 'presentiel' WHERE modality != 'presentiel' RETURNING id, title, modality`
    );
    console.log(`Sessions updated: ${sessResult.rowCount}`);
    sessResult.rows.forEach((r: any) => console.log(`  - ${r.title}`));

    console.log("Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
