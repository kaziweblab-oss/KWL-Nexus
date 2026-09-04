import type { ButtonHTMLAttributes } from "react";

// Shared button styles keep actions consistent across the store - theme-aware + hover animation.
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  const styles = {
    primary: "bg-primary text-white hover:bg-[#5750e8] hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95 dark:bg-secondary dark:text-ink dark:hover:bg-[#00c2e6] dark:hover:shadow-secondary/20",
    outline: "border border-ink/15 bg-white text-ink hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:border-secondary dark:hover:text-secondary dark:hover:bg-white/5",
    ghost: "text-ink/60 hover:bg-paper hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white",
  };
  return <button className={`rounded-full px-5 py-3 text-sm font-semibold transition duration-200 ${styles[variant]} ${className}`} {...props} />;
}
