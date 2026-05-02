// API service functions for LMS frontend
// In dev, use relative /api (proxied by Vite to backend); in prod use full URL.
// If VITE_API_URL is "http://localhost:3001" (no /api), requests would go to /auth/... → 404.
// We append /api only for origin-style URLs; leave custom paths unchanged.
function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    return import.meta.env.DEV ? "/api" : "/api";
  }
  const base = raw.replace(/\/$/, "");
  if (base.endsWith("/api")) return base;
  try {
    const parsed = new URL(base.includes("://") ? base : `http://${base}`);
    const path = parsed.pathname.replace(/\/$/, "") || "";
    if (path && path !== "/") return base;
  } catch {
    /* fall through */
  }
  return `${base}/api`;
}

const API_BASE_URL = getApiBaseUrl();

// Helper function to get auth token (checks both localStorage and sessionStorage for Remember me)
const getAuthToken = (): string | null => {
  try {
    const remember = localStorage.getItem('lms_remember');
    if (remember === '1') {
      return localStorage.getItem('lms_token') || sessionStorage.getItem('lms_token');
    }
    if (remember === '0') {
      return sessionStorage.getItem('lms_token') || localStorage.getItem('lms_token');
    }
    // Fallback for older sessions that may not have lms_remember set yet.
    return sessionStorage.getItem('lms_token') || localStorage.getItem('lms_token');
  } catch {
    return localStorage.getItem('lms_token') || sessionStorage.getItem('lms_token');
  }
};

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const baseMsg = errorData.message || `HTTP ${response.status}`;
      const message =
        errorData.path && typeof errorData.path === "string"
          ? `${baseMsg} — ${errorData.path}`
          : baseMsg;
      // If account is deactivated, clear auth and redirect to login
      if (response.status === 401 && (message.includes('deactivated') || message.includes('Deactivated'))) {
        localStorage.removeItem('lms_token');
        sessionStorage.removeItem('lms_token');
        localStorage.removeItem('teachsmart_user');
        sessionStorage.removeItem('teachsmart_user');
        window.dispatchEvent(new CustomEvent('auth:sessionExpired', { detail: { message } }));
        window.location.href = '/login';
      }
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, confirmPassword: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword }),
    }),

  firebaseToken: (idToken: string, name?: string, password?: string) =>
    apiRequest('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken, name, password }),
    }),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  getProfile: () => apiRequest('/auth/profile'),

  updateProfile: (data: { name?: string; targetJobRoleId?: string | null }) =>
    apiRequest('/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, target_job_role_id: data.targetJobRoleId }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  createInstructor: (name: string, email: string, password: string) =>
    apiRequest('/auth/admin/instructor', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getAllUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.search) searchParams.append('search', params.search);

    return apiRequest(`/auth/admin/users?${searchParams.toString()}`);
  },

  getInstructors: () => apiRequest('/auth/admin/instructors'),

  toggleUserStatus: (userId: number) =>
    apiRequest(`/auth/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
    }),

  updateUserRole: (userId: number, role: string) =>
    apiRequest(`/auth/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  searchUsers: (query: string) =>
    apiRequest(`/auth/search?query=${encodeURIComponent(query)}`),
};

// Course API functions
export const courseAPI = {
  getAllCourses: (params?: { page?: number; limit?: number; category?: string; search?: string; instructor_id?: number; is_active?: boolean; include_inactive?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.instructor_id != null) searchParams.append('instructor_id', params.instructor_id.toString());
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.include_inactive !== undefined) searchParams.append('include_inactive', params.include_inactive.toString());

    return apiRequest(`/courses?${searchParams.toString()}`);
  },

  getCourseById: (id: string) => apiRequest(`/courses/${id}`),

  createCourse: (courseData: {
    title: string;
    description?: string;
    instructor_id?: number;
    instructor_name?: string;
    category: string;
    thumbnail?: string;
    duration?: string;
    price?: number;
    level?: string;
  }) => apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  }),

  updateCourse: (id: string, updates: any) => apiRequest(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  assignInstructor: (courseId: string, instructorId: number | null) =>
    apiRequest(`/courses/${courseId}/assign-instructor`, {
      method: 'PATCH',
      body: JSON.stringify({ instructor_id: instructorId }),
    }),

  approveCourse: (courseId: string, status: 'approved' | 'rejected') =>
    apiRequest(`/courses/${courseId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  toggleCourseStatus: (courseId: string) =>
    apiRequest(`/courses/${courseId}/toggle-status`, {
      method: 'PATCH',
    }),

  publishCourse: (courseId: string) =>
    apiRequest(`/courses/${courseId}/publish`, { method: 'PATCH' }),

  unpublishCourse: (courseId: string) =>
    apiRequest(`/courses/${courseId}/unpublish`, { method: 'PATCH' }),

  enrollInCourse: (courseId: string) =>
    apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' }),

  getCategories: () => apiRequest('/courses/categories/all'),
};

// Enrollment API functions (student progress)
export const enrollmentAPI = {
  getEnrollmentByCourse: (courseId: string) =>
    apiRequest(`/enrollments/me/${courseId}`),

  getEnrollmentsByCourse: (courseId: string) =>
    apiRequest(`/enrollments/course/${courseId}`),

  updateProgress: (courseId: string, completedLessons: string[], totalModules: number) =>
    apiRequest(`/enrollments/me/${courseId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ completed_lessons: completedLessons, total_modules: totalModules }),
    }),
};

