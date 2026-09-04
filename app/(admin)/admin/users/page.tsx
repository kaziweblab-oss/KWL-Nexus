"use client";

import { UserManagement } from "@/components/admin/AdminTables";
import { useLanguage } from "@/components/shared/LanguageProvider";

// User management is intentionally separated from catalog and billing operations.
export default function AdminUsersPage() {
  const { t } = useLanguage();
  return <main><p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("memberDirectory")}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{t("userManagement")}</h1><p className="mt-2 text-ink/55">{t("searchAccounts")}</p><div className="mt-8"><UserManagement /></div></main>;
}
