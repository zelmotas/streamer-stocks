// Local price-history cache (Twitch viewer counts → simulated stock prices).
// Cash, portfolio, and leaderboard now live in the database.

export const STARTING_BALANCE = 10000;
export const PRICE_PER_VIEWER = 0.1;

export type PriceHistoryPoint = { t: number; price: number };
export type PriceHistory = Record<string, PriceHistoryPoint[]>;

const KEYS = {
  history: "ss_history",
  prices: "ss_prices",
};

const isBrowser = () => typeof window !== "undefined";

export function getPriceHistory(): PriceHistory {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.history) || "{}");
  } catch {
    return {};
  }
}

export function appendPriceHistory(login: string, price: number) {
  if (!isBrowser()) return;
  const h = getPriceHistory();
  const arr = h[login] || [];
  const now = Date.now();
  const cutoff = now - 30 * 60 * 1000;
  arr.push({ t: now, price });
  h[login] = arr.filter((p) => p.t >= cutoff).slice(-200);
  localStorage.setItem(KEYS.history, JSON.stringify(h));
}

export function getStoredPrices(): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.prices) || "{}");
  } catch {
    return {};
  }
}

export function setStoredPrices(p: Record<string, number>) {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.prices, JSON.stringify(p));
}

export function setStoredPrice(login: string, price: number) {
  const p = getStoredPrices();
  p[login] = price;
  setStoredPrices(p);
}

export function priceFromViewers(viewers: number): number {
  const base = Math.max(viewers, 10) * PRICE_PER_VIEWER;
  const vol = 1 + (Math.random() - 0.5) * 0.04;
  return Math.max(0.01, base * vol);
}

export function fmtMoney(n: number): string {
  return "SB " + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
