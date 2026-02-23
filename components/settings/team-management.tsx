'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, UserPlus, Copy, Check, Shield, Briefcase, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { inviteMember, updateMemberRole, removeMember } from '@/app/actions/auth-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface TeamManagementProps {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  maintenance: 'Maintenance',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  maintenance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  manager: <Briefcase className="h-3 w-3" />,
  maintenance: <Wrench className="h-3 w-3" />,
};

export function TeamManagement({ members, currentUserId, isAdmin }: TeamManagementProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'maintenance'>('manager');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email || !fullName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const result = await inviteMember(email, fullName, role);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Membre invité avec succès !');
        setTempPassword(result.tempPassword || null);
        router.refresh();
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseInvite = () => {
    setIsInviteOpen(false);
    setEmail('');
    setFullName('');
    setRole('manager');
    setTempPassword(null);
    setCopied(false);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingId(memberId);
    try {
      const result = await updateMemberRole(memberId, newRole as 'admin' | 'manager' | 'maintenance');
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Rôle mis à jour');
        router.refresh();
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${memberName} de l'équipe ?`)) {
      return;
    }

    setDeletingId(memberId);
    try {
      const result = await removeMember(memberId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Membre supprimé');
        router.refresh();
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Membres de l&apos;équipe</CardTitle>
              <CardDescription>
                {members.length} membre{members.length > 1 ? 's' : ''} dans l&apos;équipe
              </CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isInviteOpen} onOpenChange={(open) => {
              if (!open) handleCloseInvite();
              else setIsInviteOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Inviter un membre
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Inviter un nouveau membre</DialogTitle>
                  <DialogDescription>
                    Le membre sera créé avec un mot de passe temporaire à communiquer.
                  </DialogDescription>
                </DialogHeader>

                {!tempPassword ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-name">Nom complet *</Label>
                      <Input
                        id="invite-name"
                        placeholder="Jean Dupont"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email *</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="jean@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Rôle</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrateur — Accès complet</SelectItem>
                          <SelectItem value="manager">Gestionnaire — Gestion courante</SelectItem>
                          <SelectItem value="maintenance">Maintenance — Tickets uniquement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseInvite}>
                        Annuler
                      </Button>
                      <Button onClick={handleInvite} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Inviter
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        ✅ Membre créé avec succès !
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Mot de passe temporaire</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                            {tempPassword}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={handleCopyPassword}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Communiquez ce mot de passe au membre. Il pourra le changer dans ses paramètres.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCloseInvite}>
                        Fermer
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {member.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {member.full_name}
                    {member.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-12 sm:ml-0">
                {isAdmin && member.id !== currentUserId ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v)}
                      disabled={updatingId === member.id}
                    >
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="manager">Gestionnaire</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(member.id, member.full_name)}
                      disabled={deletingId === member.id}
                    >
                      {deletingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Badge className={`${roleColors[member.role] || ''} gap-1`} variant="outline">
                    {roleIcons[member.role]}
                    {roleLabels[member.role] || member.role}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun membre dans l&apos;équipe</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
