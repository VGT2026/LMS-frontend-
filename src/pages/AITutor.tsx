import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles, BookOpen, Lightbulb, MessageCircle, Loader2, X, GraduationCap, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { aiAPI, dashboardAPI } from "@/services/api";
import { courses as mockCourses } from "@/data/mockData";

interface ChatMessage {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: Date;
}

/** Strip markdown syntax from AI responses for clean display */
const formatMarkdown = (text: string): string => {
    return text
        // Headers: ### Title → Title
        .replace(/^#{1,6}\s+/gm, '')
        // Bold: **text** or __text__
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        // Italic: *text* or _text_
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/(?<!\w)_(.*?)_(?!\w)/g, '$1')
        // Inline code: `code`
        .replace(/`([^`]+)`/g, '$1')
        // Code blocks: ```...```
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim())
        // Strikethrough: ~~text~~
        .replace(/~~(.*?)~~/g, '$1')
        // Links: [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Images: ![alt](url) → alt
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // Blockquotes: > text → text
        .replace(/^>\s?/gm, '')
        // Unordered list markers: - item or * item → • item
        .replace(/^[\t ]*[-*+]\s+/gm, '• ')
        // Ordered list: 1. item → 1. item (keep as-is)
        // Clean up extra blank lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

// Generate course-specific suggested questions
const generateSuggestedQuestions = (courseName: string): string[] => {
    const course = courseName.toLowerCase();

    // React/Frontend courses
    if (course.includes("react") || course.includes("frontend") || course.includes("web")) {
        return [
            `Explain React hooks in ${courseName}`,
            `What's the difference between useState and useReducer?`,
            `How do I optimize component performance?`,
            `Explain the virtual DOM in ${courseName}`,
            `What are best practices for React code organization?`,
        ];
    }

    // JavaScript courses
    if (course.includes("javascript") || course.includes("js")) {
        return [
            `Explain async/await in ${courseName}`,
            `What's the difference between var, let, and const?`,
            `How do closures work in JavaScript?`,
            `Explain Promises and callbacks`,
            `What are arrow functions and their benefits?`,
        ];
    }

    // Python courses
    if (course.includes("python")) {
        return [
            `Explain decorators in Python`,
            `What's the difference between lists and tuples?`,
            `How do generators work in Python?`,
            `Explain lambda functions and when to use them`,
            `What are list comprehensions and how do I use them?`,
        ];
    }

    // Java courses
    if (course.includes("java") && !course.includes("javascript")) {
        return [
            `Explain abstract classes vs interfaces`,
            `What's the difference between checked and unchecked exceptions?`,
            `How does inheritance work in Java?`,
            `Explain the concept of polymorphism`,
            `What are generics and when should I use them?`,
        ];
    }

    // Database/SQL courses
    if (course.includes("sql") || course.includes("database") || course.includes("mysql") || course.includes("postgresql")) {
        return [
            `Explain JOIN operations in SQL`,
            `What's the difference between INNER and LEFT JOIN?`,
            `How do I optimize database queries?`,
            `Explain normalization and why it matters`,
            `What's the difference between primary and foreign keys?`,
        ];
    }

    // NoSQL/MongoDB courses
    if (course.includes("nosql") || course.includes("mongodb") || course.includes("mongo")) {
        return [
            `Explain document-oriented databases`,
            `What's the difference between SQL and NoSQL?`,
            `How do I design schemas in MongoDB?`,
            `Explain indexing strategies in NoSQL databases`,
            `What are the trade-offs of denormalization?`,
        ];
    }

    // DevOps/Docker courses
    if (course.includes("docker") || course.includes("devops") || course.includes("kubernetes") || course.includes("k8s")) {
        return [
            `Explain containerization and why it matters`,
            `What's the difference between Docker containers and VMs?`,
            `How does Kubernetes orchestration work?`,
            `Explain CI/CD pipelines`,
            `What are best practices for container security?`,
        ];
    }

    // Cloud courses (AWS, Azure, GCP)
    if (course.includes("aws") || course.includes("azure") || course.includes("gcp") || course.includes("cloud")) {
        return [
            `Explain cloud deployment models`,
            `What's the difference between IaaS, PaaS, and SaaS?`,
            `How do cloud services handle scalability?`,
            `Explain auto-scaling and load balancing`,
            `What are best practices for cloud security?`,
        ];
    }

    // Machine Learning/AI courses
    if (course.includes("machine learning") || course.includes("ml") || course.includes("ai") || course.includes("neural")) {
        return [
            `Explain neural networks and how they work`,
            `What's the difference between supervised and unsupervised learning?`,
            `How do I prevent overfitting in models?`,
            `Explain gradient descent and optimization`,
            `What are activation functions and when to use them?`,
        ];
    }

    // Data Science courses
    if (course.includes("data science") || course.includes("analytics") || course.includes("pandas")) {
        return [
            `Explain data normalization and why it's important`,
            `What's the difference between correlation and causation?`,
            `How do I handle missing data?`,
            `Explain feature engineering`,
            `What are visualization best practices?`,
        ];
    }

    // Node.js/Backend courses
    if (course.includes("node") || course.includes("express") || course.includes("backend")) {
        return [
            `Explain middleware in Express.js`,
            `What's the difference between synchronous and asynchronous operations?`,
            `How do I handle errors in Node.js?`,
            `Explain REST API design principles`,
            `What are best practices for API authentication?`,
        ];
    }

    // C++/Systems Programming
    if (course.includes("c++") || course.includes("cpp") || course.includes("systems")) {
        return [
            `Explain pointer arithmetic in C++`,
            `What's the difference between stack and heap memory?`,
            `How do smart pointers prevent memory leaks?`,
            `Explain template programming in C++`,
            `What are virtual functions and when to use them?`,
        ];
    }

    // Go/Rust courses
    if (course.includes("go") || course.includes("golang") || course.includes("rust")) {
        return [
            `Explain goroutines and concurrency`,
            `What's the ownership model in Rust?`,
            `How do I handle errors in Go?`,
            `Explain channels in Go`,
            `What are trait objects in Rust?`,
        ];
    }

    // System Design courses
    if (course.includes("system design") || course.includes("architecture") || course.includes("scalable")) {
        return [
            `Explain horizontal vs vertical scaling`,
            `What's the CAP theorem?`,
            `How do I design a distributed system?`,
            `Explain load balancing strategies`,
            `What are microservices and when should I use them?`,
        ];
    }

    // Cybersecurity courses
    if (course.includes("security") || course.includes("cybersecurity") || course.includes("hacking")) {
        return [
            `Explain encryption vs hashing`,
            `What are common security vulnerabilities?`,
            `How do I implement authentication securely?`,
            `Explain SQL injection attacks and prevention`,
            `What's the difference between authentication and authorization?`,
        ];
    }

    // Default: Generic IT questions for unknown courses
    return [
        `Explain the key concepts in ${courseName}`,
        `What are the main topics covered in this course?`,
        `How can I apply what I'm learning?`,
        `Create practice questions for ${courseName}`,
        `Help me summarize the key points`,
    ];
};

