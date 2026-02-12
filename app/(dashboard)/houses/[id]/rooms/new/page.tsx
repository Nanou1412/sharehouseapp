'use client';

import { useState } from 'react';
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
import { createRoom } from '@/app/actions/property-actions';
import { toast } from 'sonner';

const roomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  room_type: z.enum(['single', 'double', 'shared', 'master']),
  floor_level: z.number().int().optional(),
  weekly_rent: z.number().positive().optional(),
  description: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

interface PageProps {
  params: { id: string };
}

export default function NewRoomPage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_type: 'single',
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    setIsLoading(true);
    try {
      const result = await createRoom({
        ...data,
        house_id: params.id,
        is_active: true,
        has_ensuite: false,
        has_balcony: false,
        has_ac: false,
        couple_allowed: false,
        couple_surcharge: 0,
        max_occupants: 1,
        weekly_rent: data.weekly_rent || 0,
        floor: data.floor_level ?? null,
        room_type: data.room_type === 'shared' ? 'shared' : 'private',
      });
      if (result.error) {
        toast.error('Failed to create room');
      } else {
        toast.success('Room created successfully');
        router.push(`/houses/${params.id}`);
      }
    } catch (error) {
      toast.error('An error occurred');
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
          <h1 className="text-3xl font-bold">Add New Room</h1>
          <p className="text-muted-foreground">
            Create a new room in this property
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
            <CardDescription>
              Basic room information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  placeholder="Room 1"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type *</Label>
                <Select 
                  defaultValue="single"
                  onValueChange={(value) => setValue('room_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
                {errors.room_type && (
                  <p className="text-sm text-destructive">{errors.room_type.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floor_level">Floor Level</Label>
                <Input
                  id="floor_level"
                  type="number"
                  placeholder="0"
                  {...register('floor_level', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_rent">Weekly Rent ($)</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Large room with built-in wardrobe"
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Room
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/houses/${params.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
