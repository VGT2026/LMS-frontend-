import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardSolutions } from "@/data/marketingContent";

const solutionLinks = dashboardSolutions.map((s) => ({
  label: s.role,
  href: `/solutions/${s.slug}`,
}));

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background relative">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">LMS Pro</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive("/") ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Home
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg"
              >
                Solutions
                <ChevronDown className={`w-4 h-4 transition-transform ${solutionsOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {solutionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-elevated p-2"
                  >
                    {solutionLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted text-foreground"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link
              to="/solutions/platform"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname.startsWith("/solutions")
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enterprise
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="font-medium">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 shadow-md font-medium">
              <Link to="/register">Get started</Link>
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 text-muted-foreground"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1"
            >
              <Link to="/" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                Home
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1">
                Solutions
              </p>
              {solutionLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block py-2 pl-2 text-sm text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="w-full bg-accent hover:bg-accent/90">
                  <Link to="/register">Get started</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative">{children}</main>

      <footer className="relative border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">LMS Pro</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enterprise learning with AI, multi-tenant organizations, and role-based workspaces.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Solutions</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {solutionLinks.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="hover:text-accent transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-accent transition-colors">
                    Features overview
                  </Link>
                </li>
                <li>
                  <Link to="/solutions/platform" className="hover:text-accent transition-colors">
                    Multi-tenant platform
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Account</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/login" className="hover:text-accent transition-colors">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-accent transition-colors">
                    Create account
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} LMS Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
