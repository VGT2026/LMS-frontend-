export interface JobRole {
  id: string;
  title: string;
  description: string;
  roadmap: string[]; // sequence of course IDs
  salaryRange: string;
  demand: string;
  growth: string;
  milestones: { title: string; description: string; reqCourses: number }[];
  skills: { name: string; progress: number }[];
}

export const jobRoles: JobRole[] = [
  {
    id: "jr1",
    title: "Full Stack Developer",
    description: "Build complete web applications from front to back. Master both client-side and server-side technologies.",
    roadmap: ["1", "ic2", "4", "ic3"], // React, TS, AWS, System Design
    salaryRange: "$115k - $160k",
    demand: "Very High",
    growth: "+22% YoY",
    milestones: [
      { title: "Frontend Expert", description: "Master React patterns and TypeScript.", reqCourses: 2 },
      { title: "Cloud Integration", description: "Deploy scalable apps on AWS.", reqCourses: 3 },
      { title: "Senior Architect", description: "Design complex systems for scale.", reqCourses: 4 }
    ],
    skills: [
      { name: "React System Design", progress: 85 },
      { name: "Cloud Infrastructure", progress: 40 },
      { name: "Team Leadership", progress: 25 },
    ]
  },
  {
    id: "jr2",
    title: "Data Scientist",
    description: "Analyze complex data to help organizations make decisions. Deep dive into ML, AI, and big data analysis.",
    roadmap: ["2", "ic3", "5"],
    salaryRange: "$130k - $185k",
    demand: "High",
    growth: "+35% YoY",
    milestones: [
      { title: "Data Analyst", description: "Foundation in statistics and Python.", reqCourses: 1 },
      { title: "ML Practitioner", description: "Implement machine learning models.", reqCourses: 2 },
      { title: "AI Research Lead", description: "Pioneer new AI applications.", reqCourses: 3 }
    ],
    skills: [
      { name: "Python Modeling", progress: 75 },
      { name: "Advanced Statistics", progress: 60 },
      { name: "MLOps", progress: 30 },
    ]
  },
  {
    id: "jr3",
    title: "Cloud Architect",
    description: "Design and manage cloud-based systems and infrastructure. Build resilient and cost-effective solutions.",
    roadmap: ["4", "ic3", "6"],
    salaryRange: "$145k - $210k",
    demand: "Critical",
    growth: "+28% YoY",
    milestones: [
      { title: "Cloud Associate", description: "AWS/Azure/GCP fundamentals.", reqCourses: 1 },
      { title: "Infrastructure Lead", description: "Expertise in networking and security.", reqCourses: 2 },
      { title: "Principal Architect", description: "Global scale cloud transformation.", reqCourses: 3 }
    ],
    skills: [
      { name: "Kubernetes/Docker", progress: 90 },
      { name: "SecOps", progress: 55 },
      { name: "Cost Optimization", progress: 80 },
    ]
  }
];

