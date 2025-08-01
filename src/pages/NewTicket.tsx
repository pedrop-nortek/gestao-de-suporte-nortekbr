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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface TicketFormData {
  title: string;
  description: string;
  company_id: string;
  contact_id: string;
  category: string;
  priority: Database['public']['Enums']['ticket_priority'];
  equipment_model_id: string | null;
  serial_number: string;
  assigned_to: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
}

interface EquipmentFormData {
  name: string;
  manufacturer: string;
  category: string;
  description: string;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; user_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [isCreateEquipmentOpen, setIsCreateEquipmentOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    position: '',
  });
  const [equipmentFormData, setEquipmentFormData] = useState<EquipmentFormData>({
    name: '',
    manufacturer: '',
    category: '',
    description: '',
  });
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    company_id: '',
    contact_id: '',
    category: '',
    priority: 'medium',
    equipment_model_id: null,
    serial_number: '',
    assigned_to: 'unassigned',
  });

  useEffect(() => {
    fetchCompanies();
    fetchEquipmentModels();
    fetchUsers();
  }, []);

  // Fetch contacts when company changes
  useEffect(() => {
    if (formData.company_id) {
      fetchContactsByCompany(formData.company_id);
    } else {
      setContacts([]);
      setFormData(prev => ({ ...prev, contact_id: '' }));
    }
  }, [formData.company_id]);

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

  const fetchContactsByCompany = async (companyId: string) => {
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
        description: 'Erro ao carregar contatos da empresa',
        variant: 'destructive',
      });
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactFormData.name.trim() || !formData.company_id) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório para criar um contato',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          name: contactFormData.name.trim(),
          email: contactFormData.email.trim() || null,
          phone: contactFormData.phone.trim() || null,
          position: contactFormData.position.trim() || null,
          company_id: formData.company_id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato criado com sucesso!',
      });

      // Refresh contacts list and select the new contact
      await fetchContactsByCompany(formData.company_id);
      setFormData(prev => ({ ...prev, contact_id: newContact.id }));
      
      // Reset form and close dialog
      setContactFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
      });
      setIsCreateContactOpen(false);
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar contato',
        variant: 'destructive',
      });
    }
  };

  const handleCreateEquipment = async () => {
    
    if (!equipmentFormData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório para criar um equipamento',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: newEquipment, error } = await supabase
        .from('equipment_models')
        .insert({
          name: equipmentFormData.name.trim(),
          manufacturer: equipmentFormData.manufacturer.trim() || null,
          category: equipmentFormData.category.trim() || null,
          description: equipmentFormData.description.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Equipamento criado com sucesso!',
      });

      // Refresh equipment list and select the new equipment
      await fetchEquipmentModels();
      setFormData(prev => ({ ...prev, equipment_model_id: newEquipment.id }));
      
      // Reset form and close dialog
      setEquipmentFormData({
        name: '',
        manufacturer: '',
        category: '',
        description: '',
      });
      setIsCreateEquipmentOpen(false);
    } catch (error: any) {
      console.error('Erro ao criar equipamento:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar equipamento',
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
          equipment_model_id: formData.equipment_model_id,
          serial_number: formData.serial_number || null,
          contact_id: formData.contact_id || null,
          assigned_to: formData.assigned_to === 'unassigned' ? null : formData.assigned_to,
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
              <Label htmlFor="contact">Contato na Empresa</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                  disabled={!formData.company_id}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue 
                      placeholder={
                        formData.company_id 
                          ? "Selecione um contato" 
                          : "Selecione uma empresa primeiro"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.email && `(${contact.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      disabled={!formData.company_id}
                      title="Criar novo contato"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Contato</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateContact} className="space-y-4">
                      <div>
                        <Label htmlFor="contact-name">Nome *</Label>
                        <Input
                          id="contact-name"
                          value={contactFormData.name}
                          onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactFormData.email}
                          onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Telefone</Label>
                        <Input
                          id="contact-phone"
                          value={contactFormData.phone}
                          onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-position">Cargo</Label>
                        <Input
                          id="contact-position"
                          value={contactFormData.position}
                          onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateContactOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Criar Contato
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
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
              <div className="flex gap-2">
                <Select
                  value={formData.equipment_model_id}
                  onValueChange={(value) => setFormData({ ...formData, equipment_model_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um modelo de equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={isCreateEquipmentOpen} onOpenChange={setIsCreateEquipmentOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      title="Criar novo equipamento"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Equipamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="equipment-name">Nome *</Label>
                        <Input
                          id="equipment-name"
                          value={equipmentFormData.name}
                          onChange={(e) => setEquipmentFormData({ ...equipmentFormData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="equipment-manufacturer">Fabricante</Label>
                        <Input
                          id="equipment-manufacturer"
                          value={equipmentFormData.manufacturer}
                          onChange={(e) => setEquipmentFormData({ ...equipmentFormData, manufacturer: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="equipment-category">Categoria</Label>
                        <Input
                          id="equipment-category"
                          value={equipmentFormData.category}
                          onChange={(e) => setEquipmentFormData({ ...equipmentFormData, category: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="equipment-description">Descrição</Label>
                        <Textarea
                          id="equipment-description"
                          value={equipmentFormData.description}
                          onChange={(e) => setEquipmentFormData({ ...equipmentFormData, description: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateEquipmentOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleCreateEquipment}
                        >
                          Criar Equipamento
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
                  <SelectItem value="unassigned">Sem atribuição</SelectItem>
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