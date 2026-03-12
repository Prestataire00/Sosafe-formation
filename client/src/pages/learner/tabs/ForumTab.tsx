import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ForumPost, ForumReply } from "../helpers";
import type { Enrollment, Session } from "@shared/schema";

export function LearnerForumTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState("");
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [viewingPost, setViewingPost] = useState<ForumPost | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const enrolledSessionIds = new Set(enrollments.map((e) => e.sessionId));
  const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));

  // Forum posts for selected session
  const { data: posts = [], isLoading: postsLoading } = useQuery<ForumPost[]>({
    queryKey: ["/api/learner/forum-posts", selectedSession],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-posts?sessionId=${selectedSession}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedSession,
  });

  // Mute status
  const { data: muteStatus } = useQuery<{ muted: boolean }>({
    queryKey: ["/api/learner/forum-mute", selectedSession],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-mute?sessionId=${selectedSession}`, { credentials: "include" });
      if (!res.ok) return { muted: false };
      return res.json();
    },
    enabled: !!selectedSession,
  });

  // Replies for viewed post
  const { data: replies = [], isLoading: repliesLoading } = useQuery<ForumReply[]>({
    queryKey: ["/api/learner/forum-replies", viewingPost?.id],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-replies?postId=${viewingPost!.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!viewingPost,
  });

  const createPostMutation = useMutation({
    mutationFn: (data: { sessionId: string; title: string; content: string }) =>
      apiRequest("POST", "/api/learner/forum-posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-posts"] });
      setNewPostDialogOpen(false);
      setNewPostTitle("");
      setNewPostContent("");
      toast({ title: "Sujet cree" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/learner/forum-posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-posts"] });
      setViewingPost(null);
      toast({ title: "Sujet supprime" });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: (data: { postId: string; content: string }) =>
      apiRequest("POST", "/api/learner/forum-replies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-replies"] });
      setReplyContent("");
      toast({ title: "Reponse ajoutee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/learner/forum-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-replies"] });
      toast({ title: "Reponse supprimee" });
    },
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      if (muteStatus?.muted) {
        await apiRequest("DELETE", `/api/learner/forum-mute?sessionId=${selectedSession}`);
      } else {
        await apiRequest("POST", "/api/learner/forum-mute", { sessionId: selectedSession });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-mute"] });
      toast({ title: muteStatus?.muted ? "Notifications reactivees" : "Notifications desactivees" });
    },
  });

  const formatPostDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const RoleBadge = ({ role }: { role: string | null }) => {
    if (role === "trainer") return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Formateur</Badge>;
    if (role === "admin") return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">Admin</Badge>;
    return null;
  };

  // Post detail view
  if (viewingPost) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewingPost(null)}>
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Retour aux sujets
        </Button>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{viewingPost.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{viewingPost.authorName}</span>
                  <RoleBadge role={viewingPost.authorRole} />
                  <span className="text-xs text-muted-foreground">{formatPostDate(viewingPost.createdAt)}</span>
                </div>
              </div>
              {user?.id === viewingPost.authorId && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePostMutation.mutate(viewingPost.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap border-t pt-3">{viewingPost.content}</div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{replies.length} reponse(s)</h4>
          {repliesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            replies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{reply.authorName}</span>
                      <RoleBadge role={reply.authorRole} />
                      <span className="text-xs text-muted-foreground">{formatPostDate(reply.createdAt)}</span>
                    </div>
                    {user?.id === reply.authorId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteReplyMutation.mutate(reply.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Reply form */}
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Ecrire une reponse..."
                className="resize-none min-h-[60px] flex-1"
              />
              <Button
                size="sm"
                disabled={!replyContent.trim() || createReplyMutation.isPending}
                onClick={() => createReplyMutation.mutate({ postId: viewingPost.id, content: replyContent })}
              >
                {createReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session selector + mute */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Select value={selectedSession || "none"} onValueChange={(v) => setSelectedSession(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choisir une session</SelectItem>
              {enrolledSessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSession && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleMuteMutation.mutate()}
              disabled={toggleMuteMutation.isPending}
              title={muteStatus?.muted ? "Reactiver les notifications" : "Mettre en sourdine"}
            >
              {muteStatus?.muted ? (
                <><EyeOff className="w-4 h-4 mr-1" /> Sourdine</>
              ) : (
                <><Eye className="w-4 h-4 mr-1" /> Actif</>
              )}
            </Button>
            <Button size="sm" onClick={() => setNewPostDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nouveau sujet
            </Button>
          </>
        )}
      </div>

      {/* Posts list */}
      {!selectedSession ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Espace collaboratif</h3>
          <p className="text-sm text-muted-foreground">
            Selectionnez une session pour acceder au forum de discussion.
          </p>
        </div>
      ) : postsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun sujet pour cette session. Soyez le premier a en creer un !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setViewingPost(post)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">
                      {post.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.pinned && <Badge variant="secondary" className="text-xs">Epingle</Badge>}
                      <h4 className="text-sm font-medium truncate">{post.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{post.authorName}</span>
                      <RoleBadge role={post.authorRole} />
                      <span className="text-xs text-muted-foreground">{formatPostDate(post.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.content}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New post dialog */}
      <Dialog open={newPostDialogOpen} onOpenChange={setNewPostDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau sujet de discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Sujet de votre message..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Ecrivez votre message..."
                className="resize-none min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewPostDialogOpen(false)}>Annuler</Button>
              <Button
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                onClick={() => createPostMutation.mutate({ sessionId: selectedSession, title: newPostTitle, content: newPostContent })}
              >
                {createPostMutation.isPending ? "Publication..." : "Publier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
