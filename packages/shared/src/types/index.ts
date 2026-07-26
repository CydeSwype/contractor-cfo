export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'owner' | 'partner';
  householdId: number | null;
  createdAt: string;
}

export interface Household {
  id: number;
  name: string;
  state: string | null;
  stateRate: string | null;
  filingStatus: FilingStatus;
  priorYearTax: string | null;
  otherIncome: string | null;
  createdAt: string;
  members: User[];
}

export type TokenScope = 'full' | 'read_only' | 'invoice_only';

export interface PersonalAccessToken {
  id: number;
  name: string;
  scope: TokenScope;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CfoClient {
  id: number;
  householdId: number;
  name: string;
  company: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  apEmail: string | null;
  hourlyRate: string | null;
  notes: string | null;
  invoiceNotes: string | null;
  invoiceNumberPrefix: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface CfoLineItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
}

export interface CfoInvoiceAttachment {
  id: number;
  invoiceId: number;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  source: 'generated' | 'upload';
  createdAt: string;
}

export interface CfoInvoice {
  id: number;
  householdId: number;
  clientId: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Pick<CfoClient, 'id' | 'name' | 'company' | 'contactEmail' | 'apEmail'>;
  lineItems?: CfoLineItem[];
}

export interface CfoTransaction {
  id: number;
  householdId: number;
  invoiceId: number | null;
  amount: string;
  receivedAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export type ExpenseCategory =
  | 'software'
  | 'office'
  | 'travel'
  | 'meals'
  | 'phone'
  | 'home_office'
  | 'healthcare'
  | 'education'
  | 'marketing'
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'entertainment'
  | 'other';

export interface CfoExpense {
  id: number;
  householdId: number;
  category: ExpenseCategory;
  description: string;
  amount: string;
  expenseDate: string;
  vendor: string | null;
  isTaxDeductible: boolean;
  isPersonal: boolean;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CfoBudgetTarget {
  id: number;
  householdId: number;
  yearMonth: string;
  category: ExpenseCategory;
  targetAmount: string;
}

export interface BudgetActual {
  category: ExpenseCategory;
  targetAmount: string | null;
  actualAmount: string;
  variance: string;
}

export interface CfoTaxPayment {
  id: number;
  householdId: number;
  year: number;
  quarter: number;
  type: 'federal_estimated' | 'state_estimated' | 'other';
  amount: string;
  dueDate: string;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TaxEstimate {
  year: number;
  grossIncome: number;
  businessExpenses: number;
  netSEIncome: number;
  seTax: number;
  seDeduction: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  totalEstimatedTax: number;
  safeHarborAnnual: number;
  perQuarterPayment: number;
  recommendedReservePercent: number;
  quarterlyDueDates: { quarter: number; label: string; dueDate: string }[];
  paymentsToDate: number;
  remainingLiability: number;
}

export interface CfoDashboard {
  year: number;
  ytdIncome: number;
  ytdBusinessExpenses: number;
  ytdDeductibleExpenses: number;
  ytdPersonalExpenses: number;
  taxReserve: number;
  netCashFlow: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;
  overdueInvoiceCount: number;
  taxEstimate: TaxEstimate;
}
