"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ANIM_MODES, EFFECT_MODES, EFFECT_ANIM_MODES } from "@/lib/shaders";
import type { GradientState } from "@/lib/gl-engine";
import Slider from "./Slider";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ControlPanel({
  state,
  visible,
  imageSizeBytes,
  shaderSizeBytes,
  onStateChange,
  onCopyReact,
  copyReactLabel,
  onFileLoad,
}: {
  state: GradientState;
  visible: boolean;
  imageSizeBytes: number;
  shaderSizeBytes: number;
  onStateChange: (patch: Partial<GradientState>) => void;
  onCopyReact: () => void;
  copyReactLabel: string;
  onFileLoad: (file: File) => void;
}) {
  const reduction = imageSizeBytes > 0 && shaderSizeBytes > 0
    ? ((1 - shaderSizeBytes / imageSizeBytes) * 100).toFixed(1)
    : null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
    >
      <div className="mx-auto max-w-[720px] p-2">
        {reduction && (
          <div className="flex items-center justify-center gap-3 pb-2 text-[11px] text-white/50">
            <span>{formatBytes(imageSizeBytes)}</span>
            <span className="text-white/30">→</span>
            <span className="text-white/70">{formatBytes(shaderSizeBytes)}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/70">{reduction}% smaller</span>
          </div>
        )}
        <div className="bg-black/60 backdrop-blur-2xl rounded-3xl p-5 pb-0 shadow-2xl overflow-hidden">
          <div className="space-y-1">
            <Slider label="Samples" value={state.res} min={4} max={256} step={2} format={(v) => `${v}`} onChange={(v) => onStateChange({ res: v })} />
            <Slider label="Noise" value={state.noise} min={0} max={0.5} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => onStateChange({ noise: v })} />

            {/* Animation pills */}
            <div className="flex items-start gap-2 pt-1">
              <span className="text-[11px] text-white/60 w-14 shrink-0">Animation</span>
              <div className="flex flex-wrap gap-1">
                {ANIM_MODES.map((m) => (
                  <button
                    key={m.id}
                    aria-pressed={state.animMode === m.id}
                    className={`h-6 px-2.5 rounded-lg text-[12px] cursor-pointer transition-all
                        ${state.animMode === m.id
                        ? "bg-white text-black font-medium"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}
                    onClick={() => onStateChange({ animMode: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {state.animMode > 0 && (
                <motion.div
                  key="anim-sliders"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pt-1">
                    <Slider label="Flow" value={state.flow} min={0} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => onStateChange({ flow: v })} />
                    <Slider label="Speed" value={state.speed} min={0} max={2} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => onStateChange({ speed: v })} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Effect (overlay layer) pills */}
            <div className="flex items-start gap-2 pt-1">
              <span className="text-[11px] text-white/60 w-14 shrink-0">Effect</span>
              <div className="flex flex-wrap gap-1">
                {EFFECT_MODES.map((m) => (
                  <button
                    key={m.id}
                    aria-pressed={state.effect === m.id}
                    className={`h-6 px-2.5 rounded-lg text-[12px] cursor-pointer transition-all
                        ${state.effect === m.id
                        ? "bg-white text-black font-medium"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}
                    onClick={() => onStateChange({ effect: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {state.effect > 0 && (
                <motion.div
                  key="effect-sliders"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pt-1">
                    <Slider label="Size" value={state.effectScale} min={2} max={64} step={1} format={(v) => `${v}px`} onChange={(v) => onStateChange({ effectScale: v })} />

                    {/* Effect animation pills */}
                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-[11px] text-white/60 w-14 shrink-0">Motion</span>
                      <div className="flex flex-wrap gap-1">
                        {EFFECT_ANIM_MODES.map((m) => (
                          <button
                            key={m.id}
                            aria-pressed={state.effectAnim === m.id}
                            className={`h-6 px-2.5 rounded-lg text-[12px] cursor-pointer transition-all
                                ${state.effectAnim === m.id
                                ? "bg-white text-black font-medium"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                              }`}
                            onClick={() => onStateChange({ effectAnim: m.id })}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {state.effectAnim > 0 && (
                        <motion.div
                          key="effect-motion-sliders"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1 pt-1">
                            <Slider label="Speed" value={state.effectSpeed} min={0} max={3} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => onStateChange({ effectSpeed: v })} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Export buttons */}
            <div className="flex gap-2 p-4 mt-2 border-t border-white/20 relative -left-5 w-[calc(100%+40px)]">
              <button
                className="flex-1 py-2 h-10 rounded-full bg-white/30 text-white text-xs font-medium cursor-pointer hover:bg-white/50 transition-colors"
                onClick={onCopyReact}
              >
                {copyReactLabel}
              </button>
              <label className="py-2 px-4 rounded-full flex items-center justify-center bg-white/10 text-white/70 text-xs cursor-pointer hover:bg-white/20 transition-colors border border-white/10">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileLoad(f); }} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
