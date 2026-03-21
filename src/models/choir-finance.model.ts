import { Model, Schema, model, models } from "mongoose";

export const CHOIR_FINANCE_TYPES = ["INCOME", "EXPENSE"] as const;
export type ChoirFinanceType = (typeof CHOIR_FINANCE_TYPES)[number];

export type ChoirFinanceRecord = {
  type: ChoirFinanceType;
  amount: number;
  description: string;
  financeDate: Date;
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const choirFinanceSchema = new Schema<ChoirFinanceRecord>(
  {
    type: { type: String, enum: CHOIR_FINANCE_TYPES, required: true, index: true },
    amount: { type: Number, required: true, default: 0, min: 0 },
    description: { type: String, required: true, trim: true },
    financeDate: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const ChoirFinance =
  (models.ChoirFinance as Model<ChoirFinanceRecord> | undefined) ??
  model<ChoirFinanceRecord>("ChoirFinance", choirFinanceSchema);

export default ChoirFinance;
