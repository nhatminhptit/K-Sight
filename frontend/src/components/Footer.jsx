import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const Footer = () => {
  // Danh sách các mạng xã hội (Thay url thật vào nếu có)
  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com", // Ví dụ link thật
      icon: (
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      ),
      color:
        "hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]",
    },
    {
      name: "Facebook",
      url: "#",
      icon: (
        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
      ),
      color:
        "hover:text-[#1877F2] hover:drop-shadow-[0_0_8px_rgba(24,119,242,0.8)]",
    },
    {
      name: "YouTube",
      url: "#",
      icon: (
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
      ),
      color:
        "hover:text-[#FF0000] hover:drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]",
    },
    {
      name: "LinkedIn",
      url: "#",
      icon: (
        <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
      ),
      color:
        "hover:text-[#0A66C2] hover:drop-shadow-[0_0_8px_rgba(10,102,194,0.8)]",
    },
  ];

  // Hàm xử lý khi người dùng click vào mạng xã hội
  const handleSocialClick = (e, url, name) => {
    if (url === "#" || !url) {
      e.preventDefault();
      // Thay alert bằng toast error
      toast.error(`Kênh ${name} đang được thiết lập!`);
    }
  };

  return (
    <footer className="bg-[#0a1017] border-t border-gray-800/80 text-gray-400 py-8 text-center md:text-left relative z-20">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2">
          <p className="text-sm tracking-widest uppercase font-bold text-white">
            <span className="text-[#ff4655]">K-SIGHT</span> © 2026.
          </p>
          <p className="text-xs tracking-wider text-gray-500 max-w-sm">
            Dự án phân tích dữ liệu Valorant. Không trực thuộc, không được tài
            trợ hay xác nhận bởi Riot Games.
          </p>
        </div>

        {/* Render danh sách Icon động */}
        <div className="flex gap-6 items-center">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => handleSocialClick(e, social.url, social.name)}
              className={`text-gray-500 transition-all duration-300 transform hover:-translate-y-1 ${social.color}`}
              title={social.name}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {social.icon}
              </svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
