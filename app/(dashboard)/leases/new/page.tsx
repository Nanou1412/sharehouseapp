'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
import { getHouses, getRoomsByHouse, getBedsByRoom } from '@/app/actions/property-actions';
import { toast } from 'sonner';

interface SimpleTenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface SimpleHouse {
  id: string;
  name: string;
  address: string;
}

interface SimpleRoom {
  id: string;
  name: string;
  room_type: string;
}

interface SimpleBed {
  id: string;
  bed_number: number;
  bed_type: string;
  weekly_rent: number;
  bond_amount: number | null;
  status: string;
}

export default function NewLeasePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingBeds, setIsLoadingBeds] = useState(false);

  const [tenants, setTenants] = useState<SimpleTenant[]>([]);
  const [houses, setHouses] = useState<SimpleHouse[]>([]);
  const [rooms, setRooms] = useState<SimpleRoom[]>([]);
  const [beds, setBeds] = useState<SimpleBed[]>([]);

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeklyRent, setWeeklyRent] = useState('');
  const [bondAmount, setBondAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantsResult, housesResult] = await Promise.all([
        getTenants(),
        getHouses(),
      ]);
      if (Array.isArray(tenantsResult)) setTenants(tenantsResult as SimpleTenant[]);
      if (housesResult?.data) setHouses(housesResult.data as SimpleHouse[]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleHouseChange = async (houseId: string) => {
    setSelectedHouse(houseId);
    setSelectedRoom('');
    setSelectedBed('');
    setRooms([]);
    setBeds([]);

    if (!houseId) return;

    setIsLoadingRooms(true);
    try {
      const result = await getRoomsByHouse(houseId);
      if (result?.data) {
        setRooms(result.data as SimpleRoom[]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('Erreur lors du chargement des chambres');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleRoomChange = async (roomId: string) => {
    setSelectedRoom(roomId);
    setSelectedBed('');
    setBeds([]);

    if (!roomId) return;

    setIsLoadingBeds(true);
    try {
      const result = await getBedsByRoom(roomId);
      if (result?.data) {
        // Filtrer seulement les lits disponibles
        const availableBeds = (result.data as SimpleBed[]).filter(b => b.status === 'available');
        setBeds(availableBeds);
      }
    } catch (error) {
      console.error('Error loading beds:', error);
      toast.error('Erreur lors du chargement des lits');
    } finally {
      setIsLoadingBeds(false);
    }
  };

  const handleBedSelect = (bedId: string) => {
    setSelectedBed(bedId);
    // Auto-remplir le loyer et la caution
    const bed = beds.find(b => b.id === bedId);
    if (bed) {
      setWeeklyRent(String(bed.weekly_rent));
      if (bed.bond_amount) {
        setBondAmount(String(bed.bond_amount));
      } else {
        setBondAmount(String(bed.weekly_rent * 4));
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenant || !selectedHouse || !selectedBed || !startDate || !weeklyRent) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createLease({
        house_id: selectedHouse,
        bed_id: selectedBed,
        start_date: startDate,
        end_date: endDate || null,
        weekly_rent: parseFloat(weeklyRent),
        bond_amount: bondAmount ? parseFloat(bondAmount) : 0,
        status: 'active',
        notice_period_weeks: 2,
        is_couple: false,
        tenant_id: selectedTenant,
      });
      if (result.error) {
        console.error('Lease creation error:', result.error);
        const errorMsg = typeof result.error === 'object' && '_form' in result.error
          ? (result.error as any)._form?.[0]
          : 'Échec de la création du bail';
        toast.error(errorMsg || 'Échec de la création du bail');
      } else {
        toast.success('Bail créé avec succès');
        router.push('/leases');
      }
    } catch (error) {
      console.error('Lease creation exception:', error);
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

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sélection du locataire</CardTitle>
            <CardDescription>
              Choisir le locataire pour ce bail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Locataire *</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
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
                <Select value={selectedHouse} onValueChange={handleHouseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name || house.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chambre *</Label>
                <Select 
                  value={selectedRoom}
                  onValueChange={handleRoomChange}
                  disabled={!selectedHouse || isLoadingRooms}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRooms ? 'Chargement...' : 'Sélectionner une chambre'} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.room_type})
                      </SelectItem>
                    ))}
                    {rooms.length === 0 && !isLoadingRooms && selectedHouse && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucune chambre trouvée</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lit *</Label>
                <Select 
                  value={selectedBed}
                  onValueChange={handleBedSelect}
                  disabled={!selectedRoom || isLoadingBeds}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingBeds ? 'Chargement...' : 'Sélectionner un lit'} />
                  </SelectTrigger>
                  <SelectContent>
                    {beds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        Lit {bed.bed_number} ({bed.bed_type}) - ${bed.weekly_rent}/sem
                      </SelectItem>
                    ))}
                    {beds.length === 0 && !isLoadingBeds && selectedRoom && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun lit disponible</div>
                    )}
                  </SelectContent>
                </Select>
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                  value={weeklyRent}
                  onChange={(e) => setWeeklyRent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bond_amount">Montant de la caution ($)</Label>
                <Input
                  id="bond_amount"
                  type="number"
                  step="0.01"
                  placeholder="800.00"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(e.target.value)}
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
