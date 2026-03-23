export type DebtBreakdown = {
  monthlyDues: number;
  absentFee: number;
  latenessFee: number;
  pledged: number;
  fine: number;
  levy: number;
  totalOwed: number;
};

export type DebtMonthlyDueDetail = {
  year: number;
  month: string;
  monthNumber: number;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidAt?: string;
};

export type DebtAttendanceDetail = {
  id: string;
  date: string;
  amount: number;
  status: "LATE" | "ABSENT";
};

export type DebtAdjustmentDetail = {
  id: string;
  date: string;
  amount: number;
  reason: string;
  type: "PLEDGED" | "FINE" | "LEVY";
};

export type DebtDetailBreakdown = {
  monthlyDues: DebtMonthlyDueDetail[];
  absentFee: DebtAttendanceDetail[];
  latenessFee: DebtAttendanceDetail[];
  pledged: DebtAdjustmentDetail[];
  fine: DebtAdjustmentDetail[];
  levy: DebtAdjustmentDetail[];
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "REMINDER" | "ALERT";
  isRead: boolean;
  createdAt: string;
  route?: string;
};

export type ExcuseItem = {
  id: string;
  subject: string;
  reason: string;
  excuseDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
};

export type MonthlyDueItem = {
  month: string;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidAt?: string;
};

export type AttendanceHistoryItem = {
  id: string;
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  createdAt: string;
  updatedAt: string;
};

export type MemberItem = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  educationLevel?: string;
  voicePart?: string;
  stateOfOrigin?: string;
  lga?: string;
  posts?: string[];
  profilePicture?: string;
};

export type DashboardSummaryResponse = {
  debt: DebtBreakdown;
  debtDetails: DebtDetailBreakdown;
  notifications: NotificationItem[];
  activeAlert: NotificationItem | null;
  unreadNotificationCount: number;
  excusePreview: ExcuseItem[];
  monthlyDuesPreview: MonthlyDueItem[];
};

export type ProfileInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  stateOfOrigin?: string;
  lga?: string;
  educationLevel?: string;
  voicePart?: string;
  choirLevel?: string;
  posts?: string[];
  permissions?: string[];
  role?: string;
  status?: string;
  profilePicture?: string;
};

export type ChoirFinanceType = "INCOME" | "EXPENSE";

export type ChoirFinanceEntry = {
  id: string;
  type: ChoirFinanceType;
  amount: number;
  description: string;
  financeDate: string;
  postedBy?: string;
  editedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChoirFinanceSummary = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
};

export type ChoirFinancePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ChoirFinanceResponse = {
  summary: ChoirFinanceSummary;
  entries: ChoirFinanceEntry[];
  pagination: ChoirFinancePagination;
};

export type SongSelectionListItem = {
  id: string;
  title: string;
  selectionDate: string;
};

export type SongSelectionDetailItem = {
  part: string;
  song: string;
  key: string;
};

export type SongSelectionDetail = {
  id: string;
  title: string;
  selectionDate: string;
  songs: SongSelectionDetailItem[];
};

export type PsalmistScheduleItem = {
  id: string;
  assignmentDate: string;
  monthKey: string;
  year: number;
  month: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    voicePart?: string;
    profilePicture?: string;
  } | null;
};
