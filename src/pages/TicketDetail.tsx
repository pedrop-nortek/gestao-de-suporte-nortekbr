import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Clock, User, Building2, Tag, FileText, Wrench, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  companies: { name: string } | null;
  assigned_user?: { full_name: string | null } | null;
};

type TicketMessage = Database['public']['Tables']['ticket_messages']['Row'];

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [newStatus, setNewStatus] = useState<Database['public']['Enums']['ticket_status']>('open');
  const [newAssignedTo, setNewAssignedTo] = useState<string>('unassigned');

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchMessages();
      fetchUsers();
    }
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (name),
          assigned_user:user_profiles!tickets_assigned_to_fkey (full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTicket(data);
      setNewStatus(data.status);
      setNewAssignedTo(data.assigned_to || 'unassigned');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar detalhes do ticket',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Ticket #{ticket.id.slice(0, 8)}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Ticket */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{ticket.title}</span>
                {getStatusBadge(ticket.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {ticket.equipment_model && (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span>{ticket.equipment_model}</span>
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