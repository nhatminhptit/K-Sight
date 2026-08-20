import {
  registerUser,
  loginUser,
  loginWithGoogle,
  updateUserRiotId,
  getUserById,
} from "../services/auth.service.js";

const handleError = (res, error) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Lỗi máy chủ nội bộ",
  });
};

export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { token, user } = await loginWithGoogle(req.body);

    res.status(200).json({
      success: true,
      message: "Đăng nhập bằng Google thành công!",
      token,
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateRiotId = async (req, res) => {
  try {
    const user = await updateUserRiotId(req.user.userId, req.body.riotId);

    res.status(200).json({
      success: true,
      message: "Riot ID đã được cập nhật.",
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};
