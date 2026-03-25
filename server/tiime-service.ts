/**
 * TIIME Accounting Integration Service
 *
 * Handles synchronization between SO'SAFE and TIIME accounting software.
 * API access requires partnership credentials from TIIME (partnership@tiime.fr).
 *
 * Entities synced:
 * - Clients (entreprises/trainees → TIIME contacts)
 * - Invoices (factures → TIIME invoices)
 * - Quotes (devis → TIIME quotes)
 */

interface TiimeConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  companyId?: string;
  baseUrl: string;
}

interface TiimeClient {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  siret?: string;
  vatNumber?: string;
}

interface TiimeInvoice {
  id?: string;
  clientId: string;
  number?: string;
  date: string;
  dueDate: string;
  items: TiimeInvoiceItem[];
  status?: string;
  totalHT: number;
  totalTTC: number;
}

interface TiimeInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface TiimeQuote {
  id?: string;
  clientId: string;
  number?: string;
  date: string;
  validUntil: string;
  items: TiimeInvoiceItem[];
  status?: string;
  totalHT: number;
  totalTTC: number;
}

let cachedConfig: TiimeConfig | null = null;

export function resetTiimeConfig() {
  cachedConfig = null;
}

export async function getTiimeConfig(storage: any): Promise<TiimeConfig | null> {
  if (cachedConfig) return cachedConfig;

  const settings = await storage.getOrganizationSettings();
  const getValue = (key: string) => settings.find((s: any) => s.key === key)?.value || "";

  const clientId = getValue("tiime_client_id");
  const clientSecret = getValue("tiime_client_secret");

  if (!clientId || !clientSecret) return null;

  cachedConfig = {
    clientId,
    clientSecret,
    accessToken: getValue("tiime_access_token") || undefined,
    refreshToken: getValue("tiime_refresh_token") || undefined,
    companyId: getValue("tiime_company_id") || undefined,
    baseUrl: getValue("tiime_base_url") || "https://api.tiime.fr",
  };

  return cachedConfig;
}

async function tiimeFetch(config: TiimeConfig, path: string, options: any = {}) {
  if (!config.accessToken) {
    throw new Error("TIIME: Token d'accès non configuré. Veuillez d'abord connecter votre compte TIIME.");
  }

  const url = `${config.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    // Token expired — try refresh
    if (config.refreshToken) {
      const refreshed = await refreshAccessToken(config);
      if (refreshed) {
        // Retry with new token
        return tiimeFetch({ ...config, accessToken: refreshed.accessToken }, path, options);
      }
    }
    throw new Error("TIIME: Session expirée. Veuillez reconnecter votre compte.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TIIME API error ${response.status}: ${body}`);
  }

  return response.json();
}

async function refreshAccessToken(config: TiimeConfig): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch(`${config.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || config.refreshToken!,
    };
  } catch {
    return null;
  }
}

// ==================== CLIENT OPERATIONS ====================

export async function getClients(config: TiimeConfig): Promise<TiimeClient[]> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/clients`);
}

export async function createClient(config: TiimeConfig, client: TiimeClient): Promise<TiimeClient> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/clients`, {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export async function updateClient(config: TiimeConfig, id: string, client: Partial<TiimeClient>): Promise<TiimeClient> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(client),
  });
}

// ==================== INVOICE OPERATIONS ====================

export async function getInvoices(config: TiimeConfig): Promise<TiimeInvoice[]> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/invoices`);
}

export async function createInvoice(config: TiimeConfig, invoice: TiimeInvoice): Promise<TiimeInvoice> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/invoices`, {
    method: "POST",
    body: JSON.stringify(invoice),
  });
}

// ==================== QUOTE OPERATIONS ====================

export async function getQuotes(config: TiimeConfig): Promise<TiimeQuote[]> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/quotes`);
}

export async function createQuote(config: TiimeConfig, quote: TiimeQuote): Promise<TiimeQuote> {
  const companyPath = config.companyId ? `/companies/${config.companyId}` : "";
  return tiimeFetch(config, `${companyPath}/quotes`, {
    method: "POST",
    body: JSON.stringify(quote),
  });
}

// ==================== SYNC HELPERS ====================

/**
 * Sync an enterprise from SO'SAFE to TIIME as a client
 */
export function enterpriseToTiimeClient(enterprise: any): TiimeClient {
  return {
    name: enterprise.name,
    email: enterprise.contactEmail || enterprise.email || "",
    phone: enterprise.contactPhone || enterprise.phone || "",
    address: enterprise.address || "",
    city: enterprise.city || "",
    postalCode: enterprise.postalCode || "",
    siret: enterprise.siret || "",
    vatNumber: enterprise.tvaNumber || "",
  };
}

/**
 * Convert a SO'SAFE invoice to TIIME invoice format
 */
export function invoiceToTiime(invoice: any, clientTiimeId: string): TiimeInvoice {
  return {
    clientId: clientTiimeId,
    number: invoice.number,
    date: invoice.createdAt ? new Date(invoice.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
    items: (invoice.items || []).map((item: any) => ({
      description: item.description || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      vatRate: item.vatRate || 0,
    })),
    status: invoice.status,
    totalHT: invoice.total || 0,
    totalTTC: invoice.totalTTC || invoice.total || 0,
  };
}

/**
 * Convert a SO'SAFE quote to TIIME quote format
 */
export function quoteToTiime(quote: any, clientTiimeId: string): TiimeQuote {
  return {
    clientId: clientTiimeId,
    number: quote.number,
    date: quote.createdAt ? new Date(quote.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    validUntil: quote.validUntil || "",
    items: (quote.items || []).map((item: any) => ({
      description: item.description || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      vatRate: item.vatRate || 0,
    })),
    status: quote.status,
    totalHT: quote.total || 0,
    totalTTC: quote.totalTTC || quote.total || 0,
  };
}

/**
 * Test TIIME connection
 */
export async function testConnection(config: TiimeConfig): Promise<{ success: boolean; message: string; companyName?: string }> {
  try {
    const result = await tiimeFetch(config, "/me");
    return {
      success: true,
      message: "Connexion TIIME réussie",
      companyName: result.company?.name || result.name || "",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Erreur de connexion à TIIME",
    };
  }
}
