import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];

export const Companies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<CompanyInsert>>({
    name: '',
    primary_email: '',
    whatsapp_phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar empresas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da empresa é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name!,
            primary_email: formData.primary_email || null,
            whatsapp_phone: formData.whatsapp_phone || null,
            notes: formData.notes || null,
          })
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Empresa atualizada com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            name: formData.name!,
            primary_email: formData.primary_email || null,
            whatsapp_phone: formData.whatsapp_phone || null,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Empresa criada com sucesso',
        });
      }

      setIsDialogOpen(false);
      setEditingCompany(null);
      setFormData({ name: '', primary_email: '', whatsapp_phone: '', notes: '' });
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar empresa',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      primary_email: company.primary_email || '',
      whatsapp_phone: company.whatsapp_phone || '',
      notes: company.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Empresa excluída com sucesso',
      });
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir empresa',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
    setFormData({ name: '', primary_email: '', whatsapp_phone: '', notes: '' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Empresas</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Principal</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.primary_email || ''}
                  onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.whatsapp_phone || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCompany ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empresas ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma empresa cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.primary_email || '-'}</TableCell>
                    <TableCell>{company.whatsapp_phone || '-'}</TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(company.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};