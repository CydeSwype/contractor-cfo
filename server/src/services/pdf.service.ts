import PDFDocument from 'pdfkit';

interface LineItem {
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  amount: string | number;
}

interface InvoiceData {
  invoiceNumber: string;
  issuedAt: Date | string | null;
  dueAt: Date | string | null;
  notes: string | null;
  total: string | number;
  client: {
    name: string;
    company: string | null;
    contactEmail: string | null;
    notes: string | null; // used as mailing address
  };
  fromName: string;
  fromEmail: string;
  lineItems: LineItem[];
}

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  // Parse as UTC date string to avoid timezone shifting (e.g. "2026-06-25" → Jun 24 in UTC-8)
  const s = typeof d === 'string' ? d : d.toISOString();
  const [year, month, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function fmtMoney(n: string | number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

const DARK = '#111827';
const GRAY = '#6B7280';
const LIGHT_BG = '#F9FAFB';
const ALT_BG = '#F3F4F6';
const BORDER = '#E5E7EB';

const MARGIN = 50;
const PAGE_WIDTH = 612; // LETTER
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 512

const COL_DESC_W = 300;
const COL_HRS_X = MARGIN + COL_DESC_W + 20;
const COL_RATE_X = COL_HRS_X + 50;
const COL_AMT_X = COL_RATE_X + 70;

export function generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'LETTER', autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(22).fillColor(DARK).text('INVOICE', MARGIN, 50);
    doc.fontSize(10).fillColor(GRAY).text(invoice.invoiceNumber, MARGIN, 80);

    // ── From / Bill To ──────────────────────────────────────────────────────
    const colRight = 350;
    let leftY = 115;
    let rightY = 115;

    doc.fontSize(8).fillColor(GRAY).text('FROM', MARGIN, leftY);
    leftY += 12;
    doc.fontSize(10).fillColor(DARK).text(invoice.fromName, MARGIN, leftY);
    leftY += 14;
    doc.fontSize(9).fillColor(GRAY).text(invoice.fromEmail, MARGIN, leftY);

    doc.fontSize(8).fillColor(GRAY).text('BILL TO', colRight, rightY);
    rightY += 12;
    doc.fontSize(10).fillColor(DARK).text(invoice.client.name, colRight, rightY);
    rightY += 14;

    const billToWidth = PAGE_WIDTH - MARGIN - colRight;
    if (invoice.client.company) {
      doc.fontSize(9).fillColor(GRAY).text(invoice.client.company, colRight, rightY, { width: billToWidth });
      rightY += doc.heightOfString(invoice.client.company, { width: billToWidth }) + 2;
    }
    if (invoice.client.notes) {
      doc.fontSize(9).fillColor(GRAY).text(invoice.client.notes, colRight, rightY, { width: billToWidth });
      rightY += doc.heightOfString(invoice.client.notes, { width: billToWidth }) + 2;
    }
    if (invoice.client.contactEmail) {
      doc.fontSize(9).fillColor(GRAY).text(invoice.client.contactEmail, colRight, rightY, { width: billToWidth });
    }

    // ── Dates ────────────────────────────────────────────────────────────────
    const datesY = Math.max(leftY, rightY) + 30;
    doc.fontSize(8).fillColor(GRAY).text('ISSUED', MARGIN, datesY);
    doc.fontSize(9).fillColor(DARK).text(fmtDate(invoice.issuedAt), MARGIN, datesY + 12);
    doc.fontSize(8).fillColor(GRAY).text('DUE', MARGIN + 120, datesY);
    doc.fontSize(9).fillColor(DARK).text(fmtDate(invoice.dueAt), MARGIN + 120, datesY + 12);

    // ── Line items table ─────────────────────────────────────────────────────
    const tableTop = datesY + 45;
    const headerH = 22;

    doc.rect(MARGIN, tableTop, CONTENT_WIDTH, headerH).fill(LIGHT_BG);
    doc.fontSize(8).fillColor(GRAY);
    doc.text('DESCRIPTION', MARGIN + 4, tableTop + 7);
    doc.text('HRS', COL_HRS_X, tableTop + 7);
    doc.text('RATE', COL_RATE_X, tableTop + 7);
    doc.text('AMOUNT', COL_AMT_X, tableTop + 7);

    let y = tableTop + headerH;

    invoice.lineItems.forEach((item, i) => {
      const descH = doc.heightOfString(item.description, { width: COL_DESC_W });
      const rowH = Math.max(descH + 10, 20);
      const rowPad = 5;

      if (i % 2 === 1) {
        doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill(ALT_BG);
      }

      doc.fontSize(8.5).fillColor(DARK);
      doc.text(item.description, MARGIN + 4, y + rowPad, { width: COL_DESC_W });
      doc.text(String(parseFloat(String(item.quantity))), COL_HRS_X, y + rowPad);
      doc.text(fmtMoney(item.unitPrice), COL_RATE_X, y + rowPad);
      doc.text(fmtMoney(item.amount), COL_AMT_X, y + rowPad);

      y += rowH;
    });

    // ── Total ────────────────────────────────────────────────────────────────
    y += 8;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.5).stroke(BORDER);
    y += 12;
    doc.fontSize(10).fillColor(GRAY).text('Total', COL_RATE_X, y);
    doc.fontSize(13).fillColor(DARK).text(fmtMoney(invoice.total), COL_AMT_X, y);

    // ── Notes ────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      y += 40;
      doc.fontSize(8.5).fillColor(GRAY).text(invoice.notes, MARGIN, y, { width: CONTENT_WIDTH });
    }

    doc.end();
  });
}
