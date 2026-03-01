import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Users,
  User,
  Circle,
  ArrowLeft,
} from "lucide-react";

interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userRole: string;
  joinedAt: string;
  lastReadAt: string | null;
}

interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: string;
  title: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

interface AvailableUser {
  id: string;
  name: string;
  role: string;
}

function roleBadge(role: string) {
  const map: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    trainer: { label: "Formateur", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    trainee: { label: "Apprenant", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    enterprise: { label: "Entreprise", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  const info = map[role] || { label: role, className: "bg-gray-100 text-gray-700" };
  return <Badge className={`text-xs ${info.className}`}>{info.label}</Badge>;
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.title) return conv.title;
  if (conv.type === "direct") {
    const other = conv.participants.find(p => p.userId !== currentUserId);
    return other?.userName || "Conversation";
  }
  return conv.participants.map(p => p.userName).join(", ");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function Messaging() {
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newConvDialog, setNewConvDialog] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Récupérer l'utilisateur connecté
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: conversations, isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  });

  const { data: availableUsers } = useQuery<AvailableUser[]>({
    queryKey: ["/api/conversations/available-users"],
    enabled: newConvDialog,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<DirectMessage[]>({
    queryKey: ["/api/messages", selectedConvId],
    queryFn: () => apiRequest("GET", `/api/messages?conversationId=${selectedConvId}`).then(r => r.json()),
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  const createConvMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/conversations", data),
    onSuccess: async (res) => {
      const conv = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConvId(conv.id);
      setNewConvDialog(false);
      setSelectedUsers([]);
      setGroupTitle("");
      setIsGroup(false);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageInput("");
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConvId(null);
      toast({ title: "Conversation supprimée" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConvId) return;
    sendMessageMutation.mutate({ conversationId: selectedConvId, content: messageInput.trim() });
  };

  const handleCreateConv = () => {
    if (selectedUsers.length === 0) return;
    createConvMutation.mutate({
      type: isGroup || selectedUsers.length > 1 ? "group" : "direct",
      title: isGroup ? groupTitle || undefined : undefined,
      participantIds: selectedUsers,
    });
  };

  const filteredConvs = conversations?.filter(c => {
    if (!search) return true;
    const name = getConversationName(c, currentUser?.id || "");
    return name.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const filteredUsers = availableUsers?.filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.role.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  return (
    <PageLayout>
      <PageHeader
        title="Messagerie"
        subtitle="Messagerie interne de la plateforme"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {/* Liste des conversations */}
        <div className="border-r flex flex-col bg-card">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="flex-1 h-9" />
              <Button size="sm" onClick={() => setNewConvDialog(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucune conversation</p>
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => setNewConvDialog(true)}>
                  Démarrer une conversation
                </Button>
              </div>
            ) : (
              filteredConvs.map(conv => (
                <div
                  key={conv.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConvId === conv.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConvId(conv.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {conv.type === "group" ? (
                        <Users className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {getConversationName(conv, currentUser?.id || "")}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}`
                            : "Pas encore de messages"
                          }
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-[20px] flex items-center justify-center text-xs bg-primary">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zone de messages */}
        <div className="col-span-2 flex flex-col bg-background">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sélectionnez une conversation ou créez-en une nouvelle</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header conversation */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setSelectedConvId(null)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedConv.type === "group" ? (
                      <Users className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {getConversationName(selectedConv, currentUser?.id || "")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv.participants.length} participant{selectedConv.participants.length > 1 ? "s" : ""}
                      {selectedConv.type === "group" && (
                        <> — {selectedConv.participants.map(p => p.userName).join(", ")}</>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteConvMutation.mutate(selectedConv.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] ${isMe ? "order-last" : ""}`}>
                          {!isMe && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-medium">{msg.senderName}</span>
                              {roleBadge(msg.senderRole)}
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-muted-foreground mt-1 ${isMe ? "text-right" : ""}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <p>Aucun message. Commencez la conversation !</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Saisie message */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Écrire un message..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog nouvelle conversation */}
      <Dialog open={newConvDialog} onOpenChange={setNewConvDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="group"
                checked={isGroup}
                onCheckedChange={(v) => setIsGroup(v as boolean)}
              />
              <Label htmlFor="group">Message groupé</Label>
            </div>

            {isGroup && (
              <div>
                <Label>Nom du groupe</Label>
                <Input
                  value={groupTitle}
                  onChange={e => setGroupTitle(e.target.value)}
                  placeholder="Ex: Formation AFGSU - Mars 2026"
                />
              </div>
            )}

            <div>
              <Label>Rechercher des participants</Label>
              <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Nom ou rôle..." />
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(uid => {
                  const u = availableUsers?.find(u => u.id === uid);
                  return u ? (
                    <Badge key={uid} variant="secondary" className="cursor-pointer" onClick={() => setSelectedUsers(prev => prev.filter(id => id !== uid))}>
                      {u.name} ✕
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${
                    selectedUsers.includes(u.id) ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    if (isGroup) {
                      setSelectedUsers(prev =>
                        prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                      );
                    } else {
                      setSelectedUsers([u.id]);
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                  </div>
                  {roleBadge(u.role)}
                  {selectedUsers.includes(u.id) && (
                    <Circle className="w-4 h-4 fill-primary text-primary" />
                  )}
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground text-center">Aucun utilisateur trouvé</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewConvDialog(false)}>Annuler</Button>
              <Button onClick={handleCreateConv} disabled={selectedUsers.length === 0}>
                Démarrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
