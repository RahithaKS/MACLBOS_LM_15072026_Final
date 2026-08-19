import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Database,
  FileBarChart,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  LayoutTemplate
} from "lucide-react";

// Types
interface Template {
  id: string;
  name: string;
  description: string;
  analysisPrompt: string;
}

interface Cube {
  id: string;
  name: string;
  description: string;
  schemaType: string;
}

interface BoardStudioBoard {
  id: string;
  title: string;
  description: string;
  templateId: string;
  cubeId: string;
  config: Record<string, any>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function BoardStudio() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardStudioBoard | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", templateId: "", cubeId: "" });
  const [editorError, setEditorError] = useState<string | null>(null);

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery<Template[]>({
    queryKey: ["/api/board-studio/templates"],
  });

  const { data: cubes = [], isLoading: cubesLoading, error: cubesError } = useQuery<Cube[]>({
    queryKey: ["/api/board-studio/cubes"],
  });

  const { data: boards = [], isLoading: boardsLoading, error: boardsError } = useQuery<BoardStudioBoard[]>({
    queryKey: ["/api/board-studio/boards"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BoardStudioBoard>) => {
      if (editingBoard) {
        return apiRequest("PATCH", `/api/board-studio/boards/${editingBoard.id}`, data);
      }
      return apiRequest("POST", `/api/board-studio/boards`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/board-studio/boards"] });
      closeEditor();
    },
    onError: (error: Error) => {
      const message = error.message.replace(/^\d{3}:\s*/, "");
      try {
        const payload = JSON.parse(message);
        setEditorError(payload.error || "Unable to save this Board Studio board.");
      } catch {
        setEditorError(message || "Unable to save this Board Studio board.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/board-studio/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/board-studio/boards"] });
    },
  });

  const openCreate = () => {
    setEditingBoard(null);
    setFormData({ title: "", description: "", templateId: "", cubeId: "" });
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const openEdit = (board: BoardStudioBoard, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoard(board);
    setFormData({
      title: board.title || "",
      description: board.description || "",
      templateId: board.templateId || "",
      cubeId: board.cubeId || "",
    });
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingBoard(null);
    setEditorError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditorError(null);
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this board?")) {
      deleteMutation.mutate(id);
    }
  };

  const isLoading = templatesLoading || cubesLoading || boardsLoading;
  const hasError = templatesError || cubesError || boardsError;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <header className="px-8 py-6 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Board Studio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Governed Financial Analysis Workspace</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={isLoading || !!hasError}>
          <Plus className="w-4 h-4" />
          Create Board
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-8 space-y-12">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading workspace...</p>
          </div>
        )}

        {hasError && !isLoading && (
          <div className="bg-destructive/10 text-destructive p-6 rounded-xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">Unable to load data</h3>
              <p className="text-sm mt-1">There was a problem communicating with the server. Please try again later.</p>
            </div>
          </div>
        )}

        {!isLoading && !hasError && (
          <>
            {/* BOARDS SECTION */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <FileBarChart className="w-5 h-5 text-primary" />
                Active Boards
              </h2>
              {boards.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-12 text-center bg-muted/20">
                  <FileBarChart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground">No Boards Found</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Create a governed board to start analyzing your financial data with deterministic templates.
                  </p>
                  <Button onClick={openCreate} className="mt-6" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Board
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {boards.map((board) => {
                    const tpl = templates.find((t) => t.id === board.templateId);
                    const cube = cubes.find((c) => c.id === board.cubeId);
                    return (
                      <Card 
                        key={board.id} 
                        className="hover:border-primary/50 transition-colors cursor-pointer flex flex-col"
                        onClick={() => setLocation(`/board-studio/${board.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-lg line-clamp-1" title={board.title}>{board.title}</CardTitle>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(board, e)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleDelete(board.id, e)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                            {board.description || "No description provided."}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto space-y-3 pt-0">
                          <div className="text-xs space-y-2">
                            <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                              <span className="text-muted-foreground font-medium">Template</span>
                              <span className="font-mono text-foreground">{tpl?.name || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                              <span className="text-muted-foreground font-medium">Data Cube</span>
                              <span className="font-mono text-foreground">{cube?.name || "Unknown"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-border/50">
              {/* TEMPLATES SECTION */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
                  Available Templates
                </h2>
                <div className="space-y-3">
                  {templates.map(template => (
                    <div key={template.id} className="p-4 border border-border rounded-lg bg-card/50">
                      <h4 className="font-medium text-foreground">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      No templates configured.
                    </div>
                  )}
                </div>
              </section>

              {/* CUBES SECTION */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  Enterprise Cubes
                </h2>
                <div className="space-y-3">
                  {cubes.map(cube => (
                    <div key={cube.id} className="p-4 border border-border rounded-lg bg-card/50 flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">{cube.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{cube.description}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-mono uppercase">
                        {cube.schemaType}
                      </span>
                    </div>
                  ))}
                  {cubes.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      No data cubes configured.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden max-h-full">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="text-lg font-semibold text-foreground">
                {editingBoard ? "Edit Board" : "Create New Board"}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-auto p-6 space-y-5">
              {editorError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                  {editorError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Board Title</label>
                <input
                  type="text"
                  required
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Q3 Variance Analysis"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none text-foreground"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the purpose of this analysis board..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Analysis Template</label>
                <select
                  required
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  value={formData.templateId}
                  onChange={(e) => setFormData({...formData, templateId: e.target.value})}
                >
                  <option value="" disabled>Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Enterprise Data Cube</label>
                <select
                  required
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  value={formData.cubeId}
                  onChange={(e) => setFormData({...formData, cubeId: e.target.value})}
                >
                  <option value="" disabled>Select a data cube...</option>
                  {cubes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBoard ? "Save Changes" : "Create Board"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
