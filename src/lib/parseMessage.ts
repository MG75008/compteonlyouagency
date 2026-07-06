type IncomeRule = { keywords: string[]; source: string; applyOfFee: boolean };
type ExpenseRule = { keywords: string[]; source: string };

const INCOME_RULES: IncomeRule[] = [
  { keywords: ["onlyfans", "of"], source: "OnlyFans", applyOfFee: true },
  {
    keywords: ["revenu", "rentree", "rentree d'argent", "income", "entree"],
    source: "Autre revenu",
    applyOfFee: false,
  },
];

const EXPENSE_RULES: ExpenseRule[] = [
  { keywords: ["topup", "top up", "recharge"], source: "Top up" },
  { keywords: ["depense", "sortie", "expense", "achat"], source: "Depense" },
];

export type ParsedTransaction =
  | {
      kind: "income";
      source: string;
      applyOfFee: boolean;
      gross: number;
      note?: string;
    }
  | { kind: "expense"; source: string; amount: number; note?: string };

export type ParseResult =
  | { ok: true; data: ParsedTransaction }
  | { ok: false; reason: "empty" | "no-amount" | "unknown-format" };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function extractAmount(s: string): { amount: number; rest: string } | null {
  const m = s.match(/(\d[\d\s.,]*)/);
  if (!m || m.index === undefined) return null;
  let raw = m[1].trim();
  const rest = (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length))
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  raw = raw.replace(/\s/g, "");
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }
  const amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, rest };
}

function matchKeyword(
  normalized: string,
  keywords: string[]
): { remainder: string } | null {
  for (const kw of keywords) {
    if (normalized === kw) return { remainder: "" };
    if (normalized.startsWith(kw + " ") || normalized.startsWith(kw + ":")) {
      return { remainder: normalized.slice(kw.length).replace(/^:/, "").trim() };
    }
  }
  return null;
}

export function parseMessage(raw: string): ParseResult {
  const normalized = normalize(raw);
  if (!normalized) return { ok: false, reason: "empty" };

  for (const rule of INCOME_RULES) {
    const match = matchKeyword(normalized, rule.keywords);
    if (match) {
      const parsed = extractAmount(match.remainder);
      if (!parsed) return { ok: false, reason: "no-amount" };
      return {
        ok: true,
        data: {
          kind: "income",
          source: rule.source,
          applyOfFee: rule.applyOfFee,
          gross: parsed.amount,
          note: parsed.rest || undefined,
        },
      };
    }
  }

  for (const rule of EXPENSE_RULES) {
    const match = matchKeyword(normalized, rule.keywords);
    if (match) {
      const parsed = extractAmount(match.remainder);
      if (!parsed) return { ok: false, reason: "no-amount" };
      return {
        ok: true,
        data: {
          kind: "expense",
          source: rule.source,
          amount: parsed.amount,
          note: parsed.rest || undefined,
        },
      };
    }
  }

  return { ok: false, reason: "unknown-format" };
}
