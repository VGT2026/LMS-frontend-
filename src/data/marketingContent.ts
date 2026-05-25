import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  Users,
  LayoutDashboard,
  Shield,
  BookOpen,
  Bot,
  Sparkles,
  Map,
  ClipboardList,
  Award,
  MessageSquare,
  Calendar,
  BarChart3,
  Wand2,
  FileText,
  Building2,
  UserPlus,
  LineChart,
} from "lucide-react";

export interface DashboardCapability {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface DashboardSolution {
  slug: string;
  role: string;
  tagline: string;
  headline: string;
  overview: string;
  accentClass: string;
  icon: LucideIcon;
  capabilities: DashboardCapability[];
  workflow: { step: string; detail: string }[];
  highlights: string[];
}

export const dashboardSolutions: DashboardSolution[] = [
  {
    slug: "students",
    role: "Student",
    tagline: "Learner workspace",
    headline: "Your personal learning command center",
    overview:
      "The student workspace is designed around progress, discovery, and support. From the moment you sign in, you see enrolled courses, upcoming deadlines, AI study tools, and a clear path toward certificates — without switching between disconnected apps.",
    accentClass: "from-accent/20 to-primary/5",
    icon: GraduationCap,
    capabilities: [
      {
        title: "Learning dashboard",
        description:
          "A single home view for active courses, completion progress, quick stats, and recommended next steps based on your profile and goals.",
        icon: LayoutDashboard,
      },
      {
        title: "Course catalog & enrollment",
        description:
          "Browse published courses, view modules and materials, and enroll in programs assigned to your organization or open catalog.",
        icon: BookOpen,
      },
      {
        title: "Career roadmap",
        description:
          "Map skills to target job roles, track milestones, and see which courses move you closer to your career objective.",
        icon: Map,
      },
      {
        title: "AI Tutor",
        description:
          "Ask questions in natural language and receive contextual explanations tied to your courses and study topics.",
        icon: Bot,
      },
      {
        title: "AI Summarizer",
        description:
          "Upload readings or notes and generate concise summaries to review before exams or discussions.",
        icon: Sparkles,
      },
      {
        title: "Assignments & exams",
        description:
          "Submit coursework, take timed quizzes and proctored exams, and review feedback from instructors in one timeline.",
        icon: ClipboardList,
      },
      {
        title: "Grades & certificates",
        description:
          "Transparent gradebooks per course and downloadable certificates when you complete requirements.",
        icon: Award,
      },
      {
        title: "Calendar & messages",
        description:
          "Deadline visibility, scheduling, and direct messaging so you never miss critical dates or instructor updates.",
        icon: Calendar,
      },
    ],
    workflow: [
      { step: "Join your organization", detail: "Register or accept an invite from your school or employer." },
      { step: "Enroll in courses", detail: "Pick programs from the catalog or assigned learning paths." },
      { step: "Learn with AI support", detail: "Use the tutor and summarizer alongside structured modules." },
      { step: "Complete assessments", detail: "Submit assignments and exams with clear status tracking." },
      { step: "Earn credentials", detail: "Unlock certificates and track grades as you finish." },
    ],
    highlights: ["Progress at a glance", "AI-powered study", "Unified deadlines", "Certificates"],
  },
  {
    slug: "instructors",
    role: "Instructor",
    tagline: "Teaching workspace",
    headline: "Everything you need to teach at scale",
    overview:
      "Instructors get a focused hub for course ownership: build content, publish modules, assign work, grade submissions, and monitor learners — with AI assistance to create quizzes faster.",
    accentClass: "from-primary/15 to-accent/5",
    icon: Users,
    capabilities: [
      {
        title: "Instructor dashboard",
        description:
          "Overview of your courses, pending grading, recent student activity, and shortcuts to high-priority tasks.",
        icon: LayoutDashboard,
      },
      {
        title: "Course builder",
        description:
          "Create and edit courses, organize modules, upload materials, and control visibility from draft to published.",
        icon: BookOpen,
      },
      {
        title: "Student roster",
        description:
          "See who is enrolled, track participation, and understand class composition at a glance.",
        icon: Users,
      },
      {
        title: "Assignments & grading",
        description:
          "Publish assignments, review submissions, leave feedback, and record grades with a streamlined workflow.",
        icon: FileText,
      },
      {
        title: "AI Quiz Generator",
        description:
          "Generate assessment questions from lesson content, refine them, and publish quizzes linked to your courses.",
        icon: Wand2,
      },
      {
        title: "Discussions",
        description:
          "Moderate course conversations and keep learners engaged between live sessions.",
        icon: MessageSquare,
      },
      {
        title: "Analytics",
        description:
          "Course-level insights on enrollment, completion, and assessment performance.",
        icon: BarChart3,
      },
    ],
    workflow: [
      { step: "Create your course", detail: "Structure modules and upload learning materials." },
      { step: "Publish & enroll", detail: "Make the course live for your organization or cohort." },
      { step: "Assign work", detail: "Schedule assignments and quizzes with clear due dates." },
      { step: "Grade & feedback", detail: "Review submissions and communicate results quickly." },
      { step: "Improve", detail: "Use analytics and discussions to refine the next cohort." },
    ],
    highlights: ["Course ownership", "Fast grading", "AI quiz creation", "Class insights"],
  },
  {
    slug: "organizations",
    role: "Organization Admin",
    tagline: "Tenant administration",
    headline: "Run your organization’s learning program",
    overview:
      "Organization admins operate inside a private tenant: only your instructors, students, and courses appear in your workspace. Manage users, approve content, and monitor health across your entire program.",
    accentClass: "from-warning/15 to-primary/5",
    icon: Building2,
    capabilities: [
      {
        title: "Admin dashboard",
        description:
          "High-level metrics on users, courses, activity, and support — scoped exclusively to your organization.",
        icon: LayoutDashboard,
      },
      {
        title: "Course management",
        description:
          "Oversee all courses in the tenant, assign instructors, toggle availability, and maintain quality standards.",
        icon: BookOpen,
      },
      {
        title: "User management",
        description:
          "Create instructors, view students, adjust roles, and activate or deactivate accounts as needed.",
        icon: UserPlus,
      },
      {
        title: "Course creation",
        description:
          "Launch new programs by pairing categories with assigned instructors from your roster.",
        icon: FileText,
      },
      {
        title: "Reports",
        description:
          "Operational reporting to understand adoption, completion trends, and organizational outcomes.",
        icon: LineChart,
      },
      {
        title: "Support oversight",
        description:
          "Monitor help tickets submitted by learners and staff within your tenant.",
        icon: MessageSquare,
      },
    ],
    workflow: [
      { step: "Set up your tenant", detail: "Your organization is provisioned on the platform." },
      { step: "Onboard instructors", detail: "Add teaching staff and assign course ownership." },
      { step: "Grow enrollment", detail: "Students join within your isolated environment." },
      { step: "Monitor delivery", detail: "Use dashboards and reports to track program health." },
      { step: "Scale confidently", detail: "Expand courses and cohorts without data leaking across orgs." },
    ],
    highlights: ["Tenant isolation", "Full user control", "Course oversight", "Org-wide reports"],
  },
  {
    slug: "platform",
    role: "Platform Super Admin",
    tagline: "Enterprise control plane",
    headline: "Govern the entire LMS platform",
    overview:
      "Super admins sit above all organizations. You provision tenants, create platform administrators, and observe students and instructors across the ecosystem — built for SaaS operators and large multi-org deployments.",
    accentClass: "from-info/15 to-primary/10",
    icon: Shield,
    capabilities: [
      {
        title: "Platform dashboard",
        description:
          "Cross-tenant visibility into growth, usage patterns, and platform-level KPIs (as your API exposes them).",
        icon: LayoutDashboard,
      },
      {
        title: "Organizations",
        description:
          "Create and list tenants so each customer or business unit runs in an isolated environment.",
        icon: Building2,
      },
      {
        title: "Platform admins",
        description:
          "Provision organization owners with credentials and tie them to the correct tenant at creation time.",
        icon: Shield,
      },
      {
        title: "Global user directory",
        description:
          "Browse all students and instructors with filters — ideal for support, compliance, and operations.",
        icon: Users,
      },
      {
        title: "Multi-tenant security",
        description:
          "Each organization’s data stays separate; admins never see another tenant’s courses or users.",
        icon: Shield,
      },
    ],
    workflow: [
      { step: "Create organizations", detail: "Stand up a new tenant for each customer or division." },
      { step: "Assign admins", detail: "Hand off day-to-day control to organization administrators." },
      { step: "Monitor platform", detail: "Review aggregate metrics and user activity." },
      { step: "Support at scale", detail: "Investigate issues across tenants from a single console." },
    ],
    highlights: ["Multi-tenant SaaS", "Org provisioning", "Global visibility", "Enterprise governance"],
  },
];

export function getSolutionBySlug(slug: string): DashboardSolution | undefined {
  return dashboardSolutions.find((s) => s.slug === slug);
}
