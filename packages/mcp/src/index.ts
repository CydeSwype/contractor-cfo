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

registerClientTools(server);
registerInvoiceTools(server);
registerExpenseTools(server);
registerBudgetTools(server);
registerDashboardTools(server);
registerTaxTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
