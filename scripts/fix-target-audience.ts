import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const AFGSU2_METIERS = [
  "AES (Accompagnant Educatif et Social)",
  "Aide médico-psychologique",
  "Aide-soignant",
  "Ambulancier",
  "ARM (Assistant de Régulation Médicale)",
  "Assistant dentaire",
  "Assistants médicaux",
  "Auto-ambulancier",
  "Auxiliaire ambulancier",
  "Auxiliaire de puériculture",
  "Auxiliaire de vie sociale",
  "Chirurgien dentiste",
  "Diététicien",
  "Ergothérapeute",
  "Etudiant",
  "Infirmier anesthésiste",
  "Infirmier de bloc opératoire",
  "Infirmier / Infirmière",
  "Kinésithérapeute",
  "Manipulateur radio",
  "Masseur-kinésithérapeute",
  "Médecin",
  "Opticien-lunetier",
  "Orthophoniste",
  "Orthoptiste",
  "Pédicure-podologue",
  "Préleveur sanguin",
  "Préparateur en pharmacie",
  "Psychomotricien",
  "Puéricultrice",
  "Sage-femme",
  "Technicien de laboratoire",
].join(", ");

async function main() {
  const client = await pool.connect();
  try {
    // Show current state
    const current = await client.query(
      `SELECT id, title, target_audience FROM programs WHERE title ILIKE '%AFGSU 2%' OR title ILIKE '%Recyclage AFGSU 2%'`
    );
    console.log("Programs found:");
    current.rows.forEach((r: any) => console.log(`  - [${r.id}] ${r.title}`));

    // Update target_audience
    const result = await client.query(
      `UPDATE programs SET target_audience = $1 WHERE title ILIKE '%AFGSU 2%' OR title ILIKE '%Recyclage AFGSU 2%' RETURNING id, title`,
      [AFGSU2_METIERS]
    );
    console.log(`\nUpdated ${result.rowCount} programs with target audience.`);
    result.rows.forEach((r: any) => console.log(`  - ${r.title}`));
    console.log("Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
