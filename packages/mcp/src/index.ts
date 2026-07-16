import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerClientTools } from './tools/clients.js';
import { registerInvoiceTools } from './tools/invoices.js';
import { registerExpenseTools } from './tools/expenses.js';
import { registerBudgetTools } from './tools/budget.js';
import { registerDashboardTools } from './tools/dashboard.js';
import { registerTaxTools } from './tools/taxes.js';

const server = new McpServer({
  name: 'contractor-cfo',
  version: '0.1.0',
});

// Each tools/*.ts module registers its own tool names with the SDK, which throws
// on any duplicate. Wrapping each registration names the offending module in the
// error instead of a bare "Tool X is already registered" with no indication of
// which two files collided.
const registrars: [string, (s: McpServer) => void][] = [
  ['clients.ts', registerClientTools],
  ['invoices.ts', registerInvoiceTools],
  ['expenses.ts', registerExpenseTools],
  ['budget.ts', registerBudgetTools],
  ['dashboard.ts', registerDashboardTools],
  ['taxes.ts', registerTaxTools],
];

for (const [file, register] of registrars) {
  try {
    register(server);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to register tools from tools/${file}: ${message}`);
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
