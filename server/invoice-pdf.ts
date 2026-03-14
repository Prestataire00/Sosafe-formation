import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { Invoice, Enterprise, OrganizationSetting } from "@shared/schema";

function settingsMap(settings: OrganizationSetting[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const s of settings) m[s.key] = s.value;
  return m;
}

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}

function formatDate(d: string | Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
}

function formatDateISO(d: string | Date | null): string {
  if (!d) return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate Factur-X EN16931 compliant XML (MINIMUM profile).
 */
function generateFacturXML(
  invoice: Invoice,
  enterprise: Enterprise | null,
  org: Record<string, string>,
): string {
  const issueDate = formatDateISO(invoice.createdAt);
  const dueDate = invoice.dueDate ? formatDateISO(invoice.dueDate) : issueDate;
  const taxRatePercent = (invoice.taxRate / 100).toFixed(2);

  const lines = (invoice.lineItems || []).map((item: any, idx: number) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description || "Prestation")}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${centsToEur(item.unitPrice)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${taxRatePercent}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${centsToEur(item.total)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(org.org_name || "SO'SAFE Formation")}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(org.org_address || "")}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${org.org_siret ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${escapeXml(org.org_siret)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
        ${org.org_tva ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(org.org_tva)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(enterprise?.name || "Client")}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(enterprise?.address || "")}</ram:LineOne>
          <ram:PostcodeCode>${escapeXml(enterprise?.postalCode || "")}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(enterprise?.city || "")}</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${enterprise?.siret ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${escapeXml(enterprise.siret)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
        ${enterprise?.tvaNumber ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(enterprise.tvaNumber)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${centsToEur(invoice.taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${centsToEur(invoice.subtotal)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRatePercent}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${invoice.dueDate ? `<ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>` : ""}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${centsToEur(invoice.subtotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${centsToEur(invoice.subtotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${centsToEur(invoice.taxAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${centsToEur(invoice.total)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${centsToEur(invoice.total - invoice.paidAmount)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${lines}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

/**
 * Try to load a logo from the filesystem.
 */
function loadLogo(logoUrl: string | undefined): Buffer | null {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/")) {
      const publicPath = path.resolve(process.cwd(), "client/public", logoUrl.replace(/^\//, ""));
      if (fs.existsSync(publicPath)) return fs.readFileSync(publicPath);
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Generate a professional invoice PDF with embedded Factur-X XML.
 */
export function generateInvoicePDF(
  invoice: Invoice,
  enterprise: Enterprise | null,
  settings: OrganizationSetting[],
): { pdfBuffer: Promise<Buffer>; xml: string } {
  const org = settingsMap(settings);
  const xml = generateFacturXML(invoice, enterprise, org);

  const doc = new PDFDocument({ size: "A4", margin: 50, info: {
    Title: `Facture ${invoice.number}`,
    Author: org.org_name || "SO'SAFE Formation",
    Subject: `Facture ${invoice.number}`,
  }});

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const pdfBuffer = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const primaryColor = org.brand_color || "#1e40af";
  const lineItems = invoice.lineItems || [];

  // --- Header ---
  const logo = loadLogo(org.org_logo_url);
  if (logo) {
    try {
      doc.image(logo, 50, 40, { height: 50 });
    } catch { /* skip logo */ }
  }

  // Org info (top right)
  doc.fontSize(9).fillColor("#6b7280");
  const orgLines = [
    org.org_name || "SO'SAFE Formation",
    org.org_address || "",
    [org.org_phone, org.org_email].filter(Boolean).join(" — "),
    org.org_siret ? `SIRET: ${org.org_siret}` : "",
    org.org_nda ? `NDA: ${org.org_nda}` : "",
    org.org_tva ? `TVA: ${org.org_tva}` : "",
  ].filter(Boolean);
  let yOrg = 40;
  for (const line of orgLines) {
    doc.text(line, 350, yOrg, { width: 200, align: "right" });
    yOrg += 12;
  }

  // --- Title ---
  doc.moveDown(2);
  const titleY = Math.max(doc.y, yOrg + 10);
  doc.fontSize(18).fillColor(primaryColor).text(`FACTURE`, 50, titleY);
  doc.fontSize(12).fillColor("#111827").text(invoice.number, 50, titleY + 24);
  doc.fontSize(9).fillColor("#6b7280").text(`Date : ${formatDate(invoice.createdAt)}`, 50, titleY + 42);
  if (invoice.dueDate) {
    doc.text(`Échéance : ${formatDate(invoice.dueDate)}`, 50, titleY + 54);
  }

  // --- Client ---
  const clientY = titleY;
  doc.fontSize(9).fillColor("#6b7280").text("Facturer à :", 350, clientY, { width: 200, align: "right" });
  doc.fontSize(10).fillColor("#111827").text(enterprise?.name || "Client", 350, clientY + 14, { width: 200, align: "right" });
  doc.fontSize(9).fillColor("#6b7280");
  let cY = clientY + 28;
  if (enterprise?.address) { doc.text(enterprise.address, 350, cY, { width: 200, align: "right" }); cY += 12; }
  if (enterprise?.postalCode || enterprise?.city) {
    doc.text([enterprise?.postalCode, enterprise?.city].filter(Boolean).join(" "), 350, cY, { width: 200, align: "right" });
    cY += 12;
  }
  if (enterprise?.siret) { doc.text(`SIRET: ${enterprise.siret}`, 350, cY, { width: 200, align: "right" }); cY += 12; }
  if (enterprise?.tvaNumber) { doc.text(`TVA: ${enterprise.tvaNumber}`, 350, cY, { width: 200, align: "right" }); }

  // --- Line items table ---
  const tableTop = Math.max(doc.y, cY) + 30;
  const colX = { desc: 50, qty: 320, unit: 370, total: 460 };
  const tableWidth = 495;

  // Header row
  doc.rect(50, tableTop, tableWidth, 22).fill(primaryColor);
  doc.fontSize(8).fillColor("#ffffff");
  doc.text("Description", colX.desc + 6, tableTop + 6, { width: 260 });
  doc.text("Qté", colX.qty, tableTop + 6, { width: 40, align: "center" });
  doc.text("P.U. HT", colX.unit, tableTop + 6, { width: 80, align: "center" });
  doc.text("Total HT", colX.total, tableTop + 6, { width: 80, align: "right" });

  let rowY = tableTop + 22;
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i] as any;
    if (i % 2 === 0) {
      doc.rect(50, rowY, tableWidth, 20).fill("#f9fafb");
    }
    doc.fontSize(8).fillColor("#111827");
    doc.text(item.description || "Prestation", colX.desc + 6, rowY + 5, { width: 260 });
    doc.text(String(item.quantity || 1), colX.qty, rowY + 5, { width: 40, align: "center" });
    doc.text(formatEur(item.unitPrice || 0), colX.unit, rowY + 5, { width: 80, align: "center" });
    doc.text(formatEur(item.total || 0), colX.total, rowY + 5, { width: 80, align: "right" });
    rowY += 20;
  }

  // Bottom line
  doc.moveTo(50, rowY).lineTo(50 + tableWidth, rowY).strokeColor("#e5e7eb").stroke();

  // --- Totals ---
  const totalsX = 370;
  const totalsLabelX = 350;
  rowY += 15;

  const drawTotalRow = (label: string, amount: string, bold = false) => {
    doc.fontSize(bold ? 10 : 9).fillColor(bold ? "#111827" : "#6b7280");
    doc.text(label, totalsLabelX, rowY, { width: 100, align: "right" });
    doc.fontSize(bold ? 10 : 9).fillColor("#111827");
    doc.text(amount, totalsX + 10, rowY, { width: 80, align: "right" });
    rowY += bold ? 18 : 15;
  };

  drawTotalRow("Sous-total HT", formatEur(invoice.subtotal));
  if (invoice.globalDiscountPercent || invoice.globalDiscountAmount) {
    const discountLabel = invoice.globalDiscountPercent
      ? `Remise (${(invoice.globalDiscountPercent / 100).toFixed(0)}%)`
      : "Remise";
    drawTotalRow(discountLabel, `- ${formatEur(invoice.globalDiscountAmount || 0)}`);
  }
  drawTotalRow(`TVA (${(invoice.taxRate / 100).toFixed(2)}%)`, formatEur(invoice.taxAmount));
  doc.moveTo(totalsLabelX, rowY - 3).lineTo(totalsX + 90, rowY - 3).strokeColor(primaryColor).lineWidth(1.5).stroke();
  drawTotalRow("Total TTC", formatEur(invoice.total), true);

  if (invoice.paidAmount > 0 && invoice.paidAmount < invoice.total) {
    drawTotalRow("Déjà réglé", formatEur(invoice.paidAmount));
    drawTotalRow("Reste à payer", formatEur(invoice.total - invoice.paidAmount), true);
  }

  // --- Notes ---
  if (invoice.notes) {
    rowY += 15;
    doc.fontSize(8).fillColor("#6b7280").text("Notes :", 50, rowY);
    doc.fontSize(8).fillColor("#374151").text(invoice.notes, 50, rowY + 12, { width: 400 });
  }

  // --- Factur-X badge ---
  const badgeY = doc.page.height - 60;
  doc.fontSize(7).fillColor("#9ca3af").text(
    "Facture électronique conforme Factur-X EN16931 — Ordonnance n° 2021-1190",
    50, badgeY, { width: 400, align: "center" }
  );
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    50, badgeY + 10, { width: 400, align: "center" }
  );

  doc.end();

  return { pdfBuffer, xml };
}
