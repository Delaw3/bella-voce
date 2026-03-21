import { Model, Schema, model, models } from "mongoose";

export type UserFinanceRecord = {
  userId: Schema.Types.ObjectId;
  pledged: number;
  pledgedReason?: string;
  fine: number;
  fineReason?: string;
  levy: number;
  levyReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

const userFinanceSchema = new Schema<UserFinanceRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    pledged: { type: Number, default: 0, min: 0 },
    pledgedReason: { type: String, trim: true, default: "" },
    fine: { type: Number, default: 0, min: 0 },
    fineReason: { type: String, trim: true, default: "" },
    levy: { type: Number, default: 0, min: 0 },
    levyReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const existingUserFinanceModel = models.UserFinance as Model<UserFinanceRecord> | undefined;

if (existingUserFinanceModel && !existingUserFinanceModel.schema.path("pledgedReason")) {
  delete models.UserFinance;
}

const UserFinance =
  existingUserFinanceModel && existingUserFinanceModel.schema.path("pledgedReason")
    ? existingUserFinanceModel
    : model<UserFinanceRecord>("UserFinance", userFinanceSchema);

export default UserFinance;
