import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../utils/axiosClient";

const EMPTY_LEADERBOARD = [];

const Leaderboard = () => {
  const [sort, setSort] = useState("rank");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", sort],
    queryFn: () => axiosClient.get(`/leaderboard?sort=${sort}`),
    staleTime: 300000,
  });
  const entries = Array.isArray(data?.data) ? data.data : EMPTY_LEADERBOARD;
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? entries.filter((entry) =>
          [entry.username, entry.riotId, entry.rankName].some((value) =>
            String(value || "").toLowerCase().includes(query),
          ),
        )
      : entries;
  }, [entries, search]);

  return (
    <main className="tactical-page mx-auto min-h-[calc(100vh-72px)] w-full max-w-6xl px-4 py-8">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-5 border-b border-[#ff4655]/20 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ff4655]">
            K-SIGHT / GLOBAL RANKING
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
            Bảng xếp hạng
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#00f5d4]">
          <Trophy size={16} /> {entries.length} agents indexed
        </div>
      </motion.header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff4655]" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm username, Riot ID hoặc rank..."
            className="w-full border border-gray-700/60 bg-[#111b26] py-3 pl-11 pr-4 text-white outline-none transition focus:border-[#ff4655]"
          />
        </label>
        <div className="flex border border-gray-700/60 bg-[#111b26] p-1">
          {[
            ["rank", "Theo Rank"],
            ["winrate", "Theo Winrate"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
                sort === value ? "bg-[#ff4655] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="hud-skeleton h-64 w-full" />}
      {isError && (
        <div className="border border-[#ff4655]/30 bg-[#ff4655]/5 p-6 text-center text-[#ff8b94]">
          Không thể tải dữ liệu bảng xếp hạng.
        </div>
      )}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isTopThree = entry.position <= 3;
            const medal = ["", "🥇", "🥈", "🥉"][entry.position] || "";
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative grid grid-cols-[48px_1fr_auto] items-center gap-3 overflow-hidden border bg-[#111b26]/90 p-3 sm:grid-cols-[64px_1fr_150px_120px_100px] sm:gap-5 sm:p-4 ${
                  isTopThree
                    ? "border-[#ffc857]/60 shadow-[0_0_24px_rgba(255,200,87,0.12)]"
                    : "border-white/10"
                }`}
              >
                {isTopThree && <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-[#ffc857] via-[#ff4655] to-[#00f5d4]" />}
                <div className="text-center text-xl font-black text-white">
                  {medal || `#${entry.position}`}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden border border-[#ff4655]/40 bg-black/30">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-black text-[#ff4655]">
                        {(entry.username || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold uppercase text-white">{entry.username}</p>
                    <p className="truncate text-xs font-mono text-gray-500">{entry.riotId || "Riot ID chưa liên kết"}</p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Rank</p>
                  <div className="flex items-center gap-2">
                    {entry.rankIcon && <img src={entry.rankIcon} alt="" className="h-7 w-7" />}
                    <span className="text-sm font-bold text-white">{entry.rankName}</span>
                  </div>
                </div>
                <div className="hidden text-center sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Winrate</p>
                  <p className="font-black text-[#00f5d4]">{entry.winRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">RR</p>
                  <p className="font-black text-[#ffc857]">{entry.rrPoints}</p>
                </div>
              </motion.div>
            );
          })}
          {!filteredEntries.length && <p className="p-8 text-center text-gray-500">Không tìm thấy người chơi.</p>}
        </div>
      )}
    </main>
  );
};

export default Leaderboard;