// Module API functions
export const moduleAPI = {
  getModulesByCourse: (courseId: string) => apiRequest(`/modules/course/${courseId}`),
  createModule: (courseId: string, data: { title: string; description?: string; pdf_url?: string; order_index?: number }) =>
    apiRequest(`/modules/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateModule: (moduleId: string, data: { title?: string; description?: string; pdf_url?: string; order_index?: number }) =>
    apiRequest(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteModule: (moduleId: string) =>
    apiRequest(`/modules/${moduleId}`, { method: 'DELETE' }),

  createLesson: (moduleId: string, data: { title: string; content?: string; video_url?: string; pdf_url?: string; duration?: number; is_free?: boolean; order_index?: number }) =>
    apiRequest(`/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLesson: (lessonId: string, data: { title?: string; content?: string; video_url?: string; pdf_url?: string; duration?: number; is_free?: boolean; order_index?: number }) =>
    apiRequest(`/modules/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLesson: (lessonId: string) =>
    apiRequest(`/modules/lessons/${lessonId}`, { method: 'DELETE' }),
};

export const uploadAPI = {
  uploadVideo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('video', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return { url: data.data?.url ?? data.url };
  },
  uploadPdf: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('pdf', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/upload/pdf`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return { url: data.data?.url ?? data.url };
  },
};

// Discussion API functions
export const discussionAPI = {
  getPosts: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.append('limit', params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    return apiRequest(`/discussions${qs.toString() ? `?${qs}` : ''}`);
  },
  createPost: (title: string, content: string) =>
    apiRequest('/discussions', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),
  getPostDetails: (id: number) => apiRequest(`/discussions/${id}`),
  toggleLike: (id: number) =>
    apiRequest(`/discussions/${id}/like`, { method: 'POST' }),
  createReply: (postId: number, content: string, parentReplyId?: number | null) =>
    apiRequest(`/discussions/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_reply_id: parentReplyId ?? null }),
    }),
  togglePin: (id: number) =>
    apiRequest(`/discussions/${id}/pin`, { method: 'PATCH' }),
};

// Message API functions
export const messageAPI = {
  getConversations: () => apiRequest('/messages/conversations'),

  getMessages: (conversationId: number) =>
    apiRequest(`/messages/conversations/${conversationId}/messages`),

  sendMessage: (data: { conversationId?: number; recipientId?: number; content: string }) =>
    apiRequest('/messages/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markAsRead: (conversationId: number) =>
    apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
    }),
};

// Assignment API functions
export const assignmentAPI = {
  list: (params?: { courseId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.courseId) searchParams.append('courseId', params.courseId);
    const qs = searchParams.toString();
    return apiRequest(`/assignments${qs ? `?${qs}` : ''}`);
  },

  listSubmissions: () => apiRequest('/assignments/submissions'),

  listMySubmissions: () => apiRequest('/assignments/my-submissions'),

  getById: (id: string | number) => apiRequest(`/assignments/${id}`),

  publish: (id: string | number) =>
    apiRequest(`/assignments/${id}/publish`, { method: 'PATCH' }),

  create: (data: {
    course_id: number;
    title: string;
    description?: string;
    due_date: string;
    max_points?: number;
    questions?: Array<{
      id: string;
      type: 'mcq' | 'short-answer' | 'long-answer';
      text: string;
      options?: string[];
      correctOption?: number;
      points: number;
    }>;
  }) =>
    apiRequest('/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submit: (assignmentId: string | number, content: string) =>
    apiRequest(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getSubmission: (assignmentId: string | number) =>
    apiRequest(`/assignments/${assignmentId}/submission`),

  gradeSubmission: (submissionId: number, grade: number, feedback?: string) =>
    apiRequest(`/assignments/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ grade, feedback }),
    }),
};

