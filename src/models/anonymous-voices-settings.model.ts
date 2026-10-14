import { Model, Schema, model, models } from "mongoose";

export type AnonymousVoicesSettingsRecord = {
  key: "default";
  enabled: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  updatedBy?: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const anonymousVoicesSettingsSchema = new Schema<AnonymousVoicesSettingsRecord>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enabled: { type: Boolean, default: false },
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    collection: "anonymous_voices_settings",
  },
);

const AnonymousVoicesSettings =
  (models.AnonymousVoicesSettings as Model<AnonymousVoicesSettingsRecord> | undefined) ??
  model<AnonymousVoicesSettingsRecord>("AnonymousVoicesSettings", anonymousVoicesSettingsSchema);

export default AnonymousVoicesSettings;
