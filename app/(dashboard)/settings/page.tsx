import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Bell, CreditCard, Users, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Gérer les préférences de l&apos;application
        </p>
      </div>

      <div className="grid gap-6">
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Informations de l&apos;entreprise</CardTitle>
            </div>
            <CardDescription>
              Vos coordonnées professionnelles pour les factures et communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nom de l&apos;entreprise</Label>
                <Input
                  id="company_name"
                  placeholder="Perth Sharehouses Pty Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  placeholder="12 345 678 901"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email de contact</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone de contact</Label>
                <Input
                  id="phone"
                  placeholder="(08) 9123 4567"
                />
              </div>
            </div>
            <Button>Enregistrer</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configurer les seuils d&apos;alerte et préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rent_overdue_days">Alerte loyer en retard (jours)</Label>
                <Input
                  id="rent_overdue_days"
                  type="number"
                  defaultValue={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease_expiry_days">Alerte expiration bail (jours)</Label>
                <Input
                  id="lease_expiry_days"
                  type="number"
                  defaultValue={30}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visa_expiry_days">Alerte expiration visa (jours)</Label>
                <Input
                  id="visa_expiry_days"
                  type="number"
                  defaultValue={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_notifications">Notifications par email</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les notifications</SelectItem>
                    <SelectItem value="important">Importantes uniquement</SelectItem>
                    <SelectItem value="none">Aucune</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Paramètres de paiement</CardTitle>
            </div>
            <CardDescription>
              Configurer les options de paiement par défaut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default_bond_weeks">Caution par défaut (semaines)</Label>
                <Input
                  id="default_bond_weeks"
                  type="number"
                  defaultValue={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_day">Jour de paiement par défaut</Label>
                <Select defaultValue="monday">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Lundi</SelectItem>
                    <SelectItem value="tuesday">Mardi</SelectItem>
                    <SelectItem value="wednesday">Mercredi</SelectItem>
                    <SelectItem value="thursday">Jeudi</SelectItem>
                    <SelectItem value="friday">Vendredi</SelectItem>
                    <SelectItem value="saturday">Samedi</SelectItem>
                    <SelectItem value="sunday">Dimanche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_details">Coordonnées bancaires</Label>
              <Input
                id="bank_details"
                placeholder="BSB: 000-000 Compte: 12345678"
              />
              <p className="text-xs text-muted-foreground">
                Affiché sur les factures
              </p>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Membres de l&apos;équipe</CardTitle>
            </div>
            <CardDescription>
              Gérer les accès et les rôles du personnel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Admin User</p>
                  <p className="text-sm text-muted-foreground">admin@example.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    Admin
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline">Inviter un membre</Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Gérer la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <div className="flex gap-2">
                <Input type="password" value="••••••••" disabled className="flex-1" />
                <Button variant="outline">Changer le mot de passe</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Authentification à deux facteurs</Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Non activée</span>
                <Button variant="outline" size="sm">Activer 2FA</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Apparence</CardTitle>
            </div>
            <CardDescription>
              Personnaliser l&apos;apparence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Thème</Label>
              <Select defaultValue="system">
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <Select defaultValue="australia_perth">
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="australia_perth">Australia/Perth (AWST)</SelectItem>
                  <SelectItem value="australia_sydney">Australia/Sydney (AEST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
