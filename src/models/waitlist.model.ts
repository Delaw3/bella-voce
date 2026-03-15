import { Model, Schema, model, models } from "mongoose";

export type WaitlistRecord = {
  firstName: string;
  lastName: string;
  email: string;
  uniqueId: string;
  source: string;
  signupCompleted: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const waitlistSchema = new Schema<WaitlistRecord>(
  {
    firstName: { type: String, required: true, trim: true, lowercase: true },
    lastName: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    uniqueId: { type: String, required: true, unique: true },
    source: { type: String, default: "WAITLIST" },
    signupCompleted: { type: Boolean, default: false },
    status: { type: String, default: "PENDING_SIGNUP" },
  },
  { timestamps: true },
);

const Waitlist =
  (models.Waitlist as Model<WaitlistRecord> | undefined) ??
  model<WaitlistRecord>("Waitlist", waitlistSchema);

export default Waitlist;
