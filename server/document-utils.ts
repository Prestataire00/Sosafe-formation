import { storage } from "./storage";

// ---------------------------------------------------------------------------
// Branding wrapper — enveloppe le contenu HTML brut d'un document généré
// avec l'habillage professionnel du modèle (logo, couleur, en-tête/pied).
// ---------------------------------------------------------------------------

export interface BrandingOptions {
  brandColor?: string | null;
  fontFamily?: string | null;
  logoUrl?: string | null;
  headerHtml?: string | null;
  footerHtml?: string | null;
  orgName?: string;
  orgAddress?: string;
  orgPhone?: string;
  orgEmail?: string;
  orgSiret?: string;
}

export function wrapWithBranding(content: string, opts: BrandingOptions): string {
  const color    = opts.brandColor  || "#1a56db";
  const font     = opts.fontFamily  || "Arial";
  const orgName  = opts.orgName     || "SO'SAFE";
  const orgAddr  = opts.orgAddress  || "";
  const orgPhone = opts.orgPhone    || "";
  const orgEmail = opts.orgEmail    || "";
  const orgSiret = opts.orgSiret    || "";

  const logoBlock = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${orgName}" style="max-height:70px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:22px;font-weight:700;color:${color};">${orgName}</span>`;

  const orgInfoLines = [orgAddr, orgPhone && `Tél. ${orgPhone}`, orgEmail, orgSiret && `SIRET : ${orgSiret}`]
    .filter(Boolean)
    .join("<br/>");

  const header = opts.headerHtml || `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid ${color};margin-bottom:32px;">
      <div>${logoBlock}</div>
      <div style="text-align:right;font-size:11px;color:#555;line-height:1.6;">${orgInfoLines}</div>
    </div>`;

  const footer = opts.footerHtml || `
    <div style="margin-top:48px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#888;text-align:center;line-height:1.8;">
      ${orgName} — Organisme de formation professionnelle continue
      ${orgSiret ? `&nbsp;|&nbsp; SIRET ${orgSiret}` : ""}
      ${orgEmail ? `&nbsp;|&nbsp; ${orgEmail}` : ""}
    </div>`;

  return `<div style="font-family:${font},sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;font-size:13px;line-height:1.7;">
  ${header}
  <div class="doc-body" style="min-height:400px;">${content}</div>
  ${footer}
</div>`;
}

/**
 * Récupère les infos organisme depuis les settings et appelle wrapWithBranding.
 * Accepte optionnellement des données branding du modèle de document.
 */
export async function applyBranding(
  content: string,
  templateBranding?: {
    brandColor?: string | null;
    fontFamily?: string | null;
    logoUrl?: string | null;
    headerHtml?: string | null;
    footerHtml?: string | null;
  } | null,
): Promise<string> {
  const settings = await storage.getOrganizationSettings();
  const m = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return wrapWithBranding(content, {
    brandColor:  templateBranding?.brandColor,
    fontFamily:  templateBranding?.fontFamily,
    logoUrl:     templateBranding?.logoUrl,
    headerHtml:  templateBranding?.headerHtml,
    footerHtml:  templateBranding?.footerHtml,
    orgName:     m["org_name"]    || "SO'SAFE",
    orgAddress:  m["org_address"] || "",
    orgPhone:    m["org_phone"]   || "",
    orgEmail:    m["org_email"]   || "",
    orgSiret:    m["org_siret"]   || "",
  });
}
