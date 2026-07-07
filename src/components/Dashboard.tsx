"use client";

import { useCallback, useEffect, useState } from "react";
import type { PeriodSummary, Transaction } from "@/lib/types";
import Chart from "@/components/Chart";

type Metric = "income" | "expense" | "roi";
type ViewPeriod = "yesterday" | "today" | "week" | "month" | "alltime";

const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: "income", label: "Rentrée", color: "#059669" },
  { key: "expense", label: "Dépense", color: "#dc2626" },
  { key: "roi", label: "ROI", color: "#4f46e5" },
];

const PERIODS: { key: ViewPeriod; label: string }[] = [
  { key: "yesterday", label: "Hier" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "alltime", label: "Tout" },
];

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(dt);
}

function money(n: number): string {
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function metricValue(
  s: Pick<PeriodSummary, "netIncome" | "expenses" | "result" | "roi">,
  metric: Metric
): number | null {
  if (metric === "income") return s.netIncome;
  if (metric === "expense") return s.expenses;
  if (metric === "roi") return s.roi;
  return s.result;
}

function formatRoi(roi: number | null, netIncome: number): string {
  if (roi === null) return netIncome > 0 ? "∞" : "—";
  return `${money(roi)}x`;
}

const emptySummary: PeriodSummary = {
  period: "alltime",
  from: "",
  to: "",
  granularity: "day",
  grossIncome: 0,
  ofFees: 0,
  netIncome: 0,
  expenses: 0,
  result: 0,
  roi: null,
  balance: 0,
  avgDailyExpense: 0,
  reinvestReserve: 0,
  salaryAvailable: 0,
  points: [],
};

export default function Dashboard() {
  const [period, setPeriod] = useState<ViewPeriod>("alltime");
  const [metric, setMetric] = useState<Metric>("income");
  const [summary, setSummary] = useState<PeriodSummary>(emptySummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [botConnected, setBotConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [source, setSource] = useState("OnlyFans");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [applyFee, setApplyFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async (p: ViewPeriod) => {
    setLoading(true);
    const [summaryRes, txRes] = await Promise.all([
      fetch(`/api/summary?period=${p}`).then((r) => r.json()),
      fetch(`/api/transactions?period=${p}`).then((r) => r.json()),
    ]);
    setSummary(summaryRes);
    setTransactions(txRes.transactions);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on period change
    refresh(period);
  }, [period, refresh]);

  useEffect(() => {
    fetch("/api/telegram/status")
      .then((r) => r.json())
      .then((d) => setBotConnected(d.connected));
  }, []);

  function selectFormType(next: "INCOME" | "EXPENSE") {
    setFormType(next);
    setSource(next === "INCOME" ? "OnlyFans" : "");
    setApplyFee(next === "INCOME");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return;
    setSubmitting(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: formType,
        source: source || (formType === "INCOME" ? "OnlyFans" : "Dépense"),
        amount: value,
        applyOfFee: formType === "INCOME" ? applyFee : false,
        note,
      }),
    });
    setAmount("");
    setNote("");
    setSubmitting(false);
    refresh(period);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    refresh(period);
  }

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const total = metricValue(summary, metric);
  const chartPoints = summary.points.map((p) => ({
    label: p.label,
    value: metricValue(p, metric) ?? 0,
  }));

  return (
    <div className="flex min-h-full w-full flex-col bg-neutral-50">
      <div className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                Ma Compta
              </h1>
              <p className="text-sm text-neutral-500">
                Revenus OnlyFans & dépenses au quotidien
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  botConnected ? "bg-emerald-500" : "bg-neutral-300"
                }`}
              />
              {botConnected === null
                ? "Bot Telegram…"
                : botConnected
                ? "Bot connecté"
                : "Bot non connecté"}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full gap-1 rounded-xl bg-neutral-100 p-1 lg:max-w-2xl">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`flex-1 rounded-lg px-4 py-3 text-lg font-semibold transition ${
                    metric === m.key
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    period === p.key
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm text-neutral-400">
                {activeMetric.label}
                {metric === "income" && " (net, commission OnlyFans 20% déduite)"}
                {metric === "roi" && " (revenus nets ÷ dépenses)"}
                {summary.from && summary.to && (
                  <>
                    {" "}
                    · {formatShort(summary.from)} – {formatShort(summary.to)}
                  </>
                )}
              </div>
              <div
                className="mt-1 text-4xl font-bold sm:text-5xl"
                style={{ color: activeMetric.color }}
              >
                {metric === "roi" ? formatRoi(summary.roi, summary.netIncome) : `${money(total ?? 0)} $`}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-50 px-4 py-3">
              <div className="text-xs text-neutral-400">Salaire possible</div>
              <div
                className={`mt-0.5 text-lg font-semibold ${
                  summary.salaryAvailable > 0 ? "text-neutral-900" : "text-red-600"
                }`}
              >
                {money(summary.salaryAvailable)} $
              </div>
              <div className="mt-1 text-[11px] text-neutral-400">
                Solde {money(summary.balance)} $ − réserve réinvest.{" "}
                {money(summary.reinvestReserve)} $ (
                {money(summary.avgDailyExpense)} $/jour × 7j)
              </div>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-neutral-400">
                Chargement…
              </div>
            ) : (
              <Chart points={chartPoints} color={activeMetric.color} />
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
              Historique
            </div>
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-400">
                Chargement…
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-400">
                Aucune transaction
              </div>
            ) : (
              <ul className="max-h-[460px] divide-y divide-neutral-100 overflow-y-auto">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          t.type === "INCOME" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {t.source}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {formatShort(t.date.slice(0, 10))}
                          {t.type === "INCOME" && t.feeAmount > 0 && (
                            <>
                              {" "}
                              · {money(t.grossAmount)} $ brut − 20% commission
                              ({money(t.feeAmount)} $)
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "−"}
                        {money(t.netAmount)} $
                        {t.type === "INCOME" && t.feeAmount > 0 && (
                          <span className="ml-1 font-normal text-neutral-400">
                            net
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-neutral-300 transition hover:text-red-500"
                        aria-label="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectFormType("INCOME")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  formType === "INCOME"
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                Revenu
              </button>
              <button
                type="button"
                onClick={() => selectFormType("EXPENSE")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  formType === "EXPENSE"
                    ? "bg-red-600 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                Dépense
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">
                  Source
                </label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  placeholder={formType === "INCOME" ? "OnlyFans" : "IG, essence…"}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">
                  Montant brut ($)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">
                Note (optionnel)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                placeholder="Détail…"
              />
            </div>

            {formType === "INCOME" && (
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={applyFee}
                  onChange={(e) => setApplyFee(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Appliquer la commission OnlyFans (20%)
              </label>
            )}

            {formType === "INCOME" && applyFee && amount && !isNaN(parseFloat(amount.replace(",", "."))) && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {money(parseFloat(amount.replace(",", ".")))} $ brut − 20% ={" "}
                <span className="font-semibold">
                  {money(parseFloat(amount.replace(",", ".")) * 0.8)} $ net
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
