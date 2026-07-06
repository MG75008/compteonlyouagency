const INCOME_KEYWORDS = ["onlyfans", "of"];

const EXPENSE_FILLER_WORDS = [
  "depense",
  "dépense",
  "topup",
  "top up",
  "recharge",
  "sortie",
  "expense",
  "achat",
  "pour",
];

export type ParsedTransaction =
  | { kind: "income"; source: string; applyOfFee: boolean; gross: number; note?: string }
  | { kind: "expense"; source: string; amount: number; note?: string };

export type ParseResult =
  | { ok: true; data: ParsedTransaction }
  | { ok: false; reason: "empty" | "no-amount" };

function matchPrefix(text: string, keyword: string): string | null {
  const lower = text.toLowerCase();
  if (lower === keyword) return "";
  if (lower.startsWith(keyword + " ") || lower.startsWith(keyword + ":")) {
    return text.slice(keyword.length).replace(/^:/, "").trim();
  }
  return null;
}

function extractAmount(
  s: string
): { amount: number; before: string; after: string } | null {
  const m = s.match(/(\d[\d\s.,]*)/);
  if (!m || m.index === undefined) return null;
  let raw = m[1].trim();
  const before = s.slice(0, m.index).replace(/\$/g, "").trim();
  const after = s
    .slice(m.index + m[0].length)
    .replace(/\$/g, "")
    .trim();
  raw = raw.replace(/\s/g, "");
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }
  const amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, before, after };
}

function stripFillerWord(label: string): string {
  const lower = label.toLowerCase();
  for (const filler of EXPENSE_FILLER_WORDS) {
    if (lower === filler) return "";
    if (lower.startsWith(filler + " ")) return label.slice(filler.length).trim();
  }
  return label;
}

function titleCase(s: string): string {
  if (s === s.toUpperCase()) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseMessage(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  for (const kw of INCOME_KEYWORDS) {
    const remainder = matchPrefix(trimmed, kw);
    if (remainder !== null) {
      const parsed = extractAmount(remainder);
      if (!parsed) return { ok: false, reason: "no-amount" };
      const note = [parsed.before, parsed.after].filter(Boolean).join(" ").trim();
      return {
        ok: true,
        data: {
          kind: "income",
          source: "OnlyFans",
          applyOfFee: true,
          gross: parsed.amount,
          note: note || undefined,
        },
      };
    }
  }

  const parsed = extractAmount(trimmed);
  if (!parsed) return { ok: false, reason: "no-amount" };

  let label = [parsed.before, parsed.after].filter(Boolean).join(" ").trim();
  label = stripFillerWord(label);

  return {
    ok: true,
    data: {
      kind: "expense",
      source: label ? titleCase(label) : "Dépense",
      amount: parsed.amount,
    },
  };
}
