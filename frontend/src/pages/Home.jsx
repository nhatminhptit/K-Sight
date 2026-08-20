import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BlurText from "../components/BlurText";
import { motion, AnimatePresence } from "framer-motion";
import SideRays from "../components/SideRays";
import toast from "react-hot-toast"; // Import toast cho form
import axiosClient from "../utils/axiosClient";
import { updateUser } from "../store/authSlice";

// Component con: Xử lý hiệu ứng đóng mở mượt mà cho từng câu hỏi FAQ
const FAQItem = ({ q, a, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: false, amount: 0.1 }} // once: false để kéo lại vẫn hiện
      transition={{ delay: index * 0.1 }}
      className={`border ${isOpen ? "border-[#ff4655]/50" : "border-gray-700/50"} bg-[#1a2733] rounded-sm transition-colors overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-white font-bold text-lg hover:text-[#ff4655] transition-colors"
      >
        <span className="text-left">{q}</span>
        {/* Mũi tên xoay 180 độ khi mở */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[#ff4655] shrink-0 ml-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </motion.span>
      </button>

      {/* Hiệu ứng trượt xuống (height: auto) thay vì chớp tắt */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 text-gray-400 leading-relaxed overflow-hidden"
          >
            <div className="pb-6">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// COMPONENT CHÍNH
const Home = () => {
  const [riotId, setRiotId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRiotId, setModalRiotId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);

  const handleOpenModal = () => {
    setModalRiotId(user?.riotId || "");
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleUpdateRiotId = async () => {
    const newRiotId = (modalRiotId || "").trim();

    if (!newRiotId || !newRiotId.includes("#")) {
      toast.error("Vui lòng nhập Riot ID hợp lệ theo định dạng Tên#Tag");
      return;
    }

    setIsUpdating(true);
    try {
      const data = await axiosClient.put("/auth/riot-id", {
        riotId: newRiotId,
      });

      dispatch(updateUser({ riotId: data.user.riotId }));
      toast.success("Cập nhật Riot ID thành công!");
      setModalOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Cập nhật Riot ID thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const val = (riotId || "").trim();
    if (!val || !val.includes("#")) {
      toast.error("Vui lòng nhập định dạng Tên#Tag");
      return;
    }
    const parts = val.split("#");
    const n = parts[0]?.trim();
    const t = parts[1]?.trim();
    if (!n || !t) return;
    navigate(`/profile/${n}/${t}`);
  };

  const faqData = [
    {
      q: "Dữ liệu trận đấu có được cập nhật theo thời gian thực không?",
      a: "Có. K-Sight kết nối trực tiếp với HenrikDev API. Ngay sau khi trận đấu của bạn kết thúc, dữ liệu sẽ được đồng bộ lên hệ thống trong vòng 1-2 phút.",
    },
    {
      q: "Tại sao tôi không tìm thấy Riot ID của mình?",
      a: "Hãy đảm bảo bạn đã nhập chính xác định dạng Tên#Tag (Ví dụ: TenZ#VN1). Khoảng trắng bị thừa hoặc sai chữ hoa/thường ở phần Tag cũng có thể gây ra lỗi truy xuất.",
    },
    {
      q: "K-Sight có yêu cầu mật khẩu tài khoản Valorant không?",
      a: "Hoàn toàn KHÔNG. K-Sight chỉ sử dụng Riot ID công khai của bạn để lấy dữ liệu. Hệ thống tuyệt đối không bao giờ yêu cầu mật khẩu hay bất kỳ thông tin đăng nhập nào.",
    },
  ];

  return (
    <div className="w-full bg-[#0b1219]">
      {/* ===== SECTION 1: HERO ===== */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-72px)] w-full px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-60 pointer-events-none flex items-center justify-center">
          <SideRays />
        </div>

        <div className="text-center space-y-8 w-full max-w-4xl z-10 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center space-y-1 group cursor-default transition-all duration-500 hover:scale-105"
          >
            <BlurText
              text="THỐNG KÊ CHI TIẾT"
              delay={50}
              animateBy="words"
              direction="top"
              className="text-3xl md:text-5xl font-bold text-gray-300 uppercase tracking-widest group-hover:text-white"
            />
            <BlurText
              text="VALORANT STATS"
              delay={150}
              animateBy="words"
              direction="bottom"
              className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(255,70,85,0.4)] group-hover:text-[#ff4655] group-hover:drop-shadow-[0_0_40px_rgba(255,70,85,0.8)]"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 text-lg md:text-xl font-medium mt-4"
          >
            Nhập mã định danh{" "}
            <span className="text-[#ff4655] font-bold drop-shadow-[0_0_8px_rgba(255,70,85,0.8)] animate-pulse">
              Riot ID
            </span>{" "}
            để trích xuất dữ liệu.
          </motion.p>

          <form
            onSubmit={handleSearch}
            className="mt-8 relative w-full max-w-2xl mx-auto group"
          >
            {/* Thanh line đỏ */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4655] scale-y-0 group-focus-within:scale-y-100 transition-transform duration-300 origin-bottom z-20"></div>

            {/* Thẻ Input (Vẫn giữ pr-[140px] để chữ không chui xuống dưới nút) */}
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="Ví dụ: TenZ#VN1"
              className="w-full bg-[#1a2733]/80 backdrop-blur-md border border-gray-700/50 text-white text-xl p-6 pl-8 pr-35 focus:outline-none focus:border-[#ff4655]/50 focus:bg-[#1a2733] transition-all duration-300 font-bold shadow-lg relative z-10"
            />

            {/* Nút bấm (ĐÃ BỎ CHỮ RELATIVE) */}
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-8 bg-[#ff4655] hover:bg-[#e03e4d] text-white font-bold uppercase tracking-widest transition-all duration-300 z-20"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {/* ===== SECTION 1.5: QUẢN LÝ RIOT ID ===== */}
      <section className="py-12 px-4 bg-[#0b1219] border-t border-[#ff4655]/10">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-3xl bg-[#111b26]/90 border border-[#ff4655]/20 p-6 md:p-8 shadow-[0_0_40px_rgba(255,70,85,0.08)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.3em] text-[#ff4655] font-bold mb-2">
                  Quản lý Riot ID
                </div>
                <div className="text-lg font-semibold text-white">
                  {user?.riotId
                    ? `Riot ID đang liên kết: ${user.riotId}`
                    : user
                      ? "Chưa liên kết Riot ID"
                      : "Bạn chưa đăng nhập"}
                </div>
                {user && (
                  <p className="mt-2 text-sm text-[#b0b7c1]">
                    {user.riotId
                      ? "Nhấp Thay đổi để cập nhật Riot ID mới."
                      : "Liên kết Riot ID để truy xuất nhanh hồ sơ."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={user ? handleOpenModal : () => navigate("/login")}
                  className="rounded-2xl bg-[#ff4655] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(255,70,85,0.18)] transition hover:bg-[#e03e4d]"
                >
                  {user
                    ? user.riotId
                      ? "Thay đổi"
                      : "Liên kết ngay"
                    : "Đăng nhập"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Riot ID */}
      <AnimatePresence>
        {modalOpen && (
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
              className="w-full max-w-lg rounded-3xl bg-[#0f1923] border border-[#ff4655]/20 p-6 shadow-2xl shadow-[#ff4655]/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Cập nhật Riot ID
                  </h2>
                  <p className="text-sm text-[#b0b7c1] mt-1">
                    Nhập Riot ID theo định dạng Tên#Tag (ví dụ: TenZ#VN1).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  value={modalRiotId}
                  onChange={(e) => setModalRiotId(e.target.value)}
                  className="w-full rounded-2xl border border-[#ff4655]/20 bg-[#111b26] px-4 py-3 text-white placeholder-[#8892a4] outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]/30"
                  placeholder="Ví dụ: TenZ#VN1"
                />

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-2xl border border-[#5f6872] px-5 py-3 text-sm font-semibold text-[#b0b7c1] hover:bg-white/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateRiotId}
                    disabled={isUpdating}
                    className="rounded-2xl bg-[#ff4655] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#e03e4d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdating ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SECTION 2: BẢN TIN ===== */}
      <section className="py-24 px-4 bg-[#0a1017] border-t border-gray-800/50 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-2 h-10 bg-[#ff4655]"></div>
            <h3 className="text-3xl font-bold uppercase tracking-widest text-white">
              Tin Tức Khu Vực
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              viewport={{ once: false }}
              className="bg-[#1f2937]/30 border border-gray-800 p-4 rounded-sm"
            >
              <h4 className="text-gray-400 uppercase text-sm font-bold tracking-widest mb-4">
                Mã hóa: Tập 8 Cinematic
              </h4>
              <div className="relative aspect-video w-full rounded overflow-hidden border border-gray-700/50">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/Z_lZqB-Yc_s?si=fLh1q-B9B233C8O_"
                  title="Valorant"
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              viewport={{ once: false }}
              transition={{ delay: 0.1 }}
              className="bg-[#1f2937]/30 border border-gray-800 p-6 rounded-sm relative overflow-hidden group hover:border-[#ff4655]/40 transition-colors"
            >
              <h4 className="text-gray-400 uppercase text-sm font-bold tracking-widest mb-4 group-hover:text-white">
                Định vị Hệ thống
              </h4>
              <div className="w-full h-[85%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20 border border-[#ff4655]/20 relative flex items-center justify-center bg-[#0a1017]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute w-64 h-64 border-t-2 border-[#ff4655]/50 rounded-full opacity-30"
                />
                <div className="absolute w-48 h-48 border border-[#ff4655]/30 rounded-full animate-ping opacity-20"></div>
                <div className="absolute w-32 h-32 border border-[#ff4655]/40 rounded-full"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-4 h-4 bg-[#ff4655] rounded-full shadow-[0_0_15px_rgba(255,70,85,1)] animate-pulse"></div>
                  <div className="mt-4 text-center">
                    <p className="text-white font-bold tracking-widest text-lg">
                      TRẠM HÀ NỘI
                    </p>
                    <p className="text-[#ff4655] text-xs font-mono mt-1">
                      LAT: 21.0285 | LNG: 105.8542
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: FAQ ===== */}
      <section className="py-24 px-4 bg-[#0f1923] border-t border-gray-800/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="mb-12 text-center"
          >
            <h3 className="text-3xl font-bold uppercase tracking-widest text-white">
              Câu Hỏi Thường Gặp
            </h3>
            <p className="text-gray-500 mt-2">
              Giải mã các thắc mắc về hệ thống.
            </p>
          </motion.div>

          {/* Dùng component FAQItem đã tạo ở trên */}
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <FAQItem key={index} q={faq.q} a={faq.a} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
