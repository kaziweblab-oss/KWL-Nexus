"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, User as UserIcon, Smartphone, Eye, EyeOff, ChevronDown, Check, X, LogIn, GitBranch } from "lucide-react";
import { Suspense } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { isValidPhoneNumber } from "libphonenumber-js";

const COUNTRIES = [
  { code: "BD", flag: "https://flagcdn.com/w20/bd.png", dial: "+880", name: "Bangladesh", len: [10, 11] as number | number[] },
  { code: "IN", flag: "https://flagcdn.com/w20/in.png", dial: "+91", name: "India", len: [10, 11] as number | number[] },
  { code: "US", flag: "https://flagcdn.com/w20/us.png", dial: "+1", name: "USA", len: [10, 11] as number | number[] },
  { code: "GB", flag: "https://flagcdn.com/w20/gb.png", dial: "+44", name: "UK", len: [10, 11] as number | number[] },
  { code: "PK", flag: "https://flagcdn.com/w20/pk.png", dial: "+92", name: "Pakistan", len: [10, 11] as number | number[] },
  { code: "SA", flag: "https://flagcdn.com/w20/sa.png", dial: "+966", name: "Saudi Arabia", len: [9, 10] as number | number[] },
  { code: "AE", flag: "https://flagcdn.com/w20/ae.png", dial: "+971", name: "UAE", len: [9, 10] as number | number[] },
  { code: "MY", flag: "https://flagcdn.com/w20/my.png", dial: "+60", name: "Malaysia", len: [9, 10, 11] as number | number[] },
];

function GoogleIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function isPhoneValid(digits: string, country: typeof COUNTRIES[0]) {
  const d = digits.replace(/\D/g, "");
  if (!d) return false;
  // Proper validation via libphonenumber-js (online standard), fallback to length check
  try {
    const full = `${country.dial}${d.replace(/^0+/, "")}`;
    if (isValidPhoneNumber(full)) return true;
  } catch {}
  // Fallback: country-wise length check (10/11 as requested)
  const expected = (country as any).len;
  if (Array.isArray(expected)) return expected.includes(d.length) || expected.includes(d.replace(/^0+/, "").length);
  // Allow 10 or 11 for flexibility
  return d.length === expected || d.length === expected + 1;
}

