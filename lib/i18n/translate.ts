// Background EN->BN translation for app content (MyMemory free tier, no key).
// Best-effort only: failures resolve to undefined and callers fall back to English.

const API = "https://api.mymemory.translated.net/get";

async function translateOne(text: string): Promise<string | undefined> {
  const clean = text.trim();
  if (!clean) return undefined;
  // Skip strings that are mostly non-translatable (urls, versions, single tokens).
  if (/^(https?:\/\/|v?\d[\d.]*$|[\w-]{1,3}$)/i.test(clean) && clean.length < 8 && !clean.includes(" ")) return undefined;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API}?q=${encodeURIComponent(clean.slice(0, 900))}&langpair=en|bn`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const j = await res.json().catch(() => null) as { responseData?: { translatedText?: string }; responseStatus?: number } | null;
    const out = j?.responseData?.translatedText?.trim();
    if (!out || j?.responseStatus !== 200) return undefined;
    if (out.toLowerCase() === clean.toLowerCase()) return undefined;
    return out;
  } catch {
    return undefined;
  }
}

export type AppTranslatable = { name?: string; description?: string; category?: string; features?: string[] };

export async function translateAppContent(input: AppTranslatable): Promise<{ name?: string; description?: string; category?: string; features?: string[] } | null> {
  try {
    const [name, description, category] = await Promise.all([
      input.name ? translateOne(input.name) : Promise.resolve(undefined),
      input.description ? translateOne(input.description) : Promise.resolve(undefined),
      input.category ? translateOne(input.category) : Promise.resolve(undefined),
    ]);
    let features: string[] | undefined;
    if (input.features?.length) {
      const out = await Promise.all(input.features.slice(0, 50).map((f) => translateOne(f)));
      const mapped = out.filter((v): v is string => Boolean(v));
      if (mapped.length) features = mapped;
    }
    const bn: { name?: string; description?: string; category?: string; features?: string[] } = {};
    if (name) bn.name = name;
    if (description) bn.description = description;
    if (category) bn.category = category;
    if (features) bn.features = features;
    return Object.keys(bn).length ? bn : null;
  } catch {
    return null;
  }
}
