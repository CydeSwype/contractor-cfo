import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

export function registerClientTools(server: McpServer) {
  server.tool(
    'list_clients',
    'List contracting clients. Pass archived=true to include archived clients.',
    { archived: z.boolean().optional() },
    async ({ archived }) => {
      const { data } = await api.get('/cfo/clients', { params: { archived } });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'create_client',
    'Add a new contracting client.',
    {
      name: z.string().describe('Client or contact name'),
      company: z.string().optional().describe('Company name'),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      hourlyRate: z.number().positive().optional().describe('Default hourly billing rate in USD'),
      notes: z.string().optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/clients', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'update_client',
    'Update an existing client by ID.',
    {
      id: z.number().int().positive(),
      name: z.string().optional(),
      company: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      hourlyRate: z.number().positive().optional(),
      notes: z.string().optional(),
    },
    async ({ id, ...body }) => {
      const { data } = await api.put(`/cfo/clients/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
