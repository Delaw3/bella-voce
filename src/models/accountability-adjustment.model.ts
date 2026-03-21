import { Model, Schema, model, models } from "mongoose";

export const ACCOUNTABILITY_ADJUSTMENT_TYPES = ["PLEDGED", "FINE", "LEVY"] as const;
export type AccountabilityAdjustmentType = (typeof ACCOUNTABILITY_ADJUSTMENT_TYPES)[number];

export type AccountabilityAdjustmentRecord = {
  userId: Schema.Types.ObjectId;
  type: AccountabilityAdjustmentType;
  amount: number;
  reason: string;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const accountabilityAdjustmentSchema = new Schema<AccountabilityAdjustmentRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ACCOUNTABILITY_ADJUSTMENT_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

accountabilityAdjustmentSchema.index({ userId: 1, type: 1, createdAt: -1 });

const existingAdjustmentModel = models.AccountabilityAdjustment as
  | Model<AccountabilityAdjustmentRecord>
  | undefined;

if (existingAdjustmentModel && !existingAdjustmentModel.schema.path("updatedBy")) {
  delete models.AccountabilityAdjustment;
}

const AccountabilityAdjustment =
  existingAdjustmentModel && existingAdjustmentModel.schema.path("updatedBy")
    ? existingAdjustmentModel
    : model<AccountabilityAdjustmentRecord>("AccountabilityAdjustment", accountabilityAdjustmentSchema);

export default AccountabilityAdjustment;
