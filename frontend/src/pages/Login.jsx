import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff, Gamepad2, Lock, Mail, User } from "lucide-react";
import axiosClient from "../utils/axiosClient";
import { loginSuccess } from "../store/authSlice";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State quản lý UI
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // State lưu dữ liệu form
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    riotId: "",
  });

  // Hàm xử lý Submit Form Truyền thống
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        setErrorMessage("Mật khẩu nhập lại không khớp");
        setIsLoading(false);
        return;
      }

      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { username: formData.username, password: formData.password }
        : {
            email: formData.email,
            username: formData.username,
            password: formData.password,
            riotId: formData.riotId || undefined,
          };

      const data = await axiosClient.post(endpoint, payload);
      const { user, token } = data;
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_info", JSON.stringify(user));
      dispatch(loginSuccess(data));
      toast.success("Đăng nhập thành công!", { position: "top-center" });
      navigate("/", { replace: true });
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Thao tác thất bại. Vui lòng kiểm tra lại!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /// Hàm xử lý Google Login chuẩn hóa
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);

        // BƯỚC 1: Dùng token vừa nhận được để xin thông tin User từ Google
        const userInfo = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        ).then((res) => res.json());

        // BƯỚC 2: Gửi chính xác email và googleId lên Backend của bạn
        const data = await axiosClient.post("/auth/google", {
          email: userInfo.email,
          googleId: userInfo.sub, // 'sub' chính là mã ID duy nhất mà Google cấp
          username: userInfo.name,
        });

        const { user, token } = data;
        localStorage.setItem("access_token", token);
        localStorage.setItem("user_info", JSON.stringify(user));
        dispatch(loginSuccess(data));
        toast.success("Đăng nhập thành công!", { position: "top-center" });
        navigate("/", { replace: true });
      } catch (err) {
        setErrorMessage(
          err?.response?.data?.message ||
            err?.message ||
            "Lỗi xử lý Google Login!",
        );
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setErrorMessage("Đăng nhập Google bị hủy hoặc thất bại."),
  });

  // Tự động tắt thông báo lỗi sau 3 giây
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 3000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-dvh w-full flex items-center justify-center py-8 px-4 relative overflow-hidden bg-[#0f1923]"
    >
      {/* Background & Animations */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600288735298-05ef8e7f5242?auto=format&fit=crop&w=1368&q=80"
          alt="Valorant background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1923]/90 via-[#0d151f]/75 to-[#000000]/95"></div>
        <div className="absolute inset-0 bg-black/75"></div>
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-16 left-12 w-72 h-72 bg-[#ff4655]/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 right-12 w-96 h-96 bg-[#ff4655]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Floating Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 z-50 -translate-x-1/2 w-full max-w-md rounded-2xl border border-[#ff4655]/40 bg-[#3f1119]/95 px-4 py-3 text-[#ffeaea] shadow-2xl backdrop-blur-md flex items-center gap-3"
          >
            <div className="text-sm font-medium">{errorMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Main Form Card */}
      <div className="w-full max-w-130 z-20 bg-[#111a22]/95 backdrop-blur-xl border border-[#ff4655]/20 rounded-3xl shadow-[0_0_45px_rgba(255,70,85,0.15)] p-6 sm:p-8">
        <div className="text-center space-y-2 mb-4">
          <div className="flex justify-center">
            <div className="relative">
              <Gamepad2 className="w-10 h-10 text-[#ff4655]" />
              <div className="absolute inset-0 w-10 h-10 bg-[#ff4655]/25 rounded-full blur-xl"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            VALORANT TRACKER
          </h2>
          <p className="text-sm uppercase tracking-[0.4em] text-[#ff4655]">
            DARK OPS LOGIN
          </p>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex bg-[#131f2a]/80 rounded-xl p-1 mb-6 border border-[#ff4655]/20 shadow-inner">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              isLogin
                ? "bg-[#ff4655] text-white shadow-lg shadow-[#ff4655]/20"
                : "text-[#d9d9d9] hover:text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              !isLogin
                ? "bg-[#ff4655] text-white shadow-lg shadow-[#ff4655]/20"
                : "text-[#d9d9d9] hover:text-white"
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#ff4655]" />
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="player@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-4 py-2 rounded-2xl transition-all"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#ff4655]" />
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên tài khoản"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-4 py-2 rounded-2xl transition-all"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#ff4655]" />
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-10 py-2 rounded-2xl transition-all"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#c1c7d0] hover:text-[#ff4655] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#ff4655]" />
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-10 py-2 rounded-2xl transition-all"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#ff4655]" />
                  Riot ID
                  <span className="text-xs text-[#8892a4]">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập Riot ID"
                    value={formData.riotId}
                    onChange={(e) =>
                      setFormData({ ...formData, riotId: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-4 py-2 rounded-2xl transition-all"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#ff4655]" />
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên tài khoản"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-4 py-2 rounded-2xl transition-all"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#d9d9d9] text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#ff4655]" />
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full bg-[#121e2d] border border-[#ff4655]/20 text-white placeholder-[#8892a4] focus:border-[#ff4655] focus:outline-none focus:ring-1 focus:ring-[#ff4655]/30 pl-10 pr-10 py-2 rounded-2xl transition-all"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ff4655]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#c1c7d0] hover:text-[#ff4655] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Options */}
          {isLogin && (
            <div className="flex items-center justify-between text-sm mt-2">
              <label className="flex items-center space-x-2 text-[#d9d9d9] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#ff4655]/40 bg-[#0f1923] text-[#ff4655] focus:ring-[#ff4655]"
                />
                <span>Ghi nhớ</span>
              </label>
              <a
                href="#"
                className="text-[#ff4655] hover:text-[#ff7a8d] transition-colors"
              >
                Quên mật khẩu?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff4655] hover:bg-[#e03e4d] text-white font-bold py-3 rounded-2xl shadow-[0_0_20px_rgba(255,70,85,0.25)] transition-all duration-300 flex items-center justify-center mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "ĐANG XỬ LÝ..."
              : isLogin
                ? "ĐĂNG NHẬP"
                : "TẠO TÀI KHOẢN"}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-6 space-y-4">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-full border-t border-[#ff4655]/30"></span>
            <span className="bg-[#111a22] px-4 text-xs text-[#d9d9d9] relative z-10">
              HOẶC TIẾP TỤC VỚI
            </span>
          </div>

          <button
            type="button"
            onClick={() => googleLogin()}
            className="w-full bg-[#131f2a] border border-[#ff4655]/30 text-white hover:bg-[#192532] hover:border-[#ff4655]/60 font-medium py-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập bằng Google
          </button>
        </div>
      </div>
    </motion.div>
  );
}
