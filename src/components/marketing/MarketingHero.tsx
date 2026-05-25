import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

interface MarketingHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  backTo?: { href: string; label: string } | null;
  children?: ReactNode;
  size?: "default" | "compact";
}

export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  backTo,
  children,
  size = "default",
}: MarketingHeroProps) {
  const py = size === "compact" ? "py-14 lg:py-18" : "py-18 lg:py-28";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `linear-gradient(to right, transparent 0%, hsl(var(--accent) / 0.4) 50%, transparent 100%)`,
        }}
      />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-24 w-[420px] h-[420px] rounded-full bg-accent/35 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[520px] h-[520px] rounded-full bg-primary-foreground/12 blur-[100px]" />
      </div>
      <div className={`relative max-w-6xl mx-auto px-4 ${py}`}>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
          className="max-w-3xl"
        >
          {backTo && (
            <motion.div variants={fadeUp}>
              <Link
                to={backTo.href}
                className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-8 px-3 py-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {backTo.label}
              </Link>
            </motion.div>
          )}
          {eyebrow && (
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-4"
            >
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-primary-foreground leading-[1.08] tracking-tight"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg sm:text-xl text-primary-foreground/80 leading-relaxed max-w-2xl"
            >
              {subtitle}
            </motion.p>
          )}
          {children && <motion.div variants={fadeUp}>{children}</motion.div>}
        </motion.div>
      </div>
    </section>
  );
}
