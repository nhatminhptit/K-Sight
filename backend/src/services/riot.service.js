import axios from "axios";
import dotenv from "dotenv";
import { response } from "express";

dotenv.config({ quiet: true });

const riotApiClient = axios.create({
  baseURL: "https://api.henrikdev.xyz/valorant",
});
riotApiClient.interceptors.request.use((config) => {
  config.headers.Authorization = process.env.HENRIK_API_KEY;
  return config;
});
riotApiClient.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  (error) => {
    console.error(`[Riot API Lỗi ${error.response?.status}]:`, error.message);
    return Promise.reject(error);
  },
);

const normalizeRiotPart = (value) => (value || "").trim();
const encodeRiotPart = (value) => encodeURIComponent(normalizeRiotPart(value));

export const getPlayerProfile = async (name, tag) => {
  try {
    const cleanName = normalizeRiotPart(name);
    const cleanTag = normalizeRiotPart(tag);
    const response = await riotApiClient.get(
      `/v1/account/${encodeRiotPart(cleanName)}/${encodeRiotPart(cleanTag)}`,
    );

    const cleanData = {
      puuid: response.puuid,
      region: response.region,
      account_level: response.account_level,
      name: response.name,
      tag: response.tag,
      avatar_url: response.card.small,
    };

    return cleanData;
  } catch (error) {
    throw new Error("Không tìm thấy người chơi hoặc API lỗi");
  }
};

export const getPlayerMMR = async (region, name, tag) => {
  try {
    const cleanName = normalizeRiotPart(name);
    const cleanTag = normalizeRiotPart(tag);
    const response = await riotApiClient.get(
      `/v1/mmr/${encodeRiotPart(region)}/${encodeRiotPart(cleanName)}/${encodeRiotPart(cleanTag)}`,
    );

    const cleanMMR = {
      rank_name: response.currenttierpatched,
      rank_icon: response.images.small,
      rr_points: response.ranking_in_tier,
    };

    return cleanMMR;
  } catch (error) {
    console.error("Lỗi khi lấy MMR:", error.message);
    return null;
  }
};

export const getPlayerMatches = async (region, name, tag) => {
  try {
    const cleanName = normalizeRiotPart(name);
    const cleanTag = normalizeRiotPart(tag);
    const response = await riotApiClient.get(
      `/v3/matches/${encodeRiotPart(region)}/${encodeRiotPart(cleanName)}/${encodeRiotPart(cleanTag)}?size=10`,
    );

    const cleanMatches = response.map((match) => {
      const playerStats = match.players.all_players.find(
        (p) =>
          p.name.toLowerCase() === cleanName.toLowerCase() &&
          p.tag.toLowerCase() === cleanTag.toLowerCase(),
      );

      return {
        matchId: match.metadata.matchid,
        gameMode: match.metadata.mode,
        metadata: match.metadata,
        gameStartMillis: match.metadata.game_start,
        agent: playerStats?.character || "Unknown",
        team: playerStats?.team || "Unknown",
        assets: playerStats?.assets ?? {},
        stats: {
          score: playerStats?.stats?.score || 0,
          kills: playerStats?.stats?.kills || 0,
          deaths: playerStats?.stats?.deaths || 0,
          assists: playerStats?.stats?.assists || 0,
          headshots: playerStats?.stats?.headshots ?? 0,
          bodyshots: playerStats?.stats?.bodyshots ?? 0,
          legshots: playerStats?.stats?.legshots ?? 0,
          kdRatio: playerStats?.stats
            ? (
                (playerStats.stats.kills || 0) / (playerStats.stats.deaths || 1)
              ).toFixed(2)
            : "0.00",
        },
        won:
          playerStats?.team === "Red"
            ? match.teams.red.has_won
            : match.teams.blue.has_won,
      };
    });

    return cleanMatches;
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử đấu:", error.message);
    return [];
  }
};