// Quiz API functions
export const quizAPI = {
  list: (params?: { courseId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.courseId) searchParams.append('courseId', params.courseId);
    const qs = searchParams.toString();
    return apiRequest(`/quizzes${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string | number) => apiRequest(`/quizzes/${id}`),

  create: (data: {
    course_id: number;
    title: string;
    description?: string;
    due_date?: string | null;
    time_limit?: number;
    total_points?: number;
    passing_score?: number;
  }) =>
    apiRequest('/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string | number, data: Partial<{
    title: string;
    description: string;
    due_date: string | null;
    time_limit: number;
    total_points: number;
    passing_score: number;
    is_active: boolean;
    available_from: string | null;
    available_until: string | null;
    questions_json: unknown;
  }>) =>
    apiRequest(`/quizzes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string | number) =>
    apiRequest(`/quizzes/${id}`, { method: 'DELETE' }),

  /** Student: exam shell + questions (no correct answers) */
  getExam: (quizId: string | number) => apiRequest(`/quizzes/${quizId}/exam`),

  /** Student: begin attempt; timer starts server-side */
  startExam: (quizId: string | number, tabLockId?: string) =>
    apiRequest(`/quizzes/${quizId}/start`, {
      method: 'POST',
      body: JSON.stringify({ tab_lock_id: tabLockId ?? null }),
    }),
};

/** Quiz attempt autosave / submit / proctor (student) */
export const quizAttemptAPI = {
  /** Get all submitted quiz attempts for the current user */
  listMy: () => apiRequest('/quiz-attempts/my'),

  save: (attemptId: string | number, answers: Record<string, number>) =>
    apiRequest(`/quiz-attempts/${attemptId}/save`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    }),

  submit: (attemptId: string | number, answers?: Record<string, number>) =>
    apiRequest(`/quiz-attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: answers ?? {} }),
    }),

  log: (attemptId: string | number, type: string, detail?: string) =>
    apiRequest(`/quiz-attempts/${attemptId}/log`, {
      method: 'POST',
      body: JSON.stringify({ type, detail }),
    }),

  uploadProctorFrame: async (attemptId: string | number, blob: Blob) => {
    const fd = new FormData();
    fd.append('frame', blob, 'frame.jpg');
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/proctor-frame`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
};

// Dashboard API functions
export const dashboardAPI = {
  getEnrolledCourses: () => apiRequest('/dashboard/student/enrolled-courses'),

  getStudentStats: async () => {
    try {
      const res = await apiRequest('/dashboard/student');
      const data = res?.data ?? res;
      return {
        enrolledCourses: data?.enrolledCourses ?? 0,
        inProgress: data?.inProgress ?? 0,
        completed: data?.completed ?? 0,
        overallProgress: data?.overallProgress ?? 0,
        certificates: data?.certificates ?? 0,
      };
    } catch (error) {
      console.error('Failed to fetch student stats:', error);
      return { enrolledCourses: 0, inProgress: 0, completed: 0, overallProgress: 0, certificates: 0 };
    }
  },

  getInstructorStats: async () => {
    try {
      const res = await apiRequest('/dashboard/instructor');
      const data = res?.data ?? res;
      return {
        totalCourses: data?.totalCourses ?? 0,
        activeCourses: data?.activeCourses ?? 0,
        totalStudents: data?.totalStudents ?? 0,
        avgProgress: data?.avgProgress ?? 0,
      };
    } catch (error) {
      console.error('Failed to fetch instructor stats:', error);
      return { totalCourses: 0, activeCourses: 0, totalStudents: 0, avgProgress: 0 };
    }
  },

  getAdminStats: async () => {
    try {
      const res = await apiRequest('/dashboard/admin');
      const data = res?.data ?? res;
      return {
        totalUsers: data?.totalUsers ?? 0,
        activeCourses: data?.activeCourses ?? 0,
        totalCourses: data?.totalCourses ?? 0,
        activeUsers: data?.activeUsers ?? 0,
      };
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      return { totalUsers: 0, activeCourses: 0, totalCourses: 0, activeUsers: 0 };
    }
  },
};

// Support tickets / issues (authenticated users submit; admins can list)
export const supportAPI = {
  submitTicket: (body: { subject: string; category: string; message: string }) =>
    apiRequest('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Same as submitTicket — POST /api/support/issues */
  submitIssue: (body: { subject: string; category: string; message: string }) =>
    apiRequest('/support/issues', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listTickets: (params?: { limit?: number }) => {
    const limit = params?.limit ?? 10;
    return apiRequest(`/support/tickets?limit=${encodeURIComponent(String(limit))}`).then((res) => {
      const data = res?.data ?? res;
      return data?.tickets ?? [];
    });
  },

  /** Same as listTickets — GET /api/support/issues (admin) */
  listIssues: (params?: { limit?: number }) => {
    const limit = params?.limit ?? 10;
    return apiRequest(`/support/issues?limit=${encodeURIComponent(String(limit))}`).then((res) => {
      const data = res?.data ?? res;
      return data?.tickets ?? [];
    });
  },
};

// AI Services (Summarizer, Tutor, etc.)
export const aiAPI = {
  /**
   * Summarize content using AI
   * @param content Text content to summarize
   * @param type Type of content ('text' or 'pdf')
   * @param courseId Optional course ID
   * @param lessonId Optional lesson ID
   */
  summarizeContent: (
    content: string,
    type: 'text' | 'pdf' = 'text',
    courseId?: number,
    lessonId?: number
  ) =>
    apiRequest('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ content, type, courseId, lessonId, saveToDb: true }),
    }).then((res) => {
      const data = res?.data ?? res;
      const summaryId = res?.summaryId;
      return { ...data, summaryId };
    }),

  /**
   * Ask AI Tutor a question
   * @param question The question to ask
   * @param context Optional context about the lesson/topic
   * @param courseId Optional course ID for context
   */
  askTutor: (question: string, context?: string, courseId?: number) =>
    apiRequest('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question, context, courseId }),
    }).then((res) => {
      const data = res?.data ?? res;
      return data;
    }),

  /**
   * Check if AI service is available and configured
   */
  checkHealth: () =>
    apiRequest('/ai/health').then((res) => {
      const data = res?.data ?? res;
      return data;
    }),

  /**
   * Get all summaries for the user
   */
  getSummaries: (limit: number = 20, offset: number = 0) =>
    apiRequest(`/ai/summaries?limit=${limit}&offset=${offset}`).then((res) => {
      console.log("[API] getSummaries raw response:", res);
      const data = res?.data ?? res;
      const rawPagination = res?.pagination || { limit, offset, total: 0 };
      const summaries = Array.isArray(data) ? data : data?.data ?? [];
      const hasMore = (rawPagination.offset + rawPagination.limit) < rawPagination.total;
      const pagination = { ...rawPagination, hasMore };
      console.log("[API] getSummaries processed - summaries:", summaries?.length, "pagination:", pagination);
      return { summaries, pagination };
    }).catch((err) => {
      console.error("[API] getSummaries error:", err);
      throw err;
    }),

  /**
   * Get a specific summary by ID
   */
  getSummary: (summaryId: number) =>
    apiRequest(`/ai/summaries/${summaryId}`).then((res) => {
      const data = res?.data ?? res;
      return data;
    }),

  /**
   * Update a saved summary
   */
  updateSummary: (
    summaryId: number,
    updates: {
      title?: string;
      shortSummary?: string;
      studyNotes?: string;
      courseId?: number;
      lessonId?: number;
    }
  ) =>
    apiRequest(`/ai/summaries/${summaryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then((res) => {
      const data = res?.data ?? res;
      return data;
    }),

  /**
   * Delete a summary
   */
  deleteSummary: (summaryId: number) =>
    apiRequest(`/ai/summaries/${summaryId}`, {
      method: 'DELETE',
    }).then((res) => res),

  /**
   * Get user's summarization statistics
   */
  getStats: () =>
    apiRequest('/ai/stats').then((res) => {
      const data = res?.data ?? res;
      return data;
    }),

  /**
   * Generate quiz questions using OpenAI
   */
  generateQuiz: (content: string, topicName: string, numberOfQuestions: number) =>
    apiRequest('/ai/generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ content, topicName, numberOfQuestions }),
    }).then((res) => {
      const data = res?.data ?? res;
      return data;
    }),
};

export const announcementAPI = {
  list: (courseId: string) => apiRequest(`/announcements/course/${courseId}`),

  create: (courseId: string, data: { title: string; content: string; type?: string }) =>
    apiRequest(`/announcements/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) => apiRequest(`/announcements/${id}`, { method: 'DELETE' }),
};