// Course-specific knowledge base for explanations
const getCourseContentKnowledge = (courseName: string): Record<string, string> => {
    const courseKnowledge: Record<string, Record<string, string>> = {
        "react js": {
            "hooks": `## React Hooks Explained 🪝

**What are Hooks?**
Hooks are functions that let you "hook into" React state and lifecycle features from functional components. They were introduced in React 16.8 to allow you to use state and other React features without class components.

**Common Hooks:**

1. **useState** - Manage component state
   - Lets you add state variables to functional components
   - Returns [state, setState]
   - Example: const [count, setCount] = useState(0)

2. **useEffect** - Handle side effects
   - Runs after component renders
   - Similar to componentDidMount, componentDidUpdate
   - Dependencies array controls when it runs
   - Example: useEffect(() => { /* code */ }, [dependency])

3. **useContext** - Access context values
   - Access global state without prop drilling
   - Example: const value = useContext(MyContext)

4. **useReducer** - Complex state management
   - Alternative to useState for complex logic
   - Similar to Redux pattern

5. **useRef** - Access DOM elements directly
   - Keep reference to mutable value
   - Doesn't cause re-renders

6. **useCallback** - Memoize functions
   - Optimize performance by memoizing callbacks
   - Prevent unnecessary re-renders of child components

7. **useMemo** - Memoize expensive computations
   - Cache computed values
   - Only recomputes when dependencies change

**Key Rules:**
✓ Only call hooks at the top level of your function
✓ Only call hooks from React function components
✓ Don't call hooks conditionally

**Why use Hooks?**
- Easier code reuse and organization
- Smaller bundle size
- Better code splitting
- Logic is easier to test`,
            
            "components": `## React Components 🧩

**What are Components?**
Components are reusable pieces of UI that encapsulate HTML, CSS, and JavaScript logic.

**Two Types:**

1. **Functional Components**
   - JavaScript functions that return JSX
   - Simpler and more widely used
   - Can use hooks for state and effects
   - Example:
     \`\`\`jsx
     function Welcome() {
       return <h1>Hello!</h1>;
     }
     \`\`\`

2. **Class Components** (less common now)
   - ES6 classes extending React.Component
   - Have this.state and lifecycle methods
   - More verbose

**Component Structure:**
- Props: Data passed to components (immutable)
- State: Data managed within component (mutable)
- Lifecycle: Methods that run at different stages
- Rendering: Return JSX to display UI

**Best Practices:**
✓ Keep components small and focused
✓ Pass data through props
✓ Use composition for reusability
✓ Lift state up when needed
✓ Avoid drilling too many props

**Component Lifecycle:**
1. Mounting - Component is being created
2. Updating - Component is being re-rendered
3. Unmounting - Component is being removed`,

            "state": `## React State Management 📊

**What is State?**
State is data that changes over time and affects what the component renders. It's local to a component.

**State vs Props:**
- **State**: Mutable, managed by component, triggers re-render when changed
- **Props**: Immutable, passed from parent, read-only

**Managing State:**

1. **useState Hook** (Functional)
   \`\`\`jsx
   const [count, setCount] = useState(0);
   setCount(count + 1); // Update state
   \`\`\`

2. **this.state** (Class Components)
   \`\`\`jsx
   this.state = { count: 0 };
   this.setState({ count: this.state.count + 1 });
   \`\`\`

**State Best Practices:**
✓ Keep state as minimal as possible
✓ Don't modify state directly
✓ Lift state to common parent for sharing
✓ Use Context or Redux for global state
✓ Avoid storing derived values in state

**Virtual DOM & Re-rendering:**
- React batches state updates
- Only re-renders when state changes
- Uses Virtual DOM for efficient updates`,
        },
        "javascript": {
            "async": `## Asynchronous JavaScript ⏳

**Understanding Async Operations:**
Asynchronous code allows operations to run without blocking the main thread.

**Key Concepts:**

1. **Callbacks**
   - Function passed as argument to another function
   - Called when operation completes
   - Can lead to "callback hell"

2. **Promises**
   - Represents eventual completion/failure of async operation
   - States: Pending → Fulfilled/Rejected
   - Chainable with .then() and .catch()

3. **Async/Await**
   - Cleaner syntax for handling promises
   - await pauses execution until promise resolves
   - Must be inside async function
   - Makes code look synchronous

**Common Use Cases:**
- Fetching data from APIs
- Reading files
- Database queries
- Timers and delays`,

            "closures": `## JavaScript Closures 🔐

**What are Closures?**
A closure is a function that has access to variables in its outer scope, even after the outer function has finished executing.

**How They Work:**
- Inner functions have access to outer function variables
- Variables are "closed over"
- Perfect for creating private variables and data hiding

**Real-World Example:**
\`\`\`javascript
function createCounter() {
  let count = 0; // Private variable
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
\`\`\`

**Use Cases:**
- Module pattern
- Data privacy
- Function factories
- Event handlers with state`,
        },
        "database": {
            "sql": `## SQL Fundamentals 🗄️

**What is SQL?**
SQL (Structured Query Language) is used to manage and query relational databases.

**Basic Operations:**

1. **SELECT** - Retrieve data
   \`SELECT name, email FROM users WHERE age > 18;\`

2. **INSERT** - Add new records
   \`INSERT INTO users VALUES (1, 'John', 'john@mail.com');\`

3. **UPDATE** - Modify records
   \`UPDATE users SET email = 'new@mail.com' WHERE id = 1;\`

4. **DELETE** - Remove records
   \`DELETE FROM users WHERE id = 1;\`

**Joins - Combine Tables:**
- INNER JOIN: Only matching rows
- LEFT JOIN: All from left + matching from right
- RIGHT JOIN: All from right + matching from left
- FULL JOIN: All rows from both tables`,

            "normalization": `## Database Normalization 📐

**Why Normalize?**
Reduces data redundancy and improves data integrity.

**Normal Forms:**

1. **1NF (First Normal Form)**
   - Eliminate repeating groups
   - Each field contains atomic values

2. **2NF (Second Normal Form)**
   - Meet 1NF requirements
   - Remove partial dependencies
   - Non-key attributes depend on entire primary key

3. **3NF (Third Normal Form)**
   - Meet 2NF requirements
   - Remove transitive dependencies
   - Non-key attributes depend only on primary key`,
        },
    };

    // Search through knowledge base
    const lowerCourse = courseName.toLowerCase();
    for (const [course, topics] of Object.entries(courseKnowledge)) {
        if (lowerCourse.includes(course)) {
            return topics;
        }
    }
    return {};
};

