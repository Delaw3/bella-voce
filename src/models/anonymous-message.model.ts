import { Model, Schema, model, models } from "mongoose";
import { ANONYMOUS_MESSAGE_STATUSES, AnonymousMessageStatus } from "@/lib/anonymous-voices/client";

export { ANONYMOUS_MESSAGE_STATUSES };
export type { AnonymousMessageStatus };

export type AnonymousMessageRecord = {
  message: string;
  status: AnonymousMessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

const anonymousMessageSchema = new Schema<AnonymousMessageRecord>(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ANONYMOUS_MESSAGE_STATUSES,
      default: "NEW",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "anonymous_messages",
  },
);

anonymousMessageSchema.index({ createdAt: -1 });
anonymousMessageSchema.index({ status: 1, createdAt: -1 });

const AnonymousMessage =
  (models.AnonymousMessage as Model<AnonymousMessageRecord> | undefined) ??
  model<AnonymousMessageRecord>("AnonymousMessage", anonymousMessageSchema);

export default AnonymousMessage;
