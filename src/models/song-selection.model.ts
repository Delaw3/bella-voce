import { Model, Schema, model, models } from "mongoose";

export const SONG_SELECTION_STATUSES = ["IN_REVIEW", "POSTED"] as const;
export type SongSelectionStatus = (typeof SONG_SELECTION_STATUSES)[number];

export type SongSelectionItem = {
  part?: string;
  song?: string;
  key?: string;
};

export type SongSelectionRecord = {
  title: string;
  selectionDate: Date;
  songs: SongSelectionItem[];
  status: SongSelectionStatus;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const songItemSchema = new Schema<SongSelectionItem>(
  {
    part: { type: String, trim: true, default: "" },
    song: { type: String, trim: true, default: "" },
    key: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const songSelectionSchema = new Schema<SongSelectionRecord>(
  {
    title: { type: String, required: true, trim: true },
    selectionDate: { type: Date, required: true, index: true },
    songs: { type: [songItemSchema], default: [] },
    status: { type: String, enum: SONG_SELECTION_STATUSES, default: "IN_REVIEW", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && models.SongSelection) {
  delete models.SongSelection;
}

const SongSelection =
  (models.SongSelection as Model<SongSelectionRecord> | undefined) ??
  model<SongSelectionRecord>("SongSelection", songSelectionSchema);

export default SongSelection;
