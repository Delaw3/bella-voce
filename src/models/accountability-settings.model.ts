import { MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { Model, Schema, model, models } from "mongoose";

export type AccountabilitySettingsRecord = {
  key: "default";
  monthlyDues: number;
  latenessFee: number;
  absentFee: number;
  monthlyDuesStartYear: number;
  createdAt: Date;
  updatedAt: Date;
};

const accountabilitySettingsSchema = new Schema<AccountabilitySettingsRecord>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    monthlyDues: { type: Number, default: 0, min: 0 },
    latenessFee: { type: Number, default: 0, min: 0 },
    absentFee: { type: Number, default: 0, min: 0 },
    monthlyDuesStartYear: { type: Number, default: MONTHLY_DUES_YEAR_OPTIONS[0], enum: MONTHLY_DUES_YEAR_OPTIONS },
  },
  {
    timestamps: true,
    collection: "accountability_settings",
  },
);

const existingAccountabilitySettingsModel = models.AccountabilitySettings as
  | Model<AccountabilitySettingsRecord>
  | undefined;

if (existingAccountabilitySettingsModel && !existingAccountabilitySettingsModel.schema.path("monthlyDuesStartYear")) {
  delete models.AccountabilitySettings;
}

const AccountabilitySettings =
  existingAccountabilitySettingsModel && existingAccountabilitySettingsModel.schema.path("monthlyDuesStartYear")
    ? existingAccountabilitySettingsModel
    : model<AccountabilitySettingsRecord>("AccountabilitySettings", accountabilitySettingsSchema);

export default AccountabilitySettings;
