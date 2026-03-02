'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordPayment } from '@/app/actions/payment-actions';
import { getTenants } from '@/app/actions/tenant-actions';
import { getHouses } from '@/app/actions/property-actions';
import { toast } from 'sonner';

interface SimpleTenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface SimpleHouse {
  id: string;
  name: string;
  address: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<SimpleTenant[]>([]);
  const [houses, setHouses] = useState<SimpleHouse[]>([]);

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantsResult, housesResult] = await Promise.all([
        getTenants(),
        getHouses(),
      ]);
      if (Array.isArray(tenantsResult)) {
        setTenants((tenantsResult as SimpleTenant[]).filter(t => t.status === 'active'));
      }
      if (housesResult?.data) {
        setHouses(housesResult.data as SimpleHouse[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenant || !selectedHouse || !amount || !paymentDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Le montant doit être positif');
      return;
    }

    setIsLoading(true);
    try {
      const result = await recordPayment({
        house_id: selectedHouse,
        tenant_id: selectedTenant,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod as any,
        reference: reference || null,
        notes: notes || null,
        is_advance_payment: false,
        is_partial: false,
      });
      if (result.error) {
        console.error('Payment creation error:', result.error);
        const errorMsg = typeof result.error === 'object' && '_form' in result.error
          ? (result.error as any)._form?.[0]
          : 'Échec de l\'enregistrement du paiement';
        toast.error(errorMsg || 'Échec de l\'enregistrement du paiement');
      } else {
        toast.success('Paiement enregistré avec succès');
        router.push('/payments');
      }
    } catch (error) {
      console.error('Payment creation exception:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Enregistrer un paiement</h1>
          <p className="text-muted-foreground text-sm">
            Ajouter un nouveau paiement d&apos;un locataire
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails du paiement</CardTitle>
            <CardDescription>
              Saisir les informations du paiement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Locataire *</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un locataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Propriété *</Label>
                <Select value={selectedHouse} onValueChange={setSelectedHouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name || house.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Date du paiement *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Méthode de paiement *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Numéro de référence</Label>
                <Input
                  id="reference"
                  placeholder="ID de transaction ou référence"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Notes supplémentaires sur ce paiement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le paiement
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/payments">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
