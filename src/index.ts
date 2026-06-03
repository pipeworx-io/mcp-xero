interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Xero (Accounting) MCP Pack
 *
 * Requires OAuth connection — gateway injects credentials via _context.xero.
 * Read-only access to Xero accounting data via the Xero Accounting API 2.0.
 * Tools: list organisations (tenants), list invoices, list contacts,
 *        get profit & loss report, list chart-of-accounts.
 *
 * Xero is multi-tenant: every Accounting API call needs a `Xero-tenant-id`
 * header. The tenant id is discovered via GET https://api.xero.com/connections.
 */


interface XeroContext {
  xero?: { accessToken: string };
}

const API = 'https://api.xero.com/api.xro/2.0';
const CONNECTIONS_URL = 'https://api.xero.com/connections';

interface XeroConnection {
  tenantId?: string;
  tenantName?: string;
  tenantType?: string;
}

/**
 * Resolve the Xero tenant id for an accounting call.
 * - GETs https://api.xero.com/connections (Bearer only — no tenant header).
 * - Returns the first connection's tenantId.
 * - Returns { error: ... } when no connections / non-2xx.
 */
async function getTenantId(accessToken: string): Promise<string | { error: unknown; message?: string }> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  const connections = (await res.json()) as XeroConnection[];
  if (!Array.isArray(connections) || connections.length === 0 || !connections[0].tenantId) {
    return {
      error: 'no_tenant',
      message: 'No Xero organisation is connected. Use list_organisations to view available tenants.',
    };
  }
  return connections[0].tenantId as string;
}

/**
 * Resolve the tenant id to use for a call: explicit `tenant_id` arg wins,
 * otherwise auto-fetch the first connection.
 */
async function resolveTenant(
  accessToken: string,
  tenantId: string | undefined,
): Promise<string | { error: unknown; message?: string }> {
  if (tenantId) return tenantId;
  return getTenantId(accessToken);
}

/**
 * Fetch helper for the Xero Accounting API.
 * - Returns { error: 'connection_required' } when no OAuth token is present.
 * - Returns { error: <status>, message: <body text> } on non-2xx responses.
 * - Otherwise returns the parsed JSON body.
 */
