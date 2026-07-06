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

export type DaySummary = {
  date: string;
  grossIncome: number;
  ofFees: number;
  netIncome: number;
  expenses: number;
  result: number;
};

export type PeriodSummary = DaySummary & {
  period: "day" | "week" | "month";
  from: string;
  to: string;
  history?: DaySummary[];
};
