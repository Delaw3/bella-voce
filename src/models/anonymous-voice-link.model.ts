import { Model, Schema, model, models } from "mongoose";

export type AnonymousVoiceLinkRecord = {
  key: "default";
  tokenHash: string;
  label: string | null;
  isActive: boolean;
  createdBy?: Schema.Types.ObjectId | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const anonymousVoiceLinkSchema = new Schema<AnonymousVoiceLinkRecord>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    tokenHash: { type: String, required: true },
    label: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "anonymous_voice_links",
  },
);

const AnonymousVoiceLink =
  (models.AnonymousVoiceLink as Model<AnonymousVoiceLinkRecord> | undefined) ??
  model<AnonymousVoiceLinkRecord>("AnonymousVoiceLink", anonymousVoiceLinkSchema);

export default AnonymousVoiceLink;