function LoginContent() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const mode = searchParams.get("mode");
  const isSignup = mode === "signup";

  // Auto redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState<"send" | "verify" | "google" | "facebook" | "github" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = useMemo(() => (phoneDigits ? isPhoneValid(phoneDigits, country) : false), [phoneDigits, country]);
  const phoneInvalid = phoneTouched && phoneDigits.length > 0 && !phoneValid;
  const fullPhone = `${country.dial}${phoneDigits.replace(/^0+/, "")}`;

  const pwdChecks = useMemo(() => {
    const hasMin = password.length >= 6;
    const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
    const match = isSignup ? password && password === confirmPassword && confirmPassword.length > 0 : true;
    return { hasMin, hasLetterAndNumber, match };
  }, [password, confirmPassword, isSignup]);

  const passwordBorder = password.length === 0 ? "border-ink/10" : pwdChecks.hasMin && pwdChecks.hasLetterAndNumber ? "border-green-500 focus-within:ring-green-500/20" : "border-red-400 focus-within:ring-red-400/20";
  const confirmBorder = confirmPassword.length === 0 ? "border-ink/10" : pwdChecks.match ? "border-green-500 focus-within:ring-green-500/20" : "border-red-400 focus-within:ring-red-400/20";
  const phoneBorder = !phoneTouched || phoneDigits.length === 0 ? "border-ink/10" : phoneValid ? "border-green-500 focus-within:ring-green-500/20" : "border-red-400 focus-within:ring-red-400/20";

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);
    // Professional validation
    if (isSignup) {
      if (!name.trim() || name.trim().length < 2) {
        setMessage({ type: "error", text: lang === "bn" ? "অনুগ্রহ করে সঠিক নাম দিন" : "Please enter a valid name (min 2 chars)" });
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setMessage({ type: "error", text: lang === "bn" ? "সঠিক ইমেল দিন" : "Please enter a valid email address" });
        return;
      }
      if (!phoneValid) {
        setMessage({ type: "error", text: t("invalidPhone") });
        return;
      }
      if (!pwdChecks.hasMin) {
        setMessage({ type: "error", text: lang === "bn" ? "পাসওয়ার্ড অন্তত ৬ অক্ষর হতে হবে" : "Password must be at least 6 characters" });
        return;
      }
      if (!pwdChecks.hasLetterAndNumber) {
        setMessage({ type: "error", text: lang === "bn" ? "পাসওয়ার্ডে অক্ষর ও সংখ্যা থাকতে হবে" : "Password must include a letter and a number" });
        return;
      }
      if (!pwdChecks.match) {
        setMessage({ type: "error", text: t("passwordMismatch") });
        return;
      }
      if (!agreePrivacy) {
        setMessage({ type: "error", text: t("agreeRequired") });
        return;
      }
    } else {
      if (channel === "email" && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
        setMessage({ type: "error", text: lang === "bn" ? "সঠিক ইমেল দিন" : "Please enter a valid email" });
        return;
      }
      if (channel === "phone" && !phoneValid) {
        setMessage({ type: "error", text: t("invalidPhone") });
        return;
      }
      if (!password || password.length < 6) {
        setMessage({ type: "error", text: t("passwordRequired") });
        return;
      }
      if (!pwdChecks.hasLetterAndNumber) {
        setMessage({ type: "error", text: lang === "bn" ? "পাসওয়ার্ডে অক্ষর ও সংখ্যা থাকতে হবে" : "Password must include a letter and a number" });
        return;
      }
    }

    setLoading("send");
    setMessage(null);
    try {
      const payload: any = { channel };
      if (channel === "email") payload.email = email.trim();
      else payload.phone = fullPhone;

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Code pathate problem");
      setCodeSent(true);
      const targetLabel = channel === "phone" ? "phone" : "email";
      if (data?.previewCode) {
        setMessage({ type: "info", text: `Dev mode: code ${data.previewCode} (${targetLabel}, console eo dekhun)${data?.memoryFallback ? " [DB offline - memory]" : ""}` });
      } else {
        setMessage({ type: "success", text: `${targetLabel} e code pathano hoyeche. 5 min er moddhe use korun.` });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setLoading(null);
    }
  }

  async function handleVerifySignup(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setMessage({ type: "error", text: lang === "bn" ? "কোড দিন" : "Please enter code" });
      return;
    }
    if (!pwdChecks.match) {
      setMessage({ type: "error", text: t("passwordMismatch") });
      return;
    }
    setLoading("verify");
    setMessage(null);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: fullPhone, password, code: code.trim(), channel }),
      });
      const regData = await regRes.json().catch(() => null);
      if (!regRes.ok) throw new Error(regData?.error || "Registration failed");
      setMessage({ type: "success", text: lang === "bn" ? "অ্যাকাউন্ট তৈরি হয়েছে! ড্যাশবোর্ডে যাচ্ছি..." : "Account created! Going to dashboard..." });
      // Auto sign-in with same OTP + password — OTP kept alive by register route, signIn will consume it
      const result: any = await signIn("email-otp", {
        email: email.trim() || undefined,
        phone: fullPhone || undefined,
        channel,
        code: code.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) throw new Error(result.error === "CredentialsSignin" ? "Auto login failed, please login manually" : result.error);
      if (result?.ok) {
        setTimeout(() => router.push(callbackUrl), 600);
        return;
      }
      // Fallback if auto login not ok
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Verification failed" });
    } finally {
      setLoading(null);
    }
  }

  async function handleVerifyLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setMessage({ type: "error", text: lang === "bn" ? "কোড দিন" : "Please enter code" });
      return;
    }
    const targetEmail = channel === "email" ? email.trim() : "";
    const targetPhone = channel === "phone" ? fullPhone : "";
    setLoading("verify");
    setMessage(null);
    try {
      const result: any = await signIn("email-otp", {
        email: targetEmail || undefined,
        phone: targetPhone || undefined,
        channel,
        code: code.trim(),
        password: password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) throw new Error(result.error === "CredentialsSignin" ? "Invalid code or password" : result.error);
      if (result?.ok) {
        setMessage({ type: "success", text: lang === "bn" ? "যাচাই সফল! রিডাইরেক্ট হচ্ছে..." : "Verified! Redirecting..." });
        setTimeout(() => router.push(callbackUrl), 800);
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Verification failed" });
    } finally {
      setLoading(null);
    }
  }

  function handleGoogle() {
    setLoading("google");
    signIn("google", { callbackUrl });
  }
  function handleFacebook() {
    setLoading("facebook");
    signIn("facebook", { callbackUrl });
  }
  function handleGithub() {
    setLoading("github");
    signIn("github", { callbackUrl });
  }

  // If already logged in, show redirecting (middleware also handles server redirect)
  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-[85vh] max-w-6xl items-center justify-center px-6 py-12">
        <div className="flex items-center gap-2 text-ink/60"><Loader2 size={18} className="animate-spin" /> Loading...</div>
      </main>
    );
  }
  if (status === "authenticated") {
    return (
      <main className="mx-auto flex min-h-[85vh] max-w-6xl items-center justify-center px-6 py-12">
        <div className="text-center"><p className="text-sm text-ink/60 dark:text-white/60">Already logged in — redirecting to dashboard...</p></div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[85vh] max-w-6xl flex-col items-center justify-center px-6 py-12 lg:px-8">
      {/* Top toggle - slider type: active pill is cyan #00D4FF, slides between sections */}
      <div className="relative mb-6 flex w-full max-w-md rounded-full bg-paper p-1.5 dark:bg-white/[0.06] border border-ink/5 dark:border-white/10">
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-[#00D4FF] shadow-md transition-all duration-300 ease-out ${isSignup ? "left-[calc(50%+3px)]" : "left-1.5"}`}
          aria-hidden
        />
        <Link
          href="/login"
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${!isSignup ? "text-ink" : "text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white"}`}
        >
          <LogIn size={16} /> {t("login")}
        </Link>
        <Link
          href="/login?mode=signup"
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${isSignup ? "text-ink" : "text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white"}`}
        >
          <UserIcon size={16} /> {t("signUp")}
        </Link>
      </div>
      <div className="w-full max-w-md rounded-[1.75rem] border border-ink/10 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5">
        <div className="text-center">
          <Link href="/" className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">K</Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink dark:text-white">
            {isSignup ? t("createAccount") : t("welcomeBack")}
          </h1>
          <p className="mt-2 text-sm text-ink/60 dark:text-white/60">
            {isSignup ? t("signupSubtitle") : t("loginSubtitle")}
          </p>
        </div>

        <div className="mt-8">
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-4" noValidate>
              {isSignup && (
                <div>
                  <label className="text-sm font-semibold text-ink dark:text-white">{t("name")}</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/5">
                    <UserIcon size={16} className="text-ink/40" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} autoComplete="name" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-ink dark:text-white">{t("email")}</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/5">
                  <Mail size={16} className="text-ink/40" />
                  <input type="email" required={isSignup || channel === "email"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} autoComplete="email" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink dark:text-white">{t("phone")}</label>
                <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-white px-2 dark:bg-white/5 ${phoneBorder}`}>
                  <div className="relative shrink-0">
                    <button type="button" onClick={() => setCountryOpen((v) => !v)} className="flex min-w-[116px] shrink-0 items-center gap-1.5 rounded-lg bg-paper px-2.5 py-2 text-sm font-semibold text-ink dark:bg-white/10 dark:text-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={country.flag} alt={country.code} width={20} height={14} className="h-3.5 w-5 rounded-sm object-cover ring-1 ring-black/5" />
                      <span>{country.dial}</span>
                      <ChevronDown size={12} className={`transition ${countryOpen ? "rotate-180" : ""}`} />
                    </button>
                    {countryOpen && (
                      <div className="absolute left-0 top-full z-20 mt-2 max-h-56 w-56 overflow-auto rounded-xl border border-ink/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1a1a2e]">
                        {COUNTRIES.map((c) => (
                          <button key={c.code} type="button" onClick={() => { setCountry(c); setPhoneTouched(true); setCountryOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-paper dark:hover:bg-white/10 ${country.code === c.code ? "bg-primary text-white dark:bg-secondary dark:text-ink" : "text-ink dark:text-white"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.flag} alt={c.code} width={20} height={14} className="h-3.5 w-5 rounded-sm object-cover ring-1 ring-black/5" />
                            <span className="font-medium">{c.dial}</span>
                            <span className="text-xs opacity-60">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="h-6 w-px bg-ink/10 dark:bg-white/10" />
                  <input type="tel" inputMode="numeric" required={isSignup || channel === "phone"} value={phone} onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "")); if (!phoneTouched) setPhoneTouched(true); }} onBlur={() => setPhoneTouched(true)} placeholder={t("phonePlaceholder")} autoComplete="tel" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                  {phoneDigits.length > 0 && (phoneValid ? <Check size={16} className="shrink-0 text-green-600" /> : <X size={16} className="shrink-0 text-red-500" />)}
                </div>
                {phoneInvalid && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{t("invalidPhone")}</p>}
                {phoneValid && phoneTouched && <p className="mt-1.5 text-xs font-medium text-green-600 dark:text-green-400">{lang === "bn" ? "✓ সঠিক নম্বর" : "✓ Valid number"}</p>}
              </div>

              {/* Password - two separate fields for signup with live mismatch check */}
              {isSignup ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-ink dark:text-white">{t("password")}</label>
                    <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 dark:bg-white/5 ${passwordBorder}`}>
                      <Lock size={16} className="text-ink/40" />
                      <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} autoComplete="new-password" name="new-password" id="signup-password" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                      <button type="button" onClick={() => setShowPass((v) => !v)} className="p-1 text-ink/40 hover:text-primary">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-ink dark:text-white">{lang === "bn" ? "পাসওয়ার্ড নিশ্চিত করুন" : t("confirmPassword")}</label>
                    <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 dark:bg-white/5 ${confirmBorder}`}>
                      <Lock size={16} className="text-ink/40" />
                      <input type={showConfirm ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("confirmPasswordPlaceholder")} autoComplete="new-password" name="confirm-password" id="signup-confirm-password" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="p-1 text-ink/40 hover:text-primary">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && !pwdChecks.match && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{t("passwordMismatch")}</p>}
                    {confirmPassword.length > 0 && pwdChecks.match && <p className="mt-1.5 text-xs font-medium text-green-600 dark:text-green-400">{t("passwordMatch")}</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-ink dark:text-white">{t("password")}</label>
                  <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 dark:bg-white/5 ${passwordBorder}`}>
                    <Lock size={16} className="text-ink/40" />
                    <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} autoComplete="current-password" name="current-password" id="login-password" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 dark:text-white" />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="p-1 text-ink/40 hover:text-primary">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password conditions */}
              {(password.length > 0 || (isSignup && confirmPassword.length > 0)) && (
                <div className="rounded-xl bg-paper p-3 dark:bg-white/5">
                  <p className="text-xs font-semibold text-ink/60 dark:text-white/60">{lang === "bn" ? "পাসওয়ার্ড শর্ত:" : "Password requirements:"}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className={`flex items-center gap-2 text-xs ${pwdChecks.hasMin ? "text-green-600 dark:text-green-400" : "text-ink/40 dark:text-white/40"}`}>
                      {pwdChecks.hasMin ? <Check size={12} className="text-green-600" /> : <X size={12} />} {t("passwordMin")}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${pwdChecks.hasLetterAndNumber ? "text-green-600 dark:text-green-400" : "text-ink/40 dark:text-white/40"}`}>
                      {pwdChecks.hasLetterAndNumber ? <Check size={12} className="text-green-600" /> : <X size={12} />} {t("passwordLetterNumber")}
                    </div>
                    {isSignup && (
                      <div className={`flex items-center gap-2 text-xs ${pwdChecks.match ? "text-green-600 dark:text-green-400" : "text-ink/40 dark:text-white/40"}`}>
                        {pwdChecks.match ? <Check size={12} className="text-green-600" /> : <X size={12} />} {t("passwordMatch")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Channel selector */}
              <div>
                <label className="text-sm font-semibold text-ink dark:text-white">{t("whereCode")}</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setChannel("email")} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${channel === "email" ? "border-primary bg-primary/10 text-primary dark:border-secondary dark:bg-secondary/20 dark:text-secondary" : "border-ink/10 bg-white text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"}`}>
                    <Mail size={16} /> Email
                  </button>
                  <button type="button" onClick={() => setChannel("phone")} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${channel === "phone" ? "border-primary bg-primary/10 text-primary dark:border-secondary dark:bg-secondary/20 dark:text-secondary" : "border-ink/10 bg-white text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"}`}>
                    <Smartphone size={16} /> Phone
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink/40 dark:text-white/40">{channel === "email" ? t("codeEmailHint") : t("codePhoneHint")}</p>
              </div>

              {/* Privacy checkbox */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-paper p-3 dark:bg-white/5">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} required={isSignup} className="mt-0.5 h-4 w-4 cursor-pointer rounded border-ink/20 text-primary focus:ring-primary/20" />
                <span className="cursor-pointer text-xs leading-5 text-ink/60 dark:text-white/60">
                  {t("agreePrivacy")}{" "}
                  <Link href="/privacy" className="font-semibold text-primary underline dark:text-secondary"> {t("privacyPolicy")}</Link>{" "}
                  {t("and")}{" "}
                  <Link href="/terms" className="font-semibold text-primary underline dark:text-secondary">{t("terms")}</Link>
                </span>
              </label>

              <button type="submit" disabled={loading === "send" || (phoneTouched && !phoneValid && phoneDigits.length > 0)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-ink dark:hover:bg-secondary">
                {loading === "send" ? <Loader2 size={16} className="animate-spin" /> : channel === "phone" ? <Smartphone size={16} /> : <Mail size={16} />}
                {loading === "send" ? t("sending") : t("sendCode")}
              </button>

              <p className="text-center text-xs text-ink/50 dark:text-white/50">
                {isSignup ? (
                  <>{t("alreadyHave")} <Link href="/login" className="font-semibold text-primary hover:underline dark:text-secondary">{t("login")}</Link></>
                ) : (
                  <>{t("noAccount")} <Link href="/login?mode=signup" className="font-semibold text-primary hover:underline dark:text-secondary">{t("signUp")}</Link></>
                )}
              </p>
            </form>
          ) : (
            <form onSubmit={isSignup ? handleVerifySignup : handleVerifyLogin} className="space-y-4" noValidate>
              <div>
                <p className="text-sm text-ink/60 dark:text-white/60">
                  Code sent via <b className="text-ink dark:text-white">{channel === "phone" ? "phone" : "email"}</b> to <b className="text-ink dark:text-white">{channel === "phone" ? fullPhone : email}</b>{" "}
                  <button type="button" onClick={() => setCodeSent(false)} className="text-primary underline dark:text-secondary">change</button>
                </p>
                <label className="mt-4 block text-sm font-semibold text-ink dark:text-white">Verification Code</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/5">
                  <Lock size={16} className="text-ink/40" />
                  <input type="text" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="w-full bg-transparent py-3 text-sm tracking-widest outline-none placeholder:text-ink/40 dark:text-white" />
                </div>
              </div>
              <button type="submit" disabled={loading === "verify"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60 dark:bg-secondary dark:text-ink">
                {loading === "verify" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {loading === "verify" ? t("verifying") : isSignup ? t("verifyCreate") : t("verifyLogin")}
              </button>
              <button type="button" onClick={handleSendCode} disabled={loading === "send"} className="w-full text-sm font-medium text-ink/60 underline hover:text-primary dark:text-white/60">{t("resendCode")}</button>
            </form>
          )}

          {message && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300" : message.type === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink/40 dark:text-white/40">{t("or")}</span>
          <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
        </div>

        <div className="space-y-3">
          <button onClick={handleGoogle} disabled={!!loading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
            {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            {t("continueGoogle")}
          </button>
          <button onClick={handleFacebook} disabled={!!loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#166fe5] disabled:opacity-60">
            {loading === "facebook" ? <Loader2 size={16} className="animate-spin" /> : <FacebookIcon />}
            {t("continueFacebook")}
          </button>
          <button onClick={handleGithub} disabled={!!loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#24292f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2328] disabled:opacity-60">
            {loading === "github" ? <Loader2 size={16} className="animate-spin" /> : <GitBranch size={18} />}
            Continue with GitHub
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ink/50 dark:text-white/50">
          <Link href="/apps" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-secondary">Explore apps <ArrowRight size={12} /></Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-12 text-center text-ink/60">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
