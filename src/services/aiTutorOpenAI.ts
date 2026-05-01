/**
 * AITutor Frontend - OpenAI Integration
 * This is the updated handleSend function and related code for AITutor.tsx
 * 
 * REPLACE the existing handleSend and related functions in AITutor.tsx with this code
 */

/**
 * Updated handleSend function that calls OpenAI API instead of local generation
 */
const handleSendOpenAI = async () => {
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
    // Call the backend API which will use OpenAI
    const response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("lms_token") || sessionStorage.getItem("lms_token")}`,
      },
      body: JSON.stringify({
        question: userMsg.content,
        context: selectedCourse.description,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data?.data?.answer || "No response received";

    const aiMsg: ChatMessage = {
      id: `ai${Date.now()}`,
      role: "ai",
      content: aiResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
  } catch (error) {
    console.error("[AITutor] Error:", error);

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

/**
 * Function to generate quiz questions using OpenAI
 */
const generateQuizWithOpenAI = async (courseContent: string) => {
  try {
    const response = await fetch("/api/ai/generate-quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("lms_token") || sessionStorage.getItem("lms_token")}`,
      },
      body: JSON.stringify({
        content: courseContent,
        topicName: selectedCourse?.title || "General",
        numberOfQuestions: 5,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate quiz");
    }

    const data = await response.json();
    return data?.data?.questions || [];
  } catch (error) {
    console.error("[Quiz Generation] Error:", error);
    throw error;
  }
};

/**
 * Function to grade an assignment using OpenAI
 */
const gradeAssignmentWithOpenAI = async (
  studentAnswer: string,
  rubric: string,
  assignmentId?: number
) => {
  try {
    const response = await fetch("/api/ai/grade-assignment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("lms_token") || sessionStorage.getItem("lms_token")}`,
      },
      body: JSON.stringify({
        studentAnswer,
        rubric,
        courseContext: selectedCourse?.description,
        assignmentId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to grade assignment");
    }

    const data = await response.json();
    return data?.data || {};
  } catch (error) {
    console.error("[Assignment Grading] Error:", error);
    throw error;
  }
};

/**
 * USAGE IN AITutor.tsx
 * 
 * Replace the existing handleSend function with:
 * 
 * const handleSend = async () => {
 *   if (!input.trim() || isTyping || !selectedCourse) return;
 * 
 *   const userMsg: ChatMessage = {
 *     id: `u${Date.now()}`,
 *     role: "user",
 *     content: input.trim(),
 *     timestamp: new Date(),
 *   };
 * 
 *   setMessages((prev) => [...prev, userMsg]);
 *   setInput("");
 *   setIsTyping(true);
 * 
 *   try {
 *     const response = await fetch("/api/ai/ask", {
 *       method: "POST",
 *       headers: {
 *         "Content-Type": "application/json",
 *         Authorization: `Bearer ${localStorage.getItem("lms_token") || sessionStorage.getItem("lms_token")}`,
 *       },
 *       body: JSON.stringify({
 *         question: userMsg.content,
 *         context: selectedCourse.description,
 *         courseId: selectedCourse.id,
 *         courseTitle: selectedCourse.title,
 *       }),
 *     });
 * 
 *     if (!response.ok) {
 *       const errorData = await response.json();
 *       throw new Error(errorData.message || `HTTP ${response.status}`);
 *     }
 * 
 *     const data = await response.json();
 *     const aiResponse = data?.data?.answer || "No response received";
 * 
 *     const aiMsg: ChatMessage = {
 *       id: `ai${Date.now()}`,
 *       role: "ai",
 *       content: aiResponse,
 *       timestamp: new Date(),
 *     };
 * 
 *     setMessages((prev) => [...prev, aiMsg]);
 *   } catch (error) {
 *     console.error("[AITutor] Error:", error);
 * 
 *     const errorMsg: ChatMessage = {
 *       id: `ai${Date.now()}`,
 *       role: "ai",
 *       content: `Sorry, I encountered an error: ${
 *         error instanceof Error ? error.message : "Unknown error"
 *       }. Please try again.`,
 *       timestamp: new Date(),
 *     };
 * 
 *     setMessages((prev) => [...prev, errorMsg]);
 *   } finally {
 *     setIsTyping(false);
 *   }
 * };
 */
