import Link from 'next/link';
import { Plus, UserCheck, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCandidates, getCandidatePipeline } from '@/lib/services/candidate-service';

export default async function CandidatesPage() {
  const [candidates, pipeline] = await Promise.all([
    getCandidates(),
    getCandidatePipeline(),
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">Nouveau</Badge>;
      case 'screening':
        return <Badge variant="warning">Évaluation</Badge>;
      case 'approved':
        return <Badge variant="success">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'waitlist':
        return <Badge variant="outline">Liste d&apos;attente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Candidats</h1>
          <p className="text-muted-foreground text-sm">
            Gérer les candidats locataires et les demandes
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/candidates/new">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un candidat
          </Link>
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Évaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.screening}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{pipeline.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liste d&apos;attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.waitlist}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher des candidats..." className="pl-10" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardContent className="p-0">
          {candidates && candidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Emménagement souhaité</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">
                      {candidate.first_name} {candidate.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{candidate.email}</p>
                        <p className="text-muted-foreground">{candidate.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {candidate.preferred_move_in || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {candidate.budget_min && candidate.budget_max
                        ? `$${candidate.budget_min}-$${candidate.budget_max}`
                        : candidate.budget_max
                        ? `Jusqu'à $${candidate.budget_max}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {candidate.source || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(candidate.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun candidat</h3>
              <p className="text-muted-foreground text-center mb-4">
                Ajoutez des candidats pour suivre leurs dossiers
              </p>
              <Button asChild>
                <Link href="/candidates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un candidat
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
