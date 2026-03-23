import { Model, Schema, model, models } from "mongoose";

export type PsalmistRecord = {
  assignmentDate: Date;
  monthKey: string;
  year: number;
  month: number;
  userId: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const psalmistSchema = new Schema<PsalmistRecord>(
  {
    assignmentDate: { type: Date, required: true, index: true, unique: true },
    monthKey: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

psalmistSchema.index({ monthKey: 1, assignmentDate: 1 });
psalmistSchema.index({ userId: 1, monthKey: 1 });

if (process.env.NODE_ENV !== "production" && models.Psalmist) {
  delete models.Psalmist;
}

const Psalmist =
  (models.Psalmist as Model<PsalmistRecord> | undefined) ?? model<PsalmistRecord>("Psalmist", psalmistSchema);

export default Psalmist;