export const courses = [
  {
    id: "1",
    title: "Advanced React Patterns",
    instructor: "Dr. Sarah Chen",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
    progress: 72,
    category: "Development",
    students: 1284,
    duration: "12 weeks",
    description: "Master advanced React patterns including compound components, render props, and custom hooks for building scalable applications.",
    modules: [
      { id: "m1", title: "Compound Components", lessons: 4, completed: true },
      { id: "m2", title: "Render Props & HOCs", lessons: 3, completed: true },
      { id: "m3", title: "Custom Hooks Deep Dive", lessons: 5, completed: false },
      { id: "m4", title: "State Machines in React", lessons: 4, completed: false },
      { id: "m5", title: "Performance Optimization", lessons: 3, completed: false },
    ],
  },
  {
    id: "2",
    title: "Data Science Fundamentals",
    instructor: "Prof. Michael Torres",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    progress: 45,
    category: "Data Science",
    students: 2156,
    duration: "16 weeks",
    description: "Learn the fundamentals of data science including statistics, machine learning, and data visualization.",
    modules: [
      { id: "m1", title: "Statistics Refresher", lessons: 6, completed: true },
      { id: "m2", title: "Python for Data Science", lessons: 5, completed: true },
      { id: "m3", title: "Machine Learning Basics", lessons: 7, completed: false },
      { id: "m4", title: "Data Visualization", lessons: 4, completed: false },
    ],
  },
  {
    id: "3",
    title: "UX Design Masterclass",
    instructor: "Lisa Park",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop",
    progress: 90,
    category: "Design",
    students: 987,
    duration: "10 weeks",
    description: "Complete UX design course covering research, wireframing, prototyping, and usability testing.",
    modules: [
      { id: "m1", title: "User Research Methods", lessons: 4, completed: true },
      { id: "m2", title: "Information Architecture", lessons: 3, completed: true },
      { id: "m3", title: "Wireframing & Prototyping", lessons: 5, completed: true },
      { id: "m4", title: "Usability Testing", lessons: 3, completed: false },
    ],
  },
  {
    id: "4",
    title: "Cloud Architecture with AWS",
    instructor: "James Wright",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop",
    progress: 20,
    category: "Cloud",
    students: 1543,
    duration: "14 weeks",
    description: "Design and implement scalable cloud solutions using Amazon Web Services.",
    modules: [
      { id: "m1", title: "AWS Fundamentals", lessons: 5, completed: true },
      { id: "m2", title: "Networking & Security", lessons: 6, completed: false },
      { id: "m3", title: "Compute & Storage", lessons: 5, completed: false },
      { id: "m4", title: "Serverless Architecture", lessons: 4, completed: false },
    ],
  },
  {
    id: "5",
    title: "Project Management Professional",
    instructor: "Maria Garcia",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop",
    progress: 60,
    category: "Business",
    students: 3201,
    duration: "8 weeks",
    description: "Comprehensive PMP preparation course with practice exams and real-world case studies.",
    modules: [
      { id: "m1", title: "Project Initiation", lessons: 3, completed: true },
      { id: "m2", title: "Planning & Scheduling", lessons: 5, completed: true },
      { id: "m3", title: "Execution & Monitoring", lessons: 4, completed: false },
      { id: "m4", title: "Risk Management", lessons: 3, completed: false },
    ],
  },
  {
    id: "6",
    title: "Cybersecurity Essentials",
    instructor: "David Kim",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=250&fit=crop",
    progress: 35,
    category: "Security",
    students: 1876,
    duration: "12 weeks",
    description: "Essential cybersecurity concepts including threat analysis, network security, and incident response.",
    modules: [
      { id: "m1", title: "Security Fundamentals", lessons: 4, completed: true },
      { id: "m2", title: "Network Security", lessons: 5, completed: false },
      { id: "m3", title: "Cryptography", lessons: 4, completed: false },
      { id: "m4", title: "Incident Response", lessons: 3, completed: false },
    ],
  },
];

export const announcements = [
  { id: "1", title: "Platform Maintenance Scheduled", date: "2026-02-25", content: "System will be under maintenance from 2 AM to 4 AM EST.", type: "warning" as const },
  { id: "2", title: "New Course: AI for Business", date: "2026-02-22", content: "Exciting new course launching next week. Enroll now for early access.", type: "info" as const },
  { id: "3", title: "Certificate Verification Update", date: "2026-02-20", content: "Digital certificates now include QR verification codes.", type: "success" as const },
];

export const deadlines = [
  { id: "1", course: "Advanced React Patterns", task: "Custom Hooks Assignment", due: "2026-02-26", type: "assignment" },
  { id: "2", course: "Data Science Fundamentals", task: "Midterm Quiz", due: "2026-02-28", type: "quiz" },
  { id: "3", course: "UX Design Masterclass", task: "Usability Report", due: "2026-03-02", type: "assignment" },
  { id: "4", course: "Cloud Architecture", task: "Lab Exercise 3", due: "2026-03-05", type: "lab" },
];

