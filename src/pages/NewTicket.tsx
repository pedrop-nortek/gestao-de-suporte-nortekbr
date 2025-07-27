import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];

const ticketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  company_id: z.string().min(1, 'Empresa é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  channel: z.enum(['email', 'whatsapp', 'manual', 'internal_note']),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  customer_data: z.string().optional(),
});

type TicketForm = z.infer<typeof ticketSchema>;

const NewTicket = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'medium',
      channel: 'email',
    }
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
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar empresas',
        variant: 'destructive',
      });
    }
  };


  const onSubmit = async (data: TicketForm) => {
    setLoading(true);
    try {
      let customerData = null;
      if (data.customer_data) {
        try {
          customerData = JSON.parse(data.customer_data);
        } catch {
          // Se não for JSON válido, armazena como string
          customerData = { data: data.customer_data };
        }
      }

      const ticketData = {
        title: data.title,
        description: data.description,
        company_id: data.company_id,
        category: data.category,
        priority: data.priority,
        channel: data.channel,
        customer_email: data.customer_email || null,
        status: 'open' as const,
        created_by: user?.id || '',
      };

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ticket criado com sucesso!',
      });

      navigate(`/dashboard/tickets/${ticket.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Novo Ticket</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Título do ticket"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customer_email">Email do Cliente</Label>
                <Input
                  id="customer_email"
                  type="email"
                  {...register('customer_email')}
                  placeholder="cliente@email.com"
                />
                {errors.customer_email && (
                  <p className="text-sm text-destructive">{errors.customer_email.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descreva o problema ou solicitação"
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_id">Empresa *</Label>
                <Select onValueChange={(value) => setValue('company_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.company_id && (
                  <p className="text-sm text-destructive">{errors.company_id.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suporte_tecnico">Suporte Técnico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridade *</Label>
                <Select onValueChange={(value) => setValue('priority', value as any)} defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-destructive">{errors.priority.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="channel">Canal *</Label>
                <Select onValueChange={(value) => setValue('channel', value as any)} defaultValue="email">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="internal_note">Nota Interna</SelectItem>
                  </SelectContent>
                </Select>
                {errors.channel && (
                  <p className="text-sm text-destructive">{errors.channel.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="customer_data">Dados do Cliente (JSON opcional)</Label>
              <Textarea
                id="customer_data"
                {...register('customer_data')}
                placeholder='{"nome": "João", "telefone": "123456789"}'
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Dados adicionais do cliente em formato JSON
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Ticket'}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTicket;