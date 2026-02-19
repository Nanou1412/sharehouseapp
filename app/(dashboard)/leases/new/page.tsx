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
import { createLease } from '@/app/actions/lease-actions';
import { getTenants } from '@/app/actions/tenant-actions';
import { getHouses } from '@/app/actions/property-actions';
import { toast } from 'sonner';
import type { Tenant, House, Room, Bed } from '@/types/database';

const leaseFormSchema = z.object({
  tenant_id: z.string().uuid('Please select a tenant'),
  bed_id: z.string().uuid('Please select a bed'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  weekly_rent: z.number().positive('Weekly rent must be positive'),
  bond_amount: z.number().min(0).optional(),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

export default function NewLeasePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tenantsResult, housesResult] = await Promise.all([
      getTenants(),
      getHouses(),
    ]);
    if (tenantsResult) setTenants(tenantsResult);
    if (housesResult.data) setHouses(housesResult.data);
  };

  const handleHouseChange = (houseId: string) => {
    setSelectedHouse(houseId);
    setSelectedRoom('');
    setBeds([]);
    const house = houses.find(h => h.id === houseId);
    if (house && (house as any).rooms) {
      setRooms((house as any).rooms);
    }
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoom(roomId);
    const room = rooms.find(r => r.id === roomId);
    if (room && (room as any).beds) {
      setBeds((room as any).beds.filter((b: Bed) => b.status !== 'occupied'));
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
  });

  const onSubmit = async (data: LeaseFormData) => {
    setIsLoading(true);
    try {
      const { tenant_id, ...leaseData } = data;
      const result = await createLease({
        ...leaseData,
        house_id: selectedHouse,
        status: 'active',
        notice_period_weeks: 2,
        is_couple: false,
        bond_amount: data.bond_amount || 0,
        tenant_id,
      });
      if (result.error) {
        toast.error('Échec de la création du bail');
      } else {
        toast.success('Bail créé avec succès');
        router.push('/leases');
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
          <Link href="/leases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Créer un nouveau bail</h1>
          <p className="text-muted-foreground text-sm">
            Configurer un nouveau contrat de location
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sélection du locataire</CardTitle>
            <CardDescription>
              Choisir le locataire pour ce bail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Locataire *</Label>
              <Select onValueChange={(value) => setValue('tenant_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.filter(t => t.status !== 'blacklisted').map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} - {tenant.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tenant_id && (
                <p className="text-sm text-destructive">{errors.tenant_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propriété & Lit</CardTitle>
            <CardDescription>
              Sélectionner où le locataire séjournera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Propriété *</Label>
                <Select onValueChange={handleHouseChange}>
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
              </div>

              <div className="space-y-2">
                <Label>Chambre *</Label>
                <Select 
                  onValueChange={handleRoomChange}
                  disabled={!selectedHouse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une chambre" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lit *</Label>
                <Select 
                  onValueChange={(value) => setValue('bed_id', value)}
                  disabled={!selectedRoom}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lit" />
                  </SelectTrigger>
                  <SelectContent>
                    {beds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        Lit {bed.bed_number} - ${bed.weekly_rent}/sem
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bed_id && (
                  <p className="text-sm text-destructive">{errors.bed_id.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions du bail</CardTitle>
            <CardDescription>
              Définir la durée et les conditions de paiement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                />
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour un bail en cours
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekly_rent">Loyer hebdomadaire ($) *</Label>
                <Input
                  id="weekly_rent"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
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
                  placeholder="800.00"
                  {...register('bond_amount', { valueAsNumber: true })}
                />
              </div>


            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le bail
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/leases">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
