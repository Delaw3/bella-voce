import { Model, Schema, model, models } from "mongoose";

export type PaymentAccountRecord = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive: boolean;
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const paymentAccountSchema = new Schema<PaymentAccountRecord>(
  {
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "payment_accounts",
  },
);

paymentAccountSchema.index({ bankName: 1, accountNumber: 1 });

const existingPaymentAccountModel = models.PaymentAccount as Model<PaymentAccountRecord> | undefined;

if (existingPaymentAccountModel && !existingPaymentAccountModel.schema.path("updatedBy")) {
  delete models.PaymentAccount;
}

const PaymentAccount =
  existingPaymentAccountModel && existingPaymentAccountModel.schema.path("updatedBy")
    ? existingPaymentAccountModel
    : model<PaymentAccountRecord>("PaymentAccount", paymentAccountSchema);

export default PaymentAccount;
