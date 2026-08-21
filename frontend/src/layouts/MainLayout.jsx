import { Outlet, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import Footer from "../components/Footer";
import DecryptedText from "../components/DecryptedText";
import { Toaster, toast } from "react-hot-toast";
import axiosClient from "../utils/axiosClient";
import { logout, updateUser } from "../store/authSlice";

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const user = useSelector((state) => state.auth?.user);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showRiotIdFormModal, setShowRiotIdFormModal] = useState(false);
  const [riotIdInput, setRiotIdInput] = useState("");
  const [isUpdatingRiotId, setIsUpdatingRiotId] = useState(false);

  const handleAuthButtonClick = () => {
    if (isAuthenticated) {
      dispatch(logout());
      navigate("/");
      return;
    }

    navigate("/login");
  };

  const handleProfileClick = () => {
    navigate("/my-profile");
  };

  const handleCloseWarningModal = () => {
    setShowWarningModal(false);
  };

  const handleOpenRiotIdForm = () => {
    setShowWarningModal(false);
    setRiotIdInput(user?.riotId || "");
    setShowRiotIdFormModal(true);
  };

  const handleCloseRiotIdForm = () => {
    setShowRiotIdFormModal(false);
  };

  const handleSaveRiotId = async () => {
    const trimmedRiotId = riotIdInput.trim();
    if (!trimmedRiotId || !trimmedRiotId.includes("#")) {
      toast.error("Vui lòng nhập Riot ID hợp lệ theo định dạng TenZ#VN1.");
      return;
    }

    setIsUpdatingRiotId(true);
    try {
      const data = await axiosClient.put("/auth/riot-id", {
        riotId: trimmedRiotId,
      });

      dispatch(updateUser({ riotId: data.user.riotId }));
      toast.success("Riot ID đã được liên kết thành công.");
      setShowRiotIdFormModal(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể cập nhật Riot ID. Vui lòng thử lại.",
      );
    } finally {
      setIsUpdatingRiotId(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1923] text-white font-sans">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#fff",
            border: "1px solid #ff4655",
            borderRadius: "4px",
            fontWeight: "bold",
            letterSpacing: "1px",
          },
        }}
      />
      {/* Header mỏng, trong suốt nhẹ, viền dưới màu đỏ sậm */}
      <header className="h-18 sticky top-0 z-50 bg-[#0f1923]/90 backdrop-blur-sm border-b border-[#ff4655]/30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Cụm Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square" // Đổi nét cắt thành vuông vức chuẩn Valorant
              className="w-8 h-8 text-[#ff4655] transition-transform duration-500 group-hover:rotate-90"
            >
              <circle cx="12" cy="12" r="8" strokeOpacity="0.5" />
              <circle cx="12" cy="12" r="2" className="fill-[#ff4655]" />
              <line x1="12" y1="0" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="24" />
              <line x1="0" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="24" y2="12" />
            </svg>

            <div className="text-2xl font-black tracking-widest uppercase text-white group-hover:text-[#ff4655] transition-colors duration-300">
              <DecryptedText
                text="K-SIGHT"
                animateOn="hover" // Chỉ chạy hiệu ứng giải mã khi hover
                speed={80}
                maxIterations={15}
                characters="ABCD1234!@#$"
              />
            </div>
          </Link>

          {/* Menu */}
          <nav className="hidden md:flex gap-8 items-center">
            <Link
              to="/"
              className="text-gray-400 hover:text-white uppercase font-bold text-sm tracking-widest transition-colors"
            >
              Tra cứu
            </Link>
            <button
              type="button"
              onClick={handleProfileClick}
              className="text-gray-400 hover:text-white uppercase font-bold text-sm tracking-widest transition-colors"
            >
              Hồ sơ
            </button>
            {/* Nút ĐĂNG NHẬP / ĐĂNG XUẤT với hiệu ứng quét */}
            <button
              type="button"
              onClick={handleAuthButtonClick}
              className="px-6 py-2 relative group overflow-hidden border border-[#ff4655] text-[#ff4655] font-bold uppercase text-sm tracking-widest transition-all duration-300 hover:text-white"
            >
              <span className="absolute inset-0 bg-[#ff4655] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
              <span className="relative z-10 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,1)]">
                {isAuthenticated ? "ĐĂNG XUẤT" : "ĐĂNG NHẬP"}
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main className="grow relative z-10">
        <Outlet />
      </main>

      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-[#111b26] border border-[#ff4655]/30 p-6 shadow-2xl shadow-[#ff4655]/20">
            <h2 className="text-lg font-bold text-white mb-4">
              Tài khoản của bạn chưa liên kết với Riot ID
            </h2>
            <p className="text-sm text-[#b0b7c1] mb-6">
              Bạn cần liên kết Riot ID trước khi truy cập trang Hồ sơ.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  handleCloseWarningModal();
                  navigate("/");
                }}
                className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleOpenRiotIdForm}
                className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#e03e4d] transition"
              >
                Liên kết ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {showRiotIdFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-[#0e151c] border border-[#ff4655]/30 p-6 shadow-2xl shadow-[#ff4655]/20">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-2">
                Liên kết Riot ID
              </h2>
              <p className="text-sm text-[#b0b7c1]">
                Nhập Riot ID theo định dạng TenZ#VN1 để tiếp tục.
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#d9d9d9]">
                Riot ID
              </label>
              <input
                type="text"
                value={riotIdInput}
                onChange={(e) => setRiotIdInput(e.target.value)}
                placeholder="Ví dụ: TenZ#VN1"
                className="w-full rounded-2xl border border-[#ff4655]/20 bg-[#111a22] px-4 py-3 text-white placeholder-[#8892a4] outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]/30"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseRiotIdForm}
                className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveRiotId}
                disabled={isUpdatingRiotId}
                className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#e03e4d] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingRiotId ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MainLayout;
