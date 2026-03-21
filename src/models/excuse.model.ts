import { Model, Schema, model, models } from "mongoose";

export const EXCUSE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ExcuseStatus = (typeof EXCUSE_STATUSES)[number];

export type ExcuseRecord = {
  userId: Schema.Types.ObjectId;
  subject: string;
  reason: string;
  excuseDate: Date;
  status: ExcuseStatus;
  adminComment?: string;
  createdAt: Date;
  updatedAt: Date;
};

const excuseSchema = new Schema<ExcuseRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    excuseDate: { type: Date, required: true },
    status: { type: String, enum: EXCUSE_STATUSES, default: "PENDING", index: true },
    adminComment: { type: String, trim: true },
  },
  { timestamps: true },
);

const Excuse =
  (models.Excuse as Model<ExcuseRecord> | undefined) ?? model<ExcuseRecord>("Excuse", excuseSchema);

export default Excuse;
