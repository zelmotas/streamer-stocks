import { supabase } from "@/integrations/supabase/client";

export type DbHolding = {
  streamer_login: string;
  qty: number;
  avg_cost: number;
};

export async function fetchHoldings(userId: string): Promise<DbHolding[]> {
  const { data, error } = await supabase
    .from("holdings")
    .select("streamer_login, qty, avg_cost")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((h) => ({
    streamer_login: h.streamer_login,
    qty: Number(h.qty),
    avg_cost: Number(h.avg_cost),
  }));
}

export async function getHolding(userId: string, login: string): Promise<DbHolding | null> {
  const { data } = await supabase
    .from("holdings")
    .select("streamer_login, qty, avg_cost")
    .eq("user_id", userId)
    .eq("streamer_login", login)
    .maybeSingle();
  if (!data) return null;
  return {
    streamer_login: data.streamer_login,
    qty: Number(data.qty),
    avg_cost: Number(data.avg_cost),
  };
}

export async function buyShares(opts: {
  userId: string;
  login: string;
  qty: number;
  price: number;
  cash: number;
}) {
  const cost = opts.price * opts.qty;
  if (cost > opts.cash) return { ok: false as const, error: "Not enough StreamBucks" };

  const cur = await getHolding(opts.userId, opts.login);
  const newQty = (cur?.qty ?? 0) + opts.qty;
  const newAvg = cur ? (cur.avg_cost * cur.qty + cost) / newQty : opts.price;

  const { error: upErr } = await supabase
    .from("holdings")
    .upsert(
      {
        user_id: opts.userId,
        streamer_login: opts.login,
        qty: newQty,
        avg_cost: newAvg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,streamer_login" },
    );
  if (upErr) return { ok: false as const, error: upErr.message };

  const newCash = opts.cash - cost;
  const { error: cErr } = await supabase
    .from("profiles")
    .update({ cash: newCash, updated_at: new Date().toISOString() })
    .eq("id", opts.userId);
  if (cErr) return { ok: false as const, error: cErr.message };

  return { ok: true as const, cash: newCash, holding: { streamer_login: opts.login, qty: newQty, avg_cost: newAvg } };
}

export async function sellShares(opts: {
  userId: string;
  login: string;
  qty: number;
  price: number;
  cash: number;
}) {
  const cur = await getHolding(opts.userId, opts.login);
  if (!cur || cur.qty < opts.qty) return { ok: false as const, error: "Not enough shares" };

  const proceeds = opts.price * opts.qty;
  const remaining = cur.qty - opts.qty;

  if (remaining <= 0) {
    const { error } = await supabase
      .from("holdings")
      .delete()
      .eq("user_id", opts.userId)
      .eq("streamer_login", opts.login);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("holdings")
      .update({ qty: remaining, updated_at: new Date().toISOString() })
      .eq("user_id", opts.userId)
      .eq("streamer_login", opts.login);
    if (error) return { ok: false as const, error: error.message };
  }

  const newCash = opts.cash + proceeds;
  const { error: cErr } = await supabase
    .from("profiles")
    .update({ cash: newCash, updated_at: new Date().toISOString() })
    .eq("id", opts.userId);
  if (cErr) return { ok: false as const, error: cErr.message };

  return {
    ok: true as const,
    cash: newCash,
    proceeds,
    holding: remaining > 0 ? { streamer_login: opts.login, qty: remaining, avg_cost: cur.avg_cost } : null,
  };
}

export async function updateNetWorth(userId: string, netWorth: number) {
  await supabase
    .from("profiles")
    .update({ net_worth: netWorth, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
