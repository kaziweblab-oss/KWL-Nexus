"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, Lang } from "@/lib/i18n/translations";

type Vars = Record<string, string | number>;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof (typeof translations)["en"], vars?: Vars) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("kwl-lang") as Lang | null;
    if (saved === "en" || saved === "bn") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("kwl-lang", l);
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: keyof (typeof translations)["en"], vars?: Vars) => {
    let str: string = translations[lang][key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
