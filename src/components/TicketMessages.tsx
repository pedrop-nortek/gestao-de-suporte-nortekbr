import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, User, MessageSquare } from 'lucide-react';
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

interface TicketMessagesProps {
  ticketId: string;
  allowAddMessage?: boolean;
}

export const TicketMessages = ({ ticketId, allowAddMessage = true }: TicketMessagesProps) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
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
    fetchMessages();
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      let query = supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      // Se não for admin nem support_agent, filtrar mensagens internas
      if (userProfile?.role === 'requester') {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
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
      await fetchMessages();
      
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
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Inicie a conversa enviando uma mensagem</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromAgent = message.sender_type === 'agent';
              const isFromCurrentUser = message.created_by === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[70%] ${isFromCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs ${isFromAgent ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        {getInitials(message.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`rounded-lg p-3 ${isFromCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.sender_name || 'Usuário'}
                        </span>
                        {isFromAgent && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Suporte
                          </Badge>
                        )}
                        {message.is_internal && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            Interno
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      <div className="mt-1 text-xs opacity-70">
                        {formatMessageDate(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
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