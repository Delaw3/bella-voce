import { DUE_MONTH_NUMBERS, DueMonthNumber } from "@/lib/monthly-dues";
import { Model, Schema, model, models } from "mongoose";

export type MonthlyDuesRecord = {
  userId: Schema.Types.ObjectId;
  year: number;
  month: DueMonthNumber;
  paid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const monthlyDuesSchema = new Schema<MonthlyDuesRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, enum: DUE_MONTH_NUMBERS, index: true },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "monthly_due_entries",
  },
);

monthlyDuesSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const existingMonthlyDuesModel = models.MonthlyDues as Model<MonthlyDuesRecord> | undefined;

if (existingMonthlyDuesModel && !existingMonthlyDuesModel.schema.path("month")) {
  delete models.MonthlyDues;
}

const MonthlyDues =
  existingMonthlyDuesModel && existingMonthlyDuesModel.schema.path("month")
    ? existingMonthlyDuesModel
    : model<MonthlyDuesRecord>("MonthlyDues", monthlyDuesSchema);

export default MonthlyDues;
