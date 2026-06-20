import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

export function registerTaxTools(server: McpServer) {
  server.tool(
    'get_tax_estimate',
    'Get the quarterly tax estimate based on YTD income, deductible expenses, and household settings (filing status, state rate, prior year tax, other income). Returns federal income tax, SE tax, state tax, per-quarter payment, safe harbor amount, and remaining liability.',
    {
      year: z.number().int().optional().describe('Tax year, defaults to current year'),
      priorYearTax: z.number().nonnegative().optional().describe('Override the stored prior year tax — useful for what-if scenarios'),
      otherIncome: z.number().nonnegative().optional().describe('Override stored other annual income (W2, dividends, etc.)'),
    },
    async (params) => {
      const { data } = await api.get('/cfo/taxes/estimate', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_tax_payments',
    'List quarterly estimated tax payments. Returns scheduled and paid amounts, due dates, and payment status.',
    {
      year: z.number().int().optional().describe('Filter by tax year, defaults to all years'),
    },
    async (params) => {
      const { data } = await api.get('/cfo/taxes/payments', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'log_tax_payment',
    'Record a quarterly estimated tax payment. Use this to schedule an upcoming payment or record one already made.',
    {
      year: z.number().int().describe('Tax year, e.g. 2026'),
      quarter: z.number().int().min(1).max(4).describe('Quarter number 1–4'),
      type: z.enum(['federal_estimated', 'state_estimated', 'other']).describe('Payment type'),
      amount: z.number().positive().describe('Amount in USD'),
      dueDate: z.string().describe('ISO date string of the IRS due date, e.g. 2026-04-15'),
      paidDate: z.string().optional().describe('ISO date string when actually paid; omit if not yet paid'),
      notes: z.string().optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/taxes/payments', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'mark_tax_payment_paid',
    'Mark a scheduled tax payment as paid. Provide the id from list_tax_payments.',
    {
      id: z.number().int().positive(),
      paidDate: z.string().describe('ISO date string when the payment was made'),
      amount: z.number().positive().optional().describe('Actual amount paid if different from the scheduled amount'),
    },
    async ({ id, ...body }) => {
      const { data } = await api.put(`/cfo/taxes/payments/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'delete_tax_payment',
    'Delete a tax payment record.',
    { id: z.number().int().positive() },
    async ({ id }) => {
      await api.delete(`/cfo/taxes/payments/${id}`);
      return { content: [{ type: 'text', text: 'Tax payment deleted.' }] };
    }
  );
}
