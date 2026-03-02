'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { bedFormSchema, BedFormData } from '@/zod-schemas';
import { toast } from 'sonner';

interface PageProps {
  params: { id: string; roomId: string };
}

export default function NewBedPage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BedFormData>({
    resolver: zodResolver(bedFormSchema),
    defaultValues: {
      room_id: params.roomId,
      bed_number: 1,
      bed_type: 'single',
      status: 'available',
      is_active: true,
    },
  });

  const onSubmit = async (data: BedFormData) => {
    setIsLoading(true);
    try {
      const result = await createBed(data);
      if (result.error) {
        toast.error('Échec de la création du lit');
      } else {
        toast.success('Lit créé avec succès');
        router.push(`/houses/${params.id}`);
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  {...register('bed_number', { valueAsNumber: true })}
                />
                {errors.bed_number && (
                  <p className="text-sm text-destructive">{errors.bed_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bed_type">Type de lit *</Label>
                <Select 
                  defaultValue="single"
                  onValueChange={(value) => setValue('bed_type', value)}
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
                {errors.bed_type && (
                  <p className="text-sm text-destructive">{errors.bed_type.message}</p>
                )}
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
                  {...register('weekly_rent', { valueAsNumber: true })}
                />
                {errors.weekly_rent && (
                  <p className="text-sm text-destructive">{errors.weekly_rent.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bond_amount">Montant de la caution ($)</Label>
                <Input
                  id="bond_amount"
                  type="number"
                  step="0.01"
                  placeholder="720.00"
                  {...register('bond_amount', { valueAsNumber: true })}
                />
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
                {...register('notes')}
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
