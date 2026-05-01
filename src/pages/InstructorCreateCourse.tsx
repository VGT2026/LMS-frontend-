import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { courseAPI, authAPI } from "@/services/api";

const PREDEFINED_CATEGORIES = ["Development", "Data Science", "Design", "Business", "Security", "Cloud & DevOps"];

const InstructorCreateCoursePage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(PREDEFINED_CATEGORIES);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authAPI.getProfile();
                const id = res?.data?.id ?? res?.id;
                if (id != null) setUserId(Number(id));
            } catch {
                setUserId(null);
            }
        };
        fetchProfile();
    }, []);

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
        if (!title || !category) {
            toast({
                title: "Missing fields",
                description: "Please fill in title and category.",
                variant: "destructive"
            });
            return;
        }

        if (!userId) {
            toast({
                title: "Error",
                description: "Could not identify your account. Please try again.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const response = await courseAPI.createCourse({
                title: title.trim(),
                description: description.trim() || undefined,
                instructor_id: userId,
                category,
                thumbnail: thumbnail.trim() || undefined,
            });

            const newCourse = response?.data ?? response?.course ?? response;
            const courseId = newCourse?.id;

            if (response?.success || newCourse) {
                setSubmitted(true);
                toast({
                    title: "Course created!",
                    description: `"${title}" has been created as a draft. Add modules and publish when ready.`
                });
                setTimeout(() => {
                    if (courseId) {
                        navigate(`/instructor/course/${courseId}`);
                    } else {
                        navigate("/instructor/courses");
                    }
                }, 1500);
            } else {
                throw new Error(response?.message || "Failed to create course");
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
                <p className="text-muted-foreground mt-2">"{title}" has been created as a draft. Redirecting to add modules...</p>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate("/instructor/courses")} className="gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-foreground">Create New Course</h1>
                <p className="text-muted-foreground mt-1">Create a new course and add modules. You'll be the instructor.</p>
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

                <div className="space-y-2">
                    <Label>Thumbnail URL (optional)</Label>
                    <Input placeholder="https://..." value={thumbnail} onChange={e => setThumbnail(e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSubmit} className="gap-1.5 px-8" disabled={loading || !userId}>
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

export default InstructorCreateCoursePage;
