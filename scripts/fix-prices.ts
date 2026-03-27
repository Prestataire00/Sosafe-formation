/**
 * Fix prices: update invoice amounts from Digiforma export + set program prices
 *
 * Run: npx tsx scripts/fix-prices.ts
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Program base prices (HT per person) — derived from most common invoice amounts
// Exact title → price mapping (lowercase keys for matching)
const PROGRAM_PRICES: Record<string, number> = {
  "afgsu 1": 750,
  "afgsu 2": 750,
  "afgsu2": 750,
  "recyclage afgsu 1": 250,
  "recyclage afgsu 2": 250,
  "recyclage afgsu2": 250,
  "formation nouveaux actes ambulanciers": 710,
  "nouveaux actes ambulanciers": 710,
  "hypnose": 1000,
  "eusim": 1920,
  "eusim 1": 1920,
  "eusim 2": 1920,
  "eusim niveau 1": 1920,
  "eusim niveau 2": 1920,
  "premiers secours en santé mentale": 250,
  "pssm": 250,
  "escape game": 1200,
  "damage control": 1200,
  "débriefing difficile": 3200,
  "certibiocide": 490,
  "démence": 750,
  "accompagner autrement": 750,
  "sim\u2019coach": 5000,
  "sim'coach": 5000,
  "simcoach": 5000,
  "peer-coaching": 1500,
  "peer coaching": 1500,
  "initiation premiers secours": 150,
  "certificat de décès": 350,
  "céphalées": 750,
  "cervicalgies": 750,
  "urgences pédiatriques": 750,
  "situation sanitaire exceptionnelle": 750,
  "violence et de l'agressivité": 750,
  "défibrillateur": 350,
  "milieu nautique": 750,
  "formateur en simulation": 2500,
  "formation formateur": 2500,
};

interface InvoiceRow {
  date: string;
  recipient: string;
  amountHT: number;
  number: string;
  status: string;
  type: string;
  session: string;
  client: string;
}

function parseTSV(): InvoiceRow[] {
  const raw = fs.readFileSync(path.join(__dirname, "digiforma-data/invoices-export.tsv"), "utf-8");
  const lines = raw.split("\n").filter(l => l.trim());
  // Skip header
  const rows: InvoiceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 8) continue;
    rows.push({
      date: cols[0]?.trim() || "",
      recipient: cols[1]?.trim() || "",
      amountHT: parseFloat(cols[2]?.trim() || "0"),
      number: cols[3]?.trim() || "",
      status: cols[6]?.trim() || "",
      type: cols[7]?.trim() || "",
      session: cols[12]?.trim() || "",
      client: cols[13]?.trim() || "",
    });
  }
  return rows;
}

async function fixInvoicePrices(client: pg.PoolClient) {
  const invoices = parseTSV();
  console.log(`\n=== Mise à jour des factures: ${invoices.length} lignes ===`);

  let updated = 0;
  let notFound = 0;
  let charges = 0;

  for (const inv of invoices) {
    // Skip charges (no invoice number)
    if (inv.type === "Charge" || !inv.number) {
      charges++;
      continue;
    }

    // Amount in cents (DB stores integers in cents)
    const amountCents = Math.round(inv.amountHT * 100);
    const absAmountCents = Math.abs(amountCents);

    // Map status
    let dbStatus = "draft";
    if (inv.status === "Payé") dbStatus = "paid";
    else if (inv.status === "En retard") dbStatus = "overdue";
    else if (inv.status === "Envoyé") dbStatus = "sent";

    // Map type
    let invoiceType = "standard";
    if (inv.type === "Avoir") invoiceType = "credit_note";

    // Build line items
    const lineItems = JSON.stringify([{
      description: inv.session || "Formation",
      quantity: 1,
      unitPrice: absAmountCents,
      total: amountCents,
    }]);

    // Find by number
    const existing = await client.query(
      `SELECT id FROM invoices WHERE number = $1`,
      [inv.number]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE invoices SET
          subtotal = $1, total = $2, tax_amount = 0, tax_rate = 0,
          line_items = $3, status = $4, invoice_type = $5,
          title = $6
        WHERE number = $7`,
        [
          absAmountCents, amountCents, lineItems, dbStatus, invoiceType,
          inv.recipient || inv.client || "Facture",
          inv.number,
        ]
      );
      updated++;
    } else {
      notFound++;
    }
  }

  console.log(`  ✓ ${updated} factures mises à jour avec montants`);
  console.log(`  ⚠ ${notFound} factures non trouvées en base`);
  console.log(`  ○ ${charges} charges ignorées`);
}

async function fixProgramPrices(client: pg.PoolClient) {
  console.log(`\n=== Mise à jour des prix programmes ===`);

  const { rows: programs } = await client.query(`SELECT id, title FROM programs`);
  let updated = 0;

  for (const prog of programs) {
    const title = prog.title as string;

    // Find best matching price — longest matching key wins (most specific)
    let price: number | null = null;
    let bestMatchLen = 0;
    const titleLower = title.toLowerCase().normalize("NFC").trim();
    for (const [key, val] of Object.entries(PROGRAM_PRICES)) {
      const keyNorm = key.normalize("NFC");
      if (titleLower.includes(keyNorm) || keyNorm.includes(titleLower)) {
        if (keyNorm.length > bestMatchLen) {
          bestMatchLen = keyNorm.length;
          price = val;
        }
      }
    }
    // Special: if title starts with "Recyclage" but matched a non-recyclage price, override
    if (titleLower.startsWith("recyclage") && price !== null && price > 250) {
      // Check if there's a specific recyclage entry
      const isRecyclage = Object.keys(PROGRAM_PRICES).some(k =>
        k.startsWith("recyclage") && titleLower.includes(k)
      );
      if (!isRecyclage) {
        price = 250; // default recyclage price
      }
    }
    // Special: non-recyclage AFGSU should be 750, not 250
    if (!titleLower.startsWith("recyclage") && titleLower.includes("afgsu") && price === 250) {
      price = 750;
    }

    if (price !== null) {
      await client.query(
        `UPDATE programs SET price = $1 WHERE id = $2`,
        [price, prog.id]
      );
      console.log(`  ✓ ${title} → ${price}€ HT`);
      updated++;
    } else {
      console.log(`  ⚠ ${title} → pas de prix trouvé, valeur inchangée`);
    }
  }

  console.log(`  ✓ ${updated} programmes mis à jour`);
}

async function main() {
  const client = await pool.connect();
  try {
    await fixInvoicePrices(client);
    await fixProgramPrices(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
