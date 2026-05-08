// Local game state stored in localStorage
export const STARTING_BALANCE = 10000;
export const PRICE_PER_VIEWER = 0.1;

export type Holding = { qty: number; avgCost: number };
export type Portfolio = Record<string, Holding>; // by user_login

export type PriceHistoryPoint = { t: number; price: number };
export type PriceHistory = Record<string, PriceHistoryPoint[]>;

export type LeaderboardEntry = {
  username: string;
  netWorth: number;
  cash: number;
  updatedAt: number;
};

const KEYS = {
  username: "ss_username",
  cash: "ss_cash",
  portfolio: "ss_portfolio",
  history: "ss_history",
  leaderboard: "ss_leaderboard",
  prices: "ss_prices", // last known prices per login
};

const isBrowser = () => typeof window !== "undefined";

export function getUsername(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.username);
}
export function setUsername(name: string) {
  localStorage.setItem(KEYS.username, name);
  if (localStorage.getItem(KEYS.cash) === null) {
    localStorage.setItem(KEYS.cash, String(STARTING_BALANCE));
  }
  if (!localStorage.getItem(KEYS.portfolio)) {
    localStorage.setItem(KEYS.portfolio, "{}");
  }
}

export function getCash(): number {
  if (!isBrowser()) return STARTING_BALANCE;
  const v = localStorage.getItem(KEYS.cash);
  return v ? parseFloat(v) : STARTING_BALANCE;
}
export function setCash(v: number) {
  localStorage.setItem(KEYS.cash, String(v));
}

export function getPortfolio(): Portfolio {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.portfolio) || "{}");
  } catch {
    return {};
  }
}
export function setPortfolio(p: Portfolio) {
  localStorage.setItem(KEYS.portfolio, JSON.stringify(p));
}

export function getPriceHistory(): PriceHistory {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.history) || "{}");
  } catch {
    return {};
  }
}
export function appendPriceHistory(login: string, price: number) {
  const h = getPriceHistory();
  const arr = h[login] || [];
  const now = Date.now();
  // keep last 30 minutes
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
  localStorage.setItem(KEYS.prices, JSON.stringify(p));
}

export function priceFromViewers(viewers: number): number {
  // base price + ±2% volatility
  const base = Math.max(viewers, 10) * PRICE_PER_VIEWER;
  const vol = 1 + (Math.random() - 0.5) * 0.04;
  return Math.max(0.01, base * vol);
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.leaderboard) || "[]");
  } catch {
    return [];
  }
}
export function updateLeaderboard(entry: LeaderboardEntry) {
  const lb = getLeaderboard().filter((e) => e.username !== entry.username);
  lb.push(entry);
  lb.sort((a, b) => b.netWorth - a.netWorth);
  localStorage.setItem(KEYS.leaderboard, JSON.stringify(lb.slice(0, 50)));
}

export function fmtMoney(n: number): string {
  return "SB " + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
