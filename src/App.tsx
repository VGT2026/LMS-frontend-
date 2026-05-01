import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AssignmentProvider } from "@/contexts/AssignmentContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CareerRoadmap from "./pages/CareerRoadmap";
import Quiz from "./pages/Quiz";
import ExamSession from "./pages/ExamSession";
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
import InstructorCreateCourse from "./pages/InstructorCreateCourse";
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
import SavedSummaries from "./pages/SavedSummaries";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ReactNode } from "react";

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return (
    <AppLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppLayout>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getDefaultRedirect = () => {
    if (!isAuthenticated || !user) return "/login";
    if (user.role === "admin") return "/admin";
    if (user.role === "instructor") return "/instructor";
    return "/dashboard";
  };

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/courses/my-enrolled" element={<ProtectedRoute><Courses view="my-enrolled" /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
      <Route path="/course/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
      <Route path="/roadmap" element={<ProtectedRoute><CareerRoadmap /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
      <Route path="/exam/:quizId" element={<ProtectedRoute><ExamSession /></ProtectedRoute>} />
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
      <Route path="/saved-summaries" element={<ProtectedRoute><SavedSummaries /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/create-course" element={<AdminRoute><AdminCreateCourse /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
      <Route path="/instructor" element={<ProtectedRoute><InstructorDashboard /></ProtectedRoute>} />
      <Route path="/instructor/courses" element={<ProtectedRoute><InstructorCourses /></ProtectedRoute>} />
      <Route path="/instructor/create-course" element={<ProtectedRoute><InstructorCreateCourse /></ProtectedRoute>} />
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
  </ErrorBoundary>
);

export default App;
