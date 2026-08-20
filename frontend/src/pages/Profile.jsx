import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../utils/axiosClient";
import toast from "react-hot-toast";
import { updateUser } from "../store/authSlice";

const MAP_BACKGROUNDS = {
  Ascent:
    "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png",
  Haven:
    "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png",
  Split:
    "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png",
  Bind: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png",
  Icebox:
    "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png",
  Breeze:
    "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png",
  Fracture:
    "https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png",
  Abyss:
    "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png",
  Lotus:
    "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png",
  Sunset:
    "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png",
  Pearl:
    "https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/splash.png",
  Summit:
    "https://media.valorant-api.com/maps/756da597-416b-c0f2-f47b-afbdf28670bc/splash.png",
  Corrode:
    "https://media.valorant-api.com/maps/1c18ab1f-420d-0d8b-71d0-77ad3c439115/splash.png",
  Default: "",
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

  useEffect(() => {
    if (name && tag) {
      setSearchId(`${name}#${tag}`);
    }
  }, [name, tag]);
  const [openMatchId, setOpenMatchId] = useState(null);

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
    const mapName = match?.map ?? match?.metadata?.map;
    return MAP_BACKGROUNDS[mapName] ?? MAP_BACKGROUNDS.Default;
  };

  const getKdRatio = (match) => {
    const kills = match?.stats?.kills ?? 0;
    const deaths = match?.stats?.deaths ?? 0;
    if (!deaths) return kills ? "∞" : "0.00";
    return (kills / deaths).toFixed(2);
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

  const { targetName, targetTag } = useMemo(() => {
    const routeName = name?.trim() || "";
    const routeTag = tag?.trim() || "";
    const fallbackRiotId =
      reduxUser?.riotId?.trim() ||
      "";

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
  }, [
    name,
    tag,
    reduxUser?.riotId,
  ]);

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
    enabled: isAuthenticated && (onMyProfileRoute ? true : !!targetName && !!targetTag),
    retry: 1,
  });

  const profile = playerData?.data;
  const matches = profile?.matches ?? [];
  const { totalMatches, winRate, avgKd, headshotRate } = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter((match) => match.won).length;
    const averageKd = total
      ? (
          matches.reduce(
            (acc, match) => acc + (parseFloat(match.stats?.kdRatio) || 0),
            0,
          ) / total
        ).toFixed(2)
      : "0.00";

    const headshotValue =
      profile?.headshot_rate ??
      profile?.headshot ??
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

        return totals.shots
          ? Math.round((totals.headshots / totals.shots) * 100)
          : null;
      })();

    return {
      totalMatches: total,
      winRate: total ? `${Math.round((wins / total) * 100)}%` : "N/A",
      avgKd: averageKd,
      headshotRate: headshotValue,
    };
  }, [matches, profile?.headshot, profile?.headshot_rate]);

  // Fallback helpers and derived values used by JSX (safe defaults)
  const avatar =
    profile?.avatar_url ??
    "https://api.dicebear.com/6.x/adventurer/svg?seed=Valorant";
  const rankIcon = profile?.mmr?.rank_icon ?? "";
  const rankName = profile?.mmr?.rank_name ?? "Unranked";
  const rrPoints = profile?.mmr?.rr_points ?? 0;

  if (onMyProfileRoute && isAuthenticated && isError && error?.response?.status === 404) {
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
      <div className="flex min-h-[75vh] items-center justify-center w-full px-4">
        <div className="w-full max-w-sm rounded-xl border border-[#2d3748] bg-[#1a2733] p-6 shadow-[0_0_30px_rgba(255,70,85,0.14)]">
          <p className="text-sm uppercase tracking-widest text-white text-center mb-4">
            ĐANG NHẬN DỮ LIỆU...
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-full w-1/2 rounded-full bg-[#ff4655]"
            />
          </div>
        </div>
      </div>
    );
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

  if (!isAuthenticated) {
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              value={searchId}
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
            className="grid grid-cols-3 gap-4"
          >
            <div className="bg-[#1a2733] border border-gray-700/50 p-4 text-center hover:bg-[#1f2937] transition rounded-3xl">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">
                Tỉ lệ thắng
              </p>
              <p className="text-2xl font-black text-white">{winRate}</p>
            </div>
            <div className="bg-[#1a2733] border border-gray-700/50 p-4 text-center hover:bg-[#1f2937] transition rounded-3xl">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">
                K/D trung bình
              </p>
              <p className="text-2xl font-black text-white">{avgKd}</p>
            </div>
            <div className="bg-[#1a2733] border border-gray-700/50 p-4 text-center hover:bg-[#1f2937] transition rounded-3xl">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-1">
                Tỉ lệ Headshot
              </p>
              <p className="text-2xl font-black text-white">
                {headshotRate != null ? `${headshotRate}%` : "0%"}
              </p>
            </div>
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
                matches.map((match) => {
                  const stats = match.stats ?? {};
                  const kills = stats.kills ?? 0;
                  const deaths = stats.deaths ?? 0;
                  const assists = stats.assists ?? 0;
                  const headshots = stats.headshots ?? 0;
                  const score = stats.score ?? 0;

                  return (
                    <motion.div
                      key={match.matchId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-3xl border border-gray-800 bg-[#0b1018]/90 shadow-[0_0_20px_rgba(0,0,0,0.15)] transition-all duration-300 group hover:border-[#ff4655]/50 hover:shadow-[0_0_30px_rgba(255,69,85,0.35)]"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-80"
                        style={{
                          backgroundImage: `url(${getMapBackground(match)})`,
                        }}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#020608]/95 via-[#07101b]/70 to-transparent" />

                      <div className="relative z-10 p-4 sm:p-5">
                        <button
                          onClick={() => toggleMatch(match.matchId)}
                          className="w-full text-left"
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
                                  {match.metadata.map || "Unknown"} • {""}
                                  {match.gameMode || "Unknown"}
                                </p>
                                <h4 className="text-white font-bold text-lg">
                                  {match.agent || "Agent chưa có"}
                                </h4>
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

                        <AnimatePresence>
                          {openMatchId === match.matchId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28 }}
                              className="overflow-hidden mt-4"
                            >
                              <div className="p-3 rounded-md bg-linear-to-r from-[#07101b]/60 to-[#071827]/30 border border-gray-800">
                                <div className="grid grid-cols-3 gap-3 text-sm text-gray-300">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      Kills
                                    </p>
                                    <p className="text-white font-semibold">
                                      {kills}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      Deaths
                                    </p>
                                    <p className="text-white font-semibold">
                                      {deaths}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      Assists
                                    </p>
                                    <p className="text-white font-semibold">
                                      {assists}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-gray-300">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      K/D
                                    </p>
                                    <p className="text-white font-semibold">
                                      {getKdRatio(match)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      Headshots
                                    </p>
                                    <p className="text-white font-semibold">
                                      {headshots}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">
                                      Score
                                    </p>
                                    <p className="text-white font-semibold">
                                      {score}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
