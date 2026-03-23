import { Model, Schema, model, models } from "mongoose";

export type PushSubscriptionRecord = {
  userId: Schema.Types.ObjectId;
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
};

const pushSubscriptionSchema = new Schema<PushSubscriptionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, trim: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true, trim: true },
      auth: { type: String, required: true, trim: true },
    },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true, collection: "push_subscriptions" },
);

pushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

const PushSubscriptionModel =
  (models.PushSubscription as Model<PushSubscriptionRecord> | undefined) ??
  model<PushSubscriptionRecord>("PushSubscription", pushSubscriptionSchema);

export default PushSubscriptionModel;
