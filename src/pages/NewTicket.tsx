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
import { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];

interface TicketFormData {
  title: string;
  description: string;
  company_id: string;
  category: string;
  priority: Database['public']['Enums']['ticket_priority'];
  equipment_model: string;
  serial_number: string;
  assigned_to: string;
}

const PREDEFINED_CATEGORIES = [
  'System integration',
  'Deployment configuration', 
  'Data processing/interpretation',
  'Instrument communication and troubleshooting',
  'Instrument specific/technical information',
  'Theoretical questions/principal of our instrument',
  'Other'
];

export const NewTicket = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; user_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    company_id: '',
    category: '',
    priority: 'medium',
    equipment_model: '',
    serial_number: '',
    assigned_to: '',
  });

  useEffect(() => {
    fetchCompanies();
    fetchEquipmentModels();
    fetchUsers();
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
      toast({
        title: 'Erro',
        description: 'Erro ao carregar modelos de equipamento',
        variant: 'destructive',
      });
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.company_id || !formData.category) {
      toast({
        title: 'Erro',
        description: 'Todos os campos obrigatórios devem ser preenchidos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          company_id: formData.company_id,
          category: formData.category,
          priority: formData.priority,
          equipment_model: formData.equipment_model || null,
          serial_number: formData.serial_number || null,
          assigned_to: formData.assigned_to || null,
          created_by: user.id,
          status: 'open',
          responsibility: 'internal_support',
          channel: 'manual',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ticket criado com sucesso!',
      });

      navigate(`/dashboard/tickets/${newTicket.id}`);
    } catch (error: any) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar ticket',
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
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="company">Empresa *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as Database['public']['Enums']['ticket_priority'] })}
              >
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
            </div>

            <div>
              <Label htmlFor="equipment_model">Modelo do Equipamento</Label>
              <Select
                value={formData.equipment_model}
                onValueChange={(value) => setFormData({ ...formData, equipment_model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo de equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentModels.map((model) => (
                    <SelectItem key={model.id} value={model.name}>
                      {model.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Outro (especificar na descrição)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="serial_number">Número de Série</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Digite o número de série do equipamento"
              />
            </div>

            <div>
              <Label htmlFor="assigned_to">Responsável</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem atribuição</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || 'Usuário sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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