// Enhanced AI response generator with intelligent answers
const generateAIResponse = (question: string, courseName: string, courseDescription?: string): string => {
    const q = question.toLowerCase().trim();
    const knowledge = getCourseContentKnowledge(courseName);

    // Check for specific topic explanations in knowledge base
    for (const [topic, explanation] of Object.entries(knowledge)) {
        if (q.includes(topic)) {
            return explanation;
        }
    }

    // Enhanced: Handle "explain" questions
    if (q.includes("explain") || q.includes("what is") || q.includes("tell me about")) {
        const topics = Object.keys(knowledge);
        if (topics.length > 0) {
            return `## Understanding ${courseName} Concepts 📚

I'd be happy to explain! Here are the main topics covered in **${courseName}**:

${topics.map((topic, i) => `**${i + 1}. ${topic.charAt(0).toUpperCase() + topic.slice(1)}** - A fundamental concept you should understand`).join('\n')}

**How I can help:**
✓ Explain what each concept means
✓ Show practical examples
✓ Demonstrate real-world applications
✓ Compare similar concepts
✓ Answer follow-up questions

**You can ask me:**
- "Explain ${topics[0]}"
- "What's the difference between X and Y"
- "Show me an example of..."
- "How do I use X in practice?"

Which topic would you like me to explain in detail?`;
        }
    }

    // Enhanced: Handle "how" questions
    if (q.includes("how") && !q.includes("how are")) {
        return `## How-To Guide for ${courseName} 🎯

I can guide you through **step-by-step processes** and **practical implementations**.

**Topics I can help with:**
- How to implement concepts from this course
- How to solve common problems
- How to debug issues
- How to optimize your code/work
- How to structure your projects

**Ask me questions like:**
✓ "How do I implement X?"
✓ "How can I solve this problem?"
✓ "How does X work under the hood?"
✓ "How to debug this error?"
✓ "How to optimize performance?"

**Follow-up format:**
1️⃣ Provide clear step-by-step instructions
2️⃣ Include code examples if applicable
3️⃣ Explain the reasoning behind each step
4️⃣ Suggest best practices
5️⃣ Point out common pitfalls

**What specific problem or process would you like me to guide you through?**`;
    }

    // Enhanced: Handle "why" questions
    if (q.includes("why")) {
        return `## Understanding the "Why" Behind ${courseName} 🤔

Great question! Understanding the "why" is crucial for mastery.

**I can explain:**
- Why certain concepts exist
- Why we use specific approaches
- Why certain practices are recommended
- Why mistakes happen and how to avoid them
- Why performance matters

**Common "why" questions:**
✓ "Why is this important?"
✓ "Why do we use this pattern?"
✓ "Why does this fail?"
✓ "Why is performance critical here?"
✓ "Why should I follow this best practice?"

**How I answer:**
1. Historical context or problem it solves
2. Real-world implications
3. Trade-offs and considerations
4. Best practices recommendations
5. When exceptions apply

**Ask me about any concept you want to understand deeply - I'll explain the reasoning!**`;
    }

    // Enhanced: Handle general summary requests
    if (q.includes("summary") || q.includes("summarize") || q.includes("overview") || q.includes("brief")) {
        return `## ${courseName} Overview 📖

**Quick Summary:**
${courseDescription || "This course covers essential concepts and practical applications in IT and Computer Science."}

**Key Areas Covered:**
${Object.keys(knowledge).length > 0 
  ? Object.keys(knowledge).map(topic => `• **${topic.charAt(0).toUpperCase() + topic.slice(1)}** - Core concept`).join('\n')
  : '• Foundational concepts\n• Practical applications\n• Industry best practices'
}

**What You'll Learn:**
✓ Understand core principles and theory
✓ Apply concepts to real-world problems
✓ Build practical projects
✓ Follow industry standards and best practices
✓ Solve problems efficiently
✓ Write maintainable code/solutions

**Your Learning Path:**
1. Start with basics → 2. Understand concepts → 3. Practice examples → 4. Build projects → 5. Master advanced topics

**Next Steps:**
📚 Ask me to explain any specific concept
💡 Request practice questions
🔧 Get help with assignments
📊 Summarize a specific module
🎯 Guide you through projects

**What would you like to dive deeper into?**`;
    }

    // Enhanced: Handle "practice" and "quiz" requests
    if (q.includes("question") || q.includes("practice") || q.includes("quiz") || q.includes("exam") || q.includes("test")) {
        return `## Practice & Assessment 📝

Let me help you prepare and test your knowledge!

**Types of Questions I Can Create:**

**🟢 Beginner Level:**
- Concept definitions
- Basic understanding checks
- Terminology questions
- "What is..." questions

**🟡 Intermediate Level:**
- Application questions
- Problem-solving scenarios
- Code snippets to analyze
- Design decisions

**🔴 Advanced Level:**
- Complex scenarios
- Edge cases
- Optimization challenges
- Integration problems

**Assessment Formats:**
✓ Multiple choice questions
✓ True/False with explanations
✓ Short answer problems
✓ Code review exercises
✓ Design case studies
✓ Performance optimization challenges

**How to Request:**
- "Create 5 quiz questions about [topic]"
- "Give me practice problems for [concept]"
- "Test my knowledge on [subject]"
- "Create an intermediate-level quiz"
- "Give me an exam-style question"

**I'll provide:**
1. Clear questions
2. Multiple correct answers if applicable
3. Detailed explanations
4. Learning resources
5. Follow-up challenges

**Ready to test your knowledge? Ask me for specific questions!**`;
    }

    // Enhanced: Handle project/assignment help
    if (q.includes("project") || q.includes("assignment") || q.includes("practical") || q.includes("example") || q.includes("help me")) {
        return `## Project & Assignment Guidance 🚀

I'm here to help you succeed with your project work!

**Pre-Project Phase:**
✓ Break down requirements
✓ Create implementation plan
✓ Set up architecture
✓ List dependencies

**During Development:**
✓ Architecture guidance
✓ Best practices tips
✓ Code structure advice
✓ Performance optimization
✓ Error handling patterns

**Completion & Review:**
✓ Code quality checks
✓ Testing strategies
✓ Documentation help
✓ Refactoring suggestions
✓ Performance analysis

**I Can Help With:**

**📝 Understanding Requirements**
- Parse complex specs
- Identify edge cases
- Define success criteria

**🏗️ Design & Architecture**
- Choose right patterns
- Structure your project
- Plan database/API design

**💻 Implementation**
- Step-by-step coding guidance
- Best practices
- Common pitfall avoidance
- Debugging assistance

**🧪 Testing & Optimization**
- Test case ideas
- Performance tuning
- Error handling

**Types of Questions:**
- "Help me analyze this requirement"
- "How should I structure this project?"
- "What's the best approach for..."
- "Debug this error: ..."
- "How can I optimize this?"
- "Review this code snippet"

**What specific project or assignment are you working on? Tell me the details and I'll guide you!**`;
    }

    // Enhanced: Handle comparison questions
    if (q.includes("difference") || q.includes("vs") || q.includes("compare") || q.includes("different")) {
        return `## Comparison & Contrasting 🔄

Excellent question! Understanding differences helps you choose the right tool.

**I Compare:**
- Concepts and approaches
- Tools and technologies
- Programming patterns
- Database systems
- Frameworks and libraries
- Methodologies

**Comparison Framework I Use:**

**1️⃣ Definition**
- What each thing is
- Purpose and use case
- When to use each

**2️⃣ Similarities**
- Common ground
- Shared principles
- Overlap

**3️⃣ Key Differences**
- Technical distinctions
- Performance characteristics
- Learning curve
- Use case fit

**4️⃣ Trade-offs**
- Pros of each
- Cons to consider
- Performance impact
- Complexity factor

**5️⃣ When to Use**
- Best scenarios for each
- Real-world examples
- Recommendations

**6️⃣ Practical Examples**
- Code samples if applicable
- Implementation comparison
- Output differences

**Ask Me To Compare:**
✓ "X vs Y - what's different?"
✓ "When should I use X instead of Y?"
✓ "Compare approach A and B"
✓ "Which is better for [scenario]?"
✓ "What are pros/cons of each?"

**What concepts, tools, or approaches would you like me to compare?**`;
    }

    // Default: Interactive help menu
    return `## How Can I Help You Master ${courseName}? 🎓

I'm your AI tutor! Here's what I can do for you:

**📚 Explain Concepts**
Ask me to explain any topic. I'll break it down simply and provide examples.
*Example: "Explain hooks in React"*

**❓ Answer Questions**
- What is...?
- How does...?
- Why do we...?
- What's the difference between X and Y?

**✍️ Help with Practice**
- Create quiz questions
- Generate practice problems
- Provide coding challenges
- Review your understanding

**🔧 Guide Your Projects**
- Help you understand requirements
- Design your architecture
- Guide implementation
- Debug issues
- Optimize solutions

**💡 Smart Suggestions**
- Best practices
- Common pitfalls to avoid
- Performance tips
- Code organization

**📖 Summarization**
- Summarize lessons
- Create study notes
- Highlight key points
- Build revision guides

**Quick Tips:**
✓ Be specific in your questions
✓ Ask follow-ups for clarity
✓ Request examples
✓ Ask "why" to understand better

**What would you like help with?**`;
};


