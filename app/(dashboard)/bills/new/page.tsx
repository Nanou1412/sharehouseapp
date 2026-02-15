'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

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
import { createBill } from '@/app/actions/bill-actions';
import { getHouses } from '@/app/actions/property-actions';
import { toast } from 'sonner';
import type { House } from '@/types/database';

const billFormSchema = z.object({
  house_id: z.string().uuid('Please select a property'),
  bill_type: z.enum(['electricity', 'gas', 'water', 'internet', 'council_rates', 'insurance', 'other']),
  total_amount: z.number().positive('Amount must be positive'),
  period_start: z.string().min(1, 'Start date is required'),
  period_end: z.string().min(1, 'End date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  split_mode: z.enum(['included', 'equal_per_occupant', 'per_bed', 'prorata_days', 'flat_weekly_per_person']),
  provider: z.string().optional(),
  account_number: z.string().optional(),
});

type BillFormData = z.infer<typeof billFormSchema>;

export default function NewBillPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    const result = await getHouses();
    if (result.data) {
      setHouses(result.data);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BillFormData>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      bill_type: 'electricity',
      split_mode: 'equal_per_occupant',
    },
  });

  const onSubmit = async (data: BillFormData) => {
    setIsLoading(true);
    try {
      const result = await createBill({
        ...data,
        status: 'pending',
      });
      if (result.error) {
        toast.error('Échec de la création de la facture');
      } else {
        toast.success('Facture créée avec succès');
        router.push('/bills');
      }
    } catch (error) {
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
          <Link href="/bills">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Ajouter une facture</h1>
          <p className="text-muted-foreground">
            Enregistrer une charge ou dépense partagée
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails de la facture</CardTitle>
            <CardDescription>
              Informations de base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="house_id">Propriété *</Label>
                <Select onValueChange={(value) => setValue('house_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.house_id && (
                  <p className="text-sm text-destructive">{errors.house_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill_type">Catégorie *</Label>
                <Select 
                  defaultValue="electricity"
                  onValueChange={(value) => setValue('bill_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electricity">Électricité</SelectItem>
                    <SelectItem value="gas">Gaz</SelectItem>
                    <SelectItem value="water">Eau</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="council_rates">Taxes foncières</SelectItem>
                    <SelectItem value="insurance">Assurance</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bill_type && (
                  <p className="text-sm text-destructive">{errors.bill_type.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Montant total ($) *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  {...register('total_amount', { valueAsNumber: true })}
                />
                {errors.total_amount && (
                  <p className="text-sm text-destructive">{errors.total_amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="split_mode">Mode de répartition *</Label>
                <Select 
                  defaultValue="equal"
                  onValueChange={(value) => setValue('split_mode', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Répartition égale</SelectItem>
                    <SelectItem value="by_bed">Par nombre de lits</SelectItem>
                    <SelectItem value="by_rent">Au prorata du loyer</SelectItem>
                    <SelectItem value="custom">Répartition personnalisée</SelectItem>
                    <SelectItem value="usage">Par consommation</SelectItem>
                  </SelectContent>
                </Select>
                {errors.split_mode && (
                  <p className="text-sm text-destructive">{errors.split_mode.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Période de facturation</CardTitle>
            <CardDescription>
              La période couverte par cette facture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="period_start">Début de période *</Label>
                <Input
                  id="period_start"
                  type="date"
                  {...register('period_start')}
                />
                {errors.period_start && (
                  <p className="text-sm text-destructive">{errors.period_start.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end">Fin de période *</Label>
                <Input
                  id="period_end"
                  type="date"
                  {...register('period_end')}
                />
                {errors.period_end && (
                  <p className="text-sm text-destructive">{errors.period_end.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Date d'échéance *</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                />
                {errors.due_date && (
                  <p className="text-sm text-destructive">{errors.due_date.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations du fournisseur</CardTitle>
            <CardDescription>
              Détails optionnels du fournisseur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Nom du fournisseur</Label>
                <Input
                  id="provider"
                  placeholder="Synergy"
                  {...register('provider')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Numéro de compte</Label>
                <Input
                  id="account_number"
                  placeholder="1234567890"
                  {...register('account_number')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer la facture
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/bills">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
