export const COMPLAINT_STATUSES = ["NEW", "READ", "RESOLVED"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_SUBJECT_MAX_LENGTH = 120;
export const COMPLAINT_MESSAGE_MAX_LENGTH = 2000;
export const DEFAULT_COMPLAINT_PAGE = 1;
export const DEFAULT_COMPLAINT_LIMIT = 10;
export const MAX_COMPLAINT_LIMIT = 50;
