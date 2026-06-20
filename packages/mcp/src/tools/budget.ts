import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

export function registerBudgetTools(server: McpServer) {
  server.tool(
    'get_budget',
    'Get monthly budget targets. Pass yearMonth as "YYYY-MM".',
    { yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional() },
    async (params) => {
      const { data } = await api.get('/cfo/budget', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'set_budget_targets',
    'Set or update monthly budget targets for one or more categories.',
    {
      targets: z.array(z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('e.g. "2025-03"'),
        category: z.string(),
        targetAmount: z.number().positive(),
      })),
    },
    async ({ targets }) => {
      const { data } = await api.put('/cfo/budget', targets);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_budget_vs_actuals',
    'Compare this month\'s spending to budget targets by category.',
    { yearMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('e.g. "2025-03"') },
    async ({ yearMonth }) => {
      const { data } = await api.get('/cfo/budget/actuals', { params: { yearMonth } });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
