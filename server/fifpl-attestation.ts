import { PDFDocument, StandardFonts, rgb, degrees, PDFPage, PDFFont } from "pdf-lib";

// SO'SAFE fixed information
const ORG = {
  responsable: "Sophie TOTAIN",
  fonction: "Dirigeante de SO SAFE",
  organisme: "SO SAFE",
  numDeclaration: "93830670783", // 11 digits
};

// Colors matching the official FIFPL form
const COLORS = {
  blue: rgb(0.0, 0.318, 0.624),    // #00519f - FIFPL blue
  orange: rgb(0.949, 0.647, 0.118), // #f2a51e - FIFPL orange
  black: rgb(0, 0, 0),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.85, 0.85, 0.85),
  white: rgb(1, 1, 1),
  fieldBg: rgb(0.96, 0.96, 0.96),
};

interface FIFPLData {
  // Variable fields (filled when generating for a specific trainee)
  traineeFirstName?: string;
  traineeLastName?: string;
  formationTitle?: string;
  startDate?: string; // DD/MM/YYYY
  endDate?: string;   // DD/MM/YYYY
  nbJoursEntiers?: number;
  nbDemiJournees?: number;
  nbHeuresTotal?: number;
  montantHT?: number;
  montantTTC?: number;
  faitA?: string;
  dateFait?: string; // DD/MM/YYYY
  // E-learning fields
  nbHeuresElearning?: number;
  nbEtapesValidees?: number;
  dateEvaluationFinale?: string;
}

function drawBox(page: PDFPage, x: number, y: number, w: number, h: number, opts?: { fill?: any; border?: any; borderWidth?: number }) {
  if (opts?.fill) {
    page.drawRectangle({ x, y, width: w, height: h, color: opts.fill });
  }
  if (opts?.border) {
    page.drawRectangle({ x, y, width: w, height: h, borderColor: opts.border, borderWidth: opts?.borderWidth || 0.5 });
  }
}

function drawFieldBox(page: PDFPage, x: number, y: number, w: number, h: number, value: string, font: PDFFont, fontSize: number = 10) {
  drawBox(page, x, y, w, h, { border: COLORS.black, borderWidth: 0.5 });
  if (value) {
    page.drawText(value, { x: x + 4, y: y + (h - fontSize) / 2, font, size: fontSize, color: COLORS.black });
  }
}

function drawDigitBoxes(page: PDFPage, x: number, y: number, boxSize: number, digits: string, font: PDFFont) {
  for (let i = 0; i < digits.length; i++) {
    const bx = x + i * (boxSize + 2);
    drawBox(page, bx, y, boxSize, boxSize, { border: COLORS.black, borderWidth: 0.5 });
    page.drawText(digits[i], { x: bx + (boxSize - 7) / 2, y: y + (boxSize - 10) / 2, font, size: 10, color: COLORS.black });
  }
}

