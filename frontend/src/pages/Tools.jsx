import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Crosshair, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_CROSSHAIR = { thickness: 2, length: 6, opacity: 1, color: "#00f5d4" };
const COLORS = ["#00f5d4", "#ff4655", "#ffffff", "#ffc857", "#8b5cf6"];
const VALORANT_COLOR_CODES = {
  "#00f5d4": 1,
  "#ff4655": 2,
  "#ffffff": 5,
  "#ffc857": 4,
  "#8b5cf6": 3,
};

const Tools = () => {
  const [settings, setSettings] = useState(DEFAULT_CROSSHAIR);
  const updateSetting = (key, value) =>
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  const profileCode = useMemo(
    () =>
      `0;P;c;${VALORANT_COLOR_CODES[settings.color] || 5};h;0;f;0;0t;${settings.thickness};0l;${settings.length};0o;${settings.length};0a;${settings.opacity};0m;0;0s;0.8;0e;0.2;1b;0;S;c;${VALORANT_COLOR_CODES[settings.color] || 5}`,
    [settings],
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(profileCode);
      toast.success("Đã copy Crosshair Profile Code.", {
        style: { background: "#111b26", color: "#00f5d4", border: "1px solid #00f5d4" },
      });
    } catch {
      toast.error("Không thể copy mã. Hãy thử lại.");
    }
  };

  return (
    <main className="tactical-page mx-auto min-h-[calc(100vh-72px)] w-full max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ff4655]">K-SIGHT / LOADOUT</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">Công cụ</h1>
      </header>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="hud-panel border border-white/10 bg-[#111b26]/90 p-6">
          <div className="mb-6 flex items-center gap-3">
            <Crosshair className="text-[#ff4655]" />
            <div>
              <h2 className="font-bold uppercase tracking-widest text-white">Crosshair Generator</h2>
              <p className="text-xs text-gray-500">Tùy chỉnh tâm ngắm chiến thuật</p>
            </div>
          </div>
          <div className="space-y-6">
            {[
              ["thickness", "Độ dày", 1, 6, 1],
              ["length", "Độ dài", 2, 14, 1],
              ["opacity", "Opacity", 0.1, 1, 0.1],
            ].map(([key, label, min, max, step]) => (
              <label key={key} className="block">
                <div className="mb-2 flex justify-between text-xs uppercase tracking-widest text-gray-400">
                  <span>{label}</span><b className="text-white">{settings[key]}</b>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key]}
                  onChange={(event) => updateSetting(key, event.target.value)}
                  className="w-full accent-[#ff4655]"
                />
              </label>
            ))}
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-gray-400">Màu tâm ngắm</p>
              <div className="flex gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Chọn màu ${color}`}
                    onClick={() => setSettings((current) => ({ ...current, color }))}
                    className={`h-8 w-8 border-2 ${settings.color === color ? "scale-125 border-white" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_CROSSHAIR)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white"
            >
              <RotateCcw size={14} /> Reset profile
            </button>
          </div>
        </div>
        <div className="hud-panel relative min-h-[420px] overflow-hidden border border-[#ff4655]/30 bg-[#111b26]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,70,85,0.22),transparent_35%),linear-gradient(135deg,#182b3a,#070d14)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative flex min-h-[420px] flex-col items-center justify-center">
            <p className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.3em] text-[#00f5d4]">IN-GAME SIMULATION / A01</p>
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
              style={{ opacity: settings.opacity, color: settings.color }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-current" style={{ width: `${settings.thickness}px`, height: `${settings.length * 2 + 12}px` }} />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-current" style={{ width: `${settings.length * 2 + 12}px`, height: `${settings.thickness}px` }} />
              <span className="block rounded-full bg-current" style={{ width: `${settings.thickness + 2}px`, height: `${settings.thickness + 2}px` }} />
            </motion.div>
            <div className="absolute bottom-5 left-5 font-mono text-[10px] text-gray-500">THICKNESS {settings.thickness} // LENGTH {settings.length}</div>
          </div>
        </div>
      </section>
      <section className="mt-6 border border-[#00f5d4]/20 bg-[#111b26]/90 p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-gray-500">Valorant profile code</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <code className="min-w-0 flex-1 overflow-x-auto bg-[#070d14] p-3 text-xs text-[#00f5d4]">{profileCode}</code>
          <button type="button" onClick={copyCode} className="flex items-center justify-center gap-2 bg-[#00f5d4] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#07101b] hover:brightness-110">
            <Copy size={15} /> Copy Profile Code
          </button>
        </div>
      </section>
    </main>
  );
};

export default Tools;
