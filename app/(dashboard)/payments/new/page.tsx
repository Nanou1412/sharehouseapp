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
import { recordPayment } from '@/app/actions/payment-actions';
import { getTenants } from '@/app/actions/tenant-actions';
import { toast } from 'sonner';
import type { Tenant } from '@/types/database';

const paymentFormSchema = z.object({
  tenant_id: z.string().uuid('Please select a tenant'),
  house_id: z.string().uuid('Please select a property'),
  amount: z.number().positive('Amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['bank_transfer', 'cash', 'card', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  is_advance_payment: z.boolean().default(false),
  is_partial: z.boolean().default(false),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function NewPaymentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    const result = await getTenants();
    if (result) {
      setTenants(result.filter(t => t.status === 'active'));
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    try {
      const result = await recordPayment(data);
      if (result.error) {
        toast.error('Failed to record payment');
      } else {
        toast.success('Payment recorded successfully');
        router.push('/payments');
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
          <Link href="/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">
            Add a new payment from a tenant
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter the payment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenant_id">Tenant *</Label>
                <Select onValueChange={(value) => setValue('tenant_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tenant_id && (
                  <p className="text-sm text-destructive">{errors.tenant_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  {...register('payment_date')}
                />
                {errors.payment_date && (
                  <p className="text-sm text-destructive">{errors.payment_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select 
                  defaultValue="bank_transfer"
                  onValueChange={(value) => setValue('payment_method', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Transaction ID or reference"
                {...register('reference')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Additional notes about this payment"
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Payment
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/payments">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
