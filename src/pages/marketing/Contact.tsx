import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  MessageSquare,
  Building2,
  Clock,
  Send,
  CheckCircle2,
  Headphones,
  Sparkles,
} from "lucide-react";

const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || "support@lmspro.com";

const inquiryTypes = [
  { value: "general", label: "General inquiry" },
  { value: "demo", label: "Request a demo" },
  { value: "enterprise", label: "Enterprise & multi-tenant" },
  { value: "support", label: "Technical support" },
  { value: "partnership", label: "Partnership" },
];

const contactChannels = [
  {
    icon: Mail,
    title: "Email",
    detail: CONTACT_EMAIL,
    hint: "We typically respond within one business day.",
    accent: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: Headphones,
    title: "Existing customers",
    detail: "In-app Support",
    hint: "Sign in and open Support from your dashboard for account-specific help.",
    accent: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: Building2,
    title: "Organizations",
    detail: "Tenant onboarding",
    hint: "Ask about provisioning your school or business unit on LMS Pro.",
    accent: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: Clock,
    title: "Hours",
    detail: "Mon–Fri, 9:00–18:00 IST",
    hint: "Mark your subject urgent for time-sensitive live class issues.",
    accent: "from-emerald-500/10 to-teal-500/10",
  },
];

const Contact = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !inquiryType || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, inquiry type, and message.",
        variant: "destructive",
      });
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }

    setSending(true);
    const typeLabel = inquiryTypes.find((t) => t.value === inquiryType)?.label ?? inquiryType;
    const mailSubject = subject.trim() || `[LMS Pro] ${typeLabel}`;
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Inquiry: ${typeLabel}`,
      "",
      message.trim(),
    ].join("\n");

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`;

    try {
      window.location.href = mailto;
      setSubmitted(true);
      toast({
        title: "Opening your email client",
        description: "Send the pre-filled message to complete your request.",
      });
    } catch {
      await navigator.clipboard.writeText(`${CONTACT_EMAIL}\n\n${body}`).catch(() => undefined);
      toast({
        title: "Copy our address",
        description: `Email ${CONTACT_EMAIL} if your mail app did not open.`,
      });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setName("");
    setEmail("");
    setInquiryType("");
    setSubject("");
    setMessage("");
  };

  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow="Contact"
        title="Let's talk about your learning goals"
        subtitle="Demos, enterprise tenants, partnerships, or onboarding your organization — our team is ready to help."
        size="compact"
      />

      <section className="py-16 px-4 -mt-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-10 justify-center lg:justify-start">
            {inquiryTypes.slice(0, 4).map((t) => (
              <Badge
                key={t.value}
                variant="outline"
                className="text-xs font-normal px-3 py-1 border-border bg-card/80"
              >
                {t.label}
              </Badge>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">Reach us</p>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">How we can help</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent font-medium hover:underline">
                    {CONTACT_EMAIL}
                  </a>{" "}
                  or use the form — we read every message.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {contactChannels.map((ch, i) => {
                  const Icon = ch.icon;
                  return (
                    <motion.div
                      key={ch.title}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl border border-border bg-gradient-to-br ${ch.accent} to-card p-5 shadow-card hover:shadow-elevated transition-all duration-300`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {ch.title}
                          </p>
                          <p className="font-semibold text-foreground mt-0.5">{ch.detail}</p>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{ch.hint}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
                <p className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  Already have an account?
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For course, grade, or login issues,{" "}
                  <Link to="/login" className="text-accent font-medium hover:underline">
                    sign in
                  </Link>{" "}
                  and use Support from your dashboard.
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7"
            >
              <div className="relative rounded-3xl border border-border bg-card shadow-elevated overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />
                <div className="p-6 sm:p-9">
                  {submitted ? (
                    <div className="text-center py-14">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-9 h-9 text-accent" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Almost done</h3>
                      <p className="text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
                        If your email app opened, send the message to finish. Otherwise email{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent font-medium hover:underline">
                          {CONTACT_EMAIL}
                        </a>
                        .
                      </p>
                      <Button variant="outline" className="mt-8" onClick={resetForm}>
                        Send another message
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold text-foreground">Send us a message</h3>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name">Full name</Label>
                            <Input
                              id="contact-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Your name"
                              className="h-11 bg-background/50"
                              autoComplete="name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email">Email</Label>
                            <Input
                              id="contact-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@organization.com"
                              className="h-11 bg-background/50"
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-type">Inquiry type</Label>
                          <Select value={inquiryType} onValueChange={setInquiryType}>
                            <SelectTrigger id="contact-type" className="h-11 bg-background/50">
                              <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {inquiryTypes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-subject">Subject (optional)</Label>
                          <Input
                            id="contact-subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief summary"
                            className="h-11 bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-message">Message</Label>
                          <Textarea
                            id="contact-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell us about your organization, team size, or question..."
                            rows={5}
                            className="resize-none bg-background/50"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full sm:w-auto bg-accent hover:bg-accent/90 gap-2 h-12 px-10 font-semibold shadow-md shadow-accent/20"
                          disabled={sending}
                        >
                          <Send className="w-4 h-4" />
                          {sending ? "Preparing..." : "Send message"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Submitting opens your email app with a pre-filled message to our team.
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Contact;
