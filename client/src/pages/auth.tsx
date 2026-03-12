import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { LogIn, UserPlus, Shield, Users, Building2, BookOpen } from "lucide-react";
import { USER_ROLES } from "@shared/schema";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [isPending, setIsPending] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register({ username, password, role, firstName, lastName, email: email || undefined });
      }
    } catch (err: any) {
      toast({
        title: mode === "login" ? "Erreur de connexion" : "Erreur d'inscription",
        description: err?.message || "Veuillez vérifier vos informations",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const roleIcons: Record<string, typeof Shield> = {
    admin: Shield,
    trainer: Users,
    trainee: BookOpen,
    enterprise: Building2,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img
              src="/logo-sosafe.png"
              alt="SO'SAFE"
              className="h-16 object-contain dark:hidden"
            />
            <img
              src="/logo-sosafe-white.png"
              alt="SO'SAFE"
              className="h-16 object-contain hidden dark:block"
            />
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-app-title">Plateforme de gestion de formation</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-center">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        data-testid="input-register-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger data-testid="select-register-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => {
                          const Icon = roleIcons[r.value] || Shield;
                          return (
                            <SelectItem key={r.value} value={r.value}>
                              <span className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {r.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur ou email</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nom d'utilisateur ou email"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  data-testid="input-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
                {isPending ? (
                  "Chargement..."
                ) : mode === "login" ? (
                  <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> Se connecter</span>
                ) : (
                  <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> S'inscrire</span>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-auth-mode"
              >
                {mode === "login"
                  ? "Pas encore de compte ? S'inscrire"
                  : "Déjà un compte ? Se connecter"}
              </button>
            </div>
            {mode === "login" && (
              <div className="mt-4 p-3 rounded-md bg-accent/50 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Compte admin par défaut :</p>
                <p>Utilisateur : <code className="bg-accent px-1 rounded">admin</code></p>
                <p>Mot de passe : <code className="bg-accent px-1 rounded">admin123</code></p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
