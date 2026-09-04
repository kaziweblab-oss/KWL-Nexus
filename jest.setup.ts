import "@testing-library/jest-dom";

// Browser APIs used by client components are not available in jsdom by default.
if (typeof window !== "undefined") Object.defineProperty(window, "matchMedia", { writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) });

// Client components call lightweight settings endpoints during integration renders.
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { bkash: "", nagad: "", rocket: "", helpText: "" } }) }) as jest.Mock;
