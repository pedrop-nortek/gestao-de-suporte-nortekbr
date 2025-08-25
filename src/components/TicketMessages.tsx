import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, User, MessageSquare, Clock, RefreshCw, UserCheck, Package, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  sender_email: string | null;
  created_at: string;
  created_by: string | null;
  is_internal: boolean;
}

interface LogEntry {
  id: string;
  type: 'log';
  content: string;
  created_at: string;
  action_type?: 'status_change' | 'assignment_change' | 'rma_creation' | 'ticket_edit' | 'general';
}

interface CombinedEntry {
  id: string;
  type: 'message' | 'log';
  content: string;
  created_at: string;
  sender_type?: string;
  sender_name?: string | null;
  sender_email?: string | null;
  created_by?: string | null;
  is_internal?: boolean;
  action_type?: string;
}

interface TicketMessagesProps {
  ticketId: string;
  allowAddMessage?: boolean;
}

export const TicketMessages = ({ ticketId, allowAddMessage = true }: TicketMessagesProps) => {
  const [combinedEntries, setCombinedEntries] = useState<CombinedEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessagesAndLogs();
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [combinedEntries]);

  const fetchMessagesAndLogs = async () => {
    try {
      // Buscar mensagens
      let messagesQuery = supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      // Se não for admin nem support_agent, filtrar mensagens internas
      if (userProfile?.role === 'requester') {
        messagesQuery = messagesQuery.eq('is_internal', false);
      }

      const { data: messagesData, error: messagesError } = await messagesQuery;
      if (messagesError) throw messagesError;

      // Buscar ticket para pegar o log
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('ticket_log, created_at')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Processar logs do ticket_log
      const logEntries: LogEntry[] = [];
      if (ticketData?.ticket_log) {
        const logLines = ticketData.ticket_log.split('\n').filter(line => line.trim());
        
        logLines.forEach((line, index) => {
          const timestampMatch = line.match(/\[([^\]]+)\]/);
          let timestamp = new Date().toISOString();
          let content = line;
          let actionType = 'general';

          if (timestampMatch) {
            try {
              // Tentar converter timestamp brasileiro para ISO
              const [date, time] = timestampMatch[1].split(' ');
              const [day, month, year] = date.split('/');
              const [hour, minute, second] = time.split(':');
              timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                                 parseInt(hour), parseInt(minute), parseInt(second) || 0).toISOString();
              content = line.replace(timestampMatch[0], '').trim();
            } catch {
              timestamp = ticketData.created_at;
            }
          } else {
            timestamp = ticketData.created_at;
          }

          // Determinar tipo de ação baseado no conteúdo
          if (content.toLowerCase().includes('status')) actionType = 'status_change';
          else if (content.toLowerCase().includes('responsável') || content.toLowerCase().includes('atribuído')) actionType = 'assignment_change';
          else if (content.toLowerCase().includes('rma')) actionType = 'rma_creation';
          else if (content.toLowerCase().includes('editado') || content.toLowerCase().includes('atualizado')) actionType = 'ticket_edit';

          logEntries.push({
            id: `log-${index}`,
            type: 'log',
            content,
            created_at: timestamp,
            action_type: actionType as LogEntry['action_type']
          });
        });
      }

      // Combinar mensagens e logs
      const allEntries: CombinedEntry[] = [
        ...(messagesData || []).map(msg => ({ ...msg, type: 'message' as const })),
        ...logEntries.map(log => ({ ...log, type: 'log' as const }))
      ];

      // Ordenar por data
      allEntries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setCombinedEntries(allEntries);
    } catch (error: any) {
      console.error('Error fetching messages and logs:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens e logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const isAgent = userProfile?.role === 'admin' || userProfile?.role === 'support_agent';
      
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: newMessage.trim(),
          sender_type: isAgent ? 'agent' : 'requester',
          sender_name: userProfile?.full_name || 'Usuário',
          sender_email: user.email,
          created_by: user.id,
          is_internal: false,
          channel: 'manual'
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessagesAndLogs();
      
      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada',
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getLogIcon = (actionType?: string) => {
    switch (actionType) {
      case 'status_change': return <RefreshCw className="h-3 w-3" />;
      case 'assignment_change': return <UserCheck className="h-3 w-3" />;
      case 'rma_creation': return <Package className="h-3 w-3" />;
      case 'ticket_edit': return <Edit3 className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (diffDays === 1) {
      return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
    } else if (diffDays < 7) {
      return format(date, 'EEEE HH:mm', { locale: ptBR });
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Carregando mensagens...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Messages container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {combinedEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma atividade ainda</p>
              <p className="text-sm">Inicie a conversa enviando uma mensagem</p>
            </div>
          ) : (
            combinedEntries.map((entry) => {
              if (entry.type === 'message') {
                const isFromAgent = entry.sender_type === 'agent';
                const isFromCurrentUser = entry.created_by === user?.id;
                
                return (
                  <div
                    key={entry.id}
                    className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[70%] ${isFromCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`text-xs ${isFromAgent ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {getInitials(entry.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`rounded-lg p-3 ${isFromCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium">
                            {entry.sender_name || 'Usuário'}
                          </span>
                          {isFromAgent && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Suporte
                            </Badge>
                          )}
                          {entry.is_internal && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Interno
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                        
                        <div className="mt-1 text-xs opacity-70">
                          {formatMessageDate(entry.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Log entry
                return (
                  <div key={entry.id} className="flex justify-center">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-full text-xs text-muted-foreground max-w-[80%]">
                      {getLogIcon(entry.action_type)}
                      <span className="text-center">{entry.content}</span>
                      <span className="text-xs opacity-70">
                        {formatMessageDate(entry.created_at)}
                      </span>
                    </div>
                  </div>
                );
              }
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        {allowAddMessage && (
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={userProfile?.role === 'requester' 
                  ? "Digite sua mensagem para o suporte..." 
                  : "Digite sua mensagem..."
                }
                className="flex-1 min-h-[60px] resize-none"
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pressione Enter para enviar, Shift+Enter para quebrar linha
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};