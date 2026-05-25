import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MarketingSectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: ReactNode;
}

export function MarketingSectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  children,
}: MarketingSectionHeaderProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`mb-12 max-w-2xl ${alignClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{title}</h2>
      {description && (
        <p className={`text-muted-foreground mt-3 leading-relaxed ${align === "center" ? "max-w-lg mx-auto" : ""}`}>
          {description}
        </p>
      )}
      {children}
    </motion.div>
  );
}
