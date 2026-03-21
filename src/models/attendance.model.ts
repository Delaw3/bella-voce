import { Model, Schema, model, models } from "mongoose";

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceRecord = {
  userId: Schema.Types.ObjectId;
  date: Date;
  present: boolean;
  late: boolean;
  absent: boolean;
  excused: boolean;
  status?: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AttendanceState = {
  present: boolean;
  late: boolean;
  absent: boolean;
  excused: boolean;
};

export function normalizeAttendanceState(input?: Partial<AttendanceRecord> | null): AttendanceState {
  if (!input) {
    return { present: false, late: false, absent: false, excused: false };
  }

  if (
    typeof input.present === "boolean" ||
    typeof input.late === "boolean" ||
    typeof input.absent === "boolean" ||
    typeof input.excused === "boolean"
  ) {
    return {
      present: Boolean(input.present),
      late: Boolean(input.late),
      absent: Boolean(input.absent),
      excused: Boolean(input.excused),
    };
  }

  return {
    present: input.status === "PRESENT" || input.status === "LATE",
    late: input.status === "LATE",
    absent: input.status === "ABSENT",
    excused: input.status === "EXCUSED",
  };
}

export function attendanceStatusToState(status: AttendanceStatus): AttendanceState {
  if (status === "ABSENT") {
    return { present: false, late: false, absent: true, excused: false };
  }

  if (status === "EXCUSED") {
    return { present: false, late: false, absent: false, excused: true };
  }

  if (status === "LATE") {
    return { present: true, late: true, absent: false, excused: false };
  }

  return { present: true, late: false, absent: false, excused: false };
}

export function getPrimaryAttendanceStatus(state: AttendanceState): AttendanceStatus | null {
  if (state.excused) return "EXCUSED";
  if (state.absent) return "ABSENT";
  if (state.late) return "LATE";
  if (state.present) return "PRESENT";
  return null;
}

const attendanceSchema = new Schema<AttendanceRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    present: { type: Boolean, default: false },
    late: { type: Boolean, default: false },
    absent: { type: Boolean, default: false },
    excused: { type: Boolean, default: false },
    status: { type: String, enum: ATTENDANCE_STATUSES },
  },
  {
    timestamps: true,
    collection: "attendance_records",
  },
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const existingAttendanceModel = models.Attendance as Model<AttendanceRecord> | undefined;

if (existingAttendanceModel && (!existingAttendanceModel.schema.path("present") || !existingAttendanceModel.schema.path("excused"))) {
  delete models.Attendance;
}

const Attendance =
  existingAttendanceModel && existingAttendanceModel.schema.path("present") && existingAttendanceModel.schema.path("excused")
    ? existingAttendanceModel
    : model<AttendanceRecord>("Attendance", attendanceSchema);

export default Attendance;
