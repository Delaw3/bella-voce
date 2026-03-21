import { Model, Schema, model, models } from "mongoose";

export const NOTIFICATION_TYPES = ["INFO", "REMINDER", "ALERT"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationRecord = {
  userId: Schema.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "INFO" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Notification =
  (models.Notification as Model<NotificationRecord> | undefined) ??
  model<NotificationRecord>("Notification", notificationSchema);

export default Notification;
