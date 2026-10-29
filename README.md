# mcp-xero

Xero (Accounting) MCP Pack

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1857+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/xero/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1857+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

This pack runs against a connected xero account, so it needs a Pipeworx key: sign in at https://pipeworx.io/account, connect xero, then call `POST https://gateway.pipeworx.io/v1/tools/list_organisations` with `Authorization: Bearer <your Pipeworx key>`. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/list_organisations`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-xero` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/xero/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "xero": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-xero"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Xero data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
