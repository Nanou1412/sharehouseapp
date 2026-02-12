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
        toast.error('Failed to create bill');
      } else {
        toast.success('Bill created successfully');
        router.push('/bills');
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
          <Link href="/bills">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Bill</h1>
          <p className="text-muted-foreground">
            Record a utility or shared expense
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
            <CardDescription>
              Basic bill information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="house_id">Property *</Label>
                <Select onValueChange={(value) => setValue('house_id', value)}>
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
                <Label htmlFor="bill_type">Category *</Label>
                <Select 
                  defaultValue="electricity"
                  onValueChange={(value) => setValue('bill_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="council_rates">Council Rates</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bill_type && (
                  <p className="text-sm text-destructive">{errors.bill_type.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount ($) *</Label>
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
                <Label htmlFor="split_mode">Split Mode *</Label>
                <Select 
                  defaultValue="equal"
                  onValueChange={(value) => setValue('split_mode', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select split mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal Split</SelectItem>
                    <SelectItem value="by_bed">By Bed Count</SelectItem>
                    <SelectItem value="by_rent">By Rent Proportion</SelectItem>
                    <SelectItem value="custom">Custom Split</SelectItem>
                    <SelectItem value="usage">By Usage</SelectItem>
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
            <CardTitle>Billing Period</CardTitle>
            <CardDescription>
              The period this bill covers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="period_start">Period Start *</Label>
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
                <Label htmlFor="period_end">Period End *</Label>
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
                <Label htmlFor="due_date">Due Date *</Label>
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
            <CardTitle>Provider Information</CardTitle>
            <CardDescription>
              Optional provider details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider Name</Label>
                <Input
                  id="provider"
                  placeholder="Synergy"
                  {...register('provider')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
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
            Create Bill
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/bills">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