export async function generateFIFPLAttestation(data: FIFPLData = {}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const page = pdfDoc.addPage([pageW, pageH]);
  const margin = 40;
  const contentW = pageW - 2 * margin;
  let y = pageH - margin;

  // ===== HEADER: FIFPL logo area =====
  // Blue bar at top
  drawBox(page, 0, pageH - 8, pageW, 8, { fill: COLORS.blue });

  // "fifpl" text (simulated logo)
  y = pageH - 55;
  page.drawText("fi", { x: margin, y, font: fontBold, size: 36, color: COLORS.blue });
  page.drawText("f", { x: margin + 36, y, font: fontBold, size: 36, color: COLORS.orange });
  page.drawText("pl", { x: margin + 54, y, font: fontBold, size: 36, color: COLORS.blue });

  // Subtitle under logo
  y -= 14;
  page.drawText("FONDS INTERPROFESSIONNEL DE FORMATION", { x: margin, y, font: fontBold, size: 6.5, color: COLORS.blue });
  y -= 9;
  page.drawText("DES PROFESSIONNELS LIBÉRAUX", { x: margin, y, font: fontBold, size: 6.5, color: COLORS.blue });

  // Right side: website info
  page.drawText("Ce document est disponible sur le site ", { x: 340, y: pageH - 45, font, size: 9, color: COLORS.gray });
  page.drawText("www.fifpl.fr", { x: 340 + font.widthOfTextAtSize("Ce document est disponible sur le site ", 9), y: pageH - 45, font: fontBold, size: 9, color: COLORS.blue });

  // ===== TITLE =====
  y -= 25;
  const titleY = y;
  // Orange background for title area
  drawBox(page, margin, y - 30, contentW, 45, { fill: COLORS.orange });
  page.drawText("ATTESTATION DE PRÉSENCE ET DE RÈGLEMENT", { x: margin + 10, y: y - 2, font: fontBold, size: 16, color: COLORS.white });
  y -= 18;
  page.drawText("(Document à compléter par l'organisme de formation)", { x: margin + 10, y: y - 2, font: fontItalic, size: 10, color: COLORS.white });

  // ===== BODY =====
  y = titleY - 50;

  // "Je soussigné" line
  page.drawText("Je soussigné:", { x: margin, y, font, size: 9, color: COLORS.black });
  // Fixed: Sophie TOTAIN
  page.drawText(ORG.responsable, { x: margin + 70, y, font: fontBold, size: 11, color: COLORS.black });

  page.drawText("Fonction:", { x: 310, y, font, size: 9, color: COLORS.black });
  page.drawText(ORG.fonction, { x: 360, y, font: fontBold, size: 10, color: COLORS.black });

  y -= 12;
  page.drawText("(Nom du responsable de l'organisme de formation)", { x: margin + 70, y, font: fontItalic, size: 7, color: COLORS.orange });
  page.drawText("(fonction exacte)", { x: 430, y, font: fontItalic, size: 7, color: COLORS.orange });

  y -= 18;
  page.drawText("de l'organisme de formation", { x: margin, y, font, size: 9, color: COLORS.black });
  page.drawText(ORG.organisme, { x: margin + 140, y, font: fontBold, size: 11, color: COLORS.black });

  y -= 12;
  page.drawText("(Dénomination de l'organisme de formation)", { x: 350, y, font: fontItalic, size: 7, color: COLORS.orange });

  y -= 18;
  page.drawText("déclaré en tant qu'organisme formateur sous le n°", { x: margin, y, font, size: 9, color: COLORS.black });
  // Digit boxes for declaration number
  const digitStartX = margin + 260;
  drawDigitBoxes(page, digitStartX, y - 4, 18, ORG.numDeclaration, fontBold);
  page.drawText("(11 chiffres)", { x: digitStartX + 11 * 20 + 10, y, font: fontItalic, size: 7, color: COLORS.orange });

  // ===== TRAINEE =====
  y -= 30;
  page.drawText("certifie par la présente que le stagiaire", { x: margin, y, font, size: 9, color: COLORS.black });

  y -= 18;
  page.drawText("Nom et prénom du stagiaire :", { x: margin, y, font, size: 9, color: COLORS.black });
  const traineeName = data.traineeFirstName && data.traineeLastName
    ? `${data.traineeLastName} ${data.traineeFirstName}`
    : "";
  drawFieldBox(page, margin + 160, y - 4, 350, 18, traineeName, font, 10);

  // ===== FORMATION =====
  y -= 28;
  page.drawText("a bien assisté à la totalité de la formation intitulée :", { x: margin, y, font, size: 9, color: COLORS.black });
  page.drawText("(Indiquer l'intitulé exact de la formation)", { x: 370, y, font: fontItalic, size: 7, color: COLORS.orange });

  y -= 18;
  drawFieldBox(page, margin, y - 4, contentW, 22, data.formationTitle || "", font, 10);

  // ===== DATES =====
  y -= 38;
  page.drawText("Date de la formation :", { x: margin, y, font, size: 9, color: COLORS.black });

  // Parse dates for display in boxes
  const startParts = (data.startDate || "").split("/");
  const endParts = (data.endDate || "").split("/");

  page.drawText("du", { x: margin + 140, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 155, y - 4, 30, 18, startParts[0] || "", font, 10);
  page.drawText(".", { x: margin + 187, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 193, y - 4, 30, 18, startParts[1] || "", font, 10);
  page.drawText(".", { x: margin + 225, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 231, y - 4, 45, 18, startParts[2] || "", font, 10);

  page.drawText("au", { x: margin + 295, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 310, y - 4, 30, 18, endParts[0] || "", font, 10);
  page.drawText(".", { x: margin + 342, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 348, y - 4, 30, 18, endParts[1] || "", font, 10);
  page.drawText(".", { x: margin + 380, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 386, y - 4, 45, 18, endParts[2] || "", font, 10);

  y -= 12;
  page.drawText("(indiquer la date de début et de fin de formation)", { x: 330, y, font: fontItalic, size: 7, color: COLORS.orange });

  // ===== PARTIE 1 - PRÉSENTIEL =====
  y -= 30;
  const partie1Y = y;
  const partie1H = 80;

  // Blue sidebar label
  drawBox(page, margin, y - partie1H + 18, 22, partie1H, { fill: COLORS.blue });
  // Sidebar label text (vertical)
  page.drawText("Partie 1 - Présentiel", { x: margin + 3, y: y - partie1H + 25, font: fontBold, size: 5.5, color: COLORS.white, rotate: degrees(90) });

  // Content
  const p1x = margin + 28;
  page.drawText("Nombre de jours entiers:", { x: p1x, y, font, size: 9, color: COLORS.black });
  page.drawText("+ Nombre de demi-journées:", { x: p1x + 180, y, font, size: 9, color: COLORS.black });
  page.drawText("Nombre total d'heures de formation:", { x: p1x + 360, y: y + 4, font: fontBold, size: 8, color: COLORS.black });

  y -= 16;
  drawFieldBox(page, p1x, y - 4, 80, 18, data.nbJoursEntiers?.toString() || "", font, 10);
  drawFieldBox(page, p1x + 180, y - 4, 80, 18, data.nbDemiJournees?.toString() || "", font, 10);
  drawFieldBox(page, p1x + 360, y - 4, 80, 18, data.nbHeuresTotal ? `${data.nbHeuresTotal}H` : "", fontBold, 10);

  y -= 14;
  page.drawText("(6 heures minimum)", { x: p1x + 10, y, font: fontItalic, size: 7, color: COLORS.gray });
  page.drawText("(3 heures minimum)", { x: p1x + 190, y, font: fontItalic, size: 7, color: COLORS.gray });

  y -= 18;
  page.drawText("Si formation se déroulant sur 2 années civiles, indiquez impérativement la durée distincte de chacune des années", { x: p1x, y, font, size: 7, color: COLORS.black });

  y -= 14;
  page.drawText("Année :", { x: p1x, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 45, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre de jours :", { x: p1x + 110, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 185, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre d'heures :", { x: p1x + 250, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 330, y - 3, 50, 14, "", font, 8);

  y -= 16;
  page.drawText("Année :", { x: p1x, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 45, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre de jours :", { x: p1x + 110, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 185, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre d'heures :", { x: p1x + 250, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 330, y - 3, 50, 14, "", font, 8);

  // ===== PARTIE 2 - E-LEARNING =====
  y -= 30;
  const partie2Y = y;
  const partie2H = 70;

  // Orange sidebar label
  drawBox(page, margin, y - partie2H + 18, 22, partie2H, { fill: COLORS.orange });

  page.drawText("Nombre total d'heures de formation:", { x: p1x, y, font, size: 9, color: COLORS.black });
  page.drawText("Nombre d'étapes validées:", { x: p1x + 200, y, font, size: 9, color: COLORS.black });
  page.drawText("Date d'évaluation finale:", { x: p1x + 370, y, font, size: 9, color: COLORS.black });

  y -= 16;
  drawFieldBox(page, p1x, y - 4, 100, 18, data.nbHeuresElearning?.toString() || "", font, 10);
  drawFieldBox(page, p1x + 200, y - 4, 100, 18, data.nbEtapesValidees?.toString() || "", font, 10);
  drawFieldBox(page, p1x + 370, y - 4, 100, 18, data.dateEvaluationFinale || "", font, 10);

  y -= 18;
  page.drawText("Si formation se déroulant sur 2 années civiles, indiquez impérativement la durée distincte de chacune des années", { x: p1x, y, font, size: 7, color: COLORS.black });

  y -= 14;
  page.drawText("Année :", { x: p1x, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 45, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre de jours :", { x: p1x + 110, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 185, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre d'heures :", { x: p1x + 250, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 330, y - 3, 50, 14, "", font, 8);

  y -= 16;
  page.drawText("Année :", { x: p1x, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 45, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre de jours :", { x: p1x + 110, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 185, y - 3, 50, 14, "", font, 8);
  page.drawText("Nbre d'heures :", { x: p1x + 250, y, font, size: 8, color: COLORS.black });
  drawFieldBox(page, p1x + 330, y - 3, 50, 14, "", font, 8);

  // ===== PAYMENT ATTESTATION =====
  y -= 30;
  page.drawText("J'atteste également que le stagiaire stipulé ci-dessus a bien réglé la totalité de sa participation à la formation précitée,", { x: margin, y, font, size: 9, color: COLORS.black });
  y -= 14;
  page.drawText("soit un montant total de", { x: margin, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 125, y - 4, 80, 18, data.montantHT ? data.montantHT.toFixed(2) : "", font, 10);
  page.drawText("€ HT et", { x: margin + 210, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 250, y - 4, 80, 18, data.montantTTC ? data.montantTTC.toFixed(2) : "", font, 10);
  page.drawText("€ TTC", { x: margin + 335, y, font, size: 9, color: COLORS.black });
  y -= 14;
  page.drawText("correspondant uniquement au coût pédagogique de la formation.", { x: margin, y, font: fontBold, size: 9, color: COLORS.black });

  // ===== HEALTH PROFESSION NOTE =====
  y -= 22;
  page.drawText("Pour les professions de santé : l'organisme de formation atteste que la durée en jours de la formation stipulée sur ce présent document", { x: margin, y, font: fontItalic, size: 7.5, color: COLORS.orange });
  y -= 10;
  page.drawText("(et pour laquelle une demande de prise en charge est constituée auprès du FIF PL) correspond à une durée en jours non facturée à l'ANDPC.", { x: margin, y, font: fontItalic, size: 7.5, color: COLORS.orange });

  // ===== SIGNATURE AREA =====
  y -= 25;
  page.drawText("Fait à:", { x: margin, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 40, y - 4, 150, 18, data.faitA || "", font, 10);

  y -= 22;
  page.drawText("le :", { x: margin, y, font, size: 9, color: COLORS.black });
  drawFieldBox(page, margin + 40, y - 4, 150, 18, data.dateFait || "", font, 10);

  // Cachet box
  const cachetX = 220;
  const cachetY = y - 50;
  drawBox(page, cachetX, cachetY, 160, 70, { border: COLORS.black, borderWidth: 0.5 });
  page.drawText("Cachet obligatoire de l'organisme de formation", { x: cachetX + 5, y: cachetY + 72, font: fontBold, size: 7, color: COLORS.black });

  // Signature area
  const sigX = 400;
  page.drawText("Nom, prénom et signature du responsable de", { x: sigX, y: cachetY + 65, font, size: 7, color: COLORS.black });
  page.drawText("l'organisme de formation ou de toute autre", { x: sigX, y: cachetY + 55, font, size: 7, color: COLORS.black });
  page.drawText("personne rattachée à l'organisme de formation", { x: sigX, y: cachetY + 45, font, size: 7, color: COLORS.black });
  page.drawText("ayant pouvoir ou délégation de signature", { x: sigX, y: cachetY + 35, font, size: 7, color: COLORS.black });

  // Fixed signature
  page.drawText("Sophie TOTAIN", { x: sigX + 20, y: cachetY + 15, font: fontBold, size: 10, color: COLORS.black });
  page.drawText("Dirigeante de SO SAFE", { x: sigX + 10, y: cachetY + 3, font, size: 9, color: COLORS.black });

  // ===== DISCLAIMER (left side) =====
  page.drawText("Cette attestation de présence n'exclut pas l'obligation", { x: margin, y: cachetY + 20, font: fontItalic, size: 7, color: COLORS.black });
  page.drawText("pour l'organisme de formation de tenir à la disposition", { x: margin, y: cachetY + 10, font: fontItalic, size: 7, color: COLORS.black });
  page.drawText("du FIF PL les feuilles d'émargement, ainsi que les fiches", { x: margin, y: cachetY, font: fontItalic, size: 7, color: COLORS.black });
  page.drawText("d'évaluation de chaque stagiaire.", { x: margin, y: cachetY - 10, font: fontItalic, size: 7, color: COLORS.black });

  // ===== FOOTER =====
  const footerY = 35;
  page.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: pageW - margin, y: footerY + 10 }, thickness: 1, color: COLORS.blue });
  page.drawText("104 rue de Miromesnil 75384 Paris Cedex 08 - Tél. 01 55 80 50 00 - Fax 01 55 80 50 29", { x: margin + 60, y: footerY, font, size: 8, color: COLORS.gray });
  page.drawText("Agréé par arrêté ministériel du 17 mars 1993 publié au J.O. le 25 mars 1993 – Siret : 398 110 965 00041", { x: margin + 40, y: footerY - 12, font, size: 7, color: COLORS.gray });

  return pdfDoc.save();
}
