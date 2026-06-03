"use client";

import { useState, useCallback } from "react";
import type { GradientState } from "@/lib/gl-engine";
import {
  buildFragExport,
  buildVertExport,
  buildUsageExport,
  highlightGlsl,
} from "@/lib/export";

type Tab = "frag" | "vert" | "usage";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      className="py-3 px-4 rounded-[10px] bg-neutral-900 text-white font-mono text-[11.5px] font-semibold
        tracking-wider uppercase border border-neutral-800 transition-colors
        hover:border-neutral-500 hover:text-neutral-300"
      onClick={handleCopy}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export default function ExportModal({
  open,
  state,
  onClose,
}: {
  open: boolean;
  state: GradientState;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("frag");

  if (!open) return null;

  const fragCode = buildFragExport(state);
  const vertCode = buildVertExport();
  const usageCode = buildUsageExport(state);

  const tabs: { id: Tab; label: string }[] = [
    { id: "frag", label: "Fragment GLSL" },
    { id: "vert", label: "Vertex GLSL" },
    { id: "usage", label: "How to use" },
  ];

  const codeMap: Record<Tab, string> = {
    frag: fragCode,
    vert: vertCode,
    usage: usageCode,
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-[820px] max-h-[86vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center">
          <h2 className="font-serif text-xl font-semibold">Your shader</h2>
          <button
            className="bg-transparent border-none text-neutral-500 text-2xl cursor-pointer leading-none hover:text-white"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`bg-transparent border-none font-mono text-[11px] px-3.5 py-2 rounded-t-lg cursor-pointer tracking-wider
                ${tab === t.id ? "text-white bg-neutral-900" : "text-neutral-600"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Code body */}
        <div className="px-6 pb-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="pt-4">
            <pre
              className="bg-black border border-neutral-800 rounded-[10px] p-4 overflow-x-auto text-[11px] leading-relaxed text-neutral-400 whitespace-pre scrollbar-thin scrollbar-thumb-neutral-800"
              dangerouslySetInnerHTML={{
                __html: highlightGlsl(codeMap[tab]),
              }}
            />
            {(tab === "frag" || tab === "vert") && (
              <div className="mt-3.5">
                <CopyButton
                  text={codeMap[tab]}
                  label={`Copy ${tab === "frag" ? "fragment" : "vertex"} shader`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
