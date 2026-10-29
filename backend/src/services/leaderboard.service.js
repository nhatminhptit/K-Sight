import prisma from "../config/prisma.config.js";
import myCache from "../utils/cache.js";
import { getPlayerProfileData } from "./player.service.js";

const LEADERBOARD_CACHE_KEY = "public_leaderboard";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRankScore = (rankName = "") => {
  const rankOrder = [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Ascendant",
    "Immortal",
    "Radiant",
  ];
  const index = rankOrder.findIndex((rank) =>
    rankName.toLowerCase().startsWith(rank.toLowerCase()),
  );
  const division = Number(rankName.match(/\d+/)?.[0] || 0);
  return Math.max(0, (index + 1) * 10 - division);
};

const createEntry = (user, profile) => {
  const matches = Array.isArray(profile?.matches) ? profile.matches : [];
  const wins = matches.filter((match) => match?.won).length;
  const winRate = matches.length ? (wins / matches.length) * 100 : 0;
  const rankName = profile?.mmr?.rank_name || "Unranked";

  return {
    id: user.id,
    username: user.username,
    riotId: user.riotId,
    avatarUrl: profile?.avatar_url || "",
    rankName,
    rankIcon: profile?.mmr?.rank_icon || "",
    rrPoints: toNumber(profile?.mmr?.rr_points),
    matches: matches.length,
    winRate: Math.round(winRate),
    rankScore: getRankScore(rankName),
  };
};

export const getLeaderboard = async ({ sort = "rank" } = {}) => {
  let entries = myCache.get(LEADERBOARD_CACHE_KEY);

  if (!entries) {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, riotId: true },
      orderBy: { createdAt: "asc" },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        if (!user.riotId || !user.riotId.includes("#")) return null;
        const [name, tag] = user.riotId.split("#").map((part) => part.trim());
        if (!name || !tag) return null;

        try {
          const profile = await getPlayerProfileData(name, tag);
          return createEntry(user, profile);
        } catch (error) {
          console.error(`Leaderboard sync failed for user ${user.id}:`, error.message);
          return null;
        }
      }),
    );

    entries = results.filter(Boolean);
    myCache.set(LEADERBOARD_CACHE_KEY, entries, 300);
  }

  const sorted = [...entries].sort((a, b) => {
    if (sort === "winrate") {
      return b.winRate - a.winRate || b.matches - a.matches;
    }
    return b.rankScore - a.rankScore || b.rrPoints - a.rrPoints;
  });

  return sorted.map(({ rankScore, ...entry }, index) => ({
    ...entry,
    position: index + 1,
  }));
};
