import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

// Tax-related tools (estimate/list/record payments) live in tools/taxes.ts —
// keep this file to dashboard-only concerns to avoid duplicate tool names.
export function registerDashboardTools(server: McpServer) {
  server.tool(
    'get_dashboard',
    'Get a full YTD summary: income, expenses, tax reserve, net cash flow, and outstanding invoices.',
    {
      year: z.number().int().optional().describe('Tax year (defaults to current year)'),
      priorYearTax: z.number().optional().describe('Last year\'s total federal + state tax paid, for safe-harbor calculation'),
    },
    async (params) => {
      const { data } = await api.get('/cfo/dashboard', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
