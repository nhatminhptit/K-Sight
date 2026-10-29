import { getLeaderboard } from "../services/leaderboard.service.js";

export const getLeaderboardData = async (req, res) => {
  try {
    const sort = req.query.sort === "winrate" ? "winrate" : "rank";
    const data = await getLeaderboard({ sort });
    res.json({ success: true, data });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải bảng xếp hạng.",
    });
  }
};
