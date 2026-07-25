import { Prisma } from '@prisma/client';
import prisma from '../db';

export async function recalculateInvoiceTotals(invoiceId: number): Promise<void> {
  const items = await prisma.cfoLineItem.findMany({ where: { invoiceId } });
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  await prisma.cfoInvoice.update({
    where: { id: invoiceId },
    data: { subtotal: new Prisma.Decimal(subtotal), total: new Prisma.Decimal(subtotal) },
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Derive a short, regex-safe prefix from a client's name (e.g. "Wildfire Systems, Inc."
 * -> "WSI", "Alix" -> "ALI") for clients that haven't had one set explicitly. Multi-word
 * names use initials; single-word names use the first three letters. Falls back to "CLT"
 * in the pathological case of a name with no letters at all.
 */
function deriveClientPrefix(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const prefix = words.length > 1
    ? words.map((w) => w[0]).join('').slice(0, 4)
    : (words[0] ?? '').slice(0, 3);
  return (prefix || 'CLT').toUpperCase();
}

/**
 * Get (and persist, if not already set) a client's invoice-numbering prefix.
 */
async function getOrAssignClientPrefix(householdId: number, clientId: number): Promise<string> {
  const client = await prisma.cfoClient.findFirst({ where: { id: clientId, householdId } });
  if (!client) throw new Error(`Client ${clientId} not found`);
  if (client.invoiceNumberPrefix) return client.invoiceNumberPrefix;

  const prefix = deriveClientPrefix(client.name);
  await prisma.cfoClient.update({ where: { id: clientId }, data: { invoiceNumberPrefix: prefix } });
  return prefix;
}

/**
 * The invoice-numbering template: `{prefix}-{year}-{month}-{seq}`, e.g. `WSI-2026-07-003`.
 * Always scoped per client and per month, so two clients never compete over the same
 * sequence and a busy month for one client never collides with another's. Candidates are
 * fetched and parsed numerically in JS (not sorted as strings, and not truncated by a loose
 * `parseInt`) — a string sort or a lenient parse can both silently misidentify the "last"
 * invoice when historical numbers don't all match the current scheme, which is what this
 * function must never do: it's the source of truth an agent should call rather than
 * inferring the next number by pattern-matching a client's invoice history.
 */
export async function nextInvoiceNumber(householdId: number, clientId: number): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const prefix = await getOrAssignClientPrefix(householdId, clientId);
  const searchPrefix = `${prefix}-${year}-${month}-`;

  const candidates = await prisma.cfoInvoice.findMany({
    where: { householdId, clientId, invoiceNumber: { startsWith: searchPrefix } },
    select: { invoiceNumber: true },
  });

  const suffixPattern = new RegExp(`^${escapeRegex(searchPrefix)}(\\d+)$`);
  const lastNum = candidates.reduce((max, { invoiceNumber }) => {
    const match = invoiceNumber.match(suffixPattern);
    if (!match) return max; // non-numeric or malformed suffix — not a valid sequence member
    return Math.max(max, parseInt(match[1], 10));
  }, 0);

  const next = String(lastNum + 1).padStart(3, '0');
  return `${searchPrefix}${next}`;
}

/**
 * Validate a caller-supplied invoice number against a client's registered numbering
 * template (if they have one). Returns an error string, or null if it's fine — used to
 * catch an agent/user proposing a number in the wrong scheme (e.g. mixing
 * `INV-YYYY-NNN` into a client whose history is `INV-YYYY-MM-NNN`) instead of silently
 * accepting it.
 */
export async function validateInvoiceNumber(
  householdId: number,
  clientId: number,
  invoiceNumber: string
): Promise<string | null> {
  const client = await prisma.cfoClient.findFirst({ where: { id: clientId, householdId } });
  if (!client?.invoiceNumberPrefix) return null; // no template registered — anything goes

  const pattern = new RegExp(`^${escapeRegex(client.invoiceNumberPrefix)}-\\d{4}-\\d{2}-\\d+$`);
  if (!pattern.test(invoiceNumber)) {
    return `invoiceNumber "${invoiceNumber}" doesn't match this client's numbering template ` +
      `"${client.invoiceNumberPrefix}-YYYY-MM-NNN". Omit invoiceNumber to auto-generate the next one.`;
  }
  return null;
}

export async function getYtdIncome(householdId: number, year: number): Promise<number> {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);

  const result = await prisma.cfoTransaction.aggregate({
    where: { householdId, receivedAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return parseFloat((result._sum.amount ?? 0).toString());
}

export async function getYtdExpenses(
  householdId: number,
  year: number
): Promise<{ total: number; business: number; personal: number; deductible: number }> {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);
  const where = { householdId, expenseDate: { gte: start, lt: end } };

  const [total, personal, deductible] = await Promise.all([
    prisma.cfoExpense.aggregate({ where, _sum: { amount: true } }),
    prisma.cfoExpense.aggregate({ where: { ...where, isPersonal: true }, _sum: { amount: true } }),
    prisma.cfoExpense.aggregate({ where: { ...where, isTaxDeductible: true }, _sum: { amount: true } }),
  ]);

  const totalAmt = parseFloat((total._sum.amount ?? 0).toString());
  const personalAmt = parseFloat((personal._sum.amount ?? 0).toString());
  const deductibleAmt = parseFloat((deductible._sum.amount ?? 0).toString());

  return { total: totalAmt, business: totalAmt - personalAmt, personal: personalAmt, deductible: deductibleAmt };
}

export async function getYtdTaxPayments(householdId: number, year: number): Promise<number> {
  const result = await prisma.cfoTaxPayment.aggregate({
    where: { householdId, year, paidDate: { not: null } },
    _sum: { amount: true },
  });
  return parseFloat((result._sum.amount ?? 0).toString());
}
