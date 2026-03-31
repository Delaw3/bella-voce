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
    assignmentDate: { type: Date, required: true, index: true },
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

const existingPsalmistModel = models.Psalmist as Model<PsalmistRecord> | undefined;
const existingAssignmentDatePath = existingPsalmistModel?.schema.path("assignmentDate") as
  | { options?: { unique?: boolean } }
  | undefined;

if (
  process.env.NODE_ENV !== "production" &&
  models.Psalmist &&
  existingAssignmentDatePath?.options?.unique
) {
  delete models.Psalmist;
}

const Psalmist =
  (models.Psalmist as Model<PsalmistRecord> | undefined) ?? model<PsalmistRecord>("Psalmist", psalmistSchema);

let psalmistIndexMigrationPromise: Promise<void> | null = null;

export async function ensurePsalmistIndexes() {
  if (!psalmistIndexMigrationPromise) {
    psalmistIndexMigrationPromise = (async () => {
      try {
        const indexes = await Psalmist.collection.indexes();
        const assignmentDateIndex = indexes.find((index) => index.name === "assignmentDate_1");

        if (assignmentDateIndex?.unique) {
          await Psalmist.collection.dropIndex("assignmentDate_1");
        }
      } catch {
        // Ignore index cleanup failures so reads and writes can continue.
      }
    })();
  }

  await psalmistIndexMigrationPromise;
}

export default Psalmist;
