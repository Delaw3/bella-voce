export const cacheKeys = {
  adminDashboardSummary: () => "admin:dashboard:summary",
  adminAnalytics: (year: number) => `admin:analytics:summary:${year}`,
  adminMembersList: (page: number, limit: number, query: string) =>
    `admin:members:list:page:${page}:limit:${limit}:q:${encodeURIComponent(query)}`,
  adminNotificationsList: () => "admin:notifications:list",
  adminPaymentAccountsList: () => "admin:payment-accounts:list",
  adminPaymentAccount: (id: string) => `admin:payment-accounts:item:${id}`,
  adminPaymentTransactionsList: (page: number, limit: number, status: string, query: string) =>
    `admin:payments:list:page:${page}:limit:${limit}:status:${status}:q:${encodeURIComponent(query)}`,
  adminPaymentTransaction: (id: string) => `admin:payments:item:${id}`,
  accountabilitySettings: () => "config:accountability:default",
  userDashboardSummary: (userId: string, year: number) => `user:${userId}:dashboard:summary:${year}`,
  userNotifications: (userId: string) => `user:${userId}:notifications:list`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userMonthlyDues: (userId: string, year: number) => `user:${userId}:monthly-dues:${year}`,
  userPaymentHistory: (userId: string) => `user:${userId}:payments:history`,
  userPaymentTransaction: (userId: string, transactionId: string) =>
    `user:${userId}:payments:item:${transactionId}`,
  userOutstandingPayments: (userId: string, year: number) => `user:${userId}:payments:outstanding:${year}`,
  activePaymentAccounts: () => "payments:accounts:active",
} as const;

export const cachePrefixes = {
  userRoot: () => "user:",
  userDashboard: (userId: string) => `user:${userId}:dashboard:`,
  userNotifications: (userId: string) => `user:${userId}:notifications:`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userPayments: (userId: string) => `user:${userId}:payments:`,
  userMonthlyDues: (userId: string) => `user:${userId}:monthly-dues:`,
  adminDashboard: () => "admin:dashboard:",
  adminAnalytics: () => "admin:analytics:",
  adminMembers: () => "admin:members:",
  adminNotifications: () => "admin:notifications:",
  adminPaymentAccounts: () => "admin:payment-accounts:",
  adminPayments: () => "admin:payments:",
  accountabilitySettings: () => "config:accountability:",
  paymentAccounts: () => "payments:accounts:",
} as const;
