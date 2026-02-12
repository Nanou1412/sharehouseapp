'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { resetPassword } from '@/app/actions/auth-actions';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setIsSent(true);
        toast.success('Password reset link sent!');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-xl tracking-tight">ShareHouse Manager</h1>
            <p className="text-xs text-muted-foreground font-medium">Perth, Western Australia</p>
          </div>
        </div>
      </div>

      <Card className="shadow-xl border-0 shadow-black/5 dark:shadow-black/20 overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

        <CardHeader className="space-y-1 text-center pt-8 pb-2">
          {isSent ? (
            <>
              <div className="flex justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold">Check your email</CardTitle>
              <CardDescription>
                We sent a password reset link to <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive a reset link
              </CardDescription>
            </>
          )}
        </CardHeader>

        {!isSent ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
              <Button
                type="submit"
                className="w-full h-11 font-semibold gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardFooter className="flex flex-col gap-4 pb-8 pt-4">
            <p className="text-sm text-center text-muted-foreground">
              Please check your inbox and spam folder.
            </p>
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => setIsSent(false)}
            >
              Try another email
            </Button>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
