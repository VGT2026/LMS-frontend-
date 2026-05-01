import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import     {
    ArrowLeft, Users, TrendingUp, BarChart3, PlusCircle, Trash2, Send,
    CheckCircle, ChevronDown, Video, FileText, List, Upload, X, Loader2, Pencil, Globe, AlertCircle, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { courseAPI, moduleAPI, uploadAPI, quizAPI, enrollmentAPI, announcementAPI } from "@/services/api";

const EDIT_WINDOW_DAYS = 15;

const tabs = ["Overview", "Students", "Modules", "Quizzes", "Announcements"];

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

interface LessonItem {
    id: number;
    title: string;
    content?: string;
    video_url?: string;
    pdf_url?: string;
    duration?: number;
    order_index?: number;
}

interface Module {
    id: string;
    title: string;
    description: string;
    order_index: number;
    lessons: number;
    videoFileName: string;
    pdfFileName: string;
    pdfUrl?: string;
    summaryPoints: string[];
    lessonDetails?: LessonItem[];
}

interface Announcement {
    id: string | number;
    title: string;
    content: string;
    date: string;
    author_name?: string;
}

const mapApiModulesToLocal = (mods: { id?: number; title?: string; description?: string; pdf_url?: string; order_index?: number; lessons?: number | { id?: number; title?: string; video_url?: string }[]; lessonDetails?: { id?: number; title?: string; video_url?: string; duration?: number; order_index?: number }[] }[] | null | undefined): Module[] =>
    (Array.isArray(mods) ? mods : []).filter(m => m && (m.id != null || m.title != null)).map((m, idx) => {
        const details: LessonItem[] = (() => {
            if (Array.isArray(m.lessonDetails)) {
                return m.lessonDetails.map((l: any) => ({
                    id: Number(l.id ?? 0),
                    title: String(l.title ?? ""),
                    content: l.content,
                    video_url: l.video_url,
                    pdf_url: l.pdf_url,
                    duration: l.duration,
                    order_index: l.order_index,
                }));
            }
            if (Array.isArray(m.lessons) && typeof m.lessons[0] === "object") {
                return (m.lessons as any[]).map((l: any) => ({
                    id: Number(l.id ?? 0),
                    title: String(l.title ?? ""),
                    content: l.content,
                    video_url: l.video_url,
                    pdf_url: l.pdf_url,
                    duration: l.duration,
                    order_index: l.order_index,
                }));
            }
            return [];
        })();
        const hasVideo = details.some((l) => l?.video_url);
        const pdfUrl = (m as any).pdf_url;
        const lessonCount = details.length > 0 ? details.length : (typeof m.lessons === "number" ? m.lessons : 0);
        return {
            id: String(m.id ?? ""),
            title: String(m.title ?? ""),
            description: m.description || `Comprehensive coverage of ${m.title} concepts and practical exercises.`,
            order_index: typeof (m as any).order_index === "number" ? (m as any).order_index : idx,
            lessons: lessonCount,
            videoFileName: hasVideo ? "Video" : "",
            pdfFileName: pdfUrl ? (pdfUrl.split("/").pop() || "PDF") : "",
            pdfUrl: pdfUrl || undefined,
            summaryPoints: [
                `Introduction to ${m.title}`,
                `Core concepts and fundamentals`,
                `Hands-on practice exercises`,
            ],
            lessonDetails: details,
        };
    });

const InstructorCourseDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [course, setCourse] = useState<{
        id: string;
        title: string;
        category: string;
        description: string;
        thumbnail: string;
        status: "active" | "draft";
        approval_status?: "pending" | "approved" | "rejected";
        created_at?: string;
        studentCount: number;
        avgProgress: number;
        avgGrade: number;
    } | null>(null);
    const [description, setDescription] = useState("");
    const [descEditing, setDescEditing] = useState(false);
    const [savingDesc, setSavingDesc] = useState(false);
    const [modules, setModules] = useState<Module[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [expandedModId, setExpandedModId] = useState<string | null>(null);

    const [showModForm, setShowModForm] = useState(false);
    const [newModTitle, setNewModTitle] = useState("");
    const [newModDesc, setNewModDesc] = useState("");
    const [newModLessons, setNewModLessons] = useState("3");
    const [newModVideo, setNewModVideo] = useState<File | null>(null);
    const [newModVideoUrl, setNewModVideoUrl] = useState("");
    const [newModPdf, setNewModPdf] = useState<File | null>(null);
    const [newModSummary, setNewModSummary] = useState<string[]>([""]);
    const [addingModule, setAddingModule] = useState(false);

    const [editingModId, setEditingModId] = useState<string | null>(null);
    const [edModTitle, setEdModTitle] = useState("");
    const [edModDesc, setEdModDesc] = useState("");
    const [edModOrderIndex, setEdModOrderIndex] = useState(0);
    const [edModLessons, setEdModLessons] = useState("3");
    const [edModVideo, setEdModVideo] = useState<File | null>(null);
    const [edModVideoUrl, setEdModVideoUrl] = useState("");
    const [edModPdf, setEdModPdf] = useState<File | null>(null);
    const [edModSummary, setEdModSummary] = useState<string[]>([""]);
    const [updatingModule, setUpdatingModule] = useState(false);

    const [annTitle, setAnnTitle] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [postingAnn, setPostingAnn] = useState(false);
    const [deletingAnnId, setDeletingAnnId] = useState<string | number | null>(null);
    const [students, setStudents] = useState<{ id: number; user_id: number; user_name: string; user_email: string; progress_percentage: number; enrolled_at: string; status: string }[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [quizzes, setQuizzes] = useState<{ id: number; title: string; due_date?: string | null; course_title?: string; is_active?: boolean }[]>([]);
    const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDueDate, setQuizDueDate] = useState("");
    const [addingQuiz, setAddingQuiz] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get("tab");
        return tab && ["Overview", "Students", "Modules", "Quizzes", "Announcements"].includes(tab) ? tab : "Modules";
    });
    const [publishing, setPublishing] = useState(false);

    const [addLessonModId, setAddLessonModId] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState("");
    const [newLessonVideoUrl, setNewLessonVideoUrl] = useState("");
    const [newLessonVideoFile, setNewLessonVideoFile] = useState<File | null>(null);
    const [newLessonPdfFile, setNewLessonPdfFile] = useState<File | null>(null);
    const [newLessonContent, setNewLessonContent] = useState("");
    const [newLessonDuration, setNewLessonDuration] = useState("");
    const [newLessonOrder, setNewLessonOrder] = useState(0);
    const [newLessonSummary, setNewLessonSummary] = useState<string[]>([""]);
    const [addingLesson, setAddingLesson] = useState(false);

    const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
    const [edLessonTitle, setEdLessonTitle] = useState("");
    const [edLessonVideoUrl, setEdLessonVideoUrl] = useState("");
    const [edLessonVideoFile, setEdLessonVideoFile] = useState<File | null>(null);
    const [edLessonPdfFile, setEdLessonPdfFile] = useState<File | null>(null);
    const [edLessonContent, setEdLessonContent] = useState("");
    const [edLessonDuration, setEdLessonDuration] = useState("");
    const [edLessonOrder, setEdLessonOrder] = useState(0);
    const [edLessonSummary, setEdLessonSummary] = useState<string[]>([""]);
    const [updatingLesson, setUpdatingLesson] = useState(false);
    const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);

    const isDraft = course?.status === "draft";
    const isCourseApproved = course?.approval_status === "approved";
    const daysSinceCreation = course?.created_at ? (Date.now() - new Date(course.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
    const canEditWithinWindow = user?.role === "admin" || daysSinceCreation <= EDIT_WINDOW_DAYS;
    const canEditContent = isCourseApproved && canEditWithinWindow;

    const refetchCourse = async () => {
        if (!id) return;
        try {
            const [courseRes, modsRes] = await Promise.all([
                courseAPI.getCourseById(id),
                moduleAPI.getModulesByCourse(id).catch(() => null),
            ]);
            const d = courseRes?.data ?? courseRes?.course ?? courseRes;
            const modsFromCourse = d?.modules;
            const modsFromApi = modsRes?.data ?? modsRes;
            const modsToUse = Array.isArray(modsFromApi) && modsFromApi.length > 0 ? modsFromApi : modsFromCourse;
            if (modsToUse) setModules(mapApiModulesToLocal(modsToUse));
            if (d) {
                setCourse((prev) => prev ? { ...prev, approval_status: d.approval_status || "pending" } : prev);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError("Invalid course ID");
            return;
        }
        const fetchCourse = async () => {
            try {
                setLoading(true);
                setError(null);
                const [courseRes, modsRes] = await Promise.all([
                    courseAPI.getCourseById(id),
                    moduleAPI.getModulesByCourse(id).catch(() => null),
                ]);
                const d = courseRes?.data ?? courseRes?.course ?? courseRes;
                if (!d || typeof d !== "object") {
                    setError("Course not found");
                    setCourse(null);
                    return;
                }
                const status: "active" | "draft" = (d.is_active === true || d.is_active === 1) ? "active" : "draft";
                const c = {
                    id: String(d.id),
                    title: String(d.title ?? ""),
                    category: String(d.category ?? "Development"),
                    description: String(d.description ?? ""),
                    thumbnail: String(d.thumbnail || DEFAULT_THUMBNAIL),
                    status,
                    approval_status: d.approval_status || "pending",
                    created_at: d.created_at,
                    studentCount: Number(d.students ?? d.enrolledCount ?? 0),
                    avgProgress: 0,
                    avgGrade: 0,
                };
                setCourse(c);
                setDescription(c.description);
                const modsFromCourse = d.modules ?? [];
                const modsFromApi = modsRes?.data ?? modsRes;
                const modsToUse = Array.isArray(modsFromApi) && modsFromApi.length > 0 ? modsFromApi : modsFromCourse;
                setModules(mapApiModulesToLocal(modsToUse));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load course");
                setCourse(null);
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [id]);

    const handleAddSummaryPoint = () => setNewModSummary([...newModSummary, ""]);
    const handleUpdateSummaryPoint = (index: number, value: string) => {
        const updated = [...newModSummary];
        updated[index] = value;
        setNewModSummary(updated);
    };
    const handleRemoveSummaryPoint = (index: number) => {
        if (newModSummary.length <= 1) return;
        setNewModSummary(newModSummary.filter((_, i) => i !== index));
    };

    const handleEdAddSummaryPoint = () => setEdModSummary([...edModSummary, ""]);
    const handleEdUpdateSummaryPoint = (index: number, value: string) => {
        const updated = [...edModSummary];
        updated[index] = value;
        setEdModSummary(updated);
    };
    const handleEdRemoveSummaryPoint = (index: number) => {
        if (edModSummary.length <= 1) return;
        setEdModSummary(edModSummary.filter((_, i) => i !== index));
    };

    const handleNewLessonAddSummaryPoint = () => setNewLessonSummary([...newLessonSummary, ""]);
    const handleNewLessonUpdateSummaryPoint = (index: number, value: string) => {
        const updated = [...newLessonSummary];
        updated[index] = value;
        setNewLessonSummary(updated);
    };
    const handleNewLessonRemoveSummaryPoint = (index: number) => {
        if (newLessonSummary.length <= 1) return;
        setNewLessonSummary(newLessonSummary.filter((_, i) => i !== index));
    };
    const handleEdLessonAddSummaryPoint = () => setEdLessonSummary([...edLessonSummary, ""]);
    const handleEdLessonUpdateSummaryPoint = (index: number, value: string) => {
        const updated = [...edLessonSummary];
        updated[index] = value;
        setEdLessonSummary(updated);
    };
    const handleEdLessonRemoveSummaryPoint = (index: number) => {
        if (edLessonSummary.length <= 1) return;
        setEdLessonSummary(edLessonSummary.filter((_, i) => i !== index));
    };

    const handleStartEditModule = (mod: Module) => {
        setEditingModId(mod.id);
        setEdModTitle(mod.title);
        setEdModDesc(mod.description);
        setEdModOrderIndex(mod.order_index ?? modules.findIndex(m => m.id === mod.id));
        setEdModLessons(String(mod.lessons));
        setEdModVideo(null);
        setEdModVideoUrl("");
        setEdModPdf(null);
        setEdModSummary(mod.summaryPoints.length > 0 ? [...mod.summaryPoints] : [""]);
    };

    const handleCancelEditModule = () => {
        setEditingModId(null);
    };

    const handleUpdateModule = async () => {
        if (!edModTitle.trim() || !editingModId) return;
        try {
            setUpdatingModule(true);
            let pdfUrl: string | undefined;
            if (edModPdf) {
                try {
                    const uploadRes = await uploadAPI.uploadPdf(edModPdf);
                    pdfUrl = uploadRes?.url;
                } catch (uploadErr) {
                    toast({ title: "PDF upload failed", description: uploadErr instanceof Error ? uploadErr.message : "Could not upload PDF", variant: "destructive" });
                }
            }
            const modToUpdate = modules.find(m => m.id === editingModId);
            await moduleAPI.updateModule(editingModId, {
                title: edModTitle.trim(),
                description: edModDesc.trim() || undefined,
                pdf_url: pdfUrl ?? modToUpdate?.pdfUrl,
                order_index: Math.max(0, edModOrderIndex),
            });
            let videoUrl: string | undefined;
            if (edModVideo) {
                try {
                    const uploadRes = await uploadAPI.uploadVideo(edModVideo);
                    videoUrl = uploadRes?.url;
                } catch (uploadErr) {
                    toast({ title: "Video upload failed", description: uploadErr instanceof Error ? uploadErr.message : "Could not upload video", variant: "destructive" });
                }
            } else if (edModVideoUrl.trim()) {
                videoUrl = edModVideoUrl.trim();
            }
            if (videoUrl) {
                try {
                    await moduleAPI.createLesson(editingModId, {
                        title: edModTitle.trim() + " - Video Lecture",
                        video_url: videoUrl,
                        content: edModSummary.filter(s => s.trim()).join("\n") || undefined,
                        order_index: 999,
                    });
                } catch (lessonErr) {
                    toast({ title: "Lesson creation failed", description: "Module updated but video could not be added.", variant: "destructive" });
                }
            }
            await refetchCourse();
            setEditingModId(null);
            toast({ title: "Module updated", description: `"${edModTitle}" has been updated.` + (videoUrl ? " Video added." : "") + (pdfUrl ? " PDF added." : "") });
        } catch (err) {
            toast({ title: "Failed to update module", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setUpdatingModule(false);
        }
    };

    const resetModForm = () => {
        setNewModTitle("");
        setNewModDesc("");
        setNewModLessons("3");
        setNewModVideo(null);
        setNewModVideoUrl("");
        setNewModPdf(null);
        setNewModSummary([""]);
        setShowModForm(false);
    };

    const handleAddModule = async () => {
        if (!newModTitle.trim() || !id) return;
        try {
            setAddingModule(true);
            let pdfUrl: string | undefined;
            if (newModPdf) {
                try {
                    const uploadRes = await uploadAPI.uploadPdf(newModPdf);
                    pdfUrl = uploadRes?.url;
                } catch (uploadErr) {
                    toast({ title: "PDF upload failed", description: uploadErr instanceof Error ? uploadErr.message : "Could not upload PDF", variant: "destructive" });
                }
            }
            const res = await moduleAPI.createModule(id, {
                title: newModTitle.trim(),
                description: newModDesc.trim() || undefined,
                pdf_url: pdfUrl,
                order_index: modules.length,
            });
            const created = res?.data;
            if (created) {
                let videoUrl: string | undefined;
                if (newModVideo) {
                    try {
                        const uploadRes = await uploadAPI.uploadVideo(newModVideo);
                        videoUrl = uploadRes?.url;
                    } catch (uploadErr) {
                        toast({ title: "Video upload failed", description: uploadErr instanceof Error ? uploadErr.message : "Could not upload video", variant: "destructive" });
                    }
                }
                const finalVideoUrl = videoUrl || newModVideoUrl.trim() || undefined;
                if (finalVideoUrl) {
                    try {
                        await moduleAPI.createLesson(String(created.id), {
                            title: newModTitle.trim() + " - Video Lecture",
                            video_url: finalVideoUrl,
                            content: newModSummary.filter(s => s.trim()).join("\n") || undefined,
                            order_index: 0,
                        });
                    } catch (lessonErr) {
                        toast({ title: "Lesson creation failed", description: "Module created but video lesson could not be added.", variant: "destructive" });
                    }
                }
                resetModForm();
                await refetchCourse();
                toast({ title: "Module added", description: `"${newModTitle}" has been added.` + (finalVideoUrl ? " Video added." : "") + (pdfUrl ? " PDF added." : "") });
            }
        } catch (err) {
            toast({ title: "Failed to add module", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setAddingModule(false);
        }
    };

    const handleDeleteModule = async (modId: string) => {
        try {
            await moduleAPI.deleteModule(modId);
            setModules(modules.filter(m => m.id !== modId));
            toast({ title: "Module removed" });
        } catch (err) {
            toast({ title: "Failed to remove module", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        }
    };

    const resetNewLessonForm = () => {
        setAddLessonModId(null);
        setNewLessonTitle("");
        setNewLessonVideoUrl("");
        setNewLessonVideoFile(null);
        setNewLessonPdfFile(null);
        setNewLessonContent("");
        setNewLessonDuration("");
        setNewLessonOrder(0);
        setNewLessonSummary([""]);
    };

    const handleAddLesson = async () => {
        if (!newLessonTitle.trim() || !addLessonModId) return;
        try {
            setAddingLesson(true);
            let videoUrl = newLessonVideoUrl.trim() || undefined;
            if (newLessonVideoFile) {
                const uploadRes = await uploadAPI.uploadVideo(newLessonVideoFile);
                videoUrl = uploadRes?.url;
            }
            let pdfUrl: string | undefined;
            if (newLessonPdfFile) {
                try {
                    const uploadRes = await uploadAPI.uploadPdf(newLessonPdfFile);
                    pdfUrl = uploadRes?.url;
                } catch (e) {
                    toast({ title: "PDF upload failed", variant: "destructive" });
                }
            }
            const mod = modules.find(m => m.id === addLessonModId);
            const orderIdx = mod ? (mod.lessonDetails?.length ?? mod.lessons ?? 0) : 0;
            await moduleAPI.createLesson(addLessonModId, {
                title: newLessonTitle.trim(),
                video_url: videoUrl,
                pdf_url: pdfUrl,
                content: newLessonContent.trim() || (newLessonSummary.filter(s => s.trim()).join("\n") || undefined),
                duration: newLessonDuration ? parseInt(newLessonDuration) || undefined : undefined,
                order_index: newLessonOrder ?? orderIdx,
            });
            await refetchCourse();
            resetNewLessonForm();
            toast({ title: "Lesson added", description: `"${newLessonTitle}" has been added.` });
        } catch (err) {
            toast({ title: "Failed to add lesson", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setAddingLesson(false);
        }
    };

    const handleStartEditLesson = (lesson: LessonItem, mod: Module) => {
        setEditingLessonId(lesson.id);
        setEdLessonTitle(lesson.title);
        setEdLessonVideoUrl(lesson.video_url || "");
        setEdLessonVideoFile(null);
        setEdLessonPdfFile(null);
        setEdLessonContent(lesson.content || "");
        setEdLessonDuration(lesson.duration != null ? String(lesson.duration) : "");
        setEdLessonOrder(lesson.order_index ?? 0);
        const points = lesson.content?.split("\n").filter(Boolean) || [];
        setEdLessonSummary(points.length > 0 ? points : [""]);
    };

    const handleCancelEditLesson = () => {
        setEditingLessonId(null);
        setEdLessonPdfFile(null);
        setEdLessonVideoFile(null);
    };

    const handleUpdateLesson = async () => {
        if (!editingLessonId) return;
        try {
            setUpdatingLesson(true);
            let videoUrl = edLessonVideoUrl.trim() || undefined;
            if (edLessonVideoFile) {
                try {
                    const uploadRes = await uploadAPI.uploadVideo(edLessonVideoFile);
                    videoUrl = uploadRes?.url;
                } catch (e) {
                    toast({ title: "Video upload failed", variant: "destructive" });
                }
            }
            let pdfUrl: string | undefined;
            if (edLessonPdfFile) {
                try {
                    const uploadRes = await uploadAPI.uploadPdf(edLessonPdfFile);
                    pdfUrl = uploadRes?.url;
                } catch (e) {
                    toast({ title: "PDF upload failed", variant: "destructive" });
                }
            }
            const lesson = modules.flatMap(m => m.lessonDetails || []).find(l => l.id === editingLessonId);
            await moduleAPI.updateLesson(String(editingLessonId), {
                title: edLessonTitle.trim(),
                video_url: videoUrl,
                ...(pdfUrl !== undefined && { pdf_url: pdfUrl }),
                content: edLessonContent.trim() || (edLessonSummary.filter(s => s.trim()).join("\n") || undefined),
                duration: edLessonDuration ? parseInt(edLessonDuration) || undefined : undefined,
                order_index: edLessonOrder,
            });
            await refetchCourse();
            setEditingLessonId(null);
            toast({ title: "Lesson updated" });
        } catch (err) {
            toast({ title: "Failed to update lesson", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setUpdatingLesson(false);
        }
    };

    const handleDeleteLesson = async (lessonId: number) => {
        try {
            setDeletingLessonId(lessonId);
            await moduleAPI.deleteLesson(String(lessonId));
            await refetchCourse();
            setEditingLessonId(null);
            toast({ title: "Lesson removed" });
        } catch (err) {
            toast({ title: "Failed to remove lesson", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setDeletingLessonId(null);
        }
    };

    const handlePostAnnouncement = async () => {
        if (!id || !annTitle.trim() || !annContent.trim()) {
            toast({ title: "Missing fields", description: "Please fill in both title and content.", variant: "destructive" });
            return;
        }
        try {
            setPostingAnn(true);
            const res = await announcementAPI.create(id, { title: annTitle.trim(), content: annContent.trim() });
            const ann = res?.data ?? res;
            setAnnouncements([{
                id: ann?.id ?? `a${Date.now()}`,
                title: ann?.title ?? annTitle.trim(),
                content: ann?.content ?? annContent.trim(),
                date: ann?.created_at ? new Date(ann.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                author_name: ann?.author_name,
            }, ...announcements]);
            setAnnTitle("");
            setAnnContent("");
            toast({ title: "Announcement posted" });
        } catch (err) {
            toast({ title: "Failed to post announcement", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setPostingAnn(false);
        }
    };

    const handleDeleteAnnouncement = async (annId: string | number) => {
        if (typeof annId === "string" && annId.startsWith("a")) {
            setAnnouncements(announcements.filter(a => a.id !== annId));
            return;
        }
        try {
            setDeletingAnnId(annId);
            await announcementAPI.delete(Number(annId));
            setAnnouncements(announcements.filter(a => a.id !== annId));
            toast({ title: "Announcement deleted" });
        } catch (err) {
            toast({ title: "Failed to delete announcement", variant: "destructive" });
        } finally {
            setDeletingAnnId(null);
        }
    };

    useEffect(() => {
        if (activeTab === "Students" && id) {
            setStudentsLoading(true);
            enrollmentAPI.getEnrollmentsByCourse(id)
                .then((res) => {
                    const data = res?.data ?? res;
                    setStudents(Array.isArray(data) ? data : []);
                })
                .catch(() => setStudents([]))
                .finally(() => setStudentsLoading(false));
        }
        if (activeTab === "Quizzes" && id) {
            quizAPI.list({ courseId: id }).then((res) => {
                const data = res?.data ?? res;
                const list = Array.isArray(data) ? data : (data?.quizzes ?? []);
                setQuizzes(list);
            }).catch(() => setQuizzes([]));
        }
        if (activeTab === "Announcements" && id) {
            announcementAPI.list(id)
                .then((res) => {
                    const data = res?.data ?? res;
                    const list: Announcement[] = (Array.isArray(data) ? data : []).map((a: any) => ({
                        id: a.id,
                        title: a.title,
                        content: a.content,
                        date: a.created_at ? new Date(a.created_at).toLocaleDateString() : "",
                        author_name: a.author_name,
                    }));
                    setAnnouncements(list);
                })
                .catch(() => setAnnouncements([]));
        }
    }, [activeTab, id]);

    const handleAddQuiz = async () => {
        if (!id || !quizTitle.trim()) return;
        try {
            setAddingQuiz(true);
            await quizAPI.create({
                course_id: parseInt(id),
                title: quizTitle.trim(),
                due_date: quizDueDate.trim() || undefined,
            });
            setQuizTitle("");
            setQuizDueDate("");
            const res = await quizAPI.list({ courseId: id });
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : (data?.quizzes ?? []);
            setQuizzes(list);
            toast({ title: "Quiz created", description: "Students will see it on the calendar." });
        } catch (err) {
            toast({ title: "Failed to create quiz", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setAddingQuiz(false);
        }
    };

    const handleDeleteQuiz = async (quizId: number) => {
        try {
            setDeletingQuizId(quizId);
            await quizAPI.delete(quizId);
            setQuizzes(quizzes.filter(q => q.id !== quizId));
            toast({ title: "Quiz deleted" });
        } catch (err) {
            toast({ title: "Failed to delete quiz", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setDeletingQuizId(null);
        }
    };

    const handleSaveDescription = async () => {
        if (!id) return;
        try {
            setSavingDesc(true);
            await courseAPI.updateCourse(id, { description });
            setDescEditing(false);
            toast({ title: "Course description updated" });
        } catch (err) {
            toast({ title: "Failed to update", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setSavingDesc(false);
        }
    };

    const handlePublish = async () => {
        if (!id || !isDraft || !isCourseApproved) return;
        try {
            setPublishing(true);
            await courseAPI.publishCourse(id);
            setCourse(c => c ? { ...c, status: "active" as const } : null);
            toast({ title: "Course published", description: "Your course is now live and available for enrollment." });
        } catch (err) {
            toast({ title: "Failed to publish", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl">
                <Link to="/instructor/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Back to My Courses
                </Link>
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="space-y-6 max-w-5xl">
                <Link to="/instructor/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Back to My Courses
                </Link>
                <div className="bg-destructive/10 text-destructive rounded-xl p-6 border border-destructive/20">
                    {error || "Course not found"}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl min-h-[400px]">
            <div className="flex items-center justify-between">
                <Link to="/instructor/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to My Courses
                </Link>
                {isDraft && (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                            isCourseApproved ? "bg-success/20 text-success" : 
                            course?.approval_status === "rejected" ? "bg-destructive/20 text-destructive" :
                            "bg-warning/20 text-warning"
                        }`}>
                            {course?.approval_status === "rejected" ? "Rejected" : course?.approval_status === "approved" ? "Approved" : "Pending Approval"}
                        </span>
                        <Button 
                            onClick={handlePublish} 
                            disabled={publishing || !isCourseApproved}
                            title={!isCourseApproved ? "Course must be approved by admin before publishing" : "Publish your course"}
                            className="gap-1.5"
                        >
                            <Globe className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish Course"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Banner */}
            <div className="relative rounded-xl overflow-hidden h-48 md:h-56">
                <img src={course?.thumbnail ?? DEFAULT_THUMBNAIL} alt={course?.title ?? ""} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-accent uppercase tracking-wide">{course.category}</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${course.status === "active" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                            {course.status}
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-card">{course?.title ?? "Course"}</h1>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Students", value: (course?.studentCount ?? 0).toLocaleString(), icon: Users, color: "text-primary bg-primary/10" },
                    { label: "Avg. Progress", value: `${course.avgProgress}%`, icon: TrendingUp, color: "text-accent bg-accent/10" },
                    { label: "Avg. Grade", value: `${course.avgGrade}%`, icon: BarChart3, color: "text-success bg-success/10" },
                    { label: "Modules", value: modules.length, icon: CheckCircle, color: "text-warning bg-warning/10" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card rounded-xl p-4 border border-border shadow-card">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); if (tab !== "Modules") setExpandedModId(null); }}
                        className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview */}
            {activeTab === "Overview" && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-card space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Course Description</h2>
                    {canEditWithinWindow && !descEditing && (
                        <Button variant="outline" size="sm" onClick={() => setDescEditing(true)}>Edit</Button>
                    )}
                    {canEditWithinWindow && descEditing && (
                        <Button size="sm" onClick={handleSaveDescription} disabled={savingDesc} className="gap-1.5">
                            <CheckCircle className="w-4 h-4" /> {savingDesc ? "Saving..." : "Save"}
                        </Button>
                    )}
                </div>
                {descEditing && canEditWithinWindow ? (
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="bg-muted/50" />
                ) : (
                    <p className="text-muted-foreground leading-relaxed">{description || "No description yet."}</p>
                )}
            </div>
            )}

            {/* Students */}
            {activeTab === "Students" && (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                {studentsLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Loading students...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No students enrolled yet.</p>
                    </div>
                ) : (
                    <div>
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">{students.length} Student{students.length !== 1 ? "s" : ""} Enrolled</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {students.map((s) => (
                                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-3 font-medium text-foreground">{s.user_name}</td>
                                            <td className="px-6 py-3 text-muted-foreground">{s.user_email}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                                                        <div className="h-full bg-primary rounded-full" style={{ width: `${s.progress_percentage}%` }} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-8 text-right">{s.progress_percentage}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.status === "completed" ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-muted-foreground text-xs">{s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Modules */}
            {activeTab === "Modules" && (
            <div className="space-y-4">
                {!isCourseApproved && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/10 text-foreground">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                        <div>
                            <p className="font-medium">Course pending admin approval</p>
                            <p className="text-sm text-muted-foreground mt-0.5">You can add modules and lessons after an admin approves this course.</p>
                        </div>
                    </div>
                )}
                {isCourseApproved && !canEditWithinWindow && user?.role !== "admin" && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-muted bg-muted/30 text-foreground">
                        <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div>
                            <p className="font-medium">Course cannot be edited after 15 days</p>
                            <p className="text-sm text-muted-foreground mt-0.5">The 15-day edit window has passed. You can no longer add or edit modules and lessons.</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Modules in this Course</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {modules.length} module{modules.length !== 1 ? "s" : ""} • Click to expand and edit
                        </p>
                    </div>
                    {!showModForm && (
                        <Button onClick={() => canEditContent && setShowModForm(true)} className="gap-1.5" disabled={!canEditContent}>
                            <PlusCircle className="w-4 h-4" /> Add New Module
                        </Button>
                    )}
                </div>
                {showModForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                            <h3 className="text-base font-semibold text-foreground">Create New Module</h3>
                            <button type="button" onClick={resetModForm} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label className="text-sm font-medium">Module Title *</Label>
                                        <Input placeholder="e.g. Introduction to State Management" value={newModTitle} onChange={(e) => setNewModTitle(e.target.value)} className="h-10" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Lessons</Label>
                                            <Input type="number" min={1} value={newModLessons} onChange={(e) => setNewModLessons(e.target.value)} className="h-10 bg-muted/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Order</Label>
                                            <div className="h-10 px-3 flex items-center rounded-md bg-muted/50 text-sm text-muted-foreground border border-input">
                                                {modules.length}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Module Description</Label>
                                    <Textarea placeholder="Describe what students will learn in this module..." value={newModDesc} onChange={(e) => setNewModDesc(e.target.value)} rows={3} className="bg-muted/30 resize-none" />
                                </div>
                            </div>

                            {/* Media & Resources */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Video className="w-4 h-4 text-primary" /> Video URL (optional)
                                    </Label>
                                    <Input placeholder="https://youtube.com/... or direct video URL" value={newModVideoUrl} onChange={(e) => setNewModVideoUrl(e.target.value)} className="bg-muted/30" />
                                    <p className="text-xs text-muted-foreground">Paste YouTube, Vimeo, or direct video link. Or upload a file below.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Video className="w-4 h-4 text-primary" /> Upload Video
                                        </Label>
                                        <div className="relative">
                                            <input type="file" accept="video/*" onChange={(e) => setNewModVideo(e.target.files?.[0] || null)} className="hidden" id="video-upload" />
                                            <label htmlFor="video-upload" className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Upload className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{newModVideo ? newModVideo.name : "Choose video file"}</p>
                                                    <p className="text-xs text-muted-foreground">MP4, WebM, MOV</p>
                                                </div>
                                                {newModVideo && (
                                                    <button type="button" onClick={() => setNewModVideo(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </label>
                                        </div>
                                        {newModVideo && (
                                            <p className="text-xs text-success flex items-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {(newModVideo.size / (1024 * 1024)).toFixed(1)} MB selected
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-accent" /> Upload PDF
                                        </Label>
                                        <div className="relative">
                                            <input type="file" accept=".pdf" onChange={(e) => setNewModPdf(e.target.files?.[0] || null)} className="hidden" id="pdf-upload" />
                                            <label htmlFor="pdf-upload" className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer">
                                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-5 h-5 text-accent" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{newModPdf ? newModPdf.name : "Choose PDF file"}</p>
                                                    <p className="text-xs text-muted-foreground">PDF up to 50MB</p>
                                                </div>
                                                {newModPdf && (
                                                    <button type="button" onClick={() => setNewModPdf(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </label>
                                        </div>
                                        {newModPdf && (
                                            <p className="text-xs text-success flex items-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {(newModPdf.size / (1024 * 1024)).toFixed(2)} MB selected
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary Points */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <List className="w-4 h-4 text-warning" /> Summary Points
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">Key takeaways students should learn from this module</p>
                                </div>
                                <div className="space-y-2">
                                    {newModSummary.map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                            <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                            {newModSummary.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={handleAddSummaryPoint} className="gap-1.5">
                                    <PlusCircle className="w-3.5 h-3.5" /> Add Point
                                </Button>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button variant="outline" onClick={resetModForm}>Cancel</Button>
                                <Button onClick={handleAddModule} disabled={!newModTitle.trim() || addingModule} className="gap-1.5 min-w-[140px]">
                                    {addingModule ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Creating...</> : <><PlusCircle className="w-4 h-4" /> Create Module</>}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {modules.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                        <p className="text-muted-foreground">No modules yet. Add your first module above.</p>
                    </div>
                ) : (
                    modules.map((mod, idx) => {
                        const isExpanded = expandedModId === mod.id;
                        return (
                            <div key={mod.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                                <button
                                    onClick={() => setExpandedModId(isExpanded ? null : mod.id)}
                                    className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0" title={`Module ${idx + 1} of ${modules.length}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground">Module {idx + 1} of {modules.length}</span>
                                                <span className="text-xs text-muted-foreground">{(mod.lessonDetails?.length ?? mod.lessons ?? 0)} lesson{(mod.lessonDetails?.length ?? mod.lessons ?? 0) !== 1 ? "s" : ""}</span>
                                                {mod.videoFileName && (
                                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Video className="w-3 h-3" /> Video
                                                    </span>
                                                )}
                                                {mod.pdfFileName && (
                                                    <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> PDF
                                                    </span>
                                                )}
                                                {mod.summaryPoints.length > 0 && (
                                                    <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <List className="w-3 h-3" /> {mod.summaryPoints.length} points
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                                                {editingModId === mod.id ? (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold text-foreground">Edit Module</h4>
                                                            <button type="button" onClick={handleCancelEditModule} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        {/* Basic Information */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                <div className="sm:col-span-2 space-y-2">
                                                                    <Label className="text-sm font-medium">Module Title *</Label>
                                                                    <Input placeholder="e.g. Introduction to State Management" value={edModTitle} onChange={(e) => setEdModTitle(e.target.value)} className="h-10" />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-2">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium">Lessons</Label>
                                                                        <div className="h-10 px-3 flex items-center rounded-md bg-muted/50 text-sm text-muted-foreground border border-input">
                                                                            {(mod.lessonDetails?.length ?? mod.lessons ?? 0)}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">Add below</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium">Order</Label>
                                                                        <Input type="number" min={0} value={edModOrderIndex} onChange={(e) => setEdModOrderIndex(Math.max(0, parseInt(e.target.value) || 0))} className="h-10 bg-muted/50" />
                                                                        <p className="text-xs text-muted-foreground">0 = first</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium">Module Description</Label>
                                                                <Textarea placeholder="Describe what students will learn in this module..." value={edModDesc} onChange={(e) => setEdModDesc(e.target.value)} rows={3} className="bg-muted/30 resize-none" />
                                                            </div>
                                                        </div>

                                                        {/* Media & Resources */}
                                                        <div className="space-y-4 pt-4 border-t border-border">
                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium flex items-center gap-2">
                                                                    <Video className="w-4 h-4 text-primary" /> Video URL (optional)
                                                                </Label>
                                                                <Input placeholder="https://youtube.com/... or direct video URL" value={edModVideoUrl} onChange={(e) => setEdModVideoUrl(e.target.value)} className="bg-muted/30" />
                                                                <p className="text-xs text-muted-foreground">Paste YouTube, Vimeo, or direct video link. Or upload a file below.</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm font-medium flex items-center gap-2">
                                                                        <Video className="w-4 h-4 text-primary" /> Upload Video
                                                                    </Label>
                                                                    <div className="relative">
                                                                        <input type="file" accept="video/*" onChange={(e) => setEdModVideo(e.target.files?.[0] || null)} className="hidden" id={`ed-video-${mod.id}`} />
                                                                        <label htmlFor={`ed-video-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                                <Upload className="w-5 h-5 text-primary" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-foreground truncate">{edModVideo ? edModVideo.name : mod.videoFileName || "Choose video file"}</p>
                                                                                <p className="text-xs text-muted-foreground">MP4, WebM, MOV</p>
                                                                            </div>
                                                                            {edModVideo && (
                                                                                <button type="button" onClick={() => setEdModVideo(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </label>
                                                                    </div>
                                                                    {edModVideo && (
                                                                        <p className="text-xs text-success flex items-center gap-1.5">
                                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                                            {(edModVideo.size / (1024 * 1024)).toFixed(1)} MB selected
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm font-medium flex items-center gap-2">
                                                                        <FileText className="w-4 h-4 text-accent" /> Upload PDF
                                                                    </Label>
                                                                    <div className="relative">
                                                                        <input type="file" accept=".pdf" onChange={(e) => setEdModPdf(e.target.files?.[0] || null)} className="hidden" id={`ed-pdf-${mod.id}`} />
                                                                        <label htmlFor={`ed-pdf-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer">
                                                                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                                                                <FileText className="w-5 h-5 text-accent" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-foreground truncate">{edModPdf ? edModPdf.name : mod.pdfFileName || "Choose PDF file"}</p>
                                                                                <p className="text-xs text-muted-foreground">PDF up to 50MB</p>
                                                                            </div>
                                                                            {edModPdf && (
                                                                                <button type="button" onClick={() => setEdModPdf(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </label>
                                                                    </div>
                                                                    {edModPdf && (
                                                                        <p className="text-xs text-success flex items-center gap-1.5">
                                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                                            {(edModPdf.size / (1024 * 1024)).toFixed(2)} MB selected
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Summary Points */}
                                                        <div className="space-y-4 pt-4 border-t border-border">
                                                            <div>
                                                                <Label className="text-sm font-medium flex items-center gap-2">
                                                                    <List className="w-4 h-4 text-warning" /> Summary Points
                                                                </Label>
                                                                <p className="text-xs text-muted-foreground mt-1">Key takeaways students should learn from this module</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {edModSummary.map((point, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                                                        <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleEdUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                                                        {edModSummary.length > 1 && (
                                                                            <button type="button" onClick={() => handleEdRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <Button variant="outline" size="sm" onClick={handleEdAddSummaryPoint} className="gap-1.5">
                                                                <PlusCircle className="w-3.5 h-3.5" /> Add Point
                                                            </Button>
                                                        </div>

                                                        {/* Sub-lessons */}
                                                        <div className="space-y-4 pt-4 border-t border-border">
                                                            <h4 className="text-sm font-semibold text-foreground">Sub-lessons</h4>
                                                            {mod.lessonDetails && mod.lessonDetails.length > 0 ? (
                                                                <div className="space-y-2 mb-3">
                                                                    {mod.lessonDetails.map((lesson, li) => (
                                                                        <div key={lesson.id} className="rounded-lg border border-border overflow-hidden">
                                                                            {editingLessonId === lesson.id ? (
                                                                                <div className="p-4 bg-muted/10 space-y-5">
                                                                                    <h5 className="text-sm font-semibold text-foreground">Edit Sub-lesson</h5>
                                                                                    <div className="space-y-4">
                                                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                                            <div className="sm:col-span-2 space-y-2">
                                                                                                <Label className="text-sm font-medium">Lesson Title *</Label>
                                                                                                <Input value={edLessonTitle} onChange={(e) => setEdLessonTitle(e.target.value)} placeholder="e.g. Introduction to..." className="h-10" />
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-2">
                                                                                                <div className="space-y-2">
                                                                                                    <Label className="text-sm font-medium">Duration (min)</Label>
                                                                                                    <Input type="number" min={0} value={edLessonDuration} onChange={(e) => setEdLessonDuration(e.target.value)} className="h-10 bg-muted/50" />
                                                                                                </div>
                                                                                                <div className="space-y-2">
                                                                                                    <Label className="text-sm font-medium">Order</Label>
                                                                                                    <Input type="number" min={0} value={edLessonOrder} onChange={(e) => setEdLessonOrder(Math.max(0, parseInt(e.target.value) || 0))} className="h-10 bg-muted/50" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            <Label className="text-sm font-medium">Description</Label>
                                                                                            <Textarea value={edLessonContent} onChange={(e) => setEdLessonContent(e.target.value)} placeholder="Describe what students will learn..." rows={2} className="bg-muted/30 resize-none" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="space-y-4 pt-4 border-t border-border">
                                                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                                                                        <div className="space-y-2">
                                                                                            <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video URL (optional)</Label>
                                                                                            <Input placeholder="https://youtube.com/..." value={edLessonVideoUrl} onChange={(e) => setEdLessonVideoUrl(e.target.value)} className="bg-muted/30" />
                                                                                            <p className="text-xs text-muted-foreground">Paste YouTube, Vimeo, or direct video link. Or upload below.</p>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                            <div className="space-y-2">
                                                                                                <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Upload Video</Label>
                                                                                                <div className="relative">
                                                                                                    <input type="file" accept="video/*" onChange={(e) => setEdLessonVideoFile(e.target.files?.[0] || null)} className="hidden" id={`ed-lesson-video-${lesson.id}`} />
                                                                                                    <label htmlFor={`ed-lesson-video-${lesson.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
                                                                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Upload className="w-5 h-5 text-primary" /></div>
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <p className="text-sm font-medium truncate">{edLessonVideoFile ? edLessonVideoFile.name : lesson.video_url ? "Change video" : "Choose video"}</p>
                                                                                                            <p className="text-xs text-muted-foreground">MP4, WebM, MOV</p>
                                                                                                        </div>
                                                                                                        {edLessonVideoFile && <button type="button" onClick={() => setEdLessonVideoFile(null)} className="p-1 rounded hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                                    </label>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-2">
                                                                                                <Label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Upload PDF</Label>
                                                                                                <div className="relative">
                                                                                                    <input type="file" accept=".pdf" onChange={(e) => setEdLessonPdfFile(e.target.files?.[0] || null)} className="hidden" id={`ed-lesson-pdf-${lesson.id}`} />
                                                                                                    <label htmlFor={`ed-lesson-pdf-${lesson.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer">
                                                                                                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><FileText className="w-5 h-5 text-accent" /></div>
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <p className="text-sm font-medium truncate">{edLessonPdfFile ? edLessonPdfFile.name : lesson.pdf_url ? "Change PDF" : "Choose PDF"}</p>
                                                                                                            <p className="text-xs text-muted-foreground">PDF up to 50MB</p>
                                                                                                        </div>
                                                                                                        {edLessonPdfFile && <button type="button" onClick={() => setEdLessonPdfFile(null)} className="p-1 rounded hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                                    </label>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="space-y-4 pt-4 border-t border-border">
                                                                                        <div>
                                                                                            <Label className="text-sm font-medium flex items-center gap-2"><List className="w-4 h-4 text-warning" /> Summary Points</Label>
                                                                                            <p className="text-xs text-muted-foreground mt-1">Key takeaways students should learn from this lesson</p>
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            {edLessonSummary.map((point, idx) => (
                                                                                                <div key={idx} className="flex items-center gap-2">
                                                                                                    <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                                                                                    <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleEdLessonUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                                                                                    {edLessonSummary.length > 1 && (
                                                                                                        <button type="button" onClick={() => handleEdLessonRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                        <Button variant="outline" size="sm" onClick={handleEdLessonAddSummaryPoint} className="gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add Point</Button>
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                                                                        <Button size="sm" variant="outline" onClick={handleCancelEditLesson}>Cancel</Button>
                                                                                        <Button size="sm" onClick={handleUpdateLesson} disabled={!edLessonTitle.trim() || updatingLesson} className="gap-1.5">
                                                                                            {updatingLesson ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving</> : "Save Changes"}
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-3 p-3">
                                                                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">{li + 1}</span>
                                                                                    <span className="text-sm flex-1 truncate">{lesson.title}</span>
                                                                                    <div className="flex gap-1">
                                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => canEditContent && handleStartEditLesson(lesson, mod)} disabled={!canEditContent}><Pencil className="w-3 h-3" /></Button>
                                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => canEditContent && handleDeleteLesson(lesson.id)} disabled={!canEditContent || deletingLessonId === lesson.id}><Trash2 className="w-3 h-3" /></Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground mb-3">No lessons yet.</p>
                                                            )}
                                                            {addLessonModId === mod.id ? (
                                                                <div className="p-4 rounded-xl border-2 border-dashed border-border bg-muted/10 space-y-5">
                                                                    <h5 className="text-sm font-semibold text-foreground">Add New Sub-lesson</h5>
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">Lesson Title *</Label>
                                                                                <Input placeholder="e.g. Introduction to State Management" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} className="h-10" />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">Lessons</Label>
                                                                                <div className="h-10 px-3 flex items-center rounded-md bg-muted/50 text-sm text-muted-foreground border border-input">
                                                                                    {(mod.lessonDetails?.length ?? mod.lessons ?? 0) + 1}
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground">New lesson #</p>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">Order</Label>
                                                                                <Input type="number" min={0} value={newLessonOrder} onChange={(e) => setNewLessonOrder(Math.max(0, parseInt(e.target.value) || 0))} className="h-10 bg-muted/50" />
                                                                                <p className="text-xs text-muted-foreground">0 = first</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">Duration (min)</Label>
                                                                                <Input type="number" min={0} placeholder="0" value={newLessonDuration} onChange={(e) => setNewLessonDuration(e.target.value)} className="h-10 bg-muted/50" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Lesson Description</Label>
                                                                            <Textarea placeholder="Describe what students will learn in this lesson..." value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} rows={3} className="bg-muted/30 resize-none" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4 pt-4 border-t border-border">
                                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video URL (optional)</Label>
                                                                            <Input placeholder="https://youtube.com/... or direct video URL" value={newLessonVideoUrl} onChange={(e) => setNewLessonVideoUrl(e.target.value)} className="bg-muted/30" />
                                                                            <p className="text-xs text-muted-foreground">Paste YouTube, Vimeo, or direct video link. Or upload below.</p>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Upload Video</Label>
                                                                                <div className="relative">
                                                                                    <input type="file" accept="video/*" onChange={(e) => setNewLessonVideoFile(e.target.files?.[0] || null)} className="hidden" id={`new-lesson-video-${mod.id}`} />
                                                                                    <label htmlFor={`new-lesson-video-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                                                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Upload className="w-5 h-5 text-primary" /></div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-sm font-medium text-foreground truncate">{newLessonVideoFile ? newLessonVideoFile.name : "Choose video"}</p>
                                                                                            <p className="text-xs text-muted-foreground">MP4, WebM, MOV</p>
                                                                                        </div>
                                                                                        {newLessonVideoFile && <button type="button" onClick={() => setNewLessonVideoFile(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Upload PDF</Label>
                                                                                <div className="relative">
                                                                                    <input type="file" accept=".pdf" onChange={(e) => setNewLessonPdfFile(e.target.files?.[0] || null)} className="hidden" id={`new-lesson-pdf-${mod.id}`} />
                                                                                    <label htmlFor={`new-lesson-pdf-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer">
                                                                                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-accent" /></div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-sm font-medium text-foreground truncate">{newLessonPdfFile ? newLessonPdfFile.name : "Choose PDF"}</p>
                                                                                            <p className="text-xs text-muted-foreground">PDF up to 50MB</p>
                                                                                        </div>
                                                                                        {newLessonPdfFile && <button type="button" onClick={() => setNewLessonPdfFile(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4 pt-4 border-t border-border">
                                                                        <div>
                                                                            <Label className="text-sm font-medium flex items-center gap-2"><List className="w-4 h-4 text-warning" /> Summary Points</Label>
                                                                            <p className="text-xs text-muted-foreground mt-1">Key takeaways students should learn from this lesson</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {newLessonSummary.map((point, idx) => (
                                                                                <div key={idx} className="flex items-center gap-2">
                                                                                    <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                                                                    <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleNewLessonUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                                                                    {newLessonSummary.length > 1 && (
                                                                                        <button type="button" onClick={() => handleNewLessonRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <Button variant="outline" size="sm" onClick={handleNewLessonAddSummaryPoint} className="gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add Point</Button>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                                                        <Button size="sm" variant="outline" onClick={resetNewLessonForm}>Cancel</Button>
                                                                        <Button size="sm" onClick={handleAddLesson} disabled={!newLessonTitle.trim() || addingLesson} className="gap-1.5">
                                                                            {addingLesson ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Adding...</> : "Add Lesson"}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => canEditContent && (setAddLessonModId(mod.id), setNewLessonOrder(mod.lessonDetails?.length ?? mod.lessons ?? 0))} disabled={!canEditContent}><PlusCircle className="w-3.5 h-3.5" /> Add Lesson</Button>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                                            <Button variant="outline" onClick={handleCancelEditModule}>Cancel</Button>
                                                            <Button onClick={handleUpdateModule} disabled={!edModTitle.trim() || updatingModule} className="gap-1.5 min-w-[140px]">
                                                                {updatingModule ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Changes</>}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                <>
                                                {mod.description && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</h4>
                                                        <p className="text-sm text-foreground leading-relaxed">{mod.description}</p>
                                                    </div>
                                                )}
                                                {(mod.videoFileName || mod.pdfFileName) && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attached Files</h4>
                                                        <div className="flex flex-wrap gap-3">
                                                            {mod.videoFileName && (
                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                                                    <Video className="w-4 h-4 text-primary" />
                                                                    <div>
                                                                        <p className="text-xs font-medium text-foreground">{mod.videoFileName}</p>
                                                                        <p className="text-[10px] text-muted-foreground">Video Lecture</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {mod.pdfFileName && (
                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
                                                                    <FileText className="w-4 h-4 text-accent" />
                                                                    <div>
                                                                        <p className="text-xs font-medium text-foreground">{mod.pdfFileName}</p>
                                                                        <p className="text-[10px] text-muted-foreground">PDF Resource</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {mod.summaryPoints.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Summary Points</h4>
                                                        <div className="space-y-2 bg-muted/20 rounded-lg p-4">
                                                            {mod.summaryPoints.map((point, pi) => (
                                                                <div key={pi} className="flex items-start gap-2.5">
                                                                    <span className="w-5 h-5 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                                                                        {pi + 1}
                                                                    </span>
                                                                    <p className="text-sm text-foreground leading-relaxed">{point}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Sub-lessons */}
                                                <div>
                                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lessons</h4>
                                                    {mod.lessonDetails && mod.lessonDetails.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {mod.lessonDetails.map((lesson, li) => (
                                                                <div key={lesson.id} className="rounded-lg border border-border overflow-hidden">
                                                                    {editingLessonId === lesson.id ? (
                                                                        <div className="p-4 bg-muted/10 space-y-5">
                                                                            <h5 className="text-sm font-semibold text-foreground">Edit Sub-lesson</h5>
                                                                            <div className="space-y-4">
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                                    <div className="sm:col-span-2 space-y-2">
                                                                                        <Label className="text-sm font-medium">Lesson Title *</Label>
                                                                                        <Input value={edLessonTitle} onChange={(e) => setEdLessonTitle(e.target.value)} placeholder="e.g. Introduction to..." className="h-10" />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-2">
                                                                                        <div className="space-y-2">
                                                                                            <Label className="text-sm font-medium">Duration (min)</Label>
                                                                                            <Input type="number" min={0} value={edLessonDuration} onChange={(e) => setEdLessonDuration(e.target.value)} className="h-10 bg-muted/50" />
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            <Label className="text-sm font-medium">Order</Label>
                                                                                            <Input type="number" min={0} value={edLessonOrder} onChange={(e) => setEdLessonOrder(Math.max(0, parseInt(e.target.value) || 0))} className="h-10 bg-muted/50" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm font-medium">Description</Label>
                                                                                    <Textarea value={edLessonContent} onChange={(e) => setEdLessonContent(e.target.value)} placeholder="Describe what students will learn..." rows={2} className="bg-muted/30 resize-none" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-4 pt-4 border-t border-border">
                                                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video URL (optional)</Label>
                                                                                    <Input placeholder="https://youtube.com/..." value={edLessonVideoUrl} onChange={(e) => setEdLessonVideoUrl(e.target.value)} className="bg-muted/30" />
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                    <div className="space-y-2">
                                                                                        <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Upload Video</Label>
                                                                                        <input type="file" accept="video/*" onChange={(e) => setEdLessonVideoFile(e.target.files?.[0] || null)} className="hidden" id={`ed-lesson-video-view-${lesson.id}`} />
                                                                                        <label htmlFor={`ed-lesson-video-view-${lesson.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
                                                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Upload className="w-5 h-5 text-primary" /></div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-sm font-medium truncate">{edLessonVideoFile ? edLessonVideoFile.name : lesson.video_url ? "Change video" : "Choose video"}</p>
                                                                                            </div>
                                                                                            {edLessonVideoFile && <button type="button" onClick={() => setEdLessonVideoFile(null)} className="p-1 rounded hover:text-destructive"><X className="w-4 h-4" /></button>}
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Upload PDF</Label>
                                                                                        <input type="file" accept=".pdf" onChange={(e) => setEdLessonPdfFile(e.target.files?.[0] || null)} className="hidden" id={`ed-lesson-pdf-view-${lesson.id}`} />
                                                                                        <label htmlFor={`ed-lesson-pdf-view-${lesson.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer">
                                                                                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><FileText className="w-5 h-5 text-accent" /></div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-sm font-medium truncate">{edLessonPdfFile ? edLessonPdfFile.name : lesson.pdf_url ? "Change PDF" : "Choose PDF"}</p>
                                                                                            </div>
                                                                                            {edLessonPdfFile && <button type="button" onClick={() => setEdLessonPdfFile(null)} className="p-1 rounded hover:text-destructive"><X className="w-4 h-4" /></button>}
                                                                                        </label>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-4 pt-4 border-t border-border">
                                                                                <div>
                                                                                    <Label className="text-sm font-medium flex items-center gap-2"><List className="w-4 h-4 text-warning" /> Summary Points</Label>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    {edLessonSummary.map((point, idx) => (
                                                                                        <div key={idx} className="flex items-center gap-2">
                                                                                            <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                                                                            <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleEdLessonUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                                                                            {edLessonSummary.length > 1 && (
                                                                                                <button type="button" onClick={() => handleEdLessonRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <Button variant="outline" size="sm" onClick={handleEdLessonAddSummaryPoint} className="gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add Point</Button>
                                                                            </div>
                                                                            <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                                                                <Button size="sm" variant="outline" onClick={handleCancelEditLesson}>Cancel</Button>
                                                                                <Button size="sm" onClick={handleUpdateLesson} disabled={!edLessonTitle.trim() || updatingLesson} className="gap-1.5">
                                                                                    {updatingLesson ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving</> : "Save Changes"}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-3 p-3">
                                                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">{li + 1}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                                                                                {(lesson.video_url || lesson.pdf_url) && <p className="text-xs text-muted-foreground truncate">{lesson.video_url ? "Video" : ""}{lesson.video_url && lesson.pdf_url ? " • " : ""}{lesson.pdf_url ? "PDF" : ""}</p>}
                                                                            </div>
                                                                            <div className="flex gap-1 flex-shrink-0">
                                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => canEditContent && handleStartEditLesson(lesson, mod)} disabled={!canEditContent}><Pencil className="w-3.5 h-3.5" /></Button>
                                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => canEditContent && handleDeleteLesson(lesson.id)} disabled={!canEditContent || deletingLessonId === lesson.id}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No lessons yet.</p>
                                                    )}
                                                    {addLessonModId === mod.id ? (
                                                            <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-border bg-muted/10 space-y-5">
                                                                <h5 className="text-sm font-semibold text-foreground">Add New Sub-lesson</h5>
                                                                <div className="space-y-4">
                                                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Lesson Title *</Label>
                                                                            <Input placeholder="e.g. Introduction to State Management" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} className="h-10" />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Lessons</Label>
                                                                            <div className="h-10 px-3 flex items-center rounded-md bg-muted/50 text-sm text-muted-foreground border border-input">
                                                                                {(mod.lessonDetails?.length ?? mod.lessons ?? 0) + 1}
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground">New lesson #</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Order</Label>
                                                                            <Input type="number" min={0} value={newLessonOrder} onChange={(e) => setNewLessonOrder(Math.max(0, parseInt(e.target.value) || 0))} className="h-10 bg-muted/50" />
                                                                            <p className="text-xs text-muted-foreground">0 = first</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Duration (min)</Label>
                                                                            <Input type="number" min={0} placeholder="0" value={newLessonDuration} onChange={(e) => setNewLessonDuration(e.target.value)} className="h-10 bg-muted/50" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium">Lesson Description</Label>
                                                                        <Textarea placeholder="Describe what students will learn in this lesson..." value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} rows={3} className="bg-muted/30 resize-none" />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4 pt-4 border-t border-border">
                                                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media & Resources</h4>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video URL (optional)</Label>
                                                                        <Input placeholder="https://youtube.com/... or direct video URL" value={newLessonVideoUrl} onChange={(e) => setNewLessonVideoUrl(e.target.value)} className="bg-muted/30" />
                                                                        <p className="text-xs text-muted-foreground">Paste YouTube, Vimeo, or direct video link. Or upload below.</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Upload Video</Label>
                                                                            <div className="relative">
                                                                                <input type="file" accept="video/*" onChange={(e) => setNewLessonVideoFile(e.target.files?.[0] || null)} className="hidden" id={`add-lesson-video-${mod.id}`} />
                                                                                <label htmlFor={`add-lesson-video-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                                                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Upload className="w-5 h-5 text-primary" /></div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-medium text-foreground truncate">{newLessonVideoFile ? newLessonVideoFile.name : "Choose video"}</p>
                                                                                        <p className="text-xs text-muted-foreground">MP4, WebM, MOV</p>
                                                                                    </div>
                                                                                    {newLessonVideoFile && <button type="button" onClick={() => setNewLessonVideoFile(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Upload PDF</Label>
                                                                            <div className="relative">
                                                                                <input type="file" accept=".pdf" onChange={(e) => setNewLessonPdfFile(e.target.files?.[0] || null)} className="hidden" id={`add-lesson-pdf-${mod.id}`} />
                                                                                <label htmlFor={`add-lesson-pdf-${mod.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer">
                                                                                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-accent" /></div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-medium text-foreground truncate">{newLessonPdfFile ? newLessonPdfFile.name : "Choose PDF"}</p>
                                                                                        <p className="text-xs text-muted-foreground">PDF up to 50MB</p>
                                                                                    </div>
                                                                                    {newLessonPdfFile && <button type="button" onClick={() => setNewLessonPdfFile(null)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>}
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4 pt-4 border-t border-border">
                                                                    <div>
                                                                        <Label className="text-sm font-medium flex items-center gap-2"><List className="w-4 h-4 text-warning" /> Summary Points</Label>
                                                                        <p className="text-xs text-muted-foreground mt-1">Key takeaways students should learn from this lesson</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {newLessonSummary.map((point, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2">
                                                                                <span className="w-6 h-6 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center font-medium flex-shrink-0">{idx + 1}</span>
                                                                                <Input placeholder={`Summary point ${idx + 1}...`} value={point} onChange={(e) => handleNewLessonUpdateSummaryPoint(idx, e.target.value)} className="flex-1" />
                                                                                {newLessonSummary.length > 1 && (
                                                                                    <button type="button" onClick={() => handleNewLessonRemoveSummaryPoint(idx)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <Button variant="outline" size="sm" onClick={handleNewLessonAddSummaryPoint} className="gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add Point</Button>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-4 border-t border-border">
                                                                    <Button size="sm" variant="outline" onClick={resetNewLessonForm}>Cancel</Button>
                                                                    <Button size="sm" onClick={handleAddLesson} disabled={!newLessonTitle.trim() || addingLesson} className="gap-1.5">
                                                                        {addingLesson ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Adding...</> : "Add Lesson"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => canEditContent && (setAddLessonModId(mod.id), setNewLessonOrder(mod.lessonDetails?.length ?? mod.lessons ?? 0))} disabled={!canEditContent}>
                                                                <PlusCircle className="w-3.5 h-3.5" /> Add Lesson
                                                            </Button>
                                                        )}
                                                </div>

                                                <div className="flex justify-end gap-2 pt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => canEditContent && handleStartEditModule(mod)}
                                                            className="gap-1.5"
                                                            disabled={!canEditContent}
                                                        >
                                                            <Pencil className="w-4 h-4" /> Edit Module
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => canEditContent && handleDeleteModule(mod.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                                            disabled={!canEditContent}
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Remove Module
                                                        </Button>
                                                    </div>
                                                </>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>
            )}

            {/* Quizzes */}
            {activeTab === "Quizzes" && (
            <div className="space-y-4">
                <div className="bg-card rounded-xl p-5 border border-border shadow-card space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" /> Add Quiz (appears on student calendar)
                    </h3>
                    <Input placeholder="Quiz title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                    <div>
                        <Label className="text-xs text-muted-foreground">Due date (optional)</Label>
                        <Input type="date" value={quizDueDate} onChange={(e) => setQuizDueDate(e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAddQuiz} disabled={!quizTitle.trim() || addingQuiz} size="sm" className="gap-1.5">
                            {addingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Quiz
                        </Button>
                    </div>
                </div>
                {quizzes.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No quizzes yet. Add one above.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {quizzes.map((q) => (
                            <div key={q.id} className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-foreground">{q.title}</p>
                                    <p className="text-xs text-muted-foreground">{q.due_date ? `Due: ${new Date(q.due_date).toLocaleDateString()}` : "No due date"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/instructor/ai-quiz?quizId=${q.id}&courseId=${id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                                    >
                                        <Pencil className="w-3 h-3" /> Manage Questions
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteQuiz(q.id)}
                                        disabled={deletingQuizId === q.id}
                                    >
                                        {deletingQuizId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}

            {/* Announcements */}
            {activeTab === "Announcements" && (
            <div className="space-y-4">
                <div className="bg-card rounded-xl p-5 border border-border shadow-card space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Post Announcement</h3>
                    <Input placeholder="Announcement title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
                    <Textarea placeholder="Write your announcement..." value={annContent} onChange={(e) => setAnnContent(e.target.value)} rows={3} className="bg-muted/50" />
                    <div className="flex justify-end">
                        <Button onClick={handlePostAnnouncement} disabled={!annTitle.trim() || !annContent.trim() || postingAnn} size="sm" className="gap-1.5">
                            {postingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post
                        </Button>
                    </div>
                </div>
                {announcements.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                        <p className="text-muted-foreground">No announcements yet.</p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <div key={ann.id} className="bg-card rounded-xl p-5 border border-border shadow-card">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground">{ann.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{ann.content}</p>
                                    {ann.author_name && <p className="text-xs text-muted-foreground mt-2">Posted by {ann.author_name}</p>}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                    <span className="text-xs text-muted-foreground">{ann.date}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteAnnouncement(ann.id)}
                                        disabled={deletingAnnId === ann.id}
                                    >
                                        {deletingAnnId === ann.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}
        </div>
    );
};

export default InstructorCourseDetail;
