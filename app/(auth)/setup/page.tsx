'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Shield, CheckCircle2, User, Mail, Phone, Lock, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SetupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/setup/check');
        const data = await res.json();
        if (!data.needsSetup) {
          router.replace('/login');
        }
      } catch {
        // If check fails, allow setup anyway
      } finally {
        setIsChecking(false);
      }
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Échec de la configuration');
        return;
      }

      setIsComplete(true);
      toast.success('Compte administrateur créé !');

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (error) {
      toast.error('Une erreur est survenue lors de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4 animate-pulse">
          <Building2 className="h-7 w-7" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-md mx-auto text-center animate-fade-in py-10">
        <div className="relative mx-auto mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 animate-bounce" style={{ right: 'calc(50% - 50px)' }}>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Tout est prêt !</h2>
        <p className="text-muted-foreground mb-8">
          Votre compte administrateur a été créé avec succès.<br />
          Redirection vers la connexion...
        </p>
        <div className="flex justify-center gap-1 mb-6">
          <div className="h-1.5 w-8 rounded-full bg-green-500 animate-pulse" />
          <div className="h-1.5 w-8 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '100ms' }} />
          <div className="h-1.5 w-8 rounded-full bg-green-300 animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
        <Button onClick={() => router.push('/login')} size="lg" className="gap-2">
          Aller à la connexion
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header above card */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-xl tracking-tight">ShareHouse Manager</h1>
            <p className="text-xs text-muted-foreground font-medium">Perth, Australie-Occidentale</p>
          </div>
        </div>
      </div>

      <Card className="shadow-xl border-0 shadow-black/5 dark:shadow-black/20 overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

          <CardHeader className="space-y-1 text-center pt-8 pb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">Configuration initiale</CardTitle>
            <CardDescription className="text-balance">
              Créez votre compte administrateur pour commencer à gérer vos propriétés.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nom complet
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Téléphone <span className="normal-case font-normal">(optionnel)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+61 4XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">Sécurité</span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="pl-10 pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= level
                              ? level === 1 ? 'bg-red-400' : level === 2 ? 'bg-amber-400' : 'bg-green-400'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      passwordStrength === 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {passwordStrength === 1 ? 'Faible' : passwordStrength === 2 ? 'Bon' : 'Fort'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className={`pl-10 pr-10 h-11 ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-green-400 focus-visible:ring-green-400/20'
                          : 'border-red-400 focus-visible:ring-red-400/20'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-[11px] text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-800/30 p-4">
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Que se passe-t-il ensuite ?
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1.5 text-xs">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                    <span>Votre compte admin sera créé instantanément — pas de confirmation par e-mail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                    <span>Connectez-vous et commencez à ajouter des maisons, chambres et locataires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                    <span>Invitez d&apos;autres gérants depuis la page Paramètres</span>
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pb-8 pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
                size="lg" 
                disabled={isLoading || !fullName || !email || !password || !passwordsMatch}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Créer le compte admin
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Cette page de configuration n&apos;est disponible qu&apos;une seule fois — quand aucun utilisateur n&apos;existe.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
  );
}
