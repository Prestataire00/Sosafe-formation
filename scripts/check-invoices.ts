import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  const total = await client.query("SELECT COUNT(*) FROM invoices WHERE digiforma_id IS NOT NULL");
  const withAddr = await client.query("SELECT COUNT(*) FROM invoices WHERE client_city IS NOT NULL");
  const withPdf = await client.query("SELECT COUNT(*) FROM invoices WHERE file_url IS NOT NULL");
  const avoirs = await client.query("SELECT COUNT(*) FROM invoices WHERE invoice_type = 'credit_note'");
  const sample = await client.query("SELECT number, title, invoice_type, status, client_city, client_postal_code, client_address, file_url, payment_limit_days FROM invoices WHERE client_city IS NOT NULL AND file_url IS NOT NULL LIMIT 2");

  console.log("=== Factures Digiforma en base ===");
  console.log("Total Digiforma:", total.rows[0].count);
  console.log("Avec adresse client:", withAddr.rows[0].count);
  console.log("Avec PDF:", withPdf.rows[0].count);
  console.log("Avoirs:", avoirs.rows[0].count);
  console.log("\nExemples:");
  sample.rows.forEach((r: any) => console.log(JSON.stringify(r, null, 2)));

  client.release();
  await pool.end();
}
main().catch(console.error);
