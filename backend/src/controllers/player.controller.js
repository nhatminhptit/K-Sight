import {
  getPlayerProfileData,
  getMyPlayerProfileData,
} from "../services/player.service.js";

const handleError = (res, error, fallbackMessage) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : fallbackMessage,
  });
};

export const getProfile = async (req, res) => {
  try {
    const data = await getPlayerProfileData(req.params.name, req.params.tag);

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Lỗi máy chủ hoặc API Riot đang bảo trì!");
  }
};

export const getMyValorantProfile = async (req, res) => {
  try {
    const data = await getMyPlayerProfileData(req.user.userId);

    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Lỗi máy chủ hoặc API Riot đang bảo trì!");
  }
};