export const discussions = [
  { id: "1", author: "Alex Johnson", avatar: "", title: "Best practices for custom hooks?", content: "I've been working on custom hooks and wondering about error handling patterns. What approaches do you all use?", replies: 12, likes: 8, pinned: true, time: "2 hours ago" },
  { id: "2", author: "Emily Davis", avatar: "", title: "React 19 migration tips", content: "Has anyone started migrating to React 19? Any gotchas to watch out for?", replies: 7, likes: 15, pinned: false, time: "5 hours ago" },
  { id: "3", author: "Mark Wilson", avatar: "", title: "State management comparison", content: "Zustand vs Jotai vs Redux Toolkit — what's your pick for a large-scale app?", replies: 23, likes: 31, pinned: false, time: "1 day ago" },
  { id: "4", author: "Sarah Chen", avatar: "", title: "📌 Week 5 Study Guide", content: "Here's the study guide for the upcoming quiz. Make sure to review chapters 8-12.", replies: 4, likes: 42, pinned: true, time: "2 days ago" },
];

export const quizQuestions = [
  {
    id: 1,
    question: "What is the primary benefit of using custom hooks in React?",
    options: ["Better performance", "Code reusability and logic extraction", "Faster rendering", "Smaller bundle size"],
    correct: 1,
  },
  {
    id: 2,
    question: "Which pattern allows a component to share rendering logic?",
    options: ["Observer pattern", "Render props pattern", "Factory pattern", "Singleton pattern"],
    correct: 1,
  },
  {
    id: 3,
    question: "What does useMemo optimize?",
    options: ["DOM mutations", "Expensive computations", "Network requests", "Event handlers"],
    correct: 1,
  },
  {
    id: 4,
    question: "When should you use useCallback?",
    options: ["Always for event handlers", "When passing callbacks to optimized children", "For API calls only", "Instead of useMemo"],
    correct: 1,
  },
  {
    id: 5,
    question: "What is the virtual DOM?",
    options: ["A browser API", "A lightweight copy of the real DOM", "A CSS framework", "A testing tool"],
    correct: 1,
  },
];

export const adminStats = {
  totalUsers: 12847,
  activeCourses: 156,
  revenue: 284650,
  completionRate: 73,
  userGrowth: [
    { month: "Sep", users: 8200 },
    { month: "Oct", users: 9100 },
    { month: "Nov", users: 9800 },
    { month: "Dec", users: 10500 },
    { month: "Jan", users: 11600 },
    { month: "Feb", users: 12847 },
  ],
  courseCompletions: [
    { month: "Sep", completions: 420 },
    { month: "Oct", completions: 510 },
    { month: "Nov", completions: 580 },
    { month: "Dec", completions: 620 },
    { month: "Jan", completions: 710 },
    { month: "Feb", completions: 780 },
  ],
  revenueData: [
    { month: "Sep", revenue: 38000 },
    { month: "Oct", revenue: 42000 },
    { month: "Nov", revenue: 45000 },
    { month: "Dec", revenue: 48000 },
    { month: "Jan", revenue: 52000 },
    { month: "Feb", revenue: 59650 },
  ],
};

export const users = [
  { id: "1", name: "Alex Johnson", email: "alex@example.com", role: "student" as const, status: "active" as const, enrolled: 4 },
  { id: "2", name: "Emily Davis", email: "emily@example.com", role: "student" as const, status: "active" as const, enrolled: 3 },
  { id: "3", name: "Mark Wilson", email: "mark@example.com", role: "student" as const, status: "inactive" as const, enrolled: 1 },
  { id: "4", name: "Dr. Sarah Chen", email: "sarah@lmspro.com", role: "instructor" as const, status: "active" as const, enrolled: 0 },
  { id: "5", name: "Prof. Michael Torres", email: "michael@lmspro.com", role: "instructor" as const, status: "active" as const, enrolled: 0 },
  { id: "6", name: "Lisa Park", email: "lisa@lmspro.com", role: "instructor" as const, status: "active" as const, enrolled: 0 },
  { id: "7", name: "James Wright", email: "james@lmspro.com", role: "instructor" as const, status: "inactive" as const, enrolled: 0 },
  { id: "8", name: "Maria Garcia", email: "maria@example.com", role: "student" as const, status: "active" as const, enrolled: 5 },
];

