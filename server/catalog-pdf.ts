import PDFDocument from "pdfkit";
import type { Program, OrganizationSetting } from "@shared/schema";
import { PROGRAM_CATEGORY_GROUPS, MODALITIES } from "@shared/schema";

interface OrgSettings {
  org_name?: string;
  org_address?: string;
  org_siret?: string;
  org_email?: string;
  org_phone?: string;
  org_nda?: string;
}

function settingsToMap(settings: OrganizationSetting[]): OrgSettings {
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map as OrgSettings;
}

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#64748b",
  accent: "#0f766e",
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
for (const m of MODALITIES) {
  MODALITY_LABELS[m.value] = m.label;
}

export async function generateCatalogPdf(
  programs: Program[],
  settings: OrganizationSetting[],
): Promise<Buffer> {
  const org = settingsToMap(settings);
  const orgName = org.org_name || "Organisme de Formation";
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const year = now.getFullYear();

  // Group programs by their first "domain" category
  const domainCategories = PROGRAM_CATEGORY_GROUPS[0].categories as readonly string[];
  const grouped: { category: string; programs: Program[] }[] = [];
  const usedProgramIds = new Set<string>();

  for (const cat of domainCategories) {
    const matching = programs.filter(
      (p) => p.categories?.includes(cat) && !usedProgramIds.has(p.id),
    );
    if (matching.length > 0) {
      grouped.push({ category: cat, programs: matching });
      for (const p of matching) usedProgramIds.add(p.id);
    }
  }

  // Programs without a domain category
  const uncategorized = programs.filter((p) => !usedProgramIds.has(p.id));
  if (uncategorized.length > 0) {
    grouped.push({ category: "Autres formations", programs: uncategorized });
  }

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 80, left: 50, right: 50 },
    info: {
      Title: `Catalogue de Formations ${year} - ${orgName}`,
      Author: orgName,
      Subject: "Catalogue de formations",
    },
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 100; // 50 left + 50 right
  const contentLeft = 50;

  // ================================================================
  // COVER PAGE
  // ================================================================
  doc.rect(0, 0, pageWidth, doc.page.height).fill(COLORS.headerBg);

  // Decorative line
  doc
    .moveTo(contentLeft, 200)
    .lineTo(contentLeft + 80, 200)
    .lineWidth(4)
    .strokeColor(COLORS.primaryLight)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(36)
    .fillColor(COLORS.white)
    .text("Catalogue", contentLeft, 220, { width: contentWidth });

  doc
    .font("Helvetica-Bold")
    .fontSize(36)
    .fillColor(COLORS.primaryLight)
    .text("de Formations", contentLeft, 262, { width: contentWidth });

  doc
    .font("Helvetica")
    .fontSize(24)
    .fillColor(COLORS.white)
    .text(String(year), contentLeft, 320, { width: contentWidth });

  // Org info block
  const orgInfoY = 420;
  doc
    .moveTo(contentLeft, orgInfoY)
    .lineTo(contentLeft + 40, orgInfoY)
    .lineWidth(2)
    .strokeColor(COLORS.primaryLight)
    .stroke();

  let infoY = orgInfoY + 16;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.white);
  doc.text(orgName, contentLeft, infoY, { width: contentWidth });
  infoY += 28;

  doc.font("Helvetica").fontSize(11).fillColor("#94a3b8");
  if (org.org_address) {
    doc.text(org.org_address, contentLeft, infoY, { width: contentWidth });
    infoY += 18;
  }
  if (org.org_siret) {
    doc.text(`SIRET : ${org.org_siret}`, contentLeft, infoY, {
      width: contentWidth,
    });
    infoY += 18;
  }
  if (org.org_nda) {
    doc.text(`NDA : ${org.org_nda}`, contentLeft, infoY, {
      width: contentWidth,
    });
    infoY += 18;
  }
  if (org.org_email) {
    doc.text(org.org_email, contentLeft, infoY, { width: contentWidth });
    infoY += 18;
  }
  if (org.org_phone) {
    doc.text(org.org_phone, contentLeft, infoY, { width: contentWidth });
    infoY += 18;
  }

  // Stats at the bottom
  const statsY = doc.page.height - 160;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#94a3b8")
    .text(`${programs.length} formation${programs.length > 1 ? "s" : ""} disponible${programs.length > 1 ? "s" : ""}`, contentLeft, statsY, { width: contentWidth });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#94a3b8")
    .text(`Catalogue généré le ${dateStr}`, contentLeft, statsY + 16, {
      width: contentWidth,
    });

  // ================================================================
  // TABLE OF CONTENTS
  // ================================================================
  doc.addPage();

  // Track page assignments for TOC: we'll fill in page numbers after layout
  // For now, build TOC structure and note the placeholder positions
  const tocPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;

  doc
    .moveTo(contentLeft, 55)
    .lineTo(contentLeft + 60, 55)
    .lineWidth(3)
    .strokeColor(COLORS.primary)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(COLORS.text)
    .text("Sommaire", contentLeft, 65, { width: contentWidth });

  let tocY = 110;
  let programIndex = 0;

  // We'll store TOC entries to update page numbers later
  interface TocEntry {
    title: string;
    category: string;
    pageNum: number; // to be filled
  }
  const tocEntries: TocEntry[] = [];

  for (const group of grouped) {
    // Category header in TOC
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.primary)
      .text(group.category.toUpperCase(), contentLeft, tocY, {
        width: contentWidth,
      });
    tocY += 22;

    for (const program of group.programs) {
      programIndex++;
      tocEntries.push({
        title: program.title,
        category: group.category,
        pageNum: 0,
      });

      // Draw dotted line + placeholder
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.text);
      const entryText = `${programIndex}. ${program.title}`;
      doc.text(entryText, contentLeft + 10, tocY, {
        width: contentWidth - 60,
        lineBreak: false,
      });
      tocY += 18;

      if (tocY > doc.page.height - 100) {
        doc.addPage();
        tocY = 60;
      }
    }

    tocY += 8;
  }

  // ================================================================
  // PROGRAM SHEETS
  // ================================================================
  let entryIdx = 0;

  for (const group of grouped) {
    // Category divider page
    doc.addPage();

    doc
      .rect(0, 0, pageWidth, 140)
      .fill(COLORS.primary);

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(COLORS.white)
      .text(group.category, contentLeft, 55, {
        width: contentWidth,
      });

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#bfdbfe")
      .text(
        `${group.programs.length} formation${group.programs.length > 1 ? "s" : ""}`,
        contentLeft,
        85,
        { width: contentWidth },
      );

    for (const program of group.programs) {
      doc.addPage();
      // Record page number for this program (1-indexed, cover=1)
      const currentPage =
        doc.bufferedPageRange().start + doc.bufferedPageRange().count;
      tocEntries[entryIdx].pageNum = currentPage;
      entryIdx++;

      let y = 50;

      // Title bar
      doc.rect(0, 0, pageWidth, 8).fill(COLORS.primary);

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(COLORS.text)
        .text(program.title, contentLeft, y, { width: contentWidth });
      y = doc.y + 8;

      // Category badges
      if (program.categories && program.categories.length > 0) {
        let badgeX = contentLeft;
        for (const cat of program.categories) {
          const tw = doc.font("Helvetica").fontSize(8).widthOfString(cat) + 12;
          doc
            .roundedRect(badgeX, y, tw, 18, 3)
            .fill(COLORS.bg);
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(COLORS.primary)
            .text(cat, badgeX + 6, y + 4, { lineBreak: false });
          badgeX += tw + 6;
          if (badgeX > contentLeft + contentWidth - 60) {
            badgeX = contentLeft;
            y += 22;
          }
        }
        y += 26;
      }

      // Summary table
      const tableData: [string, string][] = [
        ["Durée", `${program.duration} heures`],
        ["Prix", `${program.price.toLocaleString("fr-FR")} EUR`],
        ["Niveau", LEVEL_LABELS[program.level] || program.level],
        ["Modalité", MODALITY_LABELS[program.modality] || program.modality],
        ["Certifiante", program.certifying ? "Oui" : "Non"],
      ];
      if (program.recyclingMonths) {
        tableData.push(["Recyclage", `${program.recyclingMonths} mois`]);
      }

      const colWidth = contentWidth / 2;
      const rowHeight = 24;

      for (let i = 0; i < tableData.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = contentLeft + col * colWidth;
        const cy = y + row * rowHeight;

        if (col === 0) {
          doc
            .rect(contentLeft, cy, contentWidth, rowHeight)
            .fill(i % 4 < 2 ? COLORS.bg : COLORS.white);
        }

        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(COLORS.textLight)
          .text(tableData[i][0], cx + 6, cy + 7, {
            width: 80,
            lineBreak: false,
          });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(tableData[i][1], cx + 90, cy + 7, {
            width: colWidth - 96,
            lineBreak: false,
          });
      }

      y += Math.ceil(tableData.length / 2) * rowHeight + 16;

      // Content sections
      const sections: { title: string; content: string | null | undefined }[] =
        [
          { title: "Description", content: program.description },
          { title: "Objectifs pédagogiques", content: program.objectives },
          { title: "Public visé", content: program.targetAudience },
          { title: "Prérequis", content: program.prerequisites },
          { title: "Programme détaillé", content: program.programContent },
          {
            title: "Méthodes pédagogiques",
            content: program.teachingMethods,
          },
          { title: "Moyens techniques", content: program.technicalMeans },
          {
            title: "Modalités d'évaluation",
            content: program.evaluationMethods,
          },
          {
            title: "Indicateurs de résultats",
            content: program.resultIndicators,
          },
          { title: "Accessibilité", content: program.accessibilityInfo },
          { title: "Délais d'accès", content: program.accessDelay },
          { title: "Contact référent", content: program.referentContact },
          { title: "Référent handicap", content: program.referentHandicap },
        ];

      for (const section of sections) {
        if (!section.content) continue;

        // Check if we need a new page
        if (y > doc.page.height - 120) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 8).fill(COLORS.primary);
          y = 50;
          // Sub-header
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(COLORS.textLight)
            .text(`${program.title} (suite)`, contentLeft, 20, {
              width: contentWidth,
              align: "right",
            });
        }

        // Section title
        doc
          .moveTo(contentLeft, y)
          .lineTo(contentLeft + 30, y)
          .lineWidth(2)
          .strokeColor(COLORS.primary)
          .stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(COLORS.text)
          .text(section.title, contentLeft, y + 6, { width: contentWidth });
        y = doc.y + 6;

        // Section content
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(COLORS.text)
          .text(section.content, contentLeft + 4, y, {
            width: contentWidth - 8,
            lineGap: 3,
          });
        y = doc.y + 14;
      }
    }
  }

  // ================================================================
  // ADD FOOTERS TO ALL PAGES
  // ================================================================
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const pageNum = i + 1;

    // Skip footer on cover page
    if (i === 0) continue;

    const footerY = doc.page.height - 45;

    doc
      .moveTo(contentLeft, footerY - 8)
      .lineTo(contentLeft + contentWidth, footerY - 8)
      .lineWidth(0.5)
      .strokeColor(COLORS.border)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text(orgName, contentLeft, footerY, {
        width: contentWidth / 2,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text(`Page ${pageNum} / ${totalPages}`, contentLeft + contentWidth / 2, footerY, {
        width: contentWidth / 2,
        align: "right",
      });

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text(
        `Catalogue généré le ${dateStr}`,
        contentLeft,
        footerY + 12,
        { width: contentWidth, align: "center" },
      );
  }

  // ================================================================
  // UPDATE TOC PAGE NUMBERS
  // ================================================================
  // Go back to TOC page(s) and add page numbers
  doc.switchToPage(tocPageIndex);
  let tocUpdateY = 110;
  let tocGroupIdx = 0;

  let tocEntryGlobalIdx = 0;
  for (const group of grouped) {
    // Skip category header line
    tocUpdateY += 22;

    for (let pIdx = 0; pIdx < group.programs.length; pIdx++) {
      const entry = tocEntries[tocEntryGlobalIdx];
      if (entry) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.textLight)
          .text(String(entry.pageNum), contentLeft + contentWidth - 40, tocUpdateY, {
            width: 40,
            align: "right",
          });
      }
      tocUpdateY += 18;
      tocEntryGlobalIdx++;

      if (tocUpdateY > doc.page.height - 100) {
        // Move to next page for TOC overflow
        tocGroupIdx++;
        doc.switchToPage(tocPageIndex + tocGroupIdx);
        tocUpdateY = 60;
      }
    }
    tocUpdateY += 8;
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
