'use client';

import { useState } from 'react';
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
import { createBed } from '@/app/actions/property-actions';
import { toast } from 'sonner';

interface PageProps {
  params: { id: string; roomId: string };
}

export default function NewBedPage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [bedNumber, setBedNumber] = useState('1');
  const [bedType, setBedType] = useState('single');
  const [weeklyRent, setWeeklyRent] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation locale simple
    const newErrors: Record<string, string> = {};
    if (!bedNumber || parseInt(bedNumber) < 1) {
      newErrors.bed_number = 'Le numéro du lit doit être au moins 1';
    }
    if (!weeklyRent || parseFloat(weeklyRent) <= 0) {
      newErrors.weekly_rent = 'Le loyer hebdomadaire est requis et doit être positif';
    }
    if (bondAmount && parseFloat(bondAmount) <= 0) {
      newErrors.bond_amount = 'Le montant de la caution doit être positif';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const formData = {
        room_id: params.roomId,
        bed_number: parseInt(bedNumber),
        bed_type: bedType,
        weekly_rent: parseFloat(weeklyRent),
        bond_amount: bondAmount ? parseFloat(bondAmount) : null,
        status: 'available' as const,
        is_active: true,
        notes: notes || null,
      };

      const result = await createBed(formData);
      if (result.error) {
        console.error('Bed creation error:', result.error);
        const errorMsg = typeof result.error === 'object' && '_form' in result.error
          ? (result.error as any)._form?.[0]
          : 'Échec de la création du lit';
        toast.error(errorMsg || 'Échec de la création du lit');
      } else {
        toast.success('Lit créé avec succès');
        router.push(`/houses/${params.id}`);
      }
    } catch (error) {
      console.error('Bed creation exception:', error);
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
          <Link href={`/houses/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Ajouter un lit</h1>
          <p className="text-muted-foreground text-sm">
            Créer un nouveau lit dans cette chambre
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails du lit</CardTitle>
            <CardDescription>
              Spécifications et tarif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bed_number">Numéro du lit *</Label>
                <Input
                  id="bed_number"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                />
                {errors.bed_number && (
                  <p className="text-sm text-destructive">{errors.bed_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bed_type">Type de lit *</Label>
                <Select 
                  value={bedType}
                  onValueChange={setBedType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Simple</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="queen">Queen</SelectItem>
                    <SelectItem value="king">King</SelectItem>
                    <SelectItem value="bunk">Superposé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekly_rent">Loyer hebdomadaire ($) *</Label>
                <Input
                  id="weekly_rent"
                  type="number"
                  step="0.01"
                  placeholder="180.00"
                  value={weeklyRent}
                  onChange={(e) => setWeeklyRent(e.target.value)}
                />
                {errors.weekly_rent && (
                  <p className="text-sm text-destructive">{errors.weekly_rent}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bond_amount">Montant de la caution ($)</Label>
                <Input
                  id="bond_amount"
                  type="number"
                  step="0.01"
                  placeholder="720.00"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(e.target.value)}
                />
                {errors.bond_amount && (
                  <p className="text-sm text-destructive">{errors.bond_amount}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour utiliser la valeur par défaut (4 semaines de loyer)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Informations complémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le lit
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/houses/${params.id}`}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