export const instructorCourses = [
  {
    id: "ic1",
    title: "Advanced React Patterns",
    category: "Development",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
    studentCount: 1284,
    avgProgress: 68,
    avgGrade: 82,
    status: "active" as const,
    description: "Master advanced React patterns including compound components, render props, and custom hooks for building scalable applications.",
    modules: [
      { id: "im1", title: "Compound Components", lessons: 4 },
      { id: "im2", title: "Render Props & HOCs", lessons: 3 },
      { id: "im3", title: "Custom Hooks Deep Dive", lessons: 5 },
      { id: "im4", title: "State Machines in React", lessons: 4 },
      { id: "im5", title: "Performance Optimization", lessons: 3 },
    ],
    students: [
      { id: "s1", name: "Alex Johnson", email: "alex@example.com", progress: 72, grade: 88, status: "active" as const },
      { id: "s2", name: "Emily Davis", email: "emily@example.com", progress: 85, grade: 91, status: "active" as const },
      { id: "s3", name: "Mark Wilson", email: "mark@example.com", progress: 30, grade: 65, status: "inactive" as const },
      { id: "s4", name: "Maria Garcia", email: "maria@example.com", progress: 90, grade: 95, status: "active" as const },
      { id: "s5", name: "Ryan Lee", email: "ryan@example.com", progress: 55, grade: 74, status: "active" as const },
    ],
    announcements: [
      { id: "a1", title: "Week 5 Study Guide", content: "Review chapters 8-12 for the upcoming quiz. Pay special attention to custom hooks patterns.", date: "2026-02-20" },
      { id: "a2", title: "Office Hours Change", content: "Office hours this week will be moved to Thursday 3-5 PM instead of Wednesday.", date: "2026-02-18" },
    ],
  },
  {
    id: "ic2",
    title: "Full-Stack TypeScript",
    category: "Development",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop",
    studentCount: 856,
    avgProgress: 45,
    avgGrade: 78,
    status: "active" as const,
    description: "Build production-ready applications using TypeScript on both frontend and backend with Node.js, Express, and React.",
    modules: [
      { id: "im6", title: "TypeScript Fundamentals", lessons: 6 },
      { id: "im7", title: "Backend with Express", lessons: 5 },
      { id: "im8", title: "Database Integration", lessons: 4 },
      { id: "im9", title: "Frontend with React", lessons: 5 },
    ],
    students: [
      { id: "s6", name: "Sarah Kim", email: "sarah.k@example.com", progress: 60, grade: 80, status: "active" as const },
      { id: "s7", name: "Tom Brown", email: "tom@example.com", progress: 40, grade: 72, status: "active" as const },
      { id: "s8", name: "Lisa Wang", email: "lisa.w@example.com", progress: 35, grade: 68, status: "active" as const },
    ],
    announcements: [
      { id: "a3", title: "Project Milestone 1 Due", content: "Your first project milestone is due next Friday. Make sure to push your code to the repository.", date: "2026-02-22" },
    ],
  },
  {
    id: "ic3",
    title: "System Design Fundamentals",
    category: "Architecture",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop",
    studentCount: 2100,
    avgProgress: 52,
    avgGrade: 75,
    status: "active" as const,
    description: "Learn how to design scalable, reliable, and efficient software systems from the ground up.",
    modules: [
      { id: "im10", title: "Scalability Basics", lessons: 4 },
      { id: "im11", title: "Load Balancing & Caching", lessons: 5 },
      { id: "im12", title: "Database Design", lessons: 6 },
      { id: "im13", title: "Microservices", lessons: 4 },
    ],
    students: [
      { id: "s9", name: "James Park", email: "james.p@example.com", progress: 70, grade: 82, status: "active" as const },
      { id: "s10", name: "Nina Patel", email: "nina@example.com", progress: 45, grade: 70, status: "active" as const },
    ],
    announcements: [],
  },
  {
    id: "ic4",
    title: "GraphQL Masterclass",
    category: "Development",
    thumbnail: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=250&fit=crop",
    studentCount: 0,
    avgProgress: 0,
    avgGrade: 0,
    status: "draft" as const,
    description: "Deep dive into GraphQL — schema design, resolvers, subscriptions, and best practices for production APIs.",
    modules: [
      { id: "im14", title: "GraphQL Basics", lessons: 3 },
      { id: "im15", title: "Schema Design", lessons: 4 },
    ],
    students: [],
    announcements: [],
  },
];