async function xFetch(
  ctx: XeroContext,
  path: string,
  tenantId: string,
): Promise<unknown> {
  if (!ctx.xero) {
    return {
      error: 'connection_required',
      message: 'Connect your Xero account at https://pipeworx.io/account',
    };
  }
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.xero.accessToken}`,
      'Xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

const tools: McpToolExport['tools'] = [
  {
    name: 'list_organisations',
    description:
      'List the Xero organisations (tenants) the connected account can access, with tenant id, name, and type. Xero accounting is multi-tenant — use this first to discover the tenant_id for a specific organisation, then pass it to the other accounting tools to target that org.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_invoices',
    description:
      'List invoices and bills from a Xero accounting organisation. Returns compact invoice summaries (number, type, status, contact, dates, total, amount due, currency) for bookkeeping, accounts-receivable, and accounts-payable review. Supports Xero filter expressions and pagination.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenant_id: {
          type: 'string',
          description: 'Optional Xero tenant (organisation) id to target. If omitted, the first connected organisation is used. Get ids from list_organisations.',
        },
        where: {
          type: 'string',
          description: 'Optional Xero filter expression (e.g. \'Status=="AUTHORISED"\' or \'Type=="ACCREC"\'). Applied as the Xero `where` query parameter.',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default 1). Xero returns up to 100 invoices per page.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_contacts',
    description:
      'List contacts (customers and suppliers) from a Xero accounting organisation. Returns name, email, status, and customer/supplier flags. Use for accounting, bookkeeping, and accounts-receivable/payable workflows. Supports Xero filter expressions and pagination.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenant_id: {
          type: 'string',
          description: 'Optional Xero tenant (organisation) id to target. If omitted, the first connected organisation is used. Get ids from list_organisations.',
        },
        where: {
          type: 'string',
          description: 'Optional Xero filter expression (e.g. \'IsCustomer==true\' or \'ContactStatus=="ACTIVE"\'). Applied as the Xero `where` query parameter.',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default 1). Xero returns up to 100 contacts per page.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_profit_and_loss',
    description:
      'Get the Profit and Loss (income statement) financial report from a Xero accounting organisation for an optional date range. Returns the structured Xero report (report name, date, and row sections covering revenue, expenses, and net profit). Use for financial reporting and bookkeeping analysis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenant_id: {
          type: 'string',
          description: 'Optional Xero tenant (organisation) id to target. If omitted, the first connected organisation is used. Get ids from list_organisations.',
        },
        from_date: {
          type: 'string',
          description: 'Optional start date of the reporting period in YYYY-MM-DD format.',
        },
        to_date: {
          type: 'string',
          description: 'Optional end date of the reporting period in YYYY-MM-DD format.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_accounts',
    description:
      'List the chart of accounts from a Xero accounting organisation. Returns each account\'s code, name, type, class, and status. Use to understand an organisation\'s general ledger structure for bookkeeping and financial reporting.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenant_id: {
          type: 'string',
          description: 'Optional Xero tenant (organisation) id to target. If omitted, the first connected organisation is used. Get ids from list_organisations.',
        },
      },
      required: [],
    },
  },
];

interface XeroInvoice {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Type?: string;
  Status?: string;
  Contact?: { Name?: string };
  Date?: string;
  DueDate?: string;
  Total?: number;
  AmountDue?: number;
  CurrencyCode?: string;
}

interface XeroContact {
  ContactID?: string;
  Name?: string;
  EmailAddress?: string;
  ContactStatus?: string;
  IsCustomer?: boolean;
  IsSupplier?: boolean;
}

interface XeroAccount {
  AccountID?: string;
  Code?: string;
  Name?: string;
  Type?: string;
  Status?: string;
  Class?: string;
}

interface XeroReport {
  ReportName?: string;
  ReportDate?: string;
  Rows?: unknown;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const context = (args._context ?? {}) as XeroContext;
  delete args._context;

  if (!context.xero) {
    return {
      error: 'connection_required',
      message: 'Connect your Xero account at https://pipeworx.io/account',
    };
  }
  const accessToken = context.xero.accessToken;

  switch (name) {
    case 'list_organisations': {
      const res = await fetch(CONNECTIONS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        return { error: res.status, message: text };
      }
      const connections = (await res.json()) as XeroConnection[];
      const list = Array.isArray(connections) ? connections : [];
      return list.map((c) => ({
        tenantId: c.tenantId,
        tenantName: c.tenantName,
        tenantType: c.tenantType,
      }));
    }
    case 'list_invoices': {
      const tenant = await resolveTenant(accessToken, args.tenant_id as string | undefined);
      if (typeof tenant !== 'string') return tenant;

      const page = (args.page as number) ?? 1;
      const where = args.where as string | undefined;
      let path = `/Invoices?page=${encodeURIComponent(String(page))}`;
      if (where) path += `&where=${encodeURIComponent(where)}`;

      const result = await xFetch(context, path, tenant);
      const invoices = (result as { Invoices?: XeroInvoice[] }).Invoices;
      if (!Array.isArray(invoices)) return result;
      return {
        invoices: invoices.map((i) => ({
          id: i.InvoiceID,
          number: i.InvoiceNumber,
          type: i.Type,
          status: i.Status,
          contact: i.Contact?.Name,
          date: i.Date,
          due_date: i.DueDate,
          total: i.Total,
          amount_due: i.AmountDue,
          currency: i.CurrencyCode,
        })),
      };
    }
    case 'list_contacts': {
      const tenant = await resolveTenant(accessToken, args.tenant_id as string | undefined);
      if (typeof tenant !== 'string') return tenant;

      const page = (args.page as number) ?? 1;
      const where = args.where as string | undefined;
      let path = `/Contacts?page=${encodeURIComponent(String(page))}`;
      if (where) path += `&where=${encodeURIComponent(where)}`;

      const result = await xFetch(context, path, tenant);
      const contacts = (result as { Contacts?: XeroContact[] }).Contacts;
      if (!Array.isArray(contacts)) return result;
      return {
        contacts: contacts.map((c) => ({
          id: c.ContactID,
          name: c.Name,
          email: c.EmailAddress,
          status: c.ContactStatus,
          is_customer: c.IsCustomer,
          is_supplier: c.IsSupplier,
        })),
      };
    }
    case 'get_profit_and_loss': {
      const tenant = await resolveTenant(accessToken, args.tenant_id as string | undefined);
      if (typeof tenant !== 'string') return tenant;

      const fromDate = args.from_date as string | undefined;
      const toDate = args.to_date as string | undefined;
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const qs = params.toString();
      const path = `/Reports/ProfitAndLoss${qs ? `?${qs}` : ''}`;

      const result = await xFetch(context, path, tenant);
      const reports = (result as { Reports?: XeroReport[] }).Reports;
      if (!Array.isArray(reports)) return result;
      const report = reports[0];
      return {
        report: report
          ? {
              ReportName: report.ReportName,
              ReportDate: report.ReportDate,
              Rows: report.Rows,
            }
          : null,
      };
    }
    case 'list_accounts': {
      const tenant = await resolveTenant(accessToken, args.tenant_id as string | undefined);
      if (typeof tenant !== 'string') return tenant;

      const result = await xFetch(context, '/Accounts', tenant);
      const accounts = (result as { Accounts?: XeroAccount[] }).Accounts;
      if (!Array.isArray(accounts)) return result;
      return {
        accounts: accounts.map((a) => ({
          id: a.AccountID,
          code: a.Code,
          name: a.Name,
          type: a.Type,
          status: a.Status,
          class: a.Class,
        })),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 }, provider: 'xero' } satisfies McpToolExport;
