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
        toast.error('Failed to create maintenance ticket');
      } else {
        toast.success('Maintenance ticket created');
        router.push('/maintenance');
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
          <Link href="/maintenance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Maintenance Request</h1>
          <p className="text-muted-foreground">
            Report a maintenance issue
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Where is the issue located?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select onValueChange={handleHouseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
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
                <Label>Room (Optional)</Label>
                <Select 
                  onValueChange={(value) => setValue('room_id', value)}
                  disabled={rooms.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
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
            <CardTitle>Issue Details</CardTitle>
            <CardDescription>
              Describe the maintenance issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Leaking tap in bathroom"
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
                placeholder="Provide detailed information about the issue..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  defaultValue="other"
                  onValueChange={(value) => setValue('category', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="pest">Pest Control</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select 
                  defaultValue="medium"
                  onValueChange={(value) => setValue('priority', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Ticket
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/maintenance">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
