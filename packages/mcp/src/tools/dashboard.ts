import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

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

  server.tool(
    'estimate_taxes',
    'Calculate estimated quarterly self-employment and income taxes.',
    {
      year: z.number().int().optional().describe('Tax year'),
      priorYearTax: z.number().optional().describe('Prior year total tax paid (for safe harbor)'),
      otherIncome: z.number().optional().describe('Other income (W-2, interest, etc.)'),
    },
    async (params) => {
      const { data } = await api.post('/cfo/taxes/estimate', params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_tax_payments',
    'List quarterly tax payments made or scheduled.',
    { year: z.number().int().optional() },
    async (params) => {
      const { data } = await api.get('/cfo/taxes/payments', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'record_tax_payment',
    'Record a quarterly estimated tax payment.',
    {
      year: z.number().int(),
      quarter: z.number().int().min(1).max(4),
      type: z.enum(['federal_estimated', 'state_estimated', 'other']),
      amount: z.number().positive(),
      dueDate: z.string().describe('ISO date'),
      paidDate: z.string().optional().describe('ISO date — omit if not yet paid'),
      notes: z.string().optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/taxes/payments', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
