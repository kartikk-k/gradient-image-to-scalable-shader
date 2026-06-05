"use client";

import { useState } from "react";

function parseReactCode(code: string) {
  const dataURLMatch = code.match(/img\.src\s*=\s*"(data:image\/[^"]+)"/);
  const texSizeMatch = code.match(/gl\.uniform2f\(U\.texSize,\s*([\d.]+),\s*([\d.]+)\)/);
  const getUniform = (name: string) => {
    const m = code.match(new RegExp(`gl\\.uniform1f\\(U\\.${name},\\s*([\\d.\\-]+)\\)`));
    return m ? parseFloat(m[1]) : 0;
  };

  if (!dataURLMatch || !texSizeMatch) return null;

  return {
    dataURL: dataURLMatch[1],
    gridW: parseInt(texSizeMatch[1]),
    gridH: parseInt(texSizeMatch[2]),
    flow: getUniform("flow"),
    speed: getUniform("speed"),
    scale: getUniform("scale"),
    quality: getUniform("quality"),
    noise: getUniform("noise"),
    noiseScale: getUniform("noiseScale"),
    animMode: getUniform("animMode"),
    hueShift: getUniform("hueShift"),
  };
}

export default function EditPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsed = parseReactCode(code);
    if (!parsed) {
      setStatus("Could not parse shader code. Make sure you pasted the full React component.");
      return;
    }

    const id = String(Math.floor(10000 + Math.random() * 90000));
    const item = { id, ...parsed };

    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Added #${item.id} to collection`);
        setCode("");
      } else {
        setStatus(data.error || "Failed to add");
      }
    } catch (e) {
      setStatus("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Add to Collection</h1>

      <label className="block text-sm text-white/60 mb-1">Paste React code</label>
      <textarea
        className="w-full h-64 bg-white/10 rounded-lg px-3 py-2 text-xs font-mono mb-4 outline-none focus:ring-2 focus:ring-white/30 resize-y"
        placeholder='Paste the "Copy React code" output here...'
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        className="px-6 py-2 rounded-full bg-white text-black text-sm font-medium cursor-pointer hover:bg-white/90 transition-colors"
        onClick={handleSubmit}
      >
        Add to Collection
      </button>

      {status && (
        <p className="mt-4 text-sm text-white/70">{status}</p>
      )}
    </div>
  );
}
