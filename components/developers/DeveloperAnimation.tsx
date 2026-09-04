"use client";

import { useEffect, useState } from "react";
import { Code2, Globe, Zap, Boxes, Terminal, Check } from "lucide-react";

const codeLines = [
  "import { kwl } from '@kwlnexus/sdk';",
  "",
  "const app = await kwl.publish({",
  "  name: 'Focus Flow',",
  "  version: '2.4.0',",
  "  category: 'Productivity',",
  "});",
  "",
  "// Live → 50K+ downloads",
  "console.log(app.url);",
];

export function DeveloperAnimation() {
  const [typed, setTyped] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (lineIdx >= codeLines.length) {
      const t = setTimeout(() => { setTyped([]); setLineIdx(0); setCharIdx(0); }, 2500);
      return () => clearTimeout(t);
    }
    const line = codeLines[lineIdx];
    if (charIdx <= line.length) {
      const t = setTimeout(() => {
        setTyped((prev) => {
          const copy = [...prev];
          copy[lineIdx] = line.slice(0, charIdx);
          return copy;
        });
        setCharIdx((c) => c + 1);
      }, line === "" ? 120 : 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx((l) => l + 1); setCharIdx(0); }, 180);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx]);

  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none">
      {/* glow */}
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[#6C63FF]/20 via-[#0ea5e9]/10 to-transparent blur-2xl dark:from-[#6C63FF]/25 dark:via-[#0ea5e9]/15" />
      
      {/* main card - code window */}
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0f0f1e]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_8px_20px_rgba(108,99,255,0.15)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-white/40"><Terminal size={12}/> api/publish.ts</span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"/> LIVE</span>
        </div>
        <div className="bg-[#0a0a14] p-4 font-mono text-xs leading-5">
          {codeLines.map((_, i) => (
            <div key={i} className="min-h-[18px] whitespace-pre">
              <span className={i === 6 ? "text-emerald-400" : i === 2 || i === 3 || i === 4 || i === 5 ? "text-white" : "text-white/60"}>
                {typed[i] ?? ""}
                {lineIdx === i && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#6C63FF] align-middle" />}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-white/50"><Check size={12} className="text-emerald-400"/> Deployed</span>
          <span className="text-white/20">•</span>
          <span className="text-white/50">50K+ downloads</span>
          <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-[68%] animate-[grow_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#6C63FF] to-[#0ea5e9]" /></span>
        </div>
      </div>

      {/* floating cards */}
      <div className="absolute -right-2 -top-3 hidden sm:flex animate-[float_3s_ease-in-out_infinite] items-center gap-2 rounded-2xl border border-white/10 bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a2e] dark:text-white">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#6C63FF] text-white"><Globe size={14}/></span> API Live
      </div>
      <div className="absolute -left-3 top-[42%] hidden sm:flex animate-[float_3.5s_ease-in-out_infinite_0.5s] items-center gap-2 rounded-2xl border border-white/10 bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a2e] dark:text-white">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-500 text-white"><Zap size={14}/></span> 99.9% uptime
      </div>
      <div className="absolute -bottom-4 left-6 hidden sm:flex animate-[float_3s_ease-in-out_infinite_1s] items-center gap-2 rounded-2xl border border-white/10 bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a2e] dark:text-white">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#0ea5e9] text-white"><Boxes size={14}/></span> SDK Ready
      </div>
      <div className="absolute -bottom-2 right-8 hidden sm:grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#0ea5e9] text-white shadow-lg animate-[pulse_2s_ease-in-out_infinite]">
        <Code2 size={18}/>
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes grow{0%{width:0%}50%{width:78%}100%{width:68%}}`}} />
    </div>
  );
}
