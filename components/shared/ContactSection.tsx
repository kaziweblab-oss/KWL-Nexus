"use client";

import Link from "next/link";
import { Camera, Globe, Link as LinkIcon, Mail, MessageCircle, Phone, Play, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const typeMap = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  facebook: Globe,
  twitter: Globe,
  instagram: Camera,
  youtube: Play,
  telegram: Send,
  custom: LinkIcon,
} as const;

const iconMap: Record<string, keyof typeof typeMap> = {
  Mail: "email",
  Phone: "phone",
  MessageCircle: "whatsapp",
  Globe: "facebook",
  Camera: "instagram",
  Play: "youtube",
  Send: "telegram",
  Link: "custom",
};

export type ContactItem = {
  _id?: string;
  id?: string;
  type: keyof typeof typeMap;
  value: string;
  label: string;
  icon: string;
  isActive?: boolean;
  order?: number;
};

function buildHref(contact: ContactItem) {
  const value = contact.value.trim();
  switch (contact.type) {
    case "email":
      return `mailto:${value}`;
    case "phone":
      return `tel:${value.replace(/\s+/g, "")}`;
    case "whatsapp":
      return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
    case "facebook":
      return value.startsWith("http") ? value : `https://${value}`;
    case "twitter":
      return value.startsWith("http") ? value : `https://${value}`;
    case "instagram":
      return value.startsWith("http") ? value : `https://${value}`;
    case "youtube":
      return value.startsWith("http") ? value : `https://${value}`;
    case "telegram":
      return value.startsWith("http") ? value : `https://t.me/${value.replace(/^@/, "")}`;
    default:
      return value.startsWith("http") ? value : `https://${value}`;
  }
}

export function ContactSection({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<ContactItem[]>([]);

  useEffect(() => {
    fetch("/api/contact")
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((payload) => setItems(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setItems([]));
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => item.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [items]);

  if (!visibleItems.length) return null;

  return (
    <section suppressHydrationWarning className={`${className}`}>
      <h2 className="text-2xl font-bold text-ink dark:text-white">Contact</h2>
      <div className="mt-5 flex flex-wrap gap-3" suppressHydrationWarning>
        {visibleItems.map((item) => {
          const iconType = iconMap[item.icon] ?? item.type ?? "custom";
          const Icon = typeMap[iconType as keyof typeof typeMap] ?? typeMap.custom;
          return (
            <Link
              suppressHydrationWarning
              key={item._id ?? item.id ?? `${item.type}-${item.value}`}
              href={buildHref(item)}
              target={item.type === "email" || item.type === "phone" ? undefined : "_blank"}
              rel={item.type === "email" || item.type === "phone" ? undefined : "noreferrer"}
              className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:border-secondary dark:hover:text-secondary"
            >
              <Icon size={15} suppressHydrationWarning />
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
