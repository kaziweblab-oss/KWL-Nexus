import { decryptToken } from "@/lib/github/client";

// Types for health check result
export type HealthCheckResult = {
  healthy: boolean;
  latencyMs: number | null;
  error?: string | null;
  errorCode?: string | null;
};

export type PaymentMethodForCheck = {
  _id: string;
  name: string;
  slug: string;
  type: "manual" | "gateway";
  provider: string;
  accountNumber?: string;
  gatewayConfig?: Record<string, unknown>;
};

function sanitizeError(message: string): string {
  // Remove any potential secrets (apiKey values) from error messages
  return message.replace(/sk_live_[a-zA-Z0-9]+/g, "[REDACTED]")
    .replace(/sk_test_[a-zA-Z0-9]+/g, "[REDACTED]")
    .replace(/whsec_[a-zA-Z0-9]+/g, "[REDACTED]")
    .substring(0, 200);
}

function getDecryptedConfig(gatewayConfig: Record<string, unknown> | undefined): Record<string, string> {
  if (!gatewayConfig || typeof gatewayConfig !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(gatewayConfig)) {
    if (typeof v !== "string") {
      out[k] = String(v ?? "");
      continue;
    }
    // Try to decrypt if it looks like encrypted (iv:tag:enc)
    if (v.includes(":") && v.split(":").length === 3) {
      try {
        out[k] = decryptToken(v);
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function checkStripe(config: Record<string, string>): Promise<HealthCheckResult> {
  const started = Date.now();
  const apiKey = config.apiKey || config.secret || config.secretKey || config.publishableKey;
  if (!apiKey) {
    return { healthy: false, latencyMs: null, error: "Missing Stripe API key", errorCode: "INVALID_CREDENTIALS" };
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - started;
    if (res.ok) {
      return { healthy: true, latencyMs, error: null, errorCode: null };
    }
    const text = await res.text().catch(() => "");
    let msg = `Stripe API error ${res.status}`;
    let code: string | null = "PROVIDER_ERROR";
    if (res.status === 401 || res.status === 403) {
      msg = "Invalid Stripe API key";
      code = "INVALID_CREDENTIALS";
    } else if (res.status === 429) {
      msg = "Stripe rate limit exceeded";
      code = "RATE_LIMIT";
    } else if (res.status >= 500) {
      msg = "Stripe provider error";
      code = "PROVIDER_ERROR";
    }
    // Try to parse stripe error message without exposing raw response
    try {
      const j = JSON.parse(text);
      if (j?.error?.message) msg = sanitizeError(j.error.message);
    } catch {}
    return { healthy: false, latencyMs, error: msg, errorCode: code };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const err = e as Error;
    const msgLower = err.message.toLowerCase();
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError" || msgLower.includes("timeout");
    const code = isTimeout ? "TIMEOUT" : msgLower.includes("fetch") || msgLower.includes("network") ? "NETWORK_ERROR" : "UNKNOWN_ERROR";
    return { healthy: false, latencyMs, error: isTimeout ? "Timeout after 5000ms" : "Network error", errorCode: code };
  }
}

async function checkPayPal(config: Record<string, string>): Promise<HealthCheckResult> {
  const started = Date.now();
  const clientId = config.clientId || config.client_id;
  const secret = config.secret || config.clientSecret;
  if (!clientId || !secret) {
    return { healthy: false, latencyMs: null, error: "Missing PayPal clientId/secret", errorCode: "INVALID_CREDENTIALS" };
  }
  try {
    const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
    const res = await fetch("https://api.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - started;
    if (res.ok) {
      return { healthy: true, latencyMs, error: null, errorCode: null };
    }
    let code: string | null = "PROVIDER_ERROR";
    if (res.status === 401 || res.status === 403) code = "INVALID_CREDENTIALS";
    else if (res.status === 429) code = "RATE_LIMIT";
    return { healthy: false, latencyMs, error: `PayPal auth failed ${res.status}`, errorCode: code };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const err = e as Error;
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError" || err.message.toLowerCase().includes("timeout");
    return { healthy: false, latencyMs, error: isTimeout ? "Timeout after 5000ms" : "Network error", errorCode: isTimeout ? "TIMEOUT" : "NETWORK_ERROR" };
  }
}

async function checkSSLCommerz(config: Record<string, string>): Promise<HealthCheckResult> {
  const started = Date.now();
  const storeId = config.storeId || config.store_id;
  const storePassword = config.storePassword || config.store_password || config.storePasswd;
  if (!storeId || !storePassword) {
    return { healthy: false, latencyMs: null, error: "Missing SSLCommerz storeId/storePassword", errorCode: "INVALID_CREDENTIALS" };
  }
  // Safest validation is presence + format, no external call to avoid handling real transactions
  // We validate that storeId looks plausible and password is present
  if (String(storeId).length < 3 || String(storePassword).length < 4) {
    return { healthy: false, latencyMs: Date.now() - started, error: "Invalid SSLCommerz credentials format", errorCode: "INVALID_CREDENTIALS" };
  }
  // Optionally try a lightweight validation endpoint if configured
  // For now, consider valid if both present
  return { healthy: true, latencyMs: Date.now() - started, error: null, errorCode: null };
}

async function checkCustom(config: Record<string, unknown>): Promise<HealthCheckResult> {
  const started = Date.now();
  const url = (config.healthCheckUrl || config.health_check_url || config.url) as string | undefined;
  if (!url || typeof url !== "string") {
    // No healthCheckUrl configured, just check that some keys exist
    if (Object.keys(config).length === 0) {
      return { healthy: false, latencyMs: null, error: "Missing gateway configuration", errorCode: "INVALID_CREDENTIALS" };
    }
    return { healthy: true, latencyMs: Date.now() - started, error: null, errorCode: null };
  }
  // Validate URL is https and not private IP
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      return { healthy: false, latencyMs: null, error: "Health check URL must be https", errorCode: "INVALID_CREDENTIALS" };
    }
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) {
      return { healthy: false, latencyMs: null, error: "Health check URL not allowed", errorCode: "INVALID_CREDENTIALS" };
    }
  } catch {
    return { healthy: false, latencyMs: null, error: "Invalid health check URL", errorCode: "INVALID_CREDENTIALS" };
  }
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - started;
    if (res.ok) return { healthy: true, latencyMs, error: null, errorCode: null };
    return { healthy: false, latencyMs, error: `Health check failed ${res.status}`, errorCode: res.status === 429 ? "RATE_LIMIT" : "PROVIDER_ERROR" };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const err = e as Error;
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return { healthy: false, latencyMs, error: isTimeout ? "Timeout after 5000ms" : "Network error", errorCode: isTimeout ? "TIMEOUT" : "NETWORK_ERROR" };
  }
}

function checkManual(m: PaymentMethodForCheck): HealthCheckResult {
  const started = Date.now();
  const acc = (m.accountNumber || "").trim();
  if (!acc) {
    return { healthy: false, latencyMs: null, error: "Account number required", errorCode: "INVALID_CREDENTIALS" };
  }
  // For bKash/Nagad/Rocket, require at least 11 digits
  if (["bkash", "nagad", "rocket"].includes(m.provider) && acc.replace(/\D/g, "").length < 11) {
    return { healthy: false, latencyMs: Date.now() - started, error: "Invalid account number", errorCode: "INVALID_CREDENTIALS" };
  }
  return { healthy: true, latencyMs: Date.now() - started, error: null, errorCode: null };
}

export async function checkPaymentMethodHealth(
  method: PaymentMethodForCheck,
  opts?: { timeoutMs?: number; retry?: boolean }
): Promise<HealthCheckResult> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const doCheck = async (): Promise<HealthCheckResult> => {
    const cfg = getDecryptedConfig(method.gatewayConfig as Record<string, unknown> | undefined);
    // Add timeout wrapper
    const withTimeout = async <T>(p: Promise<T>): Promise<T> => {
      return Promise.race([
        p,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout after 5000ms")), timeoutMs)),
      ]);
    };

    try {
      if (method.type === "manual") {
        return checkManual(method);
      }
      // gateway
      const provider = (method.provider || "").toLowerCase();
      if (provider === "stripe") return await withTimeout(checkStripe(cfg));
      if (provider === "paypal") return await withTimeout(checkPayPal(cfg));
      if (provider === "sslcommerz") return await withTimeout(checkSSLCommerz(cfg));
      // custom or others
      return await withTimeout(checkCustom(method.gatewayConfig as Record<string, unknown> | undefined || cfg));
    } catch (e) {
      const err = e as Error;
      const isTimeout = err.message.toLowerCase().includes("timeout");
      return { healthy: false, latencyMs: null, error: isTimeout ? "Timeout after 5000ms" : sanitizeError(err.message), errorCode: isTimeout ? "TIMEOUT" : "UNKNOWN_ERROR" };
    }
  };

  // Retry once only for TIMEOUT/NETWORK_ERROR
  const first = await doCheck();
  if (!first.healthy && (first.errorCode === "TIMEOUT" || first.errorCode === "NETWORK_ERROR") && opts?.retry !== false) {
    await new Promise((r) => setTimeout(r, 500));
    const second = await doCheck();
    // If second succeeds, return success; if second also fails, return second (more recent)
    return second;
  }
  return first;
}

export function classifyHealthError(error: string | null, errorCode: string | null): string {
  if (!errorCode) return "UNKNOWN_ERROR";
  return errorCode;
}
