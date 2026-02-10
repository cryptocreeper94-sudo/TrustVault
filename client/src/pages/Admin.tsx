import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, UserPlus, Trash2, Copy, Check, Users, Shield, Mail, Loader2,
  ExternalLink, ClipboardCopy, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import trustlayerEmblem from "@assets/images/trustvault-emblem.png";

type WhitelistEntry = {
  id: number;
  name: string;
  email: string | null;
  inviteCode: string;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
};

type AdminUser = {
  id: number;
  name: string;
  email: string | null;
  tenantId: string | null;
  isAdmin: boolean;
  mustReset: boolean;
  createdAt: string;
};

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCode, setNewCode] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: entries, isLoading: loadingEntries } = useQuery<WhitelistEntry[]>({
    queryKey: ["/api/whitelist"],
    enabled: !!user?.isAdmin,
  });

  const { data: users, isLoading: loadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; customCode?: string }) => {
      const res = await apiRequest("POST", "/api/whitelist", data);
      return res.json();
    },
    onSuccess: (entry: WhitelistEntry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist"] });
      setNewName("");
      setNewEmail("");
      setNewCode("");
      toast({ title: "Invite created", description: `Code: ${entry.inviteCode}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whitelist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist"] });
      toast({ title: "Invite removed" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      customCode: newCode.trim() || undefined,
    });
  };

  const copyInviteLink = (entry: WhitelistEntry) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join?code=${entry.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copied!", description: "Ready to share" });
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold mb-2">Admin Access Only</h1>
          <p className="text-sm text-muted-foreground mb-4">This area is restricted to administrators.</p>
          <Button asChild variant="outline">
            <Link href="/" data-testid="link-admin-back">Back to Vault</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Developer Portal | DW Media Studio</title>
        <meta name="description" content="Admin dashboard for managing users and invites." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass-morphism border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" data-testid="button-admin-back">
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <img src={trustlayerEmblem} alt="TrustLayer" className="w-7 h-7 rounded-lg object-cover" />
                <h1 className="font-display font-bold text-base" data-testid="text-admin-title">Developer Portal</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-xs" data-testid="badge-admin">Admin</Badge>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold" data-testid="text-invite-section">Invite New Users</h2>
            </div>
            <Card className="p-5">
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Person's name"
                    className="flex-1"
                    data-testid="input-whitelist-name"
                    disabled={createMutation.isPending}
                  />
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email (optional)"
                    type="email"
                    className="flex-1"
                    data-testid="input-whitelist-email"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="Custom code (optional, e.g. NATALIE-24)"
                      className="pl-10 font-mono tracking-wider uppercase"
                      data-testid="input-whitelist-code"
                      disabled={createMutation.isPending}
                      maxLength={20}
                    />
                  </div>
                  <Button type="submit" className="gap-2 shrink-0" disabled={createMutation.isPending || !newName.trim()} data-testid="button-whitelist-add">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Create Invite
                  </Button>
                </div>
              </form>
              <p className="text-[11px] text-muted-foreground/60 mt-3">
                Enter a name and optionally choose a custom invite code (letters, numbers, dashes). Leave the code blank to auto-generate one.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCopy className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold" data-testid="text-pending-section">Pending Invites</h2>
              {entries && <Badge variant="secondary" className="text-xs">{entries.filter(e => !e.used).length}</Badge>}
            </div>

            {loadingEntries ? (
              <Card className="p-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </Card>
            ) : entries && entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-whitelist-name-${entry.id}`}>{entry.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground" data-testid={`text-whitelist-code-${entry.id}`}>
                              {entry.inviteCode}
                            </span>
                            {entry.email && (
                              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {entry.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.used ? (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-whitelist-used-${entry.id}`}>Used</Badge>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => copyInviteLink(entry)}
                              data-testid={`button-whitelist-copy-${entry.id}`}
                            >
                              {copiedId === entry.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === entry.id ? "Copied" : "Copy Link"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-whitelist-delete-${entry.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No invites yet. Add someone above to get started.</p>
              </Card>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold" data-testid="text-users-section">All Users</h2>
              {users && <Badge variant="secondary" className="text-xs">{users.length}</Badge>}
            </div>

            {loadingUsers ? (
              <Card className="p-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </Card>
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((u) => (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {u.isAdmin ? <Shield className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-user-name-${u.id}`}>{u.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {u.email && (
                              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.isAdmin && <Badge variant="default" className="text-xs" data-testid={`badge-user-admin-${u.id}`}>Admin</Badge>}
                        {u.mustReset && <Badge variant="secondary" className="text-xs" data-testid={`badge-user-reset-${u.id}`}>Needs Reset</Badge>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No users found.</p>
              </Card>
            )}
          </motion.div>

          <div className="pt-4 border-t border-border/50 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              DW Media Studio Developer Portal
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
