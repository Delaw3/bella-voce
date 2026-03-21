import {
  COMPLAINT_MESSAGE_MAX_LENGTH,
  COMPLAINT_STATUSES,
  COMPLAINT_SUBJECT_MAX_LENGTH,
  DEFAULT_COMPLAINT_LIMIT,
  DEFAULT_COMPLAINT_PAGE,
  MAX_COMPLAINT_LIMIT,
  ComplaintStatus,
} from "@/lib/complaint-config";

export {
  COMPLAINT_MESSAGE_MAX_LENGTH,
  COMPLAINT_SUBJECT_MAX_LENGTH,
  DEFAULT_COMPLAINT_LIMIT,
  DEFAULT_COMPLAINT_PAGE,
  MAX_COMPLAINT_LIMIT,
};

export type ComplaintInput = {
  subject: string;
  message: string;
};

export function parseComplaintInput(payload: { subject?: string; message?: string }): ComplaintInput | null {
  const subject = payload.subject?.trim() ?? "";
  const message = payload.message?.trim() ?? "";

  if (!subject || !message) {
    return null;
  }

  if (subject.length > COMPLAINT_SUBJECT_MAX_LENGTH || message.length > COMPLAINT_MESSAGE_MAX_LENGTH) {
    return null;
  }

  return { subject, message };
}

export function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function parseComplaintStatus(value?: string): ComplaintStatus | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (!COMPLAINT_STATUSES.includes(normalized as ComplaintStatus)) {
    return null;
  }

  return normalized as ComplaintStatus;
}

type ComplaintDocument = {
  _id: { toString(): string };
  subject: string;
  message: string;
  status: ComplaintStatus;
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId?: {
    _id?: { toString(): string };
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  } | { toString(): string } | null;
};

export function serializeComplaint(complaint: ComplaintDocument) {
  const sender =
    complaint.userId && typeof complaint.userId === "object" && "_id" in complaint.userId
      ? complaint.userId
      : null;

  return {
    id: complaint._id.toString(),
    subject: complaint.subject,
    message: complaint.message,
    status: complaint.status,
    adminNote: complaint.adminNote ?? "",
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
    sender: sender
      ? {
          id: sender._id?.toString() ?? "",
          firstName: sender.firstName ?? "",
          lastName: sender.lastName ?? "",
          profilePicture: sender.profilePicture ?? "",
        }
      : null,
  };
}
