import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { assignmentAPI } from "@/services/api";
import { useAuth } from "./AuthContext";

export type QuestionType = "mcq" | "short-answer" | "long-answer";

export interface MCQQuestion {
    id: string;
    type: "mcq";
    text: string;
    options: string[];
    correctOption: number;
    points: number;
}

export interface ShortAnswerQuestion {
    id: string;
    type: "short-answer";
    text: string;
    points: number;
}

export interface LongAnswerQuestion {
    id: string;
    type: "long-answer";
    text: string;
    points: number;
}

export type Question = MCQQuestion | ShortAnswerQuestion | LongAnswerQuestion;

export interface Assignment {
    id: string;
    title: string;
    description: string;
    courseId: string;
    courseTitle: string;
    dueDate: string;
    points: number;
    questions: Question[];
    createdAt: string;
    isPublished?: boolean;
}

interface AssignmentContextType {
    assignments: Assignment[];
    loading: boolean;
    error: string | null;
    refreshAssignments: () => Promise<void>;
    addAssignment: (assignment: Omit<Assignment, "id" | "createdAt">) => Promise<void>;
    getAssignmentById: (id: string) => Promise<Assignment | null>;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

function mapBackendToFrontend(raw: any): Assignment {
    const dueDate = raw.due_date ? (typeof raw.due_date === 'string' ? raw.due_date.split('T')[0] : new Date(raw.due_date).toISOString().split('T')[0]) : '';
    const createdAt = raw.created_at ? (typeof raw.created_at === 'string' ? raw.created_at.split('T')[0] : new Date(raw.created_at).toISOString().split('T')[0]) : '';
    const questions: Question[] = Array.isArray(raw.questions)
        ? raw.questions.map((q: any) => ({
            id: q.id || `q-${Math.random().toString(36).slice(2, 9)}`,
            type: q.type || 'short-answer',
            text: q.text || '',
            options: q.options || [],
            correctOption: q.correctOption ?? 0,
            points: q.points ?? 10,
        }))
        : [];
    return {
        id: String(raw.id),
        title: raw.title || '',
        description: raw.description || '',
        courseId: String(raw.course_id),
        courseTitle: raw.course_title || '',
        dueDate,
        points: Number(raw.max_points ?? 100),
        questions,
        createdAt,
        isPublished: raw.is_published === true || raw.is_published === 1,
    };
}

export const AssignmentProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshAssignments = useCallback(async () => {
        if (!user) {
            setAssignments([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await assignmentAPI.list();
            const data = res?.data !== undefined ? res.data : res;
            const list = Array.isArray(data) ? data : (data?.assignments ?? []);
            setAssignments(list.map(mapBackendToFrontend));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load assignments');
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refreshAssignments();
    }, [refreshAssignments]);

    const getAssignmentById = useCallback(async (id: string): Promise<Assignment | null> => {
        try {
            const res = await assignmentAPI.getById(id);
            const data = res?.data !== undefined ? res.data : res;
            if (!data) return null;
            return mapBackendToFrontend(data);
        } catch {
            return null;
        }
    }, []);

    const addAssignment = useCallback(async (assignment: Omit<Assignment, "id" | "createdAt">) => {
        const totalPoints = assignment.questions.reduce((s, q) => s + q.points, 0);
        const payload = {
            course_id: Number(assignment.courseId),
            title: assignment.title,
            description: assignment.description || undefined,
            due_date: assignment.dueDate,
            max_points: totalPoints,
            questions: assignment.questions.map(q => {
                const base: any = { id: q.id, type: q.type, text: q.text, points: q.points };
                if (q.type === 'mcq') {
                    base.options = q.options;
                    base.correctOption = q.correctOption;
                }
                return base;
            }),
        };
        await assignmentAPI.create(payload);
        await refreshAssignments();
    }, [refreshAssignments]);

    return (
        <AssignmentContext.Provider value={{ assignments, loading, error, refreshAssignments, addAssignment, getAssignmentById }}>
            {children}
        </AssignmentContext.Provider>
    );
};

export const useAssignments = () => {
    const context = useContext(AssignmentContext);
    if (!context) throw new Error("useAssignments must be used within an AssignmentProvider");
    return context;
};