const AITutor = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            try {
                setCoursesLoading(true);
                const res = await dashboardAPI.getEnrolledCourses();
                const enrolled = Array.isArray(res?.data) ? res.data : [];
                setEnrolledCourses(enrolled);
            } catch (err) {
                console.error("Error fetching enrolled courses:", err);
                setEnrolledCourses([]);
            } finally {
                setCoursesLoading(false);
            }
        };
        if (user?.id) {
            fetchEnrolledCourses();
        }
    }, [user?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSelectCourse = (course: any) => {
        setSelectedCourse(course);
        setMessages([
            {
                id: "welcome",
                role: "ai",
                content: `Welcome to AI Tutoring for **${course.title}**! 👋\n\nI'm your personal AI tutor for this course. I can help you with:\n\n📚 **Learning Tutorials**\n• Explain course concepts in different ways\n• Break down complex topics step-by-step\n• Provide real-world examples and analogies\n\n📝 **Study Materials**\n• Create summaries of lessons and modules\n• Generate practice questions and quizzes\n• Build revision notes for exams\n\n🔧 **Assignment & Project Help**\n• Guide you through projects and assignments\n• Help you understand requirements\n• Provide feedback on your work\n\n💡 **Ask me anything about this course!** For example:\n• "Explain the concept of..."\n• "Summarize module 3"\n• "Create practice questions for..."\n• "Help me with the project..."\n\nWhat would you like to learn today?`,
                timestamp: new Date(),
            },
        ]);
    };

    const handleChangeCourse = () => {
        setSelectedCourse(null);
        setMessages([]);
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping || !selectedCourse) return;
        const userMsg: ChatMessage = {
            id: `u${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const result = await aiAPI.askTutor(
                userMsg.content,
                selectedCourse.description,
                Number(selectedCourse.id)
            );
            const aiResponse =
                result?.answer ||
                result?.data?.answer ||
                result?.message ||
                "No response received from AI";

            const aiMsg: ChatMessage = {
                id: `ai${Date.now()}`,
                role: "ai",
                content: String(aiResponse),
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            console.error("AI Tutor request failed:", error);
            const errorMsg: ChatMessage = {
                id: `ai${Date.now()}`,
                role: "ai",
                content: `Sorry, I encountered an error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }. Please try again.`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    // ─── Course Selection Screen ──────────────────────────────
    if (!selectedCourse) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">AI Tutor</h1>
                    <p className="text-muted-foreground text-lg">Choose from your enrolled courses to get personalized AI tutoring</p>
                </div>

                {/* Loading State */}
                {coursesLoading && (
                    <div className="flex items-center justify-center min-h-[300px]">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* No Courses State */}
                {!coursesLoading && enrolledCourses.length === 0 && (
                    <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                        <Link to="/courses" className="text-accent hover:underline font-medium">
                            Explore courses →
                        </Link>
                    </div>
                )}

                {/* Course Grid */}
                {!coursesLoading && enrolledCourses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enrolledCourses.map((course: any, index: number) => (
                            <motion.button
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                                onClick={() => handleSelectCourse(course)}
                                className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                            >
                                {/* Course Thumbnail */}
                                <div className="relative h-36 overflow-hidden">
                                    <img
                                        src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop"}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                                            {course.category || "Course"}
                                        </span>
                                    </div>
                                </div>

                                {/* Course Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">{course.instructor_name || course.instructor || "Instructor"}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>{course.modules || course.lessons || 0} modules</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            <span>{course.progress || 0}%</span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-3">
                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                            <span>Progress</span>
                                            <span>{course.progress || 0}%</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                                                style={{ width: `${course.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </motion.div>
        );
    }

    // ─── Chat Screen ──────────────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
            {/* Header with selected course */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">AI Tutor</h1>
                        <p className="text-xs text-muted-foreground">Powered by AI · Ask anything about your courses</p>
                    </div>
                </div>
                {/* Selected Course Badge */}
                <button
                    onClick={handleChangeCourse}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors group"
                >
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary max-w-[200px] truncate">{selectedCourse.title}</span>
                    <X className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-card rounded-xl border border-border shadow-card p-4 space-y-4 mb-4">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.role === "ai" && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[75%] rounded-xl p-4 ${msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 border border-border text-foreground"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.role === "ai" ? formatMarkdown(msg.content) : msg.content}
                            </p>
                            <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="w-4 h-4 text-accent" />
                            </div>
                        )}
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 1 && (
                <div className="flex-shrink-0 mb-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Try asking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {generateSuggestedQuestions(selectedCourse.title).map((sq, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(sq)}
                                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-foreground"
                            >
                                {sq}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0 flex gap-2">
                <div className="flex-1 relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Ask your AI tutor anything..."
                        className="pl-10 h-11"
                        disabled={isTyping}
                    />
                </div>
                <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="h-11 px-4">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
};

export default AITutor;
