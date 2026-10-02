/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      id: "email-otp",
      name: "OTP Login",
      credentials: {
        email: { label: "Email", type: "email" },
        phone: { label: "Phone", type: "text" },
        channel: { label: "Channel", type: "text" },
        code: { label: "Code", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials as any)?.email?.toLowerCase().trim() || null;
        const phoneRaw = (credentials as any)?.phone?.trim() || null;
        const phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "") : null;
        const channel = ((credentials as any)?.channel as "email" | "phone") ?? (phone ? "phone" : "email");
        const code = (credentials as any)?.code?.trim();
        const password = (credentials as any)?.password?.trim();
        if (!code) return null;
        const target = channel === "phone" ? phone : email;
        if (!target) return null;

        const { getMemoryOtp, deleteMemoryOtp } = await import("@/lib/otp/memory");
        const { verifyOtpCode } = await import("@/lib/otp/hash");

        let otpValid = false;
        let otpRecord: any = null;
        try {
          const { connectToDatabase } = await import("@/lib/db/connect");
          await connectToDatabase();
          const Otp = (await import("@/models/Otp")).default;
          const targetQuery: any = channel === "phone" ? { phone: target } : { email: target };
          otpRecord = await Otp.findOne(targetQuery).sort({ createdAt: -1 });
          if (otpRecord) {
            if (otpRecord.expiresAt < new Date()) {
              await Otp.deleteOne({ _id: otpRecord._id });
              return null;
            }
            if (otpRecord.attempts >= 5) return null;
            if (!verifyOtpCode(code, otpRecord.code)) {
              await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
              return null;
            }
            await Otp.deleteOne({ _id: otpRecord._id });
            otpValid = true;
          }
        } catch {
          // DB unavailable, fallback to memory
        }
        if (!otpValid) {
          const mem = getMemoryOtp(channel, target!);
          if (!mem || !verifyOtpCode(code, mem.codeHash)) {
            if (mem) {
              const { bumpMemoryOtpAttempts } = await import("@/lib/otp/memory");
              bumpMemoryOtpAttempts(channel, target!);
            }
            return null;
          }
          if ((mem as { attempts?: number }).attempts !== undefined && (mem as { attempts?: number }).attempts! >= 5) return null;
          deleteMemoryOtp(channel, target!);
          otpValid = true;
        }
        if (!otpValid) return null;

        const { connectToDatabase } = await import("@/lib/db/connect");
        try {
          await connectToDatabase();
        } catch {
          return null;
        }
        const User = (await import("@/models/User")).default;
        const bcrypt = await import("bcryptjs");

        // Lookup user by channel
        let user = channel === "phone" ? await User.findOne({ phone: target }) : await User.findOne({ email: target });

        // If password provided, verify it; otherwise for signup auto-create via OTP was already done via /api/auth/register, so here we expect existing user
        if (password) {
          if (!user || !user.passwordHash) return null;
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
        } else {
          // No password supplied: allow login via OTP alone (for users without password) — create if not exists (legacy)
          if (!user) {
            const fallbackEmail = email ?? `${phone}@phone.local`;
            user = await User.create({
              email: fallbackEmail,
              phone: phone ?? undefined,
              name: fallbackEmail.split("@")[0],
              role: "user",
            });
          }
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? (email ?? phone ?? "user").split("@")[0],
          image: user.image ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh session object daily
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow only same-origin or relative callbacks (defense in depth — the login
      // page already sanitizes ?callbackUrl=, this guards direct signIn calls).
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign-in: user object contains id, name, email, image
      if (user) {
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.picture = (user as any).image ?? (user as any).picture ?? token.picture;
      }
      if (profile) {
        const p: any = profile;
        token.email = p.email ?? token.email;
        token.name = p.name ?? token.name;
        // Google returns picture, Facebook may return picture.data.url
        token.picture = p.picture ?? p.image ?? p.avatar_url ?? (p.picture?.data?.url as any) ?? token.picture;
      }
      if (account) {
        // Keep github token if needed
        if (account.provider === "github" && (account as any).access_token) {
          (token as any).githubAccessToken = (account as any).access_token;
        }
        // Also capture image from account if available
        if ((account as any).picture) token.picture = (account as any).picture;
      }
      // Enrich token with admin roles (DB + env). Env superadmins are auto-promoted in DB.
      const email = (token.email as string | undefined)?.toLowerCase();
      if (email) {
        try {
          const { getAdminEmails } = await import("./admin");
          const isEnvSuper = getAdminEmails().includes(email);
          // Ensure env superadmin exists in DB for consistency (best-effort, no throw)
          if (isEnvSuper) {
            try {
              const { connectToDatabase } = await import("@/lib/db/connect");
              await connectToDatabase();
              const User = (await import("@/models/User")).default;
              const existing = await User.findOne({ email });
              if (!existing) {
                await User.create({ email, name: email.split("@")[0], role: "superadmin" });
                (token as any).role = "superadmin";
                (token as any).isAdmin = true;
                (token as any).isSuperAdmin = true;
              } else if (existing.role !== "superadmin") {
                existing.role = "superadmin";
                await existing.save();
                (token as any).role = "superadmin";
                (token as any).isAdmin = true;
                (token as any).isSuperAdmin = true;
              } else {
                (token as any).role = existing.role;
                (token as any).isAdmin = true;
                (token as any).isSuperAdmin = true;
              }
            } catch {
              // DB unavailable: fall back to env
              (token as any).isAdmin = true;
              (token as any).isSuperAdmin = true;
              (token as any).role = "superadmin";
            }
          } else {
            // Non-env user: lookup DB role. OAuth logins (Google/GitHub/Facebook)
            // never created a User row, which locked them out of payments/downloads
            // (those look up User by email). Provision on first sight, keyed by
            // verified provider email so OAuth and OTP share one account.
            try {
              const { connectToDatabase } = await import("@/lib/db/connect");
              await connectToDatabase();
              const User = (await import("@/models/User")).default;
              let dbUser = await User.findOne({ email });
              if (!dbUser) {
                dbUser = await User.create({
                  email,
                  name: (token.name as string) || email.split("@")[0],
                  image: (token.picture as string) ?? undefined,
                  role: "user",
                });
              }
              const role = (dbUser as any)?.role ?? "user";
              (token as any).role = role;
              (token as any).isAdmin = role === "admin" || role === "superadmin";
              (token as any).isSuperAdmin = role === "superadmin";
            } catch {
              (token as any).role = (token as any).role ?? "user";
              (token as any).isAdmin = (token as any).isAdmin ?? false;
              (token as any).isSuperAdmin = (token as any).isSuperAdmin ?? false;
            }
          }
        } catch {
          // ignore enrichment errors, token remains valid
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
        // Also expose id if needed
        if (token.sub) (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role ?? "user";
        (session.user as any).isAdmin = Boolean((token as any).isAdmin);
        (session.user as any).isSuperAdmin = Boolean((token as any).isSuperAdmin);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
