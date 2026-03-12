import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { Program, OrganizationSetting } from "@shared/schema";
import { PROGRAM_CATEGORY_GROUPS, MODALITIES } from "@shared/schema";

function settingsToMap(settings: OrganizationSetting[]) {
  const m: Record<string, string> = {};
  for (const s of settings) m[s.key] = s.value;
  return m;
}

const C = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#cbd5e1",
  bg: "#f8fafc",
  white: "#ffffff",
  headerBg: "#1e293b",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};
const MODALITY_LABELS: Record<string, string> = {};
for (const m of MODALITIES) MODALITY_LABELS[m.value] = m.label;

async function fetchLogoBuffer(logoUrl: string | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    // If it's a local path (e.g. /uploads/... or /logo-sosafe.png)
    if (logoUrl.startsWith("/")) {
      // Try client/public first, then project root
      const publicPath = path.resolve(process.cwd(), "client/public", logoUrl.replace(/^\//, ""));
      if (fs.existsSync(publicPath)) return fs.readFileSync(publicPath);
      const rootPath = path.resolve(process.cwd(), logoUrl.replace(/^\//, ""));
      if (fs.existsSync(rootPath)) return fs.readFileSync(rootPath);
      return null;
    }
    // Remote URL
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export async function generateCatalogPdf(
  programs: Program[],
  settings: OrganizationSetting[],
): Promise<Buffer> {
  const org = settingsToMap(settings);
  const orgName = org.org_name || "Organisme de Formation";
  const logoBuffer = await fetchLogoBuffer(org.org_logo_url);
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const year = new Date().getFullYear();

  // Group programs by category
  const grouped: { category: string; programs: Program[] }[] = [];
  const used = new Set<string>();
  for (const g of PROGRAM_CATEGORY_GROUPS) {
    const cats = g.categories as readonly string[];
    const match = programs.filter(
      (p) => !used.has(p.id) && p.categories?.some((c) => cats.includes(c)),
    );
    if (match.length) {
      grouped.push({ category: g.label, programs: match });
      match.forEach((p) => used.add(p.id));
    }
  }
  const rest = programs.filter((p) => !used.has(p.id));
  if (rest.length)
    grouped.push({ category: "Autres formations", programs: rest });

  // IMPORTANT: bottom margin = 0 to prevent PDFKit auto-pagination
  // We handle all vertical boundaries manually via BOT constant
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 0, left: 45, right: 45 },
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: `Catalogue de Formations ${year} - ${orgName}`,
      Author: orgName,
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const PW = doc.page.width; // 595
  const PH = doc.page.height; // 842
  const CW = PW - 90;
  const CL = 45;
  const BOT = PH - 55; // content stops here (footer zone below)

  function space(y: number) {
    return BOT - y;
  }

  function contPage(title: string) {
    doc.addPage();
    doc.rect(0, 0, PW, 5).fill(C.primary);
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.textLight)
      .text(`${title} (suite)`, CL, 10, {
        width: CW,
        align: "right",
        lineBreak: false,
      });
    return 24;
  }

  function renderParas(
    text: string,
    x: number,
    y: number,
    w: number,
    title: string,
  ): number {
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t) {
        y += 3;
        continue;
      }
      doc.font("Helvetica").fontSize(8);
      const h = doc.heightOfString(t, { width: w, lineGap: 1.5 });
      if (h > space(y) && y > 50) y = contPage(title);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.text)
        .text(t, x, y, { width: w, lineGap: 1.5 });
      y = doc.y;
    }
    return y;
  }

  // ── PAGE 1: COVER ──
  doc.rect(0, 0, PW, PH).fill(C.headerBg);

  // Logo on cover page
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, CL, 60, { fit: [200, 80] });
    } catch { /* ignore unsupported image format */ }
  }

  doc
    .moveTo(CL, 200)
    .lineTo(CL + 80, 200)
    .lineWidth(4)
    .strokeColor(C.primaryLight)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(36)
    .fillColor(C.white)
    .text("Catalogue", CL, 220, { width: CW });
  doc
    .font("Helvetica-Bold")
    .fontSize(36)
    .fillColor(C.primaryLight)
    .text("de Formations", CL, 262, { width: CW });
  doc
    .font("Helvetica")
    .fontSize(24)
    .fillColor(C.white)
    .text(String(year), CL, 320, { width: CW });

  doc
    .moveTo(CL, 420)
    .lineTo(CL + 40, 420)
    .lineWidth(2)
    .strokeColor(C.primaryLight)
    .stroke();
  let iy = 436;
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(C.white)
    .text(orgName, CL, iy, { width: CW });
  iy += 28;
  doc.font("Helvetica").fontSize(11).fillColor("#94a3b8");
  for (const v of [
    org.org_address,
    org.org_siret ? `SIRET : ${org.org_siret}` : null,
    org.org_nda ? `NDA : ${org.org_nda}` : null,
    org.org_email,
    org.org_phone,
  ]) {
    if (v) {
      doc.text(v, CL, iy, { width: CW, lineBreak: false });
      iy += 18;
    }
  }
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#94a3b8")
    .text(
      `${programs.length} formation${programs.length > 1 ? "s" : ""} disponible${programs.length > 1 ? "s" : ""}`,
      CL,
      PH - 150,
      { width: CW, lineBreak: false },
    );
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#94a3b8")
    .text(`Catalogue généré le ${dateStr}`, CL, PH - 134, {
      width: CW,
      lineBreak: false,
    });


  // ── TOC (only if 3+ programs) ──
  const showToc = programs.length >= 3;
  interface TocE {
    pn: number;
    po: number;
    ty: number;
  }
  const toc: TocE[] = [];
  let tocStart = -1;

  if (showToc) {
    doc.addPage();
    tocStart =
      doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(C.text)
      .text("Sommaire", CL, 40, { width: CW });
    let ty = 72,
      idx = 0,
      po = 0;
    for (const g of grouped) {
      if (ty + 30 > BOT) {
        doc.addPage();
        po++;
        ty = 40;
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(C.primary)
        .text(g.category.toUpperCase(), CL, ty, { width: CW });
      ty += 16;
      for (const p of g.programs) {
        if (ty + 14 > BOT) {
          doc.addPage();
          po++;
          ty = 40;
        }
        idx++;
        toc.push({ pn: 0, po, ty });
        const label = `${idx}. ${p.title}`;
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(label, CL + 6, ty, {
            width: CW - 40,
            lineBreak: false,
          });
        const tw = doc.widthOfString(label);
        const ds = CL + 10 + tw;
        const de = CL + CW - 28;
        if (de > ds + 8)
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor(C.border)
            .text(
              ".".repeat(Math.floor((de - ds) / 3)),
              ds,
              ty,
              { width: de - ds, lineBreak: false },
            );
        ty += 14;
      }
      ty += 4;
    }
  }

  // ── PROGRAM SHEETS ──

  let ti = 0;
  for (const g of grouped) {
    for (let pi = 0; pi < g.programs.length; pi++) {
      const p = g.programs[pi];
      doc.addPage();
      const pn =
        doc.bufferedPageRange().start + doc.bufferedPageRange().count;
      if (showToc && toc[ti]) toc[ti].pn = pn;
      ti++;

      let y = 40;

      // Category header on first program of group
      if (pi === 0) {
        doc.rect(0, 0, PW, 28).fill(C.primary);
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(C.white)
          .text(
            `${g.category} — ${g.programs.length} formation${g.programs.length > 1 ? "s" : ""}`,
            CL,
            8,
            { width: CW, lineBreak: false },
          );
        y = 36;
      } else {
        doc.rect(0, 0, PW, 5).fill(C.primary);
        y = 14;
      }

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(C.text)
        .text(p.title, CL, y, { width: CW });
      y = doc.y + 3;

      // Badges
      if (p.categories && p.categories.length > 0) {
        let bx = CL;
        for (const cat of p.categories) {
          const tw =
            doc.font("Helvetica").fontSize(6.5).widthOfString(cat) + 8;
          if (bx + tw > CL + CW) {
            bx = CL;
            y += 14;
          }
          doc.roundedRect(bx, y, tw, 12, 2).fill(C.bg);
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor(C.primary)
            .text(cat, bx + 4, y + 2, { lineBreak: false });
          bx += tw + 3;
        }
        y += 16;
      }

      // Meta — single compact line
      const meta: string[] = [];
      meta.push(`Durée : ${p.duration}h`);
      meta.push(`Prix : ${p.price.toLocaleString("fr-FR")} €`);
      meta.push(`Niveau : ${LEVEL_LABELS[p.level] || p.level}`);
      meta.push(`Modalité : ${MODALITY_LABELS[p.modality] || p.modality}`);
      if (p.certifying) meta.push("Certifiante");
      if (p.recyclingMonths)
        meta.push(`Recyclage : ${p.recyclingMonths} mois`);

      doc.rect(CL, y, CW, 16).fill(C.bg);
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.text)
        .text(meta.join("  •  "), CL + 5, y + 4, {
          width: CW - 10,
          lineBreak: false,
        });
      y += 22;

      // Sections
      const sections: [string, string | null | undefined][] = [
        ["Description", p.description],
        ["Objectifs pédagogiques", p.objectives],
        ["Public visé", p.targetAudience],
        ["Prérequis", p.prerequisites],
        ["Programme détaillé", p.programContent],
        ["Méthodes pédagogiques", p.teachingMethods],
        ["Moyens techniques", p.technicalMeans],
        ["Modalités d'évaluation", p.evaluationMethods],
        ["Indicateurs de résultats", p.resultIndicators],
        ["Accessibilité", p.accessibilityInfo],
        ["Délais d'accès", p.accessDelay],
        ["Contact référent", p.referentContact],
        ["Référent handicap", p.referentHandicap],
      ];

      for (const [title, content] of sections) {
        if (!content) continue;

        if (space(y) < 22) y = contPage(p.title);

        // Title
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.primary)
          .text(title, CL, y, { width: CW });
        y = doc.y + 1;

        // Content
        doc.font("Helvetica").fontSize(8);
        const ch = doc.heightOfString(content, {
          width: CW - 4,
          lineGap: 1.5,
        });
        if (ch <= space(y)) {
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(C.text)
            .text(content, CL + 2, y, { width: CW - 4, lineGap: 1.5 });
          y = doc.y + 4;
        } else {
          y = renderParas(content, CL + 2, y, CW - 4, p.title);
          y += 4;
        }
      }

    }
  }

  // ── FOOTERS (all pages except cover) ──
  const total = doc.bufferedPageRange().count;
  for (let i = 1; i < total; i++) {
    doc.switchToPage(i);

    // Small logo in top-right corner of each page (except cover)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, PW - 45 - 80, 8, { fit: [80, 24] });
      } catch { /* ignore */ }
    }

    const fy = PH - 30;
    doc
      .moveTo(CL, fy - 4)
      .lineTo(CL + CW, fy - 4)
      .lineWidth(0.5)
      .strokeColor(C.border)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor(C.textLight)
      .text(orgName, CL, fy, {
        width: CW / 2,
        align: "left",
        lineBreak: false,
      });
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor(C.textLight)
      .text(`${i + 1} / ${total}`, CL + CW / 2, fy, {
        width: CW / 2,
        align: "right",
        lineBreak: false,
      });
  }

  // ── TOC page numbers ──
  if (showToc) {
    for (const e of toc) {
      doc.switchToPage(tocStart + e.po);
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(C.primary)
        .text(String(e.pn), CL + CW - 25, e.ty, {
          width: 25,
          align: "right",
          lineBreak: false,
        });
    }
  }

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
