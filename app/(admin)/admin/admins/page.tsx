"use client";

import { AdminManagement } from "@/components/admin/AdminManagement";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Super admin management — only users with superadmin role (ADMIN_EMAILS + DB superadmin) can access.
// Regular admins will receive 403 from the API and see the error state.
export default function AdminsManagePage() {
  const { t } = useLanguage();
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("accessControl")}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("adminManagementTitle")}</h1>
      <p className="mt-2 text-ink/55 dark:text-white/60">{t("adminManagementDesc")}</p>
      <div className="mt-8">
        <AdminManagement />
      </div>
    </main>
  );
}
