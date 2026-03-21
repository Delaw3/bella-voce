import { COMPLAINT_STATUSES, ComplaintStatus } from "@/lib/complaint-config";
import { Model, Schema, model, models } from "mongoose";

export type ComplaintRecord = {
  userId: Schema.Types.ObjectId;
  subject: string;
  message: string;
  status: ComplaintStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
};

const complaintSchema = new Schema<ComplaintRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: "NEW", index: true },
    adminNote: { type: String, trim: true },
  },
  { timestamps: true },
);

complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

const Complaint =
  (models.Complaint as Model<ComplaintRecord> | undefined) ??
  model<ComplaintRecord>("Complaint", complaintSchema);

export default Complaint;
