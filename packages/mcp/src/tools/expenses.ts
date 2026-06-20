import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

const CATEGORIES = [
  'software', 'office', 'travel', 'meals', 'phone', 'home_office',
  'healthcare', 'education', 'marketing', 'housing', 'utilities',
  'groceries', 'entertainment', 'other',
] as const;

export function registerExpenseTools(server: McpServer) {
  server.tool(
    'log_expense',
    'Log a business or personal expense.',
    {
      category: z.enum(CATEGORIES),
      description: z.string(),
      amount: z.number().positive().describe('Amount in USD'),
      expenseDate: z.string().describe('ISO date string'),
      vendor: z.string().optional(),
      isTaxDeductible: z.boolean().optional().describe('True for deductible business expenses'),
      isPersonal: z.boolean().optional().describe('True for personal/household expenses, false for business'),
      notes: z.string().optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/expenses', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_expenses',
    'List expenses. Filter by year, month, category, deductible status, or personal/business.',
    {
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      category: z.enum(CATEGORIES).optional(),
      deductible: z.boolean().optional().describe('Filter to only tax-deductible expenses'),
      personal: z.boolean().optional().describe('Filter to personal (true) or business (false) expenses'),
    },
    async (params) => {
      const { data } = await api.get('/cfo/expenses', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_expense',
    'Update an existing expense record.',
    {
      id: z.number().int().positive(),
      category: z.enum(CATEGORIES).optional(),
      description: z.string().optional(),
      amount: z.number().positive().optional(),
      expenseDate: z.string().optional(),
      isTaxDeductible: z.boolean().optional(),
      isPersonal: z.boolean().optional(),
      notes: z.string().optional(),
    },
    async ({ id, ...body }) => {
      const { data } = await api.put(`/cfo/expenses/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
