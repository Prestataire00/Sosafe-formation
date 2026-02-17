import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Zap,
  Users,
  Save,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldAlert,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type {
  AutomationRule,
  InsertAutomationRule,
  EmailTemplate,
  User,
  Trainer,
  Trainee,
  Enterprise,
} from "@shared/schema";
import {
  AUTOMATION_EVENTS,
  AUTOMATION_ACTIONS,
  USER_ROLES,
  ADMIN_PERMISSIONS,
} from "@shared/schema";

// ============================================================
// Tab: Organisme
// ============================================================

function OrganismeTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    org_name: "",
    org_address: "",
    org_siret: "",
    org_email: "",
    org_phone: "",
    org_logo_url: "",
  });

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setForm({
        org_name: settings.org_name || "",
        org_address: settings.org_address || "",
        org_siret: settings.org_siret || "",
        org_email: settings.org_email || "",
        org_phone: settings.org_phone || "",
        org_logo_url: settings.org_logo_url || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Paramètres enregistrés avec succès" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de l'enregistrement",
        variant: "destructive",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Informations de l'organisme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Nom de l'organisme</Label>
              <Input
                id="org_name"
                value={form.org_name}
                onChange={(e) => updateField("org_name", e.target.value)}
                placeholder="SO'SAFE Formation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_siret">SIRET</Label>
              <Input
                id="org_siret"
                value={form.org_siret}
                onChange={(e) => updateField("org_siret", e.target.value)}
                placeholder="123 456 789 00012"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_address">Adresse</Label>
            <Input
              id="org_address"
              value={form.org_address}
              onChange={(e) => updateField("org_address", e.target.value)}
              placeholder="123 rue de la Formation, 75001 Paris"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org_email">Email</Label>
              <Input
                id="org_email"
                type="email"
                value={form.org_email}
                onChange={(e) => updateField("org_email", e.target.value)}
                placeholder="contact@sosafe.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_phone">Téléphone</Label>
              <Input
                id="org_phone"
                value={form.org_phone}
                onChange={(e) => updateField("org_phone", e.target.value)}
                placeholder="01 23 45 67 89"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_logo_url">URL du logo</Label>
            <Input
              id="org_logo_url"
              value={form.org_logo_url}
              onChange={(e) => updateField("org_logo_url", e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tab: Automatisation
// ============================================================

function EventBadge({ event }: { event: string }) {
  const labels: Record<string, string> = {};
  AUTOMATION_EVENTS.forEach((e) => {
    labels[e.value] = e.label;
  });
  return (
    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {labels[event] || event}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, string> = {};
  AUTOMATION_ACTIONS.forEach((a) => {
    labels[a.value] = a.label;
  });
  return (
    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      {labels[action] || action}
    </Badge>
  );
}

function AutomationRuleForm({
  rule,
  templates,
  onSubmit,
  isPending,
}: {
  rule?: AutomationRule;
  templates: EmailTemplate[];
  onSubmit: (data: InsertAutomationRule) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [event, setEvent] = useState(rule?.event || AUTOMATION_EVENTS[0].value);
  const [action, setAction] = useState(rule?.action || AUTOMATION_ACTIONS[0].value);
  const [templateId, setTemplateId] = useState(rule?.templateId || "");
  const [delay, setDelay] = useState(rule?.delay?.toString() || "0");
  const [active, setActive] = useState(rule?.active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      event,
      action,
      templateId: templateId || null,
      delay: parseInt(delay) || 0,
      active,
      conditions: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rule-name">Nom de la règle</Label>
        <Input
          id="rule-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Convocation automatique"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Événement déclencheur</Label>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_EVENTS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Template email</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-delay">Délai (minutes)</Label>
        <Input
          id="rule-delay"
          type="number"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          min="0"
          placeholder="0"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="rule-active"
          checked={active}
          onCheckedChange={setActive}
        />
        <Label htmlFor="rule-active">Règle active</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : rule ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function AutomatisationTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | undefined>();

  const { data: rules, isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation-rules"],
  });

  const { data: templates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertAutomationRule) =>
      apiRequest("POST", "/api/automation-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      setDialogOpen(false);
      toast({ title: "Règle créée avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertAutomationRule }) =>
      apiRequest("PATCH", `/api/automation-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      setDialogOpen(false);
      setEditRule(undefined);
      toast({ title: "Règle modifiée avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/automation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Règle supprimée" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PATCH", `/api/automation-rules/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const templateNames: Record<string, string> = {};
  templates?.forEach((t) => {
    templateNames[t.id] = t.name;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Règles d'automatisation
        </CardTitle>
        <Button
          onClick={() => {
            setEditRule(undefined);
            setDialogOpen(true);
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle règle
        </Button>
      </CardHeader>
      <CardContent>
        {!rules || rules.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Aucune règle</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre première règle d'automatisation
            </p>
            <Button
              onClick={() => {
                setEditRule(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une règle
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Délai</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <EventBadge event={rule.event} />
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={rule.action} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.templateId
                      ? templateNames[rule.templateId] || "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.delay ? `${rule.delay} min` : "Immédiat"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.active ?? false}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: rule.id,
                          active: checked,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditRule(rule);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditRule(undefined);
          }}
        >
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editRule
                  ? "Modifier la règle"
                  : "Nouvelle règle d'automatisation"}
              </DialogTitle>
            </DialogHeader>
            <AutomationRuleForm
              rule={editRule}
              templates={templates || []}
              onSubmit={(data) =>
                editRule
                  ? updateMutation.mutate({ id: editRule.id, data })
                  : createMutation.mutate(data)
              }
              isPending={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tab: Utilisateurs
// ============================================================

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {};
  USER_ROLES.forEach((r) => {
    labels[r.value] = r.label;
  });
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    trainer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    trainee: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[role] || ""}`}>
      {labels[role] || role}
    </Badge>
  );
}

const PERM_GROUP_LABELS: Record<string, string> = {
  administration: "Administration",
  contacts: "Contacts",
  formation: "Formation",
  commercial: "Commercial",
  qualite: "Qualité",
};

function UtilisateursTab() {
  const { toast } = useToast();
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PATCH", `/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Rôle mis à jour avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour du rôle", variant: "destructive" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; trainerId?: string | null; traineeId?: string | null; enterpriseId?: string | null }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Profil associé mis à jour" });
    },
    onError: () =>
      toast({ title: "Erreur lors de l'association du profil", variant: "destructive" }),
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiRequest("PATCH", `/api/users/${id}`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setPermDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Permissions mises à jour avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour des permissions", variant: "destructive" }),
  });

  const openPermDialog = (user: User) => {
    setEditingUser(user);
    setSelectedPerms((user.permissions as string[]) || []);
    setPermDialogOpen(true);
  };

  const togglePerm = (value: string) => {
    setSelectedPerms(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  const allPermValues = Object.values(ADMIN_PERMISSIONS).flat().map(p => p.value);
  const allSelected = allPermValues.length > 0 && allPermValues.every(v => selectedPerms.includes(v));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPerms([]);
    } else {
      setSelectedPerms([...allPermValues]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestion des utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!users || users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Aucun utilisateur</h3>
            <p className="text-sm text-muted-foreground">
              Aucun utilisateur trouvé dans le système
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Modifier le rôle</TableHead>
                <TableHead>Profil associé</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.firstName}</TableCell>
                  <TableCell>{user.lastName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email || "—"}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        updateRoleMutation.mutate({ id: user.id, role })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.role === "trainer" && (
                      <Select
                        value={user.trainerId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            trainerId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {trainers?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "trainee" && (
                      <Select
                        value={user.traineeId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            traineeId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {trainees?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "enterprise" && (
                      <Select
                        value={user.enterpriseId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            enterpriseId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {enterprises?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "admin" && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermDialog(user)}
                        title="Gérer les permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={permDialogOpen}
        onOpenChange={(open) => {
          setPermDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissions - {editingUser?.firstName} {editingUser?.lastName}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mb-4">
            Un administrateur sans permissions spécifiques a accès à toutes les fonctionnalités.
          </p>

          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
          </div>

          <div className="space-y-5">
            {(Object.keys(ADMIN_PERMISSIONS) as Array<keyof typeof ADMIN_PERMISSIONS>).map((group) => (
              <div key={group}>
                <h4 className="font-semibold text-sm mb-2">
                  {PERM_GROUP_LABELS[group] || group}
                </h4>
                <div className="space-y-2 ml-1">
                  {ADMIN_PERMISSIONS[group].map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPerms.includes(perm.value)}
                        onCheckedChange={() => togglePerm(perm.value)}
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => {
                if (editingUser) {
                  updatePermsMutation.mutate({
                    id: editingUser.id,
                    permissions: selectedPerms,
                  });
                }
              }}
              disabled={updatePermsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updatePermsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Main Settings Page
// ============================================================

export default function Settings() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accès réservé aux administrateurs</h1>
        <p className="text-muted-foreground">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez les paramètres de votre plateforme SO'SAFE
        </p>
      </div>

      <Tabs defaultValue="organisme" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organisme" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organisme
          </TabsTrigger>
          <TabsTrigger value="automatisation" className="gap-2">
            <Zap className="w-4 h-4" />
            Automatisation
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organisme">
          <OrganismeTab />
        </TabsContent>

        <TabsContent value="automatisation">
          <AutomatisationTab />
        </TabsContent>

        <TabsContent value="utilisateurs">
          <UtilisateursTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
