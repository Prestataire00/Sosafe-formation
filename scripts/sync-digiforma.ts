/**
 * Synchronisation Digiforma → LMS
 *
 * Importe toutes les données Digiforma (JSON) dans la base PostgreSQL du LMS.
 * Utilise digiformaId pour éviter les doublons (upsert).
 *
 * Run: npx tsx scripts/sync-digiforma.ts
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "digiforma-data");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function loadJson(filename: string) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

// Maps digiforma IDs → LMS UUIDs (populated during import)
const idMaps = {
  enterprises: new Map<string, string>(),
  trainers: new Map<string, string>(),
  trainees: new Map<string, string>(),
  programs: new Map<string, string>(),
  sessions: new Map<string, string>(),
  locations: new Map<string, string>(),
};

async function upsert(
  client: pg.PoolClient,
  table: string,
  data: Record<string, any>,
  conflictColumn: string = "digiforma_id"
): Promise<string> {
  const digiformaId = data[conflictColumn];

  // Check if exists
  const existing = await client.query(
    `SELECT id FROM ${table} WHERE "${conflictColumn}" = $1`,
    [digiformaId]
  );

  if (existing.rows.length > 0) {
    // UPDATE
    const updateKeys = Object.keys(data).filter((k) => k !== "id" && k !== conflictColumn);
    const setClauses = updateKeys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const updateValues = updateKeys.map((k) => data[k]);
    updateValues.push(digiformaId);

    await client.query(
      `UPDATE ${table} SET ${setClauses} WHERE "${conflictColumn}" = $${updateValues.length}`,
      updateValues
    );
    return existing.rows[0].id;
  } else {
    // INSERT
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const columns = keys.map((k) => `"${k}"`).join(", ");

    const result = await client.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    return result.rows[0].id;
  }
}

// ============================================================
// 1. ENTERPRISES (companies)
// ============================================================
async function syncEnterprises(client: pg.PoolClient) {
  const { data } = loadJson("companies.json");
  const companies = data.companies || [];
  console.log(`\n=== Entreprises: ${companies.length} ===`);

  for (const c of companies) {
    const lmsId = await upsert(client, "enterprises", {
      digiforma_id: c.id,
      name: c.name || "Sans nom",
      siret: c.siret || null,
      address: c.roadAddress || null,
      city: c.city || null,
      postal_code: c.cityCode || null,
      email: c.email || null,
      phone: c.phone || null,
      status: "active",
    });
    idMaps.enterprises.set(c.id, lmsId);
  }
  console.log(`  ✓ ${companies.length} entreprises synchronisées`);
}

// ============================================================
// 2. TRAINING LOCATIONS (rooms)
// ============================================================
async function syncLocations(client: pg.PoolClient) {
  const { data } = loadJson("rooms.json");
  const rooms = data.rooms || [];
  console.log(`\n=== Lieux de formation: ${rooms.length} ===`);

  for (const r of rooms) {
    const lmsId = await upsert(client, "training_locations", {
      digiforma_id: r.id,
      name: r.name || "Sans nom",
      description: r.description || null,
      road_number: r.roadNumber || null,
      road_type: r.roadType || null,
      road_label: r.roadLabel || null,
      address_extra: r.addressExtra || null,
      city: r.city || null,
      city_code: r.cityCode || null,
      country: r.country || "France",
      country_code: r.countryCode || "FR",
      capacity: r.capacity || null,
      equipment: r.equipment || null,
      access_instructions: r.accessInstructions || null,
      contact_name: r.contactName || null,
      contact_email: r.contactEmail || null,
      contact_phone: r.contactPhone || null,
      price_per_day: r.pricePerDay || null,
      price_per_half_day: r.pricePerHalfDay || null,
      siret: r.siret || null,
      accessibility_compliant: r.addressRegulatoryCompliance || false,
      is_active: true,
    });
    idMaps.locations.set(r.id, lmsId);
  }
  console.log(`  ✓ ${rooms.length} lieux synchronisés`);
}

// ============================================================
// 3. TRAINERS (instructors)
// ============================================================
async function syncTrainers(client: pg.PoolClient) {
  const { data } = loadJson("instructors.json");
  const instructors = data.instructors || [];
  console.log(`\n=== Formateurs: ${instructors.length} ===`);

  let synced = 0;
  for (const i of instructors) {
    // Check if already exists by digiformaId OR email
    const existing = await client.query(
      `SELECT id FROM trainers WHERE digiforma_id = $1 OR ($2::text IS NOT NULL AND email = $2::text)`,
      [i.id, i.email]
    );

    let lmsId: string;
    if (existing.rows.length > 0) {
      lmsId = existing.rows[0].id;
      await client.query(
        `UPDATE trainers SET digiforma_id = $1, first_name = $2, last_name = $3, phone = $4 WHERE id = $5`,
        [i.id, i.firstname || "", i.lastname || "", i.phone, lmsId]
      );
    } else {
      const result = await client.query(
        `INSERT INTO trainers (digiforma_id, first_name, last_name, email, phone, status) VALUES ($1,$2,$3,$4,$5,'active') RETURNING id`,
        [i.id, i.firstname || "", i.lastname || "", i.email, i.phone]
      );
      lmsId = result.rows[0].id;
    }
    idMaps.trainers.set(i.id, lmsId);
    synced++;
  }
  console.log(`  ✓ ${synced} formateurs synchronisés`);
}

// ============================================================
// 4. TRAINEES
// ============================================================
async function syncTrainees(client: pg.PoolClient) {
  const { data } = loadJson("trainees-all.json");
  const trainees = data.trainees || [];
  console.log(`\n=== Stagiaires: ${trainees.length} ===`);

  let synced = 0;
  let skipped = 0;
  for (const t of trainees) {
    // Map civility
    let civility = null;
    if (t.civility === "mr") civility = "M.";
    else if (t.civility === "mme") civility = "Mme";

    // Map enterprise
    const enterpriseId = t.company?.id ? idMaps.enterprises.get(t.company.id) : null;

    // Map status
    let status = "active";
    if (t.status === "employee") status = "active";
    else if (t.status === "resigned" || t.status === "inactive") status = "inactive";

    // Map profile type
    let profileType = "salarie";
    if (t.status === "liberal") profileType = "profession_liberale";
    else if (t.status === "independent") profileType = "independant";
    else if (t.status === "unemployed") profileType = "demandeur_emploi";

    // Check by digiformaId OR email
    const existing = await client.query(
      `SELECT id FROM trainees WHERE digiforma_id = $1 OR ($2::text IS NOT NULL AND email = $2::text)`,
      [t.id, t.email]
    );

    let lmsId: string;
    if (existing.rows.length > 0) {
      lmsId = existing.rows[0].id;
      await client.query(
        `UPDATE trainees SET digiforma_id = $1, first_name = $2, last_name = $3, phone = $4, city = $5, civility = $6, company = $7, enterprise_id = COALESCE($8, enterprise_id), profession = $9, profile_type = $10 WHERE id = $11`,
        [t.id, t.firstname || "", t.lastname || "", t.phone, t.city, civility, t.company?.name, enterpriseId, t.profession, profileType, lmsId]
      );
      skipped++;
    } else {
      try {
        const result = await client.query(
          `INSERT INTO trainees (digiforma_id, first_name, last_name, email, phone, city, civility, company, enterprise_id, profession, status, profile_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [t.id, t.firstname || "", t.lastname || "", t.email, t.phone, t.city, civility, t.company?.name, enterpriseId, t.profession, status, profileType]
        );
        lmsId = result.rows[0].id;
        synced++;
      } catch (err: any) {
        if (err.code === "23505") { skipped++; continue; }
        console.error(`  ✗ Erreur stagiaire ${t.firstname} ${t.lastname}:`, err.message);
        continue;
      }
    }
    idMaps.trainees.set(t.id, lmsId);
  }
  console.log(`  ✓ ${synced} stagiaires synchronisés, ${skipped} doublons ignorés`);
}

// ============================================================
// 5. PROGRAMS — dédupliqués (1 par nom, onSale prioritaire)
// ============================================================

// Map every Digiforma program ID to a canonical LMS program ID
const digiProgramToCanonical = new Map<string, string>();

// Known prices HT per person — Digiforma doesn't expose them via API
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

function lookupPrice(title: string): number {
  const t = title.toLowerCase().normalize("NFC").trim();
  let best = 0;
  let bestLen = 0;
  for (const [key, val] of Object.entries(PROGRAM_PRICES)) {
    const k = key.normalize("NFC");
    if ((t.includes(k) || k.includes(t)) && k.length > bestLen) {
      bestLen = k.length;
      best = val;
    }
  }
  // Recyclage override
  if (t.startsWith("recyclage") && best > 250) best = 250;
  if (!t.startsWith("recyclage") && t.includes("afgsu") && best === 250) best = 750;
  return best;
}

async function syncPrograms(client: pg.PoolClient) {
  const { data } = loadJson("programs.json");
  const allPrograms = data.programs || [];

  // Group by trimmed name
  const byName: Record<string, any[]> = {};
  for (const p of allPrograms) {
    const key = p.name.trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(p);
  }

  // Pick canonical: onSale=true first, then highest ID (most recent)
  const canonical: any[] = [];
  for (const [, variants] of Object.entries(byName)) {
    const onSale = variants.find((v: any) => v.onSale);
    const picked = onSale || variants.sort((a: any, b: any) => parseInt(b.id) - parseInt(a.id))[0];
    canonical.push({ picked, allIds: variants.map((v: any) => v.id) });
  }

  console.log(`\n=== Programmes: ${canonical.length} uniques (sur ${allPrograms.length} dans Digiforma) ===`);

  // Delete all existing programs, sessions, enrollments for clean import
  await client.query("DELETE FROM enrollments");
  await client.query("DELETE FROM session_trainers");
  await client.query("DELETE FROM sessions");
  await client.query("DELETE FROM programs");
  console.log("  ✓ Tables programs/sessions/enrollments nettoyées");

  for (const { picked: p, allIds } of canonical) {
    // Store raw Digiforma data — no transformation
    const result = await client.query(
      `INSERT INTO programs (
        digiforma_id, title, description, categories, duration, price, level,
        objectives, prerequisites, modality, status, certifying,
        program_content, target_audience, teaching_methods, evaluation_methods,
        accessibility_info, image_url, funding_types
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [
        p.id,
        p.name || "Sans titre",
        p.description || null,
        JSON.stringify(p.category?.name ? [p.category.name] : []),
        p.durationInHours || 0,
        p.costsInter?.[0]?.cost || lookupPrice(p.name || "") || 0,
        "all_levels",
        // Format arrays as readable text for the LMS
        (p.goals || []).map((g: string) => `• ${g}`).join("\n") || null,
        (p.prerequisites || []).map((pr: string) => `• ${pr}`).join("\n") || "Aucun prérequis",
        p.remote ? "distanciel" : "presentiel",
        p.onSale ? "published" : "draft",
        p.cpf || false,
        (p.steps || []).map((s: any) => `${s.name}${s.durationInHours ? ` (${s.durationInHours}h)` : ""}\n${s.description || ""}`).join("\n\n") || null,
        (p.targets || []).map((t: string) => `• ${t}`).join("\n") || null,
        (p.pedagogicalResources || []).map((r: any) => `• ${r.name || r}`).join("\n") || null,
        (p.assessments || []).map((a: any) => a.text || a.name || a).join("\n") || null,
        p.handicappedAccessibility || null,
        p.image?.url || null,
        JSON.stringify(p.cpf ? ["cpf"] : []),
      ]
    );
    const lmsId = result.rows[0].id;

    // Map ALL variant IDs to this single canonical program
    for (const variantId of allIds) {
      digiProgramToCanonical.set(variantId, lmsId);
    }
    idMaps.programs.set(p.id, lmsId);
  }
  console.log(`  ✓ ${canonical.length} programmes importés`);
}

// ============================================================
// 6. SESSIONS
// ============================================================
async function syncSessions(client: pg.PoolClient) {
  const { data } = loadJson("training-sessions.json");
  const sessions = data.trainingSessions || [];
  console.log(`\n=== Sessions: ${sessions.length} ===`);

  let synced = 0;
  let skipped = 0;
  for (const s of sessions) {
    // Require program mapping and dates — use canonical program map
    const programId = s.program?.id ? digiProgramToCanonical.get(s.program.id) : null;
    if (!programId) {
      skipped++;
      continue;
    }

    // Skip sessions without dates
    if (!s.startDate || !s.endDate) {
      skipped++;
      continue;
    }

    // Map status
    let status = "planned";
    if (s.pipelineState === "completed" || s.pipelineState === "done") status = "completed";
    else if (s.pipelineState === "cancelled") status = "cancelled";
    else if (s.pipelineState === "in_progress") status = "in_progress";

    // Map modality
    let modality = "presentiel";
    if (s.remote) modality = "distanciel";

    // Location from room
    const locationName = s.room?.name || s.placeName || s.place || null;
    const locationId = s.room?.id ? idMaps.locations.get(s.room.id) : null;

    const lmsId = await upsert(client, "sessions", {
      digiforma_id: s.id,
      program_id: programId,
      title: s.name || "Session sans titre",
      start_date: s.startDate,
      end_date: s.endDate,
      location: locationName,
      modality,
      status,
      max_participants: 12,
      notes: s.extranetUrl ? `Extranet: ${s.extranetUrl}` : null,
    });
    idMaps.sessions.set(s.id, lmsId);

    // Link trainers to session
    if (s.instructors?.length > 0) {
      for (const inst of s.instructors) {
        const trainerId = idMaps.trainers.get(inst.id);
        if (trainerId) {
          await client.query(
            `INSERT INTO session_trainers (session_id, trainer_id, role)
             VALUES ($1, $2, 'trainer')
             ON CONFLICT DO NOTHING`,
            [lmsId, trainerId]
          );
        }
      }
    }
    synced++;
  }
  console.log(`  ✓ ${synced} sessions synchronisées, ${skipped} ignorées (sans dates ou programme)`);
}

// ============================================================
// 6b. ENROLLMENTS (inscriptions stagiaires aux sessions)
// ============================================================
async function syncEnrollments(client: pg.PoolClient) {
  let enrollData: any;
  try {
    enrollData = loadJson("enrollments.json");
  } catch {
    console.log("\n=== Inscriptions: fichier enrollments.json absent, ignoré ===");
    return;
  }
  const sessions = enrollData.data?.trainingSessions || [];
  console.log(`\n=== Inscriptions ===`);

  let synced = 0;
  let skipped = 0;
  for (const s of sessions) {
    const sessionId = idMaps.sessions.get(s.id);
    if (!sessionId) continue;

    const trainees = s.trainees || [];
    for (const t of trainees) {
      const traineeId = idMaps.trainees.get(t.id);
      if (!traineeId) { skipped++; continue; }

      try {
        await client.query(
          `INSERT INTO enrollments (session_id, trainee_id, status)
           VALUES ($1, $2, 'registered')
           ON CONFLICT DO NOTHING`,
          [sessionId, traineeId]
        );
        synced++;
      } catch {
        skipped++;
      }
    }
  }
  console.log(`  ✓ ${synced} inscriptions créées, ${skipped} ignorées`);
}

// ============================================================
// 7. INVOICES
// ============================================================
async function syncInvoices(client: pg.PoolClient) {
  const { data } = loadJson("invoices.json");
  const invoices = data.invoices || [];
  console.log(`\n=== Factures: ${invoices.length} ===`);

  let synced = 0;
  let skipped = 0;
  for (const inv of invoices) {
    const number = inv.numberStr
      ? `${inv.prefix || ""}-${inv.numberStr}`.replace(/^-/, "")
      : `DIG-${inv.id}`;

    try {
      await upsert(client, "invoices", {
        digiforma_id: inv.id,
        number,
        title: inv.freeText && inv.freeText.startsWith("Avoir") ? `Avoir ${number}` : `Facture ${number}`,
        invoice_type: inv.freeText && inv.freeText.startsWith("Avoir") ? "credit_note" : "standard",
        status: inv.status === "paid" ? "paid" : inv.status === "partially_paid" ? "partially_paid" : inv.locked ? "sent" : "draft",
        due_date: inv.date || null,
        notes: [inv.reference, inv.freeText].filter(Boolean).join("\n") || null,
        subtotal: parseFloat(inv.totalHT) || 0,
        tax_rate: inv.totalHT > 0 ? Math.round((parseFloat(inv.totalVAT) / parseFloat(inv.totalHT)) * 10000) / 100 : 0,
        tax_amount: parseFloat(inv.totalVAT) || 0,
        total: parseFloat(inv.totalTTC) || 0,
        paid_amount: parseFloat(inv.paidAmount) || 0,
        enterprise_id: inv.customer?.id ? idMaps.enterprises.get(inv.customer.id) || null : null,
        client_address: inv.roadAddress || null,
        client_city: inv.city || null,
        client_postal_code: inv.cityCode?.trim() || null,
        client_country_code: inv.countryCode || "FR",
        file_url: inv.fileUrl || null,
        order_form: inv.orderForm || null,
        payment_limit_days: inv.paymentLimitDays || null,
        is_payment_limit_end_month: inv.isPaymentLimitEndMonth || false,
        reference: inv.reference || null,
      });
      synced++;
    } catch (err: any) {
      if (err.code === "23505") {
        skipped++;
      } else {
        console.error(`  ✗ Erreur facture ${number}:`, err.message);
      }
    }
  }
  console.log(`  ✓ ${synced} factures synchronisées, ${skipped} doublons ignorés`);
}

// ============================================================
// 8. QUOTATIONS → quotes
// ============================================================
async function syncQuotations(client: pg.PoolClient) {
  const { data } = loadJson("quotations.json");
  const quotations = data.quotations || [];
  console.log(`\n=== Devis: ${quotations.length} ===`);

  let synced = 0;
  let skipped = 0;
  for (const q of quotations) {
    const number = q.numberStr
      ? `${q.prefix || ""}-${q.numberStr}`.replace(/^-/, "")
      : `DIG-Q-${q.id}`;

    let status = "draft";
    if (q.acceptedAt) status = "accepted";

    try {
      await upsert(client, "quotes", {
        digiforma_id: q.id,
        number,
        title: `Devis ${number}`,
        status,
        subtotal: parseFloat(q.totalHT) || 0,
        tax_rate: q.totalHT > 0 ? Math.round((parseFloat(q.totalVAT) / parseFloat(q.totalHT)) * 10000) / 100 : 0,
        tax_amount: parseFloat(q.totalVAT) || 0,
        total: parseFloat(q.totalTTC) || 0,
        notes: null,
      });
      synced++;
    } catch (err: any) {
      if (err.code === "23505") {
        skipped++;
      } else {
        console.error(`  ✗ Erreur devis ${number}:`, err.message);
      }
    }
  }
  console.log(`  ✓ ${synced} devis synchronisés, ${skipped} doublons ignorés`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Synchronisation Digiforma → LMS SO SAFE    ║");
  console.log("╚══════════════════════════════════════════════╝");

  const client = await pool.connect();

  try {
    // Ensure digiforma_id columns exist
    const migrations = [
      "ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE trainers ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE trainees ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE programs ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE training_locations ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS digiforma_id TEXT",
      // Drop old partial indexes if they exist, then create non-partial unique indexes for upsert
      "DROP INDEX IF EXISTS idx_enterprises_digiforma_id",
      "DROP INDEX IF EXISTS idx_trainers_digiforma_id",
      "DROP INDEX IF EXISTS idx_trainees_digiforma_id",
      "DROP INDEX IF EXISTS idx_programs_digiforma_id",
      "DROP INDEX IF EXISTS idx_sessions_digiforma_id",
      "DROP INDEX IF EXISTS idx_training_locations_digiforma_id",
      "DROP INDEX IF EXISTS idx_invoices_digiforma_id",
      "DROP INDEX IF EXISTS idx_quotes_digiforma_id",
      "CREATE UNIQUE INDEX idx_enterprises_digiforma_id ON enterprises(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_trainers_digiforma_id ON trainers(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_trainees_digiforma_id ON trainees(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_programs_digiforma_id ON programs(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_sessions_digiforma_id ON sessions(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_training_locations_digiforma_id ON training_locations(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_invoices_digiforma_id ON invoices(digiforma_id) WHERE digiforma_id IS NOT NULL",
      "CREATE UNIQUE INDEX idx_quotes_digiforma_id ON quotes(digiforma_id) WHERE digiforma_id IS NOT NULL",
      // Digiforma invoice fields
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_city TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_postal_code TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_country_code TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS file_url TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_form TEXT",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_limit_days INTEGER",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_payment_limit_end_month BOOLEAN DEFAULT false",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference TEXT",
    ];

    console.log("\nMigration des colonnes digiforma_id...");
    for (const sql of migrations) {
      await client.query(sql);
    }
    console.log("  ✓ Colonnes et index créés");

    // Import in dependency order
    await syncEnterprises(client);
    await syncLocations(client);
    await syncTrainers(client);
    await syncTrainees(client);
    await syncPrograms(client);
    await syncSessions(client);
    await syncEnrollments(client);
    await syncInvoices(client);
    await syncQuotations(client);

    // Summary
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║  Synchronisation terminée !                  ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`  Entreprises: ${idMaps.enterprises.size}`);
    console.log(`  Lieux:       ${idMaps.locations.size}`);
    console.log(`  Formateurs:  ${idMaps.trainers.size}`);
    console.log(`  Stagiaires:  ${idMaps.trainees.size}`);
    console.log(`  Programmes:  ${idMaps.programs.size}`);
    console.log(`  Sessions:    ${idMaps.sessions.size}`);
  } catch (err) {
    console.error("Erreur fatale:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
