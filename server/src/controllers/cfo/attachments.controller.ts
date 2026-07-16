import path from 'path';
import fs from 'fs';
import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';
import { generateInvoicePdf } from '../../services/pdf.service';

const UPLOADS_ROOT = path.join(__dirname, '../../../uploads/invoices');

function invoiceDir(invoiceId: number) {
  const dir = path.join(UPLOADS_ROOT, String(invoiceId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const id = parseInt((req as AuthRequest).params.id, 10);
      cb(null, invoiceDir(id));
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
});

async function resolveInvoice(req: AuthRequest, res: Response) {
  const householdId = req.user?.householdId;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid invoice id' }); return null; }
  const invoice = await prisma.cfoInvoice.findFirst({
    where: { id, householdId },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return null; }
  return invoice;
}

export async function getInvoicePdf(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await resolveInvoice(req, res);
  if (!invoice) return;

  const user = req.user!;

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    notes: invoice.notes,
    total: invoice.total.toNumber(),
    client: {
      name: invoice.client.name,
      company: invoice.client.company,
      contactEmail: invoice.client.contactEmail,
      notes: invoice.client.notes,
    },
    fromName: user.name ?? 'Contractor',
    fromEmail: user.email ?? '',
    lineItems: invoice.lineItems.map(li => ({
      description: li.description,
      quantity: li.quantity.toNumber(),
      unitPrice: li.unitPrice.toNumber(),
      amount: li.amount.toNumber(),
    })),
  });

  // Upsert the attachment record (replace existing generated PDF if any)
  const filename = `${invoice.invoiceNumber}.pdf`;
  const storedPath = path.join(invoiceDir(invoice.id), filename);
  fs.writeFileSync(storedPath, pdfBuffer);

  const existing = await prisma.cfoInvoiceAttachment.findFirst({
    where: { invoiceId: invoice.id, source: 'generated' },
  });

  if (existing) {
    await prisma.cfoInvoiceAttachment.update({
      where: { id: existing.id },
      data: { filename, storedPath, sizeBytes: pdfBuffer.length },
    });
  } else {
    await prisma.cfoInvoiceAttachment.create({
      data: {
        invoiceId: invoice.id,
        filename,
        mimeType: 'application/pdf',
        storedPath,
        sizeBytes: pdfBuffer.length,
        source: 'generated',
      },
    });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': pdfBuffer.length,
  });
  res.send(pdfBuffer);
}

export async function listAttachments(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await resolveInvoice(req, res);
  if (!invoice) return;
  const attachments = await prisma.cfoInvoiceAttachment.findMany({
    where: { invoiceId: invoice.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(attachments);
}

export async function uploadAttachment(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await resolveInvoice(req, res);
  if (!invoice) return;

  const file = req.file;
  if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const attachment = await prisma.cfoInvoiceAttachment.create({
    data: {
      invoiceId: invoice.id,
      filename: file.originalname,
      mimeType: file.mimetype,
      storedPath: file.path,
      sizeBytes: file.size,
      source: 'upload',
    },
  });
  res.status(201).json(attachment);
}

export async function downloadAttachment(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await resolveInvoice(req, res);
  if (!invoice) return;

  const attachmentId = parseInt(req.params.attachmentId, 10);
  const attachment = await prisma.cfoInvoiceAttachment.findFirst({
    where: { id: attachmentId, invoiceId: invoice.id },
  });
  if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
  if (!fs.existsSync(attachment.storedPath)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  res.set({
    'Content-Type': attachment.mimeType,
    'Content-Disposition': `attachment; filename="${attachment.filename}"`,
  });
  fs.createReadStream(attachment.storedPath).pipe(res);
}

export async function deleteAttachment(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await resolveInvoice(req, res);
  if (!invoice) return;

  const attachmentId = parseInt(req.params.attachmentId, 10);
  const attachment = await prisma.cfoInvoiceAttachment.findFirst({
    where: { id: attachmentId, invoiceId: invoice.id },
  });
  if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }

  try { fs.unlinkSync(attachment.storedPath); } catch { /* file may already be gone */ }
  await prisma.cfoInvoiceAttachment.delete({ where: { id: attachmentId } });
  res.status(204).send();
}
