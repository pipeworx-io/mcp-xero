# mcp-xero

Xero (Accounting) MCP Pack

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `list_organisations` | List the Xero organisations (tenants) the connected account can access, with tenant id, name, and type. Xero accounting is multi-tenant — use this first to discover the tenant_id for a specific organisation, then pass it to the other accounting tools to target that org. |
| `list_invoices` | List invoices and bills from a Xero accounting organisation. Returns compact invoice summaries (number, type, status, contact, dates, total, amount due, currency) for bookkeeping, accounts-receivable, and accounts-payable review. Supports Xero filter expressions and pagination. |
| `list_contacts` | List contacts (customers and suppliers) from a Xero accounting organisation. Returns name, email, status, and customer/supplier flags. Use for accounting, bookkeeping, and accounts-receivable/payable workflows. Supports Xero filter expressions and pagination. |
| `get_profit_and_loss` | Get the Profit and Loss (income statement) financial report from a Xero accounting organisation for an optional date range. Returns the structured Xero report (report name, date, and row sections covering revenue, expenses, and net profit). Use for financial reporting and bookkeeping analysis. |
| `list_accounts` | List the chart of accounts from a Xero accounting organisation. Returns each account's code, name, type, class, and status. Use to understand an organisation's general ledger structure for bookkeeping and financial reporting. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "xero": {
      "url": "https://gateway.pipeworx.io/xero/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Xero data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
