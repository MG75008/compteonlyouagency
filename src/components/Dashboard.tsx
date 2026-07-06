"use client";

import { useCallback, useEffect, useState } from "react";
import type { DaySummary, Transaction } from "@/lib/types";

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const label = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function money(n: number): string {
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const emptySummary: DaySummary = {
  date: "",
  grossIncome: 0,
  ofFees: 0,
  netIncome: 0,
  expenses: 0,
  result: 0,
};

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState<DaySummary>(emptySummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<DaySummary[]>([]);
  const [botConnected, setBotConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [source, setSource] = useState("OnlyFans");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [applyFee, setApplyFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async (d: string) => {
    setLoading(true);
    const [summaryRes, txRes, historyRes] = await Promise.all([
      fetch(`/api/summary?date=${d}`).then((r) => r.json()),
      fetch(`/api/transactions?date=${d}`).then((r) => r.json()),
      fetch(`/api/summary?date=${d}&days=7`).then((r) => r.json()),
    ]);
    setSummary(summaryRes);
    setTransactions(txRes.transactions);
    setHistory(historyRes.history);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on date change
    refresh(date);
  }, [date, refresh]);

  useEffect(() => {
    fetch("/api/telegram/status")
      .then((r) => r.json())
      .then((d) => setBotConnected(d.connected));
  }, []);

  function selectFormType(next: "INCOME" | "EXPENSE") {
    setFormType(next);
    setSource(next === "INCOME" ? "OnlyFans" : "Top up");
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
        source,
        amount: value,
        applyOfFee: formType === "INCOME" ? applyFee : false,
        note,
        date: `${date}T12:00:00`,
      }),
    });
    setAmount("");
    setNote("");
    setSubmitting(false);
    refresh(date);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    refresh(date);
  }

  const isToday = date === todayStr();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between">
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
      </header>

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="rounded-lg px-2 py-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Jour précédent"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-sm font-medium text-neutral-900">
            {formatDateLabel(date)}
          </div>
          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-600"
            >
              revenir à aujourd&apos;hui
            </button>
          )}
        </div>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          className="rounded-lg px-2 py-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Jour suivant"
          disabled={isToday}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Revenus bruts" value={summary.grossIncome} />
        <SummaryCard label="Commission OF" value={-summary.ofFees} muted />
        <SummaryCard label="Dépenses" value={-summary.expenses} muted />
        <SummaryCard label="Résultat net" value={summary.result} highlight />
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
              placeholder="OnlyFans, Top up…"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">
              Montant ($)
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

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
          Transactions du jour
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-400">
            Chargement…
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-400">
            Aucune transaction ce jour-là
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
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
                    {t.note && (
                      <div className="text-xs text-neutral-400">{t.note}</div>
                    )}
                    {t.type === "INCOME" && t.feeAmount > 0 && (
                      <div className="text-xs text-neutral-400">
                        Brut {money(t.grossAmount)} $ − commission{" "}
                        {money(t.feeAmount)} $
                      </div>
                    )}
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

      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
          7 derniers jours
        </div>
        <ul className="divide-y divide-neutral-100">
          {history.map((h) => (
            <li
              key={h.date}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <button
                onClick={() => setDate(h.date)}
                className="text-neutral-500 hover:text-neutral-900 hover:underline"
              >
                {new Intl.DateTimeFormat("fr-FR", {
                  timeZone: "UTC",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(new Date(`${h.date}T00:00:00Z`))}
              </button>
              <span className="text-neutral-400">
                net {money(h.netIncome)} $
              </span>
              <span className="text-neutral-400">
                dép. {money(h.expenses)} $
              </span>
              <span
                className={`font-medium ${
                  h.result >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {money(h.result)} $
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-neutral-900 bg-neutral-900"
          : "border-neutral-200 bg-white"
      }`}
    >
      <div
        className={`text-xs ${
          highlight ? "text-neutral-400" : "text-neutral-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold ${
          highlight
            ? "text-white"
            : muted
            ? "text-neutral-400"
            : value < 0
            ? "text-red-600"
            : "text-neutral-900"
        }`}
      >
        {value < 0 ? "−" : ""}
        {money(Math.abs(value))} $
      </div>
    </div>
  );
}
