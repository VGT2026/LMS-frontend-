import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardSolution } from "@/data/marketingContent";
import { dashboardSolutions } from "@/data/marketingContent";
import { ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface DashboardDetailPageProps {
  solution: DashboardSolution;
}

export function DashboardDetailPage({ solution }: DashboardDetailPageProps) {
  const Icon = solution.icon;
  const others = dashboardSolutions.filter((s) => s.slug !== solution.slug);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${solution.accentClass}`}>
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent blur-[100px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={fadeUp}>
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20">
                {solution.tagline}
              </Badge>
              {solution.highlights.map((h) => (
                <Badge
                  key={h}
                  variant="outline"
                  className="border-primary-foreground/25 text-primary-foreground/90 bg-transparent"
                >
                  {h}
                </Badge>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center shrink-0 border border-primary-foreground/20">
                <Icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground tracking-tight max-w-3xl">
                  {solution.headline}
                </h1>
                <p className="mt-4 text-lg text-primary-foreground/85 max-w-2xl leading-relaxed">{solution.overview}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">Capabilities</p>
          <h2 className="text-3xl font-bold text-foreground">What&apos;s inside this workspace</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            A detailed breakdown of tools and views available after you sign in as a {solution.role.toLowerCase()}.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-5">
          {solution.capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated hover:border-accent/30 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <cap.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{cap.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{cap.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 px-4 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">How it works</p>
          <h2 className="text-3xl font-bold text-foreground mb-10">Typical journey</h2>
          <div className="space-y-0">
            {solution.workflow.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-6 pb-10 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md">
                    {i + 1}
                  </div>
                  {i < solution.workflow.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2 min-h-[2rem]" />
                  )}
                </div>
                <div className="pt-1.5 pb-2">
                  <h3 className="font-semibold text-foreground text-lg">{step.step}</h3>
                  <p className="text-muted-foreground mt-1 max-w-xl">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Other solutions */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">Explore other workspaces</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {others.map((s) => (
            <Link
              key={s.slug}
              to={`/solutions/${s.slug}`}
              className="rounded-xl border border-border bg-card p-4 hover:border-accent/40 hover:shadow-md transition-all group"
            >
              <s.icon className="w-5 h-5 text-accent mb-2" />
              <p className="font-medium text-foreground group-hover:text-accent transition-colors">{s.role}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-primary p-10 sm:p-14 text-center text-primary-foreground shadow-elevated relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,hsl(168_76%_50%),transparent_50%)]" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to use the {solution.role} workspace?</h2>
            <p className="mt-3 text-primary-foreground/85 max-w-md mx-auto">
              Sign in with your organization credentials or create a student account to get started.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-11 px-8">
                <Link to="/register">
                  Create free account
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-11 px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
