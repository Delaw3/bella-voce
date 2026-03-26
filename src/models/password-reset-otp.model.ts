import { Model, Schema, model, models } from "mongoose";

export type PasswordResetOtpRecord = {
  userId: Schema.Types.ObjectId;
  email: string;
  otpHash: string;
  resetTokenHash?: string;
  expiresAt: Date;
  verifiedAt?: Date | null;
  consumedAt?: Date | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
};

const passwordResetOtpSchema = new Schema<PasswordResetOtpRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    otpHash: { type: String, required: true },
    resetTokenHash: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    verifiedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "password_reset_otps",
  },
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetOtp =
  (models.PasswordResetOtp as Model<PasswordResetOtpRecord> | undefined) ??
  model<PasswordResetOtpRecord>("PasswordResetOtp", passwordResetOtpSchema);

export default PasswordResetOtp;
