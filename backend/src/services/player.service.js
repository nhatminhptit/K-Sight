import prisma from "../config/prisma.config.js";
import myCache from "../utils/cache.js";
import {
  getPlayerProfile,
  getPlayerMMR,
  getPlayerMatches,
} from "./riot.service.js";

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const fetchAndCachePlayerInfo = async (name, tag) => {
  const cleanName = (name || "").trim();
  const cleanTag = (tag || "").trim();
  const cacheKey = `valorant_${cleanName.toLowerCase()}_${cleanTag.toLowerCase()}`;
  const cachedData = myCache.get(cacheKey);

  if (cachedData) return cachedData;

  const playerData = await getPlayerProfile(cleanName, cleanTag);
  const [mmrData, matchesData] = await Promise.all([
    getPlayerMMR(playerData.region, cleanName, cleanTag),
    getPlayerMatches(playerData.region, cleanName, cleanTag),
  ]);
  const finalData = { ...playerData, mmr: mmrData, matches: matchesData };

  myCache.set(cacheKey, finalData);
  return finalData;
};

export const getPlayerProfileData = async (name, tag) => {
  const cleanName = (name || "").trim();
  const cleanTag = (tag || "").trim();

  if (!cleanName || !cleanTag) {
    throw createServiceError("Tên và tag Riot ID không hợp lệ.", 400);
  }

  return fetchAndCachePlayerInfo(cleanName, cleanTag);
};

export const getMyPlayerProfileData = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.riotId) {
    throw createServiceError("Chưa liên kết Riot ID!", 404);
  }

  const [name = "", tag = ""] = user.riotId
    .split("#")
    .map((part) => part.trim());

  if (!name || !tag) {
    throw createServiceError("Riot ID trong hệ thống không hợp lệ!", 400);
  }

  return fetchAndCachePlayerInfo(name, tag);
};
