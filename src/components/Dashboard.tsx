"use client";

import { useCallback, useEffect, useState } from "react";
import type { PeriodSummary, Transaction } from "@/lib/types";
import Chart from "@/components/Chart";
import Logo from "@/components/Logo";

type Metric = "income" | "expense" | "roi";
type ViewPeriod = "yesterday" | "today" | "week" | "month" | "alltime";

const ACCENT = "#3b82f6";

const METRICS: { key: Metric; label: string }[] = [
  { key: "income", label: "Rentrée" },
  { key: "expense", label: "Dépense" },
  { key: "roi", label: "ROI" },
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
    <div className="flex min-h-full w-full flex-col bg-brand-bg">
      <div className="sticky top-0 z-10 w-full border-b border-brand-border bg-brand-bg">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-3 py-1.5 text-xs text-brand-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  botConnected ? "bg-brand-income" : "bg-brand-muted"
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
            <div className="flex w-full gap-1 rounded-xl bg-brand-surface p-1 lg:max-w-2xl">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`flex-1 rounded-lg px-4 py-3 text-lg font-bold transition ${
                    metric === m.key
                      ? "bg-brand-surface-2 text-brand-text"
                      : "text-brand-muted hover:text-brand-text"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-brand-surface p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    period === p.key
                      ? "bg-brand-surface-2 text-brand-accent"
                      : "text-brand-muted hover:bg-brand-surface-2 hover:text-brand-text"
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
        <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
          <div className="text-sm text-brand-muted">
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
          <div className="mt-2 flex items-baseline gap-2" style={{ color: ACCENT }}>
            <span className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {metric === "roi" ? formatRoi(summary.roi, summary.netIncome) : money(total ?? 0)}
            </span>
            {metric !== "roi" && (
              <span className="text-lg font-medium text-brand-muted sm:text-xl">
                $
              </span>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-brand-muted">
                Chargement…
              </div>
            ) : (
              <Chart points={chartPoints} color={ACCENT} />
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-brand-border bg-brand-surface">
            <div className="border-b border-brand-border px-4 py-3 text-sm font-bold text-brand-text">
              Historique
            </div>
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-brand-muted">
                Chargement…
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-brand-muted">
                Aucune transaction
              </div>
            ) : (
              <ul className="max-h-[460px] divide-y divide-brand-border overflow-y-auto">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          t.type === "INCOME" ? "bg-brand-income" : "bg-brand-expense"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-brand-text">
                          {t.source}
                        </div>
                        <div className="text-xs text-brand-muted">
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
                          t.type === "INCOME" ? "text-brand-income" : "text-brand-expense"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "−"}
                        {money(t.netAmount)} $
                        {t.type === "INCOME" && t.feeAmount > 0 && (
                          <span className="ml-1 font-normal text-brand-muted">
                            net
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-brand-muted transition hover:text-brand-expense"
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
            className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-surface p-4"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectFormType("INCOME")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  formType === "INCOME"
                    ? "bg-brand-income text-brand-bg"
                    : "bg-brand-surface-2 text-brand-muted hover:text-brand-text"
                }`}
              >
                Revenu
              </button>
              <button
                type="button"
                onClick={() => selectFormType("EXPENSE")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  formType === "EXPENSE"
                    ? "bg-brand-expense text-brand-bg"
                    : "bg-brand-surface-2 text-brand-muted hover:text-brand-text"
                }`}
              >
                Dépense
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-brand-muted">
                  Source
                </label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-muted focus:border-brand-accent"
                  placeholder={formType === "INCOME" ? "OnlyFans" : "IG, essence…"}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-brand-muted">
                  Montant brut ($)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-muted focus:border-brand-accent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-brand-muted">
                Note (optionnel)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-muted focus:border-brand-accent"
                placeholder="Détail…"
              />
            </div>

            {formType === "INCOME" && (
              <label className="flex items-center gap-2 text-sm text-brand-muted">
                <input
                  type="checkbox"
                  checked={applyFee}
                  onChange={(e) => setApplyFee(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-border"
                />
                Appliquer la commission OnlyFans (20%)
              </label>
            )}

            {formType === "INCOME" && applyFee && amount && !isNaN(parseFloat(amount.replace(",", "."))) && (
              <div className="rounded-lg border border-brand-border bg-brand-surface-2 px-3 py-2 text-xs text-brand-muted">
                {money(parseFloat(amount.replace(",", ".")))} $ brut − 20% ={" "}
                <span className="font-semibold text-brand-income">
                  {money(parseFloat(amount.replace(",", ".")) * 0.8)} $ net
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-lg bg-brand-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
