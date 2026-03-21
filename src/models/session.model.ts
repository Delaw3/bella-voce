import { Model, Schema, model, models } from "mongoose";

export type SessionRecord = {
  userId: Schema.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const sessionSchema = new Schema<SessionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session =
  (models.Session as Model<SessionRecord> | undefined) ??
  model<SessionRecord>("Session", sessionSchema);

export default Session;
