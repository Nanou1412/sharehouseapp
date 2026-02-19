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
import { createTicket } from '@/app/actions/maintenance-actions';
import { getHouses } from '@/app/actions/property-actions';
import { toast } from 'sonner';
import type { House, Room } from '@/types/database';

const ticketFormSchema = z.object({
  house_id: z.string().uuid('Please select a property'),
  room_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['plumbing', 'electrical', 'appliance', 'structural', 'pest', 'cleaning', 'other']),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

export default function NewMaintenancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    const result = await getHouses();
    if (result.data) {
      setHouses(result.data);
    }
  };

  const handleHouseChange = (houseId: string) => {
    setValue('house_id', houseId);
    setValue('room_id', undefined);
    const house = houses.find(h => h.id === houseId);
    if (house && (house as any).rooms) {
      setRooms((house as any).rooms);
    } else {
      setRooms([]);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      priority: 'medium',
      category: 'other',
    },
  });

  const onSubmit = async (data: TicketFormData) => {
    setIsLoading(true);
    try {
      const result = await createTicket({
        ...data,
        status: 'open',
        responsibility: 'landlord',
      });
      if (result.error) {
        toast.error('Échec de la création du ticket');
      } else {
        toast.success('Ticket de maintenance créé');
        router.push('/maintenance');
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
          <Link href="/maintenance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nouvelle demande de maintenance</h1>
          <p className="text-muted-foreground text-sm">
            Signaler un problème de maintenance
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Localisation</CardTitle>
            <CardDescription>
              Où se situe le problème ?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                {errors.house_id && (
                  <p className="text-sm text-destructive">{errors.house_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Chambre (Optionnel)</Label>
                <Select 
                  onValueChange={(value) => setValue('room_id', value)}
                  disabled={rooms.length === 0}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails du problème</CardTitle>
            <CardDescription>
              Décrire le problème de maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="ex. Fuite du robinet dans la salle de bain"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Décrivez le problème en détail..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select 
                  defaultValue="other"
                  onValueChange={(value) => setValue('category', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plomberie</SelectItem>
                    <SelectItem value="electrical">Électricité</SelectItem>
                    <SelectItem value="appliance">Électroménager</SelectItem>
                    <SelectItem value="structural">Structure</SelectItem>
                    <SelectItem value="pest">Nuisibles</SelectItem>
                    <SelectItem value="cleaning">Nettoyage</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorité *</Label>
                <Select 
                  defaultValue="medium"
                  onValueChange={(value) => setValue('priority', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le ticket
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/maintenance">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
