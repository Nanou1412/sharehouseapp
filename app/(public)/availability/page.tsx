import Link from 'next/link';
import { Bed, MapPin, DollarSign, Users, Home, Mail, Phone, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAvailableBeds } from '@/lib/services/property-service';

export const revalidate = 3600; // Revalidate every hour

export default async function AvailabilityPortalPage() {
  const availableBeds = await getAvailableBeds();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Perth Sharehouses</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="#available" className="text-sm font-medium hover:text-primary">
              Chambres disponibles
            </Link>
            <Link href="#contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
            <Button asChild size="sm">
              <Link href="/login">Connexion staff</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Trouvez votre nouveau logement à Perth
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Hébergement en colocation abordable et confortable dans les meilleurs quartiers de Perth, WA.
          Loyer hebdomadaire tout inclus avec les charges comprises.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <a href="#available">
              Voir les chambres disponibles
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#contact">Nous contacter</a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Tarifs simples</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Loyer hebdomadaire sans frais cachés. De nombreuses propriétés incluent les charges dans le loyer.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Belle communauté</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Partagez avec des colocataires sympathiques du monde entier. Idéal pour les étudiants et les voyageurs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <MapPin className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Emplacements de choix</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Propriétés dans des quartiers populaires, proches des transports en commun, commerces et commodités.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Available Rooms */}
      <section id="available" className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Chambres disponibles</h2>
          <p className="text-muted-foreground">
            {availableBeds?.length || 0} lits actuellement disponibles
          </p>
        </div>

        {availableBeds && availableBeds.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableBeds.map((bed) => (
              <Card key={bed.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Bed className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {(bed as any).room?.house?.suburb || 'Perth'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {(bed as any).room?.house?.address}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {bed.bed_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chambre</span>
                      <span>{(bed as any).room?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type de chambre</span>
                      <span className="capitalize">{(bed as any).room?.room_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lit</span>
                      <span>{bed.label}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <div>
                    <span className="text-2xl font-bold">${bed.weekly_rent}</span>
                    <span className="text-muted-foreground">/sem</span>
                  </div>
                  <Button asChild>
                    <a href={`mailto:hello@perthsharehouses.com?subject=Inquiry: ${(bed as any).room?.house?.address} - ${bed.label}`}>
                      Nous contacter
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Bed className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune chambre disponible</h3>
              <p className="text-muted-foreground mb-4">
                Toutes nos chambres sont actuellement occupées. Revenez bientôt ou contactez-nous pour être ajouté à notre liste d'attente.
              </p>
              <Button asChild>
                <a href="#contact">Rejoindre la liste d'attente</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Contact Section */}
      <section id="contact" className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nous contacter</CardTitle>
            <CardDescription>
              Contactez-nous pour toute demande ou pour planifier une visite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <a 
                href="mailto:hello@perthsharehouses.com" 
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <Mail className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">E-mail</p>
                  <p className="text-sm text-muted-foreground">hello@perthsharehouses.com</p>
                </div>
              </a>
              <a 
                href="tel:+61412345678" 
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <Phone className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Téléphone</p>
                  <p className="text-sm text-muted-foreground">0412 345 678</p>
                </div>
              </a>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Horaires : Lundi - Vendredi, 9h - 17h (AWST)</p>
              <p>Visites possibles sur rendez-vous, week-ends inclus</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Perth Sharehouses</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Perth Sharehouses. Tous droits réservés.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                Politique de confidentialité
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary">
                Conditions d'utilisation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
