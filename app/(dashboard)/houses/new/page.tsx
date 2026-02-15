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
import { houseFormSchema, type HouseFormData } from '@/zod-schemas';
import { createHouse } from '@/app/actions/property-actions';
import { toast } from 'sonner';

export default function NewHousePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: {
      is_active: true,
    },
  });

  const onSubmit = async (data: HouseFormData) => {
    setIsLoading(true);
    try {
      const result = await createHouse(data);
      if (result.error) {
                toast.error('Échec de la création');
      } else {
        toast.success('Maison créée avec succès');
        router.push('/houses');
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
          <Link href="/houses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Ajouter une maison</h1>
          <p className="text-muted-foreground">
            Créer une nouvelle propriété de colocation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de la propriété</CardTitle>
          <CardDescription>
            Entrez les informations de base sur la propriété
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la propriété *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Northbridge House"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb *</Label>
                <Input
                  id="suburb"
                  placeholder="e.g., Northbridge"
                  {...register('suburb')}
                />
                {errors.suburb && (
                  <p className="text-sm text-destructive">{errors.suburb.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse complète *</Label>
              <Input
                id="address"
                placeholder="e.g., 123 James Street, Northbridge WA 6003"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  placeholder="e.g., 6003"
                  {...register('postcode')}
                />
                {errors.postcode && (
                  <p className="text-sm text-destructive">{errors.postcode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_manager">Gérant</Label>
                <Input
                  id="property_manager"
                  placeholder="Manager name"
                  {...register('property_manager')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Nom du propriétaire</Label>
                <Input
                  id="owner_name"
                  placeholder="Owner name"
                  {...register('owner_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_contact">Contact du propriétaire</Label>
                <Input
                  id="owner_contact"
                  placeholder="Phone or email"
                  {...register('owner_contact')}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">Propriété active</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer la maison
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/houses">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
