import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authAPI, courseAPI } from "@/services/api";

interface Instructor {
    id: number;
    name: string;
    email: string;
    is_active?: boolean;
}

const PREDEFINED_CATEGORIES = ["Development", "Data Science", "Design", "Business", "Security", "Cloud & DevOps"];

const AdminCreateCoursePage = () => {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [instructorId, setInstructorId] = useState<string>("");
    const [thumbnail, setThumbnail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loadingInstructors, setLoadingInstructors] = useState(true);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(PREDEFINED_CATEGORIES);

    useEffect(() => {
        const fetchInstructors = async () => {
            try {
                setLoadingInstructors(true);
                const list = await authAPI.fetchInstructorsList();
                const typed = Array.isArray(list) ? (list as Instructor[]) : [];
                const active = typed.filter((i) => i && i.is_active !== false);
                setInstructors(active);
            } catch (error) {
                console.error("Failed to fetch instructors:", error);
                setInstructors([]);
                const apiMsg = error instanceof Error ? error.message : "Request failed";
                toast({
                    title: "Could not load instructors",
                    description:
                        `${apiMsg} Uses GET /auth/admin/users?role=instructor or GET /auth/admin/instructors — check API logs if you are already signed in as admin.`,
                    variant: "destructive",
                });
            } finally {
                setLoadingInstructors(false);
            }
        };
        fetchInstructors();
    }, [toast]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await courseAPI.getCategories?.();
                const fetchedCategories = Array.isArray(response?.data) ? response.data : [];
                if (fetchedCategories.length > 0) {
                    setCategories(fetchedCategories);
                } else {
                    setCategories(PREDEFINED_CATEGORIES);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                setCategories(PREDEFINED_CATEGORIES);
            }
        };
        fetchCategories();
    }, []);

    const handleSubmit = async () => {
        if (!title || !category || !instructorId) {
            toast({
                title: "Missing fields",
                description: "Please fill in title, category, and select an instructor.",
                variant: "destructive"
            });
            return;
        }

        const selectedInstructor = instructors.find(inst => inst.id.toString() === instructorId);
        if (!selectedInstructor) {
            toast({
                title: "Invalid instructor",
                description: "The selected instructor is no longer available. Please choose another instructor.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const response = await courseAPI.createCourse({
                title: title.trim(),
                description: description.trim() || undefined,
                instructor_id: parseInt(instructorId),
                category,
                thumbnail: thumbnail.trim() || undefined,
            });

            if (response.success) {
                setSubmitted(true);
                toast({
                    title: "Course created!",
                    description: `"${title}" has been assigned to ${selectedInstructor.name} and published.`
                });
                setTimeout(() => {
                    setSubmitted(false);
                    setTitle(""); setDescription(""); setCategory(""); setInstructorId(""); setThumbnail("");
                }, 3000);
            } else {
                throw new Error(response.message || "Failed to create course");
            }
        } catch (error) {
            console.error('Create course error:', error);
            toast({
                title: "Error",
                description: (error as Error).message || "Failed to create course. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto text-center py-20">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Course Created!</h2>
                <p className="text-muted-foreground mt-2">"{title}" has been published and is now available for enrollment.</p>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Create New Course</h1>
                <p className="text-muted-foreground mt-1">Set up a new course for students</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Course Title *</Label>
                        <Input placeholder="e.g. Introduction to Machine Learning" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Category *</Label>
                        {category && !categories.includes(category) ? (
                            // Custom category selected - show it with option to change
                            <div className="flex gap-2">
                                <div className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground">
                                    {category}
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setShowCustomCategory(true);
                                        setCustomCategory(category);
                                    }}
                                >
                                    Change
                                </Button>
                            </div>
                        ) : showCustomCategory ? (
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter new category" 
                                    value={customCategory} 
                                    onChange={e => setCustomCategory(e.target.value)}
                                    className="flex-1"
                                />
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        if (customCategory.trim()) {
                                            const trimmedCat = customCategory.trim();
                                            setCategory(trimmedCat);
                                            // Add to categories list if not already there
                                            if (!categories.includes(trimmedCat)) {
                                                setCategories([...categories, trimmedCat]);
                                            }
                                            setShowCustomCategory(false);
                                            setCustomCategory("");
                                        } else {
                                            toast({ title: "Error", description: "Category cannot be empty", variant: "destructive" });
                                        }
                                    }}
                                >
                                    Add
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setShowCustomCategory(false);
                                        setCustomCategory("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Select value={category} onValueChange={(value) => {
                                if (value === "__other__") {
                                    setShowCustomCategory(true);
                                } else {
                                    setCategory(value);
                                }
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                    <SelectItem value="__other__">Other (Add custom)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Course description..." value={description} onChange={e => setDescription(e.target.value)} rows={3} className="bg-muted/50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Instructor *</Label>
                        <Select
                            value={loadingInstructors ? "__loading__" : (instructorId || (instructors.length > 0 ? "__select__" : "__none__"))}
                            onValueChange={(v) => !["__select__", "__none__", "__loading__"].includes(v) && setInstructorId(v)}
                            disabled={loadingInstructors}
                        >
                            <SelectTrigger><SelectValue placeholder={loadingInstructors ? "Loading..." : "Select instructor"} /></SelectTrigger>
                            <SelectContent>
                                {loadingInstructors ? (
                                    <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                                ) : instructors.length > 0 ? (
                                    <>
                                        <SelectItem value="__select__" disabled>Select instructor</SelectItem>
                                        {instructors.map((inst) => (
                                            <SelectItem key={inst.id} value={inst.id.toString()}>
                                                {inst.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                ) : (
                                    <SelectItem value="__none__" disabled>No instructors available. Create instructors first.</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Thumbnail URL (optional)</Label>
                        <Input placeholder="https://..." value={thumbnail} onChange={e => setThumbnail(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSubmit} className="gap-1.5 px-8" disabled={loading}>
                    {loading ? (
                        <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Creating...</>
                    ) : (
                        <><PlusCircle className="w-4 h-4" /> Create Course</>
                    )}
                </Button>
            </div>
        </motion.div>
    );
};

export default AdminCreateCoursePage;
