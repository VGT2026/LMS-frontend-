import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Headphones,
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
  },
  {
    icon: Headphones,
    title: "Existing customers",
    detail: "Use in-app Support",
    hint: "Sign in and open Support from your dashboard for account-specific help.",
  },
  {
    icon: Building2,
    title: "Organizations",
    detail: "Platform & tenant setup",
    hint: "Ask about onboarding your school or business unit on LMS Pro.",
  },
  {
    icon: Clock,
    title: "Hours",
    detail: "Mon–Fri, 9:00–18:00 IST",
    hint: "Emergency issues for live classes: mark subject as urgent.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

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
        description: "Send the pre-filled message to complete your request. You can also email us directly.",
      });
    } catch {
      await navigator.clipboard.writeText(`${CONTACT_EMAIL}\n\n${body}`).catch(() => undefined);
      toast({
        title: "Copy our address",
        description: `Email ${CONTACT_EMAIL} with your message if your mail app did not open.`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-1/3 right-0 w-[480px] h-[480px] rounded-full bg-accent/25 blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 lg:py-20">
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
            <motion.div variants={fadeUp}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Contact</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground tracking-tight max-w-2xl">
                Let&apos;s talk about your learning goals
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/85 max-w-xl leading-relaxed">
                Questions about demos, enterprise tenants, or getting your organization onboard? We&apos;re here to help.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">Reach us</p>
              <h2 className="text-2xl font-bold text-foreground">How we can help</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Prefer email? Use the form or write directly to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-medium">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {contactChannels.map((ch) => {
                const Icon = ch.icon;
                return (
                  <div
                    key={ch.title}
                    className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {ch.title}
                        </p>
                        <p className="font-medium text-foreground mt-0.5">{ch.detail}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ch.hint}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Already have an account?
              </p>
              <p>
                For course, grade, or login issues,{" "}
                <Link to="/login" className="text-accent hover:underline font-medium">
                  sign in
                </Link>{" "}
                and use Support from your dashboard.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-elevated">
              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground">Almost done</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    If your email app opened, send the message to finish. Otherwise email{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setInquiryType("");
                      setSubject("");
                      setMessage("");
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Full name</Label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
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
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-type">Inquiry type</Label>
                    <Select value={inquiryType} onValueChange={setInquiryType}>
                      <SelectTrigger id="contact-type">
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
                      className="resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 gap-2 h-11 px-8"
                    disabled={sending}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Preparing..." : "Send message"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Submitting opens your default email app with a pre-filled message to our team.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Contact;
