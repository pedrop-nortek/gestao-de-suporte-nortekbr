import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Clock, User, Building2, Tag, FileText, Wrench, Hash, Edit, Trash2, Save, X, Download, Plus, MessageSquare } from 'lucide-react';
import { TicketMessages } from '@/components/TicketMessages';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  companies: { name: string } | null;
  assigned_user?: { full_name: string | null } | null;
  equipment_models?: { name: string } | null;
  contacts?: { name: string } | null;
};

// Schema de validação para edição do ticket
const editTicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  category: z.string().optional(),
  company_id: z.string().optional(),
  contact_id: z.string().optional(),
  equipment_model_id: z.string().optional(),
  serial_number: z.string().optional(),
  country: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type EditTicketFormData = z.infer<typeof editTicketSchema>;

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; user_id: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string; country: string | null }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; company_id: string }[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<{ id: string; name: string }[]>([]);
  const [categories] = useState<string[]>([
    'Data processing/interpretation',
    'Deployment configuration',
    'Instrument communication and troubleshooting',
    'Instrument specific/technical information',
    'Other',
    'Suporte Técnico',
    'System integration',
    'Theoretical questions/principal of our instrument'
  ]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rmaNumber, setRmaNumber] = useState('');
  const [showCreateRMA, setShowCreateRMA] = useState(false);
  const [newStatus, setNewStatus] = useState<Database['public']['Enums']['ticket_status']>('open');
  const [newAssignedTo, setNewAssignedTo] = useState<string>('unassigned');

  const form = useForm<EditTicketFormData>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: {
      title: '',
      category: '',
      company_id: '',
      contact_id: '',
      equipment_model_id: '',
      serial_number: '',
      country: '',
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchUsers();
      fetchCompanies();
      fetchContacts();
      fetchEquipmentModels();
    }
  }, [id]);

  useEffect(() => {
    if (ticket && isEditing) {
      form.reset({
        title: ticket.title || '',
        category: ticket.category || '',
        company_id: ticket.company_id || '',
        contact_id: ticket.contact_id || '',
        equipment_model_id: ticket.equipment_model_id || '',
        serial_number: ticket.serial_number || '',
        country: ticket.country || '',
        priority: ticket.priority || 'medium',
      });
    }
  }, [ticket, isEditing, form]);

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (name),
          user_profiles!tickets_assigned_to_fkey (full_name),
          equipment_models (name),
          contacts (name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const ticketData = {
          ...data,
          assigned_user: data.user_profiles
        };
        
        setTicket(ticketData);
        setNewStatus(data.status);
        setNewAssignedTo(data.assigned_to || 'unassigned');
      }
    } catch (error: any) {
      console.error('Error fetching ticket details:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar detalhes do ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, role')
        .in('role', ['support_agent', 'admin'])
        .order('full_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, country')
        .order('name');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company_id')
        .order('name');
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const fetchEquipmentModels = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_models')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setEquipmentModels(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar modelos de equipamento:', error);
    }
  };

  // Function removed - now using TicketMessages component for messaging

  const exportLog = async () => {
    if (!ticket) return;

    try {
      // Buscar mensagens
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Criar conteúdo do export
      let logContent = `TICKET #${ticket.ticket_number} - ${ticket.title}\n` +
                      `Data de criação: ${new Date(ticket.created_at).toLocaleString('pt-BR')}\n` +
                      `Status: ${ticket.status}\n` +
                      `${ticket.companies ? `Empresa: ${ticket.companies.name}\n` : ''}` +
                      `${ticket.contacts ? `Contato: ${ticket.contacts.name}\n` : ''}` +
                      `${ticket.equipment_models ? `Equipamento: ${ticket.equipment_models.name}\n` : ''}` +
                      `${ticket.serial_number ? `Número de série: ${ticket.serial_number}\n` : ''}` +
                      `\n--- HISTÓRICO COMPLETO ---\n\n`;

      // Combinar logs do sistema e mensagens
      const allEntries: Array<{
        type: 'log' | 'message';
        content: string;
        created_at: string;
        sender?: string;
      }> = [];

      // Adicionar logs do sistema
      if (ticket.ticket_log) {
        const logLines = ticket.ticket_log.split('\n').filter(line => line.trim());
        logLines.forEach(line => {
          const timestampMatch = line.match(/\[([^\]]+)\]/);
          let timestamp = new Date().toISOString();
          let content = line;

          if (timestampMatch) {
            try {
              const [date, time] = timestampMatch[1].split(' ');
              const [day, month, year] = date.split('/');
              const [hour, minute, second] = time.split(':');
              timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                                 parseInt(hour), parseInt(minute), parseInt(second) || 0).toISOString();
              content = line.replace(timestampMatch[0], '').trim();
            } catch {
              timestamp = ticket.created_at;
            }
          }

          allEntries.push({
            type: 'log',
            content: `[SISTEMA] ${content}`,
            created_at: timestamp
          });
        });
      }

      // Adicionar mensagens
      messagesData?.forEach(msg => {
        allEntries.push({
          type: 'message',
          content: msg.content,
          created_at: msg.created_at,
          sender: `${msg.sender_name || 'Usuário'} (${msg.sender_type === 'agent' ? 'Suporte' : 'Cliente'})`
        });
      });

      // Ordenar por data
      allEntries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Adicionar entradas ao conteúdo
      allEntries.forEach(entry => {
        const date = new Date(entry.created_at).toLocaleString('pt-BR');
        if (entry.type === 'message') {
          logContent += `[${date}] ${entry.sender}\n${entry.content}\n\n`;
        } else {
          logContent += `[${date}] ${entry.content}\n\n`;
        }
      });

      if (allEntries.length === 0) {
        logContent += 'Nenhuma atividade registrada ainda.\n';
      }

      const blob = new Blob([logContent], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticket.ticket_number}-historico-completo.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Histórico exportado com sucesso',
      });
    } catch (error: any) {
      console.error('Error exporting log:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar histórico',
        variant: 'destructive',
      });
    }
  };

  const createRMA = async () => {
    if (!ticket) return;

    try {
      const { data, error } = await supabase
        .from('rma_requests')
        .insert({
          ticket_id: ticket.id,
          rma_number: null, // Will be added when first step is completed
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setRmaNumber('');
      setShowCreateRMA(false);
      
      toast({
        title: "Sucesso",
        description: "RMA criado com sucesso",
      });

      // Add log entry about RMA creation
      const timestamp = new Date().toLocaleString('pt-BR');
      const logEntry = `\n[${timestamp}]\nRMA criado (número será adicionado na primeira etapa)\n`;
      const updatedLog = (ticket.ticket_log || '') + logEntry;

      await supabase
        .from('tickets')
        .update({ ticket_log: updatedLog })
        .eq('id', id);

      navigate(`/dashboard/rmas/${data.id}`);
    } catch (error) {
      console.error('Error creating RMA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o RMA",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleSaveEdit = async (data: EditTicketFormData) => {
    setEditLoading(true);
    try {
      // Add log entry for ticket edit
      const logEntry = `[${new Date().toLocaleString('pt-BR')}] Ticket editado - dados atualizados`;
      const currentLog = ticket?.ticket_log || '';
      const newLog = currentLog ? `${currentLog}\n${logEntry}` : logEntry;

      const { error } = await supabase
        .from('tickets')
        .update({
          title: data.title,
          category: data.category || null,
          company_id: data.company_id || null,
          contact_id: data.contact_id || null,
          equipment_model_id: data.equipment_model_id || null,
          serial_number: data.serial_number || null,
          country: data.country || null,
          priority: data.priority,
          ticket_log: newLog,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchTicketDetails();
      setIsEditing(false);
      toast({
        title: 'Sucesso',
        description: 'Ticket atualizado com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar ticket',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .rpc('soft_delete_ticket', { _id: id });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ticket excluído com sucesso',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir ticket',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtrar contatos pela empresa selecionada
  const filteredContacts = contacts.filter(contact => 
    !form.watch('company_id') || contact.company_id === form.watch('company_id')
  );

  const watchedCompanyId = form.watch('company_id');
  useEffect(() => {
    if (!isEditing) return;
    const selected = companies.find((c) => c.id === watchedCompanyId);
    if (selected) {
      form.setValue('country', selected.country || '');
    }
  }, [watchedCompanyId, companies, isEditing, form]);

  const updateStatus = async () => {
    if (!newStatus || newStatus === ticket?.status) return;

    try {
      const oldStatus = ticket?.status;
      const statusLabels: Record<string, string> = {
        new: 'Novo',
        open: 'Aberto', 
        pending: 'Aguardando',
        resolved: 'Resolvido',
        unresolved: 'Não resolvido',
      };

      // Add log entry for status change
      const logEntry = `[${new Date().toLocaleString('pt-BR')}] Status alterado de "${statusLabels[oldStatus || '']}" para "${statusLabels[newStatus]}"`;
      const currentLog = ticket?.ticket_log || '';
      const newLog = currentLog ? `${currentLog}\n${logEntry}` : logEntry;

      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          ticket_log: newLog 
        })
        .eq('id', id);

      if (error) throw error;

      fetchTicketDetails();
      toast({
        title: 'Sucesso',
        description: 'Status atualizado',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const updateAssignedTo = async () => {
    if (newAssignedTo === ticket?.assigned_to) return;

    try {
      const oldAssignedUser = users.find(u => u.user_id === ticket?.assigned_to);
      const newAssignedUser = users.find(u => u.user_id === newAssignedTo);
      
      // Add log entry for assignment change
      const logEntry = `[${new Date().toLocaleString('pt-BR')}] Responsável alterado de "${oldAssignedUser?.full_name || 'Não atribuído'}" para "${newAssignedUser?.full_name || 'Não atribuído'}"`;
      const currentLog = ticket?.ticket_log || '';
      const newLog = currentLog ? `${currentLog}\n${logEntry}` : logEntry;

      const { error } = await supabase
        .from('tickets')
        .update({ 
          assigned_to: newAssignedTo === 'unassigned' ? null : newAssignedTo,
          ticket_log: newLog 
        })
        .eq('id', id);

      if (error) throw error;

      fetchTicketDetails();
      toast({
        title: 'Sucesso',
        description: 'Responsável atualizado',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar responsável',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className: string }> = {
      new: { variant: 'destructive', label: 'Novo', className: 'bg-red-500 hover:bg-red-600 text-white' },
      open: { variant: 'secondary', label: 'Aberto', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
      pending: { variant: 'outline', label: 'Aguardando', className: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' },
      resolved: { variant: 'default', label: 'Resolvido', className: 'bg-green-500 hover:bg-green-600 text-white' },
      unresolved: { variant: 'outline', label: 'Não resolvido', className: '' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, className: '' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p>Ticket não encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este ticket? O ticket será movido para a lixeira e poderá ser restaurado por 30 dias.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Detalhes do Ticket */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{ticket.title}</span>
              {getStatusBadge(ticket.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveEdit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um contato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipment_model_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipamento</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um equipamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serial_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Série</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={editLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {editLoading ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                {ticket.description && (
                  <div>
                    <Label className="text-sm font-medium">Descrição</Label>
                    <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Categoria</Label>
                    <p className="text-sm text-muted-foreground">{ticket.category || 'Não definida'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Prioridade</Label>
                    <p className="text-sm text-muted-foreground">
                      {ticket.priority === 'low' && 'Baixa'}
                      {ticket.priority === 'medium' && 'Média'}
                      {ticket.priority === 'high' && 'Alta'}
                      {ticket.priority === 'urgent' && 'Urgente'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Empresa</Label>
                    <p className="text-sm text-muted-foreground">{ticket.companies?.name || 'Não especificada'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">País do Ticket</Label>
                    <p className="text-sm text-muted-foreground">{ticket.country || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contato</Label>
                    <p className="text-sm text-muted-foreground">{ticket.contacts?.name || 'Não especificado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Equipamento</Label>
                    <p className="text-sm text-muted-foreground">{ticket.equipment_models?.name || 'Não especificado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Número de Série</Label>
                    <p className="text-sm text-muted-foreground">{ticket.serial_number || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Messages Section */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversas do Ticket
              </span>
              <div className="flex gap-2">
                <Button onClick={exportLog} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar TXT
                </Button>
                {!showCreateRMA && (
                  <Button onClick={() => setShowCreateRMA(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar RMA
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TicketMessages ticketId={ticket.id} allowAddMessage={true} />
            
            {/* Create RMA Section */}
            {showCreateRMA && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <Label>Criar RMA para este ticket:</Label>
                <p className="text-sm text-muted-foreground">
                  O número do RMA será adicionado quando a primeira etapa for concluída.
                </p>
                <div className="flex gap-2">
                  <Button onClick={createRMA}>
                    Criar RMA
                  </Button>
                  <Button 
                    onClick={() => setShowCreateRMA(false)} 
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Laterais */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex gap-2 mt-1">
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Database['public']['Enums']['ticket_status'])}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="pending">Aguardando</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="unresolved">Não resolvido</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={updateStatus} size="sm" disabled={newStatus === ticket.status}>
                  Atualizar
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Responsável</Label>
              <div className="flex gap-2 mt-1">
                <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || 'Usuário sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={updateAssignedTo} size="sm" disabled={newAssignedTo === (ticket.assigned_to || 'unassigned')}>
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Criado em:</span>
                <span className="text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Atualizado em:</span>
                <span className="text-muted-foreground">
                  {new Date(ticket.updated_at).toLocaleString('pt-BR')}
                </span>
              </div>
              {ticket.assigned_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Responsável:</span>
                  <span className="text-muted-foreground">
                    {ticket.assigned_user.full_name}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetail;
