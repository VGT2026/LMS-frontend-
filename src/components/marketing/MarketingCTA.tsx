import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface MarketingCTAProps {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  footer?: ReactNode;
  variant?: "gradient" | "outline";
}

export function MarketingCTA({
  title,
  description,
  primaryLabel = "Create account",
  primaryHref = "/register",
  secondaryLabel = "Sign in",
  secondaryHref = "/login",
  footer,
  variant = "gradient",
}: MarketingCTAProps) {
  if (variant === "outline") {
    return (
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-10 sm:p-14 shadow-elevated"
        >
          <h2 className="text-3xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 h-11 px-8 shadow-md shadow-accent/20">
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-8">
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
          {footer && <div className="mt-6">{footer}</div>}
        </motion.div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto rounded-3xl bg-gradient-primary p-10 sm:p-14 text-center text-primary-foreground shadow-elevated relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,hsl(168_76%_50%),transparent_45%)]" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_70%,hsl(224_65%_60%),transparent_50%)]" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-3 text-primary-foreground/85 max-w-md mx-auto leading-relaxed">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-11 px-8 shadow-lg shadow-accent/30 font-semibold"
            >
              <Link to={primaryHref}>
                {primaryLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-11 px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
          {footer && <div className="mt-6 text-primary-foreground/80 text-sm">{footer}</div>}
        </div>
      </motion.div>
    </section>
  );
}
