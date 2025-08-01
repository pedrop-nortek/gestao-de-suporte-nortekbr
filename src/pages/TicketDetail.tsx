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
import { ArrowLeft, Clock, User, Building2, Tag, FileText, Wrench, Hash, Edit, Trash2, Save, X } from 'lucide-react';
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

type TicketMessage = Database['public']['Tables']['ticket_messages']['Row'];

// Schema de validação para edição do ticket
const editTicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  category: z.string().nullish().transform(val => val || undefined),
  company_id: z.string().nullish().transform(val => val || undefined),
  contact_id: z.string().nullish().transform(val => val || undefined),
  equipment_model_id: z.string().nullish().transform(val => val || undefined),
  serial_number: z.string().nullish().transform(val => val || undefined),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type EditTicketFormData = z.infer<typeof editTicketSchema>;

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; user_id: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
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
  const [newMessage, setNewMessage] = useState('');
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
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (id) {
      console.log('Starting data fetch for ticket ID:', id);
      Promise.all([
        fetchTicketDetails(),
        fetchMessages(),
        fetchUsers(),
        fetchCompanies(),
        fetchContacts(),
        fetchEquipmentModels()
      ]).catch(error => {
        console.error('Error in data fetching:', error);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (ticket && isEditing) {
      console.log('Resetting form with ticket data:', ticket);
      form.reset({
        title: ticket.title || '',
        category: ticket.category || '',
        company_id: ticket.company_id || '',
        contact_id: ticket.contact_id || '',
        equipment_model_id: ticket.equipment_model_id || '',
        serial_number: ticket.serial_number || '',
        priority: ticket.priority || 'medium',
      });
    }
  }, [ticket, isEditing, form]);

  const fetchTicketDetails = async () => {
    try {
      console.log('Fetching ticket details for ID:', id);
      
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
        .single();

      if (error) {
        console.error('Ticket query error:', error);
        throw error;
      }
      
      console.log('Ticket data received:', data);
      
      // Ajustar a estrutura dos dados
      const ticketData = {
        ...data,
        assigned_user: data.user_profiles
      };
      
      setTicket(ticketData);
      setNewStatus(data.status);
      setNewAssignedTo(data.assigned_to || 'unassigned');
    } catch (error: any) {
      console.error('Error fetching ticket details:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar detalhes do ticket',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for ticket:', id);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages query error:', error);
        throw error;
      }
      
      console.log('Messages received:', data?.length || 0);
      setMessages(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar mensagens',
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
        .select('id, user_id, full_name')
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
        .select('id, name')
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
      const { error } = await supabase
        .from('tickets')
        .update({
          title: data.title,
          category: data.category || null,
          company_id: data.company_id || null,
          contact_id: data.contact_id || null,
          equipment_model_id: data.equipment_model_id || null,
          serial_number: data.serial_number || null,
          priority: data.priority,
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
      // Primeiro deletar mensagens relacionadas
      await supabase
        .from('ticket_messages')
        .delete()
        .eq('ticket_id', id);

      // Depois deletar o ticket
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

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

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id!,
          created_by: user.id,
          content: newMessage.trim(),
          is_internal: false,
          channel: 'manual' as Database['public']['Enums']['communication_channel'],
          sender_type: 'support_agent',
          sender_name: user.email || 'Agente',
          sender_email: user.email,
        });

      if (error) {
        console.error('Erro ao inserir mensagem:', error);
        throw error;
      }

      setNewMessage('');
      fetchMessages();
      toast({
        title: 'Sucesso',
        description: 'Mensagem adicionada com sucesso',
      });
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar mensagem',
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async () => {
    if (!newStatus || newStatus === ticket?.status) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
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
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: newAssignedTo === 'unassigned' ? null : newAssignedTo })
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aberto: 'destructive',
      em_andamento: 'secondary',
      aguardando_cliente: 'outline',
      resolvido: 'default',
      fechado: 'default',
    };
    
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      em_andamento: 'Em Andamento',
      aguardando_cliente: 'Aguardando Cliente',
      resolvido: 'Resolvido',
      fechado: 'Fechado',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
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
          <h1 className="text-3xl font-bold">Ticket #{ticket.id.slice(0, 8)}</h1>
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
                  Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.
                  Todas as mensagens associadas também serão excluídas.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Ticket */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {isEditing ? (
                  <span>Editando Ticket</span>
                ) : (
                  <span>{ticket.title}</span>
                )}
                {!isEditing && getStatusBadge(ticket.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            <Input {...field} placeholder="Título do ticket" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Sem categoria</SelectItem>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma empresa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Sem empresa</SelectItem>
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
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um contato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Sem contato</SelectItem>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="equipment_model_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipamento</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um equipamento" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Sem equipamento</SelectItem>
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
                            <FormLabel>Serial do Equipamento</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Número de série" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
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
                <>
                  <p className="text-muted-foreground">{ticket.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{ticket.companies?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{ticket.category || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <Badge variant="outline">{ticket.priority}</Badge>
                    </div>
                    {ticket.contacts?.name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span><strong>Contato:</strong> {ticket.contacts.name}</span>
                      </div>
                    )}
                    {ticket.equipment_models?.name && (
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        <span>{ticket.equipment_models.name}</span>
                      </div>
                    )}
                    {ticket.serial_number && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>{ticket.serial_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        <strong>Responsável:</strong> {ticket.assigned_user?.full_name || 'Não atribuído'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Mensagens */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                       <span className="font-medium">
                          {message.sender_name || 'Sistema'}
                        </span>
                      {message.is_internal && (
                        <Badge variant="outline" className="text-xs">Interno</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(message.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
              
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem ainda
                </p>
              )}
            </CardContent>
          </Card>

          {/* Nova Mensagem */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Resposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={4}
                />
              </div>
              <Button onClick={addMessage} disabled={!newMessage.trim()}>
                Enviar Resposta
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Alterar Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Database['public']['Enums']['ticket_status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={updateStatus} 
                disabled={newStatus === ticket.status}
                className="w-full"
              >
                Atualizar Status
              </Button>
              
              <Separator />
              
              <div>
                <Label htmlFor="assigned_to">Atribuir Responsável</Label>
                <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem atribuição</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || 'Usuário sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={updateAssignedTo} 
                disabled={newAssignedTo === (ticket.assigned_to || 'unassigned')}
                className="w-full"
              >
                Atualizar Responsável
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>Canal:</strong> {ticket.channel}
              </div>
              <div>
                <strong>Criado:</strong> {new Date(ticket.created_at).toLocaleString('pt-BR')}
              </div>
              <div>
                <strong>Atualizado:</strong> {new Date(ticket.updated_at).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;