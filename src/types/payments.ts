export type PaymentTransactionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PaymentTransactionType = "ACCOUNTABILITY" | "MONTHLY_DUES" | "CUSTOM";
export type PaymentItemCategory =
  | "MONTHLY_DUES"
  | "LEVY"
  | "FINE"
  | "LATENESS_FEE"
  | "ABSENT_FEE"
  | "PLEDGE"
  | "CUSTOM";

export type PaymentAccountItem = {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentItem = {
  category: PaymentItemCategory;
  description: string;
  amount: number;
  month?: number;
  year?: number;
  accountabilityDate?: string;
  quantity?: number;
};

export type PaymentOwedGroup = {
  category: Exclude<PaymentItemCategory, "CUSTOM">;
  label: string;
  totalAmount: number;
  itemCount: number;
  items: PaymentItem[];
};

export type PaymentDraftPayload = {
  transactionType: PaymentTransactionType;
  items: PaymentItem[];
  selectedAccountId?: string;
  transferNote?: string;
};

export type PaymentTransactionSummary = {
  id: string;
  transactionType: PaymentTransactionType;
  items: PaymentItem[];
  totalAmount: number;
  status: PaymentTransactionStatus;
  transferNote?: string;
  adminNote?: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  account?: {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    isActive: boolean;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  } | null;
};
