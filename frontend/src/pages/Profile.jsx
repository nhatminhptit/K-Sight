import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../utils/axiosClient";
import toast from "react-hot-toast";
import { updateUser } from "../store/authSlice";
import useFetchPublicData from "../hooks/useFetchPublicData";

const MAPS_URL = "https://valorant-api.com/v1/maps";
const DEFAULT_MAP_BACKGROUND = "/favicon.svg";

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const EMPTY_MATCHES = [];

const getComparableStats = (profileData) => {
  const profileMatches = Array.isArray(profileData?.matches)
    ? profileData.matches
    : [];
  const total = profileMatches.length;
  const wins = profileMatches.filter((match) => match?.won).length;
  const kills = profileMatches.reduce(
    (sum, match) => sum + toSafeNumber(match?.stats?.kills),
    0,
  );
  const deaths = profileMatches.reduce(
    (sum, match) => sum + toSafeNumber(match?.stats?.deaths),
    0,
  );
  const acs = total
    ? profileMatches.reduce(
        (sum, match) => sum + toSafeNumber(match?.stats?.score),
        0,
      ) / total
    : 0;

  return {
    winRate: total ? (wins / total) * 100 : 0,
    kd: deaths ? kills / deaths : kills,
    acs,
  };
};

const formatRiotId = (profileData, fallback = "Unknown#Player") => {
  const profileName = profileData?.name || "";
  const profileTag = profileData?.tag || "";
  return profileName && profileTag ? `${profileName}#${profileTag}` : fallback;
};

const DonutMetric = ({ label, value, displayValue, color = "#ff4655" }) => {
  const safeValue = Math.min(100, Math.max(0, toSafeNumber(value)));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 80 80" className="-rotate-90 h-full w-full">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="7"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
          {displayValue}
        </span>
      </div>
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </span>
    </div>
  );
};

const StatProgress = ({ label, value, max = 100, displayValue, color }) => {
  const percentage = Math.min(
    100,
    Math.max(0, (toSafeNumber(value) / max) * 100),
  );
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold text-white">{displayValue}</span>
      </div>
      <div className="h-2 overflow-hidden bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const BadgeCard = ({ title, description, icon, tone }) => (
  <div className="badge-card h-32">
    <div className="badge-card-inner relative h-full w-full">
      <div
        className="badge-face badge-front absolute inset-0 flex flex-col items-center justify-center gap-2 border p-3 text-center"
        style={{ borderColor: tone, boxShadow: `0 0 18px ${tone}33` }}
      >
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-black uppercase tracking-widest text-white">
          {title}
        </span>
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: tone }}
        >
          Thành tựu đã mở khóa
        </span>
      </div>
      <div
        className="badge-face badge-back absolute inset-0 flex items-center justify-center border p-4 text-center text-xs text-gray-300"
        style={{ borderColor: tone, background: `${tone}12` }}
      >
        {description}
      </div>
    </div>
  </div>
);

