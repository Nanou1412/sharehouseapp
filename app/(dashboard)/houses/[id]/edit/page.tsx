'use client';

import { useState, useEffect } from 'react';
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
import { updateHouse, getHouseById } from '@/app/actions/property-actions';
import { toast } from 'sonner';

interface PageProps {
  params: { id: string };
}

export default function EditHousePage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
  });

  useEffect(() => {
    loadHouse();
  }, []);

  const loadHouse = async () => {
    try {
      const result = await getHouseById(params.id);
      if (result) {
        reset({
          name: result.name || '',
          address: result.address || '',
          suburb: result.suburb || '',
          postcode: result.postcode || '',
          property_manager: result.property_manager || '',
          owner_name: result.owner_name || '',
          owner_contact: result.owner_contact || '',
          is_active: result.is_active ?? true,
        });
      }
    } catch (error) {
      toast.error('Impossible de charger la propriété');
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSubmit = async (data: HouseFormData) => {
    setIsLoading(true);
    try {
      const result = await updateHouse(params.id, data);
      if (result.error) {
        toast.error('Échec de la mise à jour');
      } else {
        toast.success('Propriété mise à jour avec succès');
        router.push(`/houses/${params.id}`);
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold">Modifier la propriété</h1>
          <p className="text-muted-foreground text-sm">
            Mettre à jour les informations de la propriété
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de la propriété</CardTitle>
          <CardDescription>
            Modifiez les informations ci-dessous
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la propriété *</Label>
                <Input
                  id="name"
                  placeholder="ex. Maison Northbridge"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suburb">Quartier *</Label>
                <Input
                  id="suburb"
                  placeholder="ex. Northbridge"
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
                placeholder="ex. 123 James Street, Northbridge WA 6003"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Code postal *</Label>
                <Input
                  id="postcode"
                  placeholder="ex. 6003"
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
                  placeholder="Nom du gérant"
                  {...register('property_manager')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Nom du propriétaire</Label>
                <Input
                  id="owner_name"
                  placeholder="Nom du propriétaire"
                  {...register('owner_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_contact">Contact du propriétaire</Label>
                <Input
                  id="owner_contact"
                  placeholder="Téléphone ou email"
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
                Enregistrer les modifications
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/houses/${params.id}`}>Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
