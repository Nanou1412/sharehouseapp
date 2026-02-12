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
import { createBed } from '@/app/actions/property-actions';
import { toast } from 'sonner';

const bedFormSchema = z.object({
  label: z.string().min(1, 'Bed label is required'),
  bed_type: z.enum(['single', 'double', 'queen', 'king', 'bunk']),
  weekly_rent: z.number().positive('Weekly rent must be positive'),
  bond_amount: z.number().positive().optional(),
});

type BedFormData = z.infer<typeof bedFormSchema>;

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
      bed_type: 'single',
    },
  });

  const onSubmit = async (data: BedFormData) => {
    setIsLoading(true);
    try {
      const result = await createBed({
        ...data,
        room_id: params.roomId,
        status: 'available',
        is_active: true,
        bed_number: 1, // Default value, can be adjusted
      });
      if (result.error) {
        toast.error('Failed to create bed');
      } else {
        toast.success('Bed created successfully');
        router.push(`/houses/${params.id}/rooms/${params.roomId}`);
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
          <Link href={`/houses/${params.id}/rooms/${params.roomId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Bed</h1>
          <p className="text-muted-foreground">
            Create a new bed in this room
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bed Details</CardTitle>
            <CardDescription>
              Bed specifications and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="label">Bed Label *</Label>
                <Input
                  id="label"
                  placeholder="Bed A"
                  {...register('label')}
                />
                {errors.label && (
                  <p className="text-sm text-destructive">{errors.label.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bed_type">Bed Type *</Label>
                <Select 
                  defaultValue="single"
                  onValueChange={(value) => setValue('bed_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bed type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="queen">Queen</SelectItem>
                    <SelectItem value="king">King</SelectItem>
                    <SelectItem value="bunk">Bunk</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bed_type && (
                  <p className="text-sm text-destructive">{errors.bed_type.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekly_rent">Weekly Rent ($) *</Label>
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
                <Label htmlFor="bond_amount">Bond Amount ($)</Label>
                <Input
                  id="bond_amount"
                  type="number"
                  step="0.01"
                  placeholder="720.00"
                  {...register('bond_amount', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use default (4 weeks rent)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Bed
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/houses/${params.id}/rooms/${params.roomId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
