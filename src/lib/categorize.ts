import type { TransactionCategory } from "@/lib/validations";

/**
 * Lightweight keyword-based auto-categorization for transactions.
 * Maps a free-text description to a spending category. This is deterministic
 * and runs server-side at write time so analytics can group transactions.
 */
const KEYWORD_RULES: Array<{ category: TransactionCategory; words: string[] }> = [
  { category: "food", words: ["restaurant", "cafe", "coffee", "grocery", "groceries", "food", "dining", "pizza", "burger", "starbucks", "mcdonald", "uber eats", "doordash", "comida", "super"] },
  { category: "shopping", words: ["amazon", "store", "shop", "mall", "clothing", "nike", "adidas", "zara", "compra", "tienda"] },
  { category: "bills", words: ["bill", "electric", "water", "internet", "phone", "rent", "mortgage", "insurance", "utility", "factura", "renta", "luz", "agua"] },
  { category: "transport", words: ["uber", "lyft", "taxi", "fuel", "gasoline", "parking", "transit", "metro", "bus", "train", "transporte", "gasolina"] },
  { category: "entertainment", words: ["netflix", "spotify", "movie", "cinema", "game", "steam", "concert", "disney", "hbo", "entretenimiento", "cine"] },
  { category: "health", words: ["pharmacy", "doctor", "hospital", "clinic", "gym", "fitness", "medical", "dental", "salud", "farmacia", "medico"] },
  { category: "travel", words: ["hotel", "flight", "airline", "airbnb", "booking", "expedia", "vacation", "travel", "viaje", "vuelo"] },
];

/**
 * Pick a category for a transaction based on its type and description.
 * Income/transfers are categorized structurally; spending falls back to
 * keyword matching, then "other".
 */
export function categorize(
  type: string,
  description?: string | null,
): TransactionCategory {
  if (type === "deposit" || type === "transfer_in") return "income";
  if (type === "transfer_out") return "transfer";

  const text = (description ?? "").toLowerCase();
  if (text) {
    for (const rule of KEYWORD_RULES) {
      if (rule.words.some((w) => text.includes(w))) return rule.category;
    }
  }
  return "other";
}
