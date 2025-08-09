import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, RotateCcw } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

interface ContactsManagerProps {
  companyId: string;
  companyName: string;
}

export const ContactsManager = ({ companyId, companyName }: ContactsManagerProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<ContactInsert>>({
    name: '',
    email: '',
    phone: '',
    position: '',
    company_id: companyId,
  });
  const [showTrash, setShowTrash] = useState(false);
  const [deletedContacts, setDeletedContacts] = useState<Contact[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [companyId]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contatos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedContacts = async () => {
    try {
      setLoadingDeleted(true);
      const { data, error } = await supabase.rpc('list_deleted_contacts', { _company_id: companyId });
      if (error) throw error;
      setDeletedContacts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar lixeira de contatos:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar lixeira', variant: 'destructive' });
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleRestoreContact = async (id: string) => {
    try {
      const { error } = await supabase.rpc('restore_contact', { _id: id });
      if (error) throw error;
      toast({ title: 'Restaurado', description: 'Contato restaurado com sucesso' });
      await fetchContacts();
      await fetchDeletedContacts();
    } catch (error: any) {
      console.error('Erro ao restaurar contato:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao restaurar', variant: 'destructive' });
    }
  };

  const toggleTrash = async () => {
    const next = !showTrash;
    setShowTrash(next);
    if (next) {
      await fetchDeletedContacts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do contato é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name!,
            email: formData.email || null,
            phone: formData.phone || null,
            position: formData.position || null,
          })
          .eq('id', editingContact.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Contato atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert({
            name: formData.name!,
            email: formData.email || null,
            phone: formData.phone || null,
            position: formData.position || null,
            company_id: companyId,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Contato criado com sucesso',
        });
      }

      setIsDialogOpen(false);
      setEditingContact(null);
      setFormData({ name: '', email: '', phone: '', position: '', company_id: companyId });
      fetchContacts();
    } catch (error: any) {
      console.error('Erro ao salvar contato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar contato',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      company_id: companyId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja enviar este contato para a lixeira?')) return;

    try {
      const { error } = await supabase.rpc('soft_delete_contact', { _id: id });
      if (error) throw error;
      toast({ title: 'Enviado para lixeira', description: 'Restaurável por 30 dias' });
      fetchContacts();
      if (showTrash) fetchDeletedContacts();
    } catch (error: any) {
      console.error('Erro ao excluir contato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir contato',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData({ name: '', email: '', phone: '', position: '', company_id: companyId });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contatos - {companyName} ({contacts.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? 'Editar Contato' : 'Novo Contato'}
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Função</Label>
                    <Input
                      id="position"
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingContact ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Nenhum contato cadastrado para esta empresa
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email || '-'}</TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>{contact.position || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(contact)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(contact.id)}
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
  );
};