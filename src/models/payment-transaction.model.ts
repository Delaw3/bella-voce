import {
  PAYMENT_ITEM_CATEGORIES,
  PAYMENT_TRANSACTION_STATUSES,
  PAYMENT_TRANSACTION_TYPES,
} from "@/lib/payment-constants";
import { Model, Schema, model, models } from "mongoose";

export type PaymentTransactionItemRecord = {
  category: (typeof PAYMENT_ITEM_CATEGORIES)[number];
  description: string;
  amount: number;
  month?: number;
  year?: number;
  accountabilityDate?: Date;
  quantity?: number;
};

export type PaymentTransactionRecord = {
  userId: Schema.Types.ObjectId;
  transactionType: (typeof PAYMENT_TRANSACTION_TYPES)[number];
  items: PaymentTransactionItemRecord[];
  totalAmount: number;
  selectedAccountId?: Schema.Types.ObjectId;
  transferNote?: string;
  status: (typeof PAYMENT_TRANSACTION_STATUSES)[number];
  adminNote?: string;
  submittedAt: Date;
  approvedAt?: Date;
  approvedBy?: Schema.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const paymentTransactionItemSchema = new Schema<PaymentTransactionItemRecord>(
  {
    category: { type: String, enum: PAYMENT_ITEM_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0, default: 0 },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number, min: 2000 },
    accountabilityDate: { type: Date },
    quantity: { type: Number, min: 0 },
  },
  { _id: false },
);

const paymentTransactionSchema = new Schema<PaymentTransactionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transactionType: { type: String, enum: PAYMENT_TRANSACTION_TYPES, required: true },
    items: { type: [paymentTransactionItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    selectedAccountId: { type: Schema.Types.ObjectId, ref: "PaymentAccount" },
    transferNote: { type: String, trim: true },
    status: { type: String, enum: PAYMENT_TRANSACTION_STATUSES, default: "PENDING", index: true },
    adminNote: { type: String, trim: true },
    submittedAt: { type: Date, default: () => new Date(), index: true },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "payment_transactions",
  },
);

paymentTransactionSchema.index({ userId: 1, status: 1, submittedAt: -1 });

const existingPaymentTransactionModel = models.PaymentTransaction as Model<PaymentTransactionRecord> | undefined;

if (existingPaymentTransactionModel && !existingPaymentTransactionModel.schema.path("transactionType")) {
  delete models.PaymentTransaction;
}

const PaymentTransaction =
  existingPaymentTransactionModel && existingPaymentTransactionModel.schema.path("transactionType")
    ? existingPaymentTransactionModel
    : model<PaymentTransactionRecord>("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
