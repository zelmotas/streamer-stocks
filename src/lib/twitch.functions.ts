import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twitch";

export type TwitchStream = {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  profile_image_url?: string;
};

export type TwitchCategory = {
  id: string;
  name: string;
  box_art_url: string;
};

async function twitchFetch(path: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWITCH_API_KEY = process.env.TWITCH_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!TWITCH_API_KEY) throw new Error("TWITCH_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWITCH_API_KEY,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twitch API failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

export const getTopStreams = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { gameId?: string };
    return { gameId: typeof d.gameId === "string" ? d.gameId : "" };
  })
  .handler(async ({ data }): Promise<TwitchStream[]> => {
    const qs = new URLSearchParams({ first: "20" });
    if (data.gameId) qs.set("game_id", data.gameId);
    const streamsRes = await twitchFetch(`streams?${qs.toString()}`);
    const streams: TwitchStream[] = streamsRes.data ?? [];
    if (streams.length === 0) return [];

    const userParams = streams.map((s) => `id=${s.user_id}`).join("&");
    const usersRes = await twitchFetch(`users?${userParams}`);
    const userMap = new Map<string, string>();
    for (const u of usersRes.data ?? []) {
      userMap.set(u.id, u.profile_image_url);
    }
    return streams.map((s) => ({ ...s, profile_image_url: userMap.get(s.user_id) }));
  });

export const getStreamByLogin = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = data as { login: string };
    if (!d?.login) throw new Error("login required");
    return { login: d.login };
  })
  .handler(async ({ data }): Promise<TwitchStream | null> => {
    const streamsRes = await twitchFetch(`streams?user_login=${encodeURIComponent(data.login)}`);
    const stream: TwitchStream | undefined = streamsRes.data?.[0];
    const usersRes = await twitchFetch(`users?login=${encodeURIComponent(data.login)}`);
    const user = usersRes.data?.[0];
    if (!stream) {
      if (!user) return null;
      return {
        id: user.id,
        user_id: user.id,
        user_login: user.login,
        user_name: user.display_name,
        game_id: "",
        game_name: "Offline",
        type: "offline",
        title: user.description ?? "",
        viewer_count: 0,
        started_at: "",
        thumbnail_url: "",
        profile_image_url: user.profile_image_url,
      };
    }
    return { ...stream, profile_image_url: user?.profile_image_url };
  });

export const getTopCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<TwitchCategory[]> => {
    const res = await twitchFetch(`games/top?first=20`);
    return res.data ?? [];
  },
);
