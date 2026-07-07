export type Transaction = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  source: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  note: string | null;
  createdAt: string;
};

export type ChartPoint = {
  label: string;
  grossIncome: number;
  ofFees: number;
  netIncome: number;
  expenses: number;
  result: number;
  roi: number | null;
};

export type PeriodSummary = {
  period: "yesterday" | "today" | "week" | "month" | "alltime";
  from: string;
  to: string;
  granularity: "hour" | "day" | "month";
  grossIncome: number;
  ofFees: number;
  netIncome: number;
  expenses: number;
  result: number;
  roi: number | null;
  balance: number;
  avgDailyExpense: number;
  reinvestReserve: number;
  salaryAvailable: number;
  points: ChartPoint[];
};
