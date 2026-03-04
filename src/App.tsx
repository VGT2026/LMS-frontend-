import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AssignmentProvider } from "@/contexts/AssignmentContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CareerRoadmap from "./pages/CareerRoadmap";
import Quiz from "./pages/Quiz";
import Assignments from "./pages/Assignments";
import AssignmentDetail from "./pages/AssignmentDetail";
import Discussions from "./pages/Discussions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCourses from "./pages/AdminCourses";
import AdminUsers from "./pages/AdminUsers";
import AdminCreateCourse from "./pages/AdminCreateCourse";
import AdminReports from "./pages/AdminReports";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourses from "./pages/InstructorCourses";
import InstructorCourseDetail from "./pages/InstructorCourseDetail";
import InstructorAssignments from "./pages/InstructorAssignments";
import InstructorStudents from "./pages/InstructorStudents";
import Settings from "./pages/Settings";
import Certificates from "./pages/Certificates";
import CalendarPage from "./pages/CalendarPage";
import GradesPage from "./pages/GradesPage";
import MessagesPage from "./pages/MessagesPage";
import SupportPage from "./pages/SupportPage";
import AITutor from "./pages/AITutor";
import AIQuizGenerator from "./pages/AIQuizGenerator";
import ContentSummarizer from "./pages/ContentSummarizer";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
      <Route path="/course/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
      <Route path="/roadmap" element={<ProtectedRoute><CareerRoadmap /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
      <Route path="/assignment/:id" element={<ProtectedRoute><AssignmentDetail /></ProtectedRoute>} />
      <Route path="/discussions" element={<ProtectedRoute><Discussions /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
      <Route path="/ai-summarizer" element={<ProtectedRoute><ContentSummarizer /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute><AdminCourses /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/create-course" element={<ProtectedRoute><AdminCreateCourse /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
      <Route path="/instructor" element={<ProtectedRoute><InstructorDashboard /></ProtectedRoute>} />
      <Route path="/instructor/courses" element={<ProtectedRoute><InstructorCourses /></ProtectedRoute>} />
      <Route path="/instructor/course/:id" element={<ProtectedRoute><InstructorCourseDetail /></ProtectedRoute>} />
      <Route path="/instructor/assignments" element={<ProtectedRoute><InstructorAssignments /></ProtectedRoute>} />
      <Route path="/instructor/students" element={<ProtectedRoute><InstructorStudents /></ProtectedRoute>} />
      <Route path="/instructor/discussions" element={<ProtectedRoute><Discussions /></ProtectedRoute>} />
      <Route path="/instructor/ai-quiz" element={<ProtectedRoute><AIQuizGenerator /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AssignmentProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AssignmentProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