export const studentSubmissions = [
  { id: "sub1", studentName: "Alex Johnson", studentEmail: "alex@example.com", courseId: "ic1", courseTitle: "Advanced React Patterns", assignmentTitle: "Custom Hooks Assignment", submittedAt: "2026-02-22T14:30:00", status: "pending" as const, grade: null as number | null, feedback: "" as string, fileName: "custom-hooks.zip" },
  { id: "sub2", studentName: "Emily Davis", studentEmail: "emily@example.com", courseId: "ic1", courseTitle: "Advanced React Patterns", assignmentTitle: "Custom Hooks Assignment", submittedAt: "2026-02-21T09:15:00", status: "graded" as const, grade: 92 as number | null, feedback: "Excellent work! Great use of the reducer pattern." as string, fileName: "hooks-solution.zip" },
  { id: "sub3", studentName: "Mark Wilson", studentEmail: "mark@example.com", courseId: "ic1", courseTitle: "Advanced React Patterns", assignmentTitle: "Render Props Exercise", submittedAt: "2026-02-23T11:00:00", status: "late" as const, grade: null as number | null, feedback: "" as string, fileName: "render-props.tsx" },
  { id: "sub4", studentName: "Maria Garcia", studentEmail: "maria@example.com", courseId: "ic1", courseTitle: "Advanced React Patterns", assignmentTitle: "Custom Hooks Assignment", submittedAt: "2026-02-20T16:45:00", status: "graded" as const, grade: 95 as number | null, feedback: "Outstanding! You demonstrated mastery of all three patterns." as string, fileName: "maria-hooks.zip" },
  { id: "sub5", studentName: "Sarah Kim", studentEmail: "sarah.k@example.com", courseId: "ic2", courseTitle: "Full-Stack TypeScript", assignmentTitle: "REST API Project", submittedAt: "2026-02-22T10:20:00", status: "pending" as const, grade: null as number | null, feedback: "" as string, fileName: "api-project.zip" },
  { id: "sub6", studentName: "Tom Brown", studentEmail: "tom@example.com", courseId: "ic2", courseTitle: "Full-Stack TypeScript", assignmentTitle: "REST API Project", submittedAt: "2026-02-21T23:58:00", status: "pending" as const, grade: null as number | null, feedback: "" as string, fileName: "rest-api-tom.zip" },
  { id: "sub7", studentName: "Ryan Lee", studentEmail: "ryan@example.com", courseId: "ic1", courseTitle: "Advanced React Patterns", assignmentTitle: "State Machines Lab", submittedAt: "2026-02-19T13:10:00", status: "graded" as const, grade: 74 as number | null, feedback: "Good effort but needs improvement on edge case handling." as string, fileName: "state-machines.tsx" },
  { id: "sub8", studentName: "James Park", studentEmail: "james.p@example.com", courseId: "ic3", courseTitle: "System Design Fundamentals", assignmentTitle: "Load Balancer Design Doc", submittedAt: "2026-02-22T08:30:00", status: "pending" as const, grade: null as number | null, feedback: "" as string, fileName: "load-balancer-design.pdf" },
];

export const instructorSchedule = [
  { id: "ev1", title: "Advanced React — Lecture 10", type: "lecture" as const, date: "2026-02-24", time: "10:00 AM", course: "Advanced React Patterns" },
  { id: "ev2", title: "Office Hours", type: "office-hours" as const, date: "2026-02-24", time: "2:00 PM", course: "All Courses" },
  { id: "ev3", title: "TypeScript — Lecture 8", type: "lecture" as const, date: "2026-02-25", time: "11:00 AM", course: "Full-Stack TypeScript" },
  { id: "ev4", title: "Assignment Review Session", type: "review" as const, date: "2026-02-26", time: "3:00 PM", course: "Advanced React Patterns" },
  { id: "ev5", title: "System Design — Lecture 6", type: "lecture" as const, date: "2026-02-27", time: "10:00 AM", course: "System Design Fundamentals" },
];

export const instructorStats = {
  totalStudents: 4240,
  activeCourses: 3,
  pendingGrading: 4,
  averageGrade: 79,
  submissionTrend: [
    { month: "Sep", submissions: 42 },
    { month: "Oct", submissions: 58 },
    { month: "Nov", submissions: 65 },
    { month: "Dec", submissions: 51 },
    { month: "Jan", submissions: 73 },
    { month: "Feb", submissions: 80 },
  ],
};
