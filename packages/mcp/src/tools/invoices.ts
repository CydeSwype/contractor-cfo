import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../apiClient.js';

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
});

export function registerInvoiceTools(server: McpServer) {
  server.tool(
    'list_invoices',
    'List invoices. Optionally filter by status (draft/sent/paid/overdue/void), clientId, or year.',
    {
      status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional(),
      clientId: z.number().int().optional(),
      year: z.number().int().optional(),
    },
    async (params) => {
      const { data } = await api.get('/cfo/invoices', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_overdue_invoices',
    'Get all invoices that are past their due date and unpaid.',
    {},
    async () => {
      const { data } = await api.get('/cfo/invoices', { params: { status: 'sent' } });
      const today = new Date();
      const overdue = data.filter((inv: { dueAt: string | null }) =>
        inv.dueAt && new Date(inv.dueAt) < today
      );
      return { content: [{ type: 'text', text: JSON.stringify(overdue, null, 2) }] };
    }
  );

  server.tool(
    'create_invoice',
    'Create a new invoice for a client, with optional line items.',
    {
      clientId: z.number().int().positive(),
      invoiceNumber: z.string().optional().describe('Auto-generated as INV-YYYY-NNN if not provided'),
      issuedAt: z.string().optional().describe('ISO date string, defaults to today'),
      dueAt: z.string().optional().describe('ISO date string for payment due date'),
      notes: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/invoices', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'mark_invoice_sent',
    'Mark an invoice as sent to the client.',
    { id: z.number().int().positive() },
    async ({ id }) => {
      const { data } = await api.patch(`/cfo/invoices/${id}/send`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'record_payment',
    'Log a payment received. Links to an invoice if invoiceId is provided.',
    {
      amount: z.number().positive().describe('Amount received in USD'),
      receivedAt: z.string().describe('ISO date string'),
      invoiceId: z.number().int().optional(),
      method: z.enum(['ach', 'check', 'wire', 'paypal', 'venmo', 'other']).optional(),
      reference: z.string().optional().describe('Check number, transaction ID, etc.'),
      notes: z.string().optional(),
    },
    async (body) => {
      const { data } = await api.post('/cfo/transactions', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_transactions',
    'List income transactions. Filter by year or invoiceId.',
    {
      year: z.number().int().optional(),
      invoiceId: z.number().int().optional(),
    },
    async (params) => {
      const { data } = await api.get('/cfo/transactions', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