const MatchDetails = ({
  match,
  kills,
  deaths,
  assists,
  headshots,
  score,
  playerName,
}) => {
  const rounds = Array.isArray(match?.rounds)
    ? match.rounds
    : Array.isArray(match?.timeline)
      ? match.timeline
      : [];
  const findRoundPlayer = (round) => {
    if (!Array.isArray(round?.player_stats)) return round?.player_stats;
    return (
      round.player_stats.find(
        (player) =>
          Boolean(playerName) &&
          (player?.player_display_name === playerName ||
            player?.player_display_name?.toLowerCase() ===
              playerName.toLowerCase()),
      ) ||
      round.player_stats.find((player) => {
        const candidateName = player?.name ?? player?.player_name;
        return candidateName?.toLowerCase() === playerName?.toLowerCase();
      })
    );
  };
  const chartData = rounds.map((round) => {
    const myStats = findRoundPlayer(round);
    const totalDamage =
      myStats?.damage_events?.reduce(
        (sum, event) => sum + toSafeNumber(event?.damage),
        0,
      ) || 0;
    const spent = myStats?.economy?.spent || 0;
    return { damage: totalDamage, economy: toSafeNumber(spent) };
  });
  const damageValues = chartData.map((data) => data.damage);
  const economyValues = chartData.map((data) => data.economy);
  const chartWidth = 320;
  const chartHeight = 100;
  const maxDamage = Math.max(...damageValues, 1);
  const chartPoints = damageValues
    .map((damage, index) => {
      const x =
        damageValues.length === 1
          ? chartWidth / 2
          : (index / (damageValues.length - 1)) * chartWidth;
      const y = chartHeight - (damage / maxDamage) * (chartHeight - 12) - 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-5 border border-gray-800 bg-linear-to-r from-[#07101b]/60 to-[#071827]/30 p-4">
      <div className="grid grid-cols-3 gap-3 text-sm text-gray-300">
        {[
          ["Kills", kills],
          ["Deaths", deaths],
          ["Assists", assists],
          [
            "K/D",
            (() => {
              if (!deaths) return kills ? "∞" : "0.00";
              return (kills / deaths).toFixed(2);
            })(),
          ],
          ["Headshots", headshots],
          ["Score", score],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-300">
            Round timeline
          </h4>
          <span className="text-[10px] uppercase tracking-widest text-gray-600">
            {rounds.length ? `${rounds.length} rounds` : "No round feed"}
          </span>
        </div>
        {rounds.length ? (
          <div className="flex flex-wrap gap-1.5">
            {rounds.map((round, index) => {
              const won =
                round?.won !== undefined
                  ? Boolean(round.won)
                  : round?.win !== undefined
                    ? Boolean(round.win)
                    : round?.winning_team
                      ? round.winning_team === match?.team
                      : round?.result === "win";
              return (
                <span
                  key={round?.id || round?.round || index}
                  title={`Round ${round?.round || index + 1}: ${won ? "Thắng" : "Thua"}`}
                  className={`h-5 w-5 text-center text-[9px] leading-5 font-bold text-[#07101b] ${won ? "bg-[#00f5d4]" : "bg-[#ff4655]"}`}
                >
                  {index + 1}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            Dữ liệu không khả dụng cho chế độ chơi này
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-300">
            Damage / round
          </h4>
          <span className="text-[10px] uppercase tracking-widest text-gray-600">
            LINE TELEMETRY
          </span>
        </div>
        {rounds.length ? (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-28 w-full overflow-visible"
          >
            <line
              x1="0"
              y1={chartHeight - 1}
              x2={chartWidth}
              y2={chartHeight - 1}
              stroke="rgba(255,255,255,0.12)"
            />
            <polyline
              points={chartPoints}
              fill="none"
              stroke="#ff4655"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {damageValues.map((damage, index) => {
              const [x, y] = chartPoints.split(" ")[index].split(",");
              return (
                <circle key={index} cx={x} cy={y} r="2.5" fill="#00f5d4" />
              );
            })}
          </svg>
        ) : (
          <p className="text-xs text-gray-600">
            Dữ liệu không khả dụng cho chế độ chơi này
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-300">
          Weapon economy
        </h4>
        {rounds.length ? (
          <div className="flex h-28 items-end gap-1 border-b border-white/10 px-2">
            {economyValues.map((value, index) => {
              const maxEconomy = Math.max(...economyValues, 1);
              return (
                <div
                  key={index}
                  className="group flex h-full flex-1 items-end justify-center"
                >
                  <div
                    className="w-full max-w-5 bg-[#00f5d4]/70 transition-all group-hover:bg-[#00f5d4]"
                    style={{
                      height: `${Math.max(4, (value / maxEconomy) * 100)}%`,
                    }}
                    title={`Round ${index + 1}: ${value}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            Dữ liệu không khả dụng cho chế độ chơi này
          </p>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { name, tag } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const reduxUser = useSelector((state) => state.auth?.user);
  const [searchId, setSearchId] = useState("");
  const queryClient = useQueryClient();
  const onMyProfileRoute = !name && !tag;

  // Modal & form state for linking Riot ID when viewing /my-profile
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkRiotId, setLinkRiotId] = useState("");
  const [compareInput, setCompareInput] = useState("");
  const [compareRiotId, setCompareRiotId] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);

  const [openMatchId, setOpenMatchId] = useState(null);
  const mapsRequest = useFetchPublicData(MAPS_URL);
  const mapIcons = useMemo(() => {
    const maps = Array.isArray(mapsRequest.data?.data)
      ? mapsRequest.data.data
      : [];
    return maps.reduce((icons, map) => {
      if (map?.displayName && map?.listViewIcon) {
        icons[map.displayName.toLowerCase()] = map.listViewIcon;
      }
      return icons;
    }, {});
  }, [mapsRequest.data]);

  const toggleMatch = (id) => {
    setOpenMatchId((prev) => (prev === id ? null : id));
  };

  // playerProfile query will be defined later after resolving targetName/targetTag

  const linkMutation = useMutation({
    mutationFn: async (riotId) => axiosClient.put("/auth/riot-id", { riotId }),
    onSuccess: (res) => {
      dispatch(updateUser({ riotId: res?.user?.riotId }));
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      toast.success("Riot ID đã được liên kết.");
      setShowLinkModal(false);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Không thể liên kết Riot ID.",
      );
    },
  });

  const getAgentAvatar = (match) =>
    match?.assets?.agent?.small ?? match?.assets?.agent?.bust ?? "";

  const getMapBackground = (match) => {
    const mapName = match?.mapName ?? match?.map ?? match?.metadata?.map ?? "";
    return mapIcons[mapName.toLowerCase()] ?? DEFAULT_MAP_BACKGROUND;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const val = (searchId || "").trim();
    if (!val || !val.includes("#")) {
      toast.error("Vui lòng nhập định dạng Tên#Tag");
      return;
    }
    const [n, t] = val.split("#").map((part) => part.trim());
    if (!n || !t) return;
    navigate(`/profile/${encodeURIComponent(n)}/${encodeURIComponent(t)}`);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    const value = compareInput.trim();
    const [compareName = "", compareTag = ""] = value
      .split("#")
      .map((part) => part.trim());

    if (!compareName || !compareTag) {
      toast.error("Nhập Riot ID thứ hai theo định dạng Tên#Tag.");
      return;
    }

    if (value.toLowerCase() === `${targetName}#${targetTag}`.toLowerCase()) {
      toast.error("Hãy chọn một Riot ID khác để so sánh.");
      return;
    }

    setCompareRiotId(`${compareName}#${compareTag}`);
    setCompareOpen(true);
  };

  const handleShare = async () => {
    const shareUrl = `https://vnminh.id.vn/profile/${encodeURIComponent(
      profile?.name || targetName,
    )}/${encodeURIComponent(profile?.tag || targetTag)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      toast.success("Đã sao chép liên kết hồ sơ.", {
        style: {
          background: "#111b26",
          color: "#00f5d4",
          border: "1px solid rgba(0,245,212,0.45)",
        },
      });
    } catch {
      toast.error("Không thể sao chép liên kết. Hãy thử lại.");
    }
  };

  const handleOpenLinkModal = () => {
    setLinkRiotId(reduxUser?.riotId || "");
    setShowLinkModal(true);
  };

  const { targetName, targetTag } = useMemo(() => {
    const routeName = name?.trim() || "";
    const routeTag = tag?.trim() || "";
    const fallbackRiotId = reduxUser?.riotId?.trim() || "";

    if (routeName && routeTag) {
      return {
        targetName: routeName,
        targetTag: routeTag,
      };
    }

    const [fallbackName = "", fallbackTag = ""] = fallbackRiotId
      .split("#")
      .map((part) => part.trim());

    return {
      targetName: fallbackName,
      targetTag: fallbackTag,
    };
  }, [name, tag, reduxUser?.riotId]);

  const {
    data: playerData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: onMyProfileRoute
      ? ["myProfile"]
      : ["playerProfile", targetName, targetTag],
    queryFn: async () =>
      onMyProfileRoute
        ? axiosClient.get("/my-profile/")
        : axiosClient.get(
            `/profile/${encodeURIComponent(targetName)}/${encodeURIComponent(targetTag)}`,
          ),
    enabled: onMyProfileRoute ? isAuthenticated : !!targetName && !!targetTag,
    retry: 1,
  });

  const {
    data: comparePlayerData,
    isLoading: isCompareLoading,
    isError: isCompareError,
  } = useQuery({
    queryKey: ["compareProfile", compareRiotId],
    queryFn: async () => {
      const [compareName, compareTag] = compareRiotId
        .split("#")
        .map((part) => part.trim());
      return axiosClient.get(
        `/profile/${encodeURIComponent(compareName)}/${encodeURIComponent(compareTag)}`,
      );
    },
    enabled: compareOpen && Boolean(compareRiotId),
    retry: 1,
  });

  const profile = playerData?.data;
  const matches = Array.isArray(profile?.matches)
    ? profile.matches
    : EMPTY_MATCHES;
  const {
    totalMatches,
    winRate,
    winRateValue,
    avgKd,
    avgKdValue,
    headshotRate,
    headshotValue,
    avgAcs,
    shotDistribution,
    topAgents,
    badges,
  } = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter((match) => match.won).length;
    const averageKdValue = total
      ? matches.reduce((acc, match) => {
          const stats = match?.stats ?? {};
          const deaths = toSafeNumber(stats.deaths);
          return (
            acc +
            (deaths
              ? toSafeNumber(stats.kills) / deaths
              : toSafeNumber(stats.kills))
          );
        }, 0) / total
      : 0;
    const averageAcs = total
      ? matches.reduce(
          (acc, match) => acc + toSafeNumber(match?.stats?.score),
          0,
        ) / total
      : 0;
    const averageAssists = total
      ? matches.reduce(
          (acc, match) => acc + toSafeNumber(match?.stats?.assists),
          0,
        ) / total
      : 0;

    const headshotValue =
      toSafeNumber(profile?.headshot_rate ?? profile?.headshot, NaN) ||
      (() => {
        const totals = matches.reduce(
          (acc, item) => {
            const headshots = item?.stats?.headshots ?? 0;
            const bodyshots = item?.stats?.bodyshots ?? 0;
            const legshots = item?.stats?.legshots ?? 0;
            return {
              headshots: acc.headshots + headshots,
              shots: acc.shots + headshots + bodyshots + legshots,
            };
          },
          { headshots: 0, shots: 0 },
        );

        return totals.shots ? (totals.headshots / totals.shots) * 100 : 0;
      })();

    const shots = matches.reduce(
      (acc, match) => {
        acc.head += toSafeNumber(match?.stats?.headshots);
        acc.body += toSafeNumber(match?.stats?.bodyshots);
        acc.legs += toSafeNumber(match?.stats?.legshots);
        return acc;
      },
      { head: 0, body: 0, legs: 0 },
    );
    const agentMap = matches.reduce((acc, match) => {
      const agent = match?.agent?.trim() || "Unknown";
      const current = acc.get(agent) || {
        agent,
        matches: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        avatar: "",
      };
      current.matches += 1;
      current.wins += match?.won ? 1 : 0;
      current.kills += toSafeNumber(match?.stats?.kills);
      current.deaths += toSafeNumber(match?.stats?.deaths);
      current.avatar ||=
        match?.assets?.agent?.small ?? match?.assets?.agent?.bust ?? "";
      acc.set(agent, current);
      return acc;
    }, new Map());

    return {
      totalMatches: total,
      winRateValue: total ? (wins / total) * 100 : 0,
      winRate: total ? `${Math.round((wins / total) * 100)}%` : "N/A",
      avgKdValue: averageKdValue,
      avgKd: averageKdValue.toFixed(2),
      headshotValue,
      headshotRate: total ? Math.round(headshotValue) : null,
      avgAcs: Math.round(averageAcs),
      averageAssists,
      badges: [
        headshotValue > 30 && {
          title: "Máy dập Headshot",
          description: `Tỷ lệ headshot trung bình ${Math.round(headshotValue)}%, vượt mốc 30%.`,
          icon: "🎯",
          tone: "#ffc857",
        },
        averageAssists > 10 && {
          title: "Ông hoàng hỗ trợ",
          description: `Trung bình ${averageAssists.toFixed(1)} assists mỗi trận.`,
          icon: "◈",
          tone: "#c0c0c0",
        },
        averageAcs > 250 && {
          title: "Chiến thần",
          description: `ACS trung bình ${Math.round(averageAcs)}, vượt mốc 250.`,
          icon: "✦",
          tone: "#b87333",
        },
      ].filter(Boolean),
      shotDistribution: shots,
      topAgents: [...agentMap.values()]
        .sort((a, b) => b.matches - a.matches || b.kills - a.kills)
        .slice(0, 3)
        .map((agent) => ({
          ...agent,
          kd: agent.deaths ? (agent.kills / agent.deaths).toFixed(2) : "∞",
          winRate: agent.matches
            ? Math.round((agent.wins / agent.matches) * 100)
            : 0,
        })),
    };
  }, [matches, profile]);

  const compareProfile = comparePlayerData?.data;
  const currentComparableStats = useMemo(
    () => getComparableStats(profile),
    [profile],
  );
  const compareStats = useMemo(
    () => getComparableStats(compareProfile),
    [compareProfile],
  );
  const compareRows = [
    { label: "K/D", key: "kd", format: (value) => value.toFixed(2) },
    {
      label: "Win Rate",
      key: "winRate",
      format: (value) => `${Math.round(value)}%`,
    },
    { label: "ACS", key: "acs", format: (value) => `${Math.round(value)}` },
  ];

  // Fallback helpers and derived values used by JSX (safe defaults)
  const avatar =
    profile?.avatar_url ??
    "https://api.dicebear.com/6.x/adventurer/svg?seed=Valorant";
  const rankIcon = profile?.mmr?.rank_icon ?? "";
  const rankName = profile?.mmr?.rank_name ?? "Unranked";
  const rrPoints = profile?.mmr?.rr_points ?? 0;

  if (
    onMyProfileRoute &&
    isAuthenticated &&
    isError &&
    error?.response?.status === 404
  ) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
        <div className="w-full max-w-lg rounded-3xl bg-[#111b26] border border-[#ff4655]/30 p-6 shadow-2xl">
          {!showLinkModal ? (
            <>
              <h2 className="text-lg font-bold text-white mb-3">
                Tài khoản chưa liên kết Riot ID
              </h2>
              <p className="text-sm text-[#b0b7c1] mb-6">
                Bạn cần liên kết Riot ID để xem hồ sơ cá nhân.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => navigate("/")}
                  className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                >
                  Về trang chủ
                </button>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#e03e4d]"
                >
                  Liên kết ngay
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">
                  Liên kết Riot ID
                </h3>
                <p className="text-sm text-[#b0b7c1]">
                  Nhập Riot ID theo định dạng TenZ#VN1.
                </p>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#d9d9d9]">
                  Riot ID
                </label>
                <input
                  type="text"
                  value={linkRiotId}
                  onChange={(e) => setLinkRiotId(e.target.value)}
                  placeholder="Ví dụ: TenZ#VN1"
                  className="w-full rounded-2xl border border-[#ff4655]/20 bg-[#111a22] px-4 py-3 text-white placeholder-[#8892a4] outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]/30"
                />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="rounded-2xl border border-[#5f6872] px-4 py-2 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  onClick={() => linkMutation.mutate(linkRiotId)}
                  disabled={linkMutation.isLoading}
                  className="rounded-2xl bg-[#ff4655] px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
                >
                  {linkMutation.isLoading ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="tactical-page flex min-h-[75vh] items-center justify-center w-full px-4">
        <div className="hud-panel w-full max-w-sm rounded-xl border border-[#2d3748] bg-[#1a2733] p-6 shadow-[0_0_30px_rgba(255,70,85,0.14)]">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.28em] text-[#ff4655]">
              K-SIGHT / SCAN
            </span>
            <span className="hud-status-dot" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <div className="hud-skeleton h-5 w-3/4" />
            <div className="hud-skeleton h-3 w-full" />
            <div className="hud-skeleton h-3 w-5/6" />
            <div className="hud-skeleton mt-5 h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError && [401, 403].includes(error?.response?.status)) {
    return null;
  }

  const myProfileNotFound =
    onMyProfileRoute && isError && error?.response?.status === 404;

  if (myProfileNotFound) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
        <div className="w-full max-w-lg rounded-3xl bg-[#111b26] border border-[#ff4655]/30 p-6 shadow-2xl">
          {!showLinkModal ? (
            <>
              <h2 className="text-lg font-bold text-white mb-3">
                Riot ID hiện tại không tìm thấy
              </h2>
              <p className="text-sm text-[#b0b7c1] mb-2">
                Riot ID đang lưu trong tài khoản của bạn không khớp với dữ liệu
                Henrik API, nên hồ sơ cá nhân chưa thể tải.
              </p>
              <p className="text-sm text-[#ff8b94] mb-6">
                Hãy liên kết lại Riot ID chính xác để tiếp tục.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => navigate("/")}
                  className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                >
                  Về trang chủ
                </button>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#e03e4d]"
                >
                  Liên kết lại
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">
                  Liên kết Riot ID
                </h3>
                <p className="text-sm text-[#b0b7c1]">
                  Nhập Riot ID theo định dạng TenZ#VN1.
                </p>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#d9d9d9]">
                  Riot ID
                </label>
                <input
                  type="text"
                  value={linkRiotId}
                  onChange={(e) => setLinkRiotId(e.target.value)}
                  placeholder="Ví dụ: TenZ#VN1"
                  className="w-full rounded-2xl border border-[#ff4655]/20 bg-[#111a22] px-4 py-3 text-white placeholder-[#8892a4] outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]/30"
                />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="rounded-2xl border border-[#5f6872] px-4 py-2 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  onClick={() => linkMutation.mutate(linkRiotId)}
                  disabled={linkMutation.isLoading}
                  className="rounded-2xl bg-[#ff4655] px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
                >
                  {linkMutation.isLoading ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (onMyProfileRoute && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1f2937]/50 border border-red-500/50 p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
            CHƯA ĐĂNG NHẬP
          </h2>
          <p className="text-gray-400 mb-8">Bạn chưa đăng nhập để xem hồ sơ.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 transition font-bold uppercase tracking-widest text-sm"
            >
              VỀ TRANG CHỦ
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2 bg-[#ff4655] hover:bg-[#e03e4d] text-white transition font-bold uppercase tracking-widest text-sm shadow-[0_0_10px_rgba(255,70,85,0.4)]"
            >
              ĐĂNG NHẬP
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1f2937]/50 border border-red-500/50 p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
            Truy xuất thất bại
          </h2>
          <p className="text-gray-400 mb-8">
            {error.response?.data?.message ||
              "Không thể lấy dữ liệu. Vui lòng kiểm tra lại Riot ID hoặc thử lại sau."}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 transition font-bold uppercase tracking-widest text-sm"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-[#ff4655] hover:bg-[#e03e4d] text-white transition font-bold uppercase tracking-widest text-sm shadow-[0_0_10px_rgba(255,70,85,0.4)]"
            >
              Thử lại
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="tactical-page container mx-auto px-4 py-8 max-w-6xl">
      {isAuthenticated && (
        <section className="mb-8 w-full rounded-3xl border border-[#ff4655]/20 bg-[#111b26]/90 p-6 shadow-[0_0_40px_rgba(255,70,85,0.08)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[#ff4655]">
                Quản lý Riot ID
              </div>
              <div className="text-lg font-semibold text-white">
                {reduxUser?.riotId
                  ? `Riot ID đang liên kết: ${reduxUser.riotId}`
                  : "Chưa liên kết Riot ID"}
              </div>
              <p className="mt-2 text-sm text-[#b0b7c1]">
                {reduxUser?.riotId
                  ? "Nhấp Thay đổi để cập nhật Riot ID mới."
                  : "Liên kết Riot ID để truy xuất nhanh hồ sơ."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="rounded-2xl bg-[#ff4655] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(255,70,85,0.18)] transition hover:bg-[#e03e4d]"
            >
              {reduxUser?.riotId ? "Thay đổi" : "Liên kết ngay"}
            </button>
          </div>
        </section>
      )}

      {isAuthenticated && showLinkModal && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl border border-[#ff4655]/20 bg-[#0f1923] p-6 shadow-2xl shadow-[#ff4655]/10"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Cập nhật Riot ID
                  </h2>
                  <p className="mt-1 text-sm text-[#b0b7c1]">
                    Nhập Riot ID theo định dạng Tên#Tag (ví dụ: TenZ#VN1).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="text-[#b0b7c1] hover:text-white"
                >
                  Đóng
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-[#d9d9d9]">
                  Riot ID
                </label>
                <input
                  type="text"
                  value={linkRiotId}
                  onChange={(e) => setLinkRiotId(e.target.value)}
                  className="w-full rounded-2xl border border-[#ff4655]/20 bg-[#111b26] px-4 py-3 text-white placeholder-[#8892a4] outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]/30"
                  placeholder="Ví dụ: TenZ#VN1"
                />

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => linkMutation.mutate(linkRiotId)}
                    disabled={linkMutation.isPending}
                    className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#e03e4d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {linkMutation.isPending ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="show"
        onSubmit={handleSearch}
        className="mb-8 bg-[#1a2733] border border-gray-700/50 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.25)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 min-w-0">
            <label className="block text-sm uppercase tracking-[0.3em] text-gray-400 mb-2">
              Tra cứu Riot ID khác
            </label>
            <input
              key={`${name || "profile"}-${tag || "search"}`}
              defaultValue={name && tag ? `${name}#${tag}` : ""}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Ví dụ: TenZ#VN1"
              className="w-full bg-[#0d151f] border border-gray-700/60 text-white placeholder:text-gray-500 text-lg px-5 py-4 rounded-xl focus:outline-none focus:border-[#ff4655] focus:ring-2 focus:ring-[#ff4655]/10 transition"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#ff4655] px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#e03e4d]"
          >
            Tra cứu
          </button>
        </div>
      </motion.form>

      <motion.section
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="mb-8 border border-[#00f5d4]/20 bg-[#111b26]/85 p-5 shadow-[0_0_30px_rgba(0,245,212,0.06)] sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00f5d4]">
              Tactical comparison
            </p>
            <h3 className="mt-1 text-lg font-bold uppercase tracking-widest text-white">
              Đối đầu chỉ số
            </h3>
          </div>
          {compareOpen && (
            <button
              type="button"
              onClick={() => {
                setCompareOpen(false);
                setCompareRiotId("");
              }}
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-[#ff4655]"
            >
              Đóng so sánh
            </button>
          )}
        </div>
        <form
          onSubmit={handleCompare}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value)}
            placeholder="Nhập Riot ID thứ 2: TenZ#VN1"
            className="min-w-0 flex-1 border border-gray-700/60 bg-[#0d151f] px-4 py-3 text-white placeholder:text-gray-600 outline-none transition focus:border-[#00f5d4]"
          />
          <button
            type="submit"
            className="border border-[#00f5d4]/50 bg-[#00f5d4]/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#00f5d4] transition hover:bg-[#00f5d4]/20"
          >
            So sánh
          </button>
        </form>

        {compareOpen && (
          <div className="mt-6">
            {isCompareLoading && (
              <div
                className="hud-skeleton h-28 w-full"
                aria-label="Đang tải dữ liệu so sánh"
              />
            )}
            {isCompareError && !isCompareLoading && (
              <p className="border border-[#ff4655]/30 bg-[#ff4655]/5 p-4 text-sm text-[#ff8b94]">
                Không thể tải Riot ID này. Hãy kiểm tra lại tên và tag.
              </p>
            )}
            {compareProfile && !isCompareLoading && (
              <div className="overflow-hidden border border-white/10">
                <div className="grid grid-cols-2 bg-[#0d151f] text-center">
                  {[profile, compareProfile].map((player, index) => (
                    <div
                      key={`${formatRiotId(player)}-${index}`}
                      className={`p-4 ${index === 0 ? "border-r border-white/10" : ""}`}
                    >
                      <p className="truncate text-sm font-bold uppercase text-white">
                        {formatRiotId(
                          player,
                          index === 0
                            ? `${targetName}#${targetTag}`
                            : compareRiotId,
                        )}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                        {index === 0 ? "Current profile" : "Opponent"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-white/10">
                  {compareRows.map((row) => {
                    const currentValue = toSafeNumber(
                      currentComparableStats[row.key],
                    );
                    const opponentValue = toSafeNumber(compareStats[row.key]);
                    const currentWins = currentValue > opponentValue;
                    const opponentWins = opponentValue > currentValue;
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 text-center"
                      >
                        <span
                          className={`text-lg font-black ${currentWins ? "text-[#00f5d4]" : "text-white"}`}
                        >
                          {row.format(currentValue)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                          {row.label}
                        </span>
                        <span
                          className={`text-lg font-black ${opponentWins ? "text-[#ff4655]" : "text-white"}`}
                        >
                          {row.format(opponentValue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="border-t border-white/10 px-4 py-3 text-center text-[10px] uppercase tracking-widest text-gray-600">
                  Xanh: chỉ số cao hơn của hồ sơ hiện tại · Đỏ: chỉ số cao hơn
                  của đối thủ
                </p>
              </div>
            )}
          </div>
        )}
      </motion.section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733]/80 border border-gray-700/50 relative overflow-hidden group rounded-3xl"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 transition-opacity duration-500 group-hover:opacity-40"
              style={{ backgroundImage: `url(${avatar})` }}
            ></div>
            <div className="absolute inset-0 bg-linear-to-t from-[#0b131b] via-[#0b131b]/85 to-transparent"></div>

            <div className="relative z-10 p-6 flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full border-2 border-[#ff4655] overflow-hidden p-1 shadow-[0_0_20px_rgba(255,70,85,0.35)] mb-4 bg-[#0b1017]">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h2 className="text-3xl font-black text-white tracking-wider uppercase">
                {profile?.name || targetName}
              </h2>
              <p className="text-[#ff4655] font-bold text-lg mb-2">
                #{profile?.tag || targetTag}
              </p>
              <div className="px-4 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-mono tracking-widest text-gray-300">
                LEVEL {profile?.account_level ?? "N/A"}
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="mt-4 border border-[#00f5d4]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00f5d4] transition hover:bg-[#00f5d4]/10"
              >
                Chia sẻ hồ sơ
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733] border border-gray-700/50 p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-[#ff4655]/40 transition-colors rounded-3xl"
          >
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4 w-full text-left">
              Xếp hạng hiện tại
            </h3>
            <img
              src={rankIcon || undefined}
              alt="Rank"
              className="w-28 h-28 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-500"
            />
            <h2 className="text-3xl font-black text-white uppercase tracking-widest mt-4">
              {rankName}
            </h2>
            <p className="text-2xl font-mono text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] mt-1">
              {rrPoints} RR
            </p>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733] border border-gray-700/50 p-5 sm:p-6 rounded-3xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest text-lg">
                  Combat telemetry
                </h3>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">
                  Phân tích {totalMatches} trận gần nhất
                </p>
              </div>
              <span className="text-xs font-mono text-[#00f5d4]">SYNCED</span>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <DonutMetric
                label="Win rate"
                value={winRateValue}
                displayValue={winRate}
                color="#00f5d4"
              />
              <DonutMetric
                label="Headshot"
                value={headshotValue}
                displayValue={`${headshotRate ?? 0}%`}
                color="#ff4655"
              />
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  K/D ratio
                </p>
                <p className="mt-1 text-3xl font-black text-white">{avgKd}</p>
                <StatProgress
                  label="efficiency"
                  value={Math.min(avgKdValue, 3)}
                  max={3}
                  displayValue={`${avgKd} / 3.00`}
                  color="#ff4655"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  Average ACS
                </p>
                <p className="mt-1 text-3xl font-black text-white">{avgAcs}</p>
                <StatProgress
                  label="combat score"
                  value={avgAcs}
                  max={350}
                  displayValue={`${avgAcs} / 350`}
                  color="#ffc857"
                />
              </div>
            </div>
            <div className="mt-7 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-300">
                  Body shot distribution
                </h4>
                <span className="text-[10px] font-mono text-gray-500">
                  {shotDistribution.head +
                    shotDistribution.body +
                    shotDistribution.legs}{" "}
                  shots
                </span>
              </div>
              <div className="flex h-3 overflow-hidden bg-white/10">
                {[
                  ["Đầu", shotDistribution.head, "#ff4655"],
                  ["Thân", shotDistribution.body, "#ffc857"],
                  ["Chân", shotDistribution.legs, "#00a8cc"],
                ].map(([label, amount, color]) => {
                  const totalShots =
                    shotDistribution.head +
                    shotDistribution.body +
                    shotDistribution.legs;
                  return (
                    <div
                      key={label}
                      title={`${label}: ${amount}`}
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${totalShots ? (amount / totalShots) * 100 : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                {[
                  ["Đầu", shotDistribution.head, "#ff4655"],
                  ["Thân", shotDistribution.body, "#ffc857"],
                  ["Chân", shotDistribution.legs, "#00a8cc"],
                ].map(([label, amount, color]) => (
                  <span key={label} className="flex items-center gap-2">
                    <i className="h-2 w-2" style={{ backgroundColor: color }} />
                    {label} {amount}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733] border border-gray-700/50 p-5 sm:p-6 rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest text-lg">
                  Huy hiệu thành tựu
                </h3>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">
                  Performance awards
                </p>
              </div>
              <span className="text-xs font-mono text-[#ffc857]">
                {badges.length} UNLOCKED
              </span>
            </div>
            {badges.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {badges.map((badge) => (
                  <BadgeCard key={badge.title} {...badge} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Tiếp tục thi đấu để mở khóa huy hiệu đầu tiên.
              </p>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733] border border-gray-700/50 p-5 sm:p-6 rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-white font-bold uppercase tracking-widest text-lg">
                Đặc vụ thuần thục nhất
              </h3>
              <span className="text-xs uppercase tracking-widest text-gray-500">
                Top agents
              </span>
            </div>
            {topAgents.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {topAgents.map((agent, index) => (
                  <div
                    key={agent.agent}
                    className="relative overflow-hidden border border-white/10 bg-[#0d151f] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden border border-[#ff4655]/40 bg-black/30">
                        {agent.avatar ? (
                          <img
                            src={agent.avatar}
                            alt={agent.agent}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-lg font-black text-[#ff4655]">
                            {agent.agent.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold uppercase text-white">
                          {agent.agent}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-[#00f5d4]">
                          #{index + 1} specialist
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span className="text-gray-400">
                        K/D <b className="text-white">{agent.kd}</b>
                      </span>
                      <span className="text-gray-400">
                        WR <b className="text-white">{agent.winRate}%</b>
                      </span>
                      <span className="text-gray-400">
                        GP <b className="text-white">{agent.matches}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Chưa có dữ liệu đặc vụ.</p>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-[#1a2733] border border-gray-700/50 p-6 rounded-3xl"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest text-lg">
                  Lịch sử giao tranh
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {totalMatches} trận gần nhất
                </p>
              </div>
              <span className="text-[#ff4655] text-xs font-bold uppercase tracking-widest animate-pulse">
                Live Data
              </span>
            </div>

            <div className="space-y-3">
              {matches.length > 0 ? (
                matches.map((match = {}, matchIndex) => {
                  const matchId = match.matchId || `match-${matchIndex}`;
                  const isExpanded = openMatchId === matchId;
                  const stats = match.stats ?? {};
                  const kills = stats.kills ?? 0;
                  const deaths = stats.deaths ?? 0;
                  const assists = stats.assists ?? 0;
                  const headshots = stats.headshots ?? 0;
                  const score = stats.score ?? 0;
                  const isMvp =
                    score > 0 &&
                    score >=
                      Math.max(
                        ...matches.map((item) =>
                          toSafeNumber(item?.stats?.score),
                        ),
                      );

                  return (
                    <motion.div
                      key={match.matchId || `match-${matchIndex}`}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-3xl border border-gray-800 bg-[#0b1018]/90 shadow-[0_0_20px_rgba(0,0,0,0.15)] transition-all duration-300 group hover:border-[#ff4655]/50 hover:shadow-[0_0_30px_rgba(255,69,85,0.35)]"
                    >
                      <div
                        className="relative h-40 bg-cover bg-center sm:h-36"
                        style={{
                          backgroundImage: `url(${getMapBackground(match)})`,
                        }}
                      >
                        <div className="absolute inset-0 bg-linear-to-t from-[#020608]/95 via-[#07101b]/70 to-transparent" />
                        <button
                          onClick={() =>
                            toggleMatch(matchId)
                          }
                          className="relative z-10 h-full w-full p-4 text-left sm:p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-16 w-16 rounded-3xl overflow-hidden border border-white/10 bg-[#0d141f] flex items-center justify-center">
                                <img
                                  src={getAgentAvatar(match)}
                                  alt={match.agent || "Agent"}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.32em] text-green-400 mb-1">
                                  {match?.metadata?.map ||
                                    match?.map ||
                                    "Unknown"}{" "}
                                  • {""}
                                  {match.gameMode || "Unknown"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-white font-bold text-lg">
                                    {match.agent || "Agent chưa có"}
                                  </h4>
                                  {isMvp && (
                                    <span className="border border-[#ffc857]/40 bg-[#ffc857]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#ffc857]">
                                      MVP
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
                                    K: {kills}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
                                    D: {deaths}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
                                    A: {assists}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] ${match.won ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"}`}
                            >
                              {match.won ? "THẮNG" : "THUA"}
                            </span>
                          </div>
                        </button>
                      </div>

                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden bg-[#0f1923]">
                          <div className="p-4 sm:p-5">
                            <MatchDetails
                              match={match}
                              kills={kills}
                              deaths={deaths}
                              assists={assists}
                              headshots={headshots}
                              score={score}
                              playerName={profile?.name || targetName}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-700/60 bg-[#0d131b] p-6 text-center text-gray-400">
                  Không có dữ liệu trận đấu để hiển thị.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
