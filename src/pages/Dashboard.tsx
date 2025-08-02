import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  companies: { name: string } | null;
  assigned_user: { full_name: string } | null;
  equipment_models: { name: string } | null;
};

type UserProfile = {
  user_id: string;
  full_name: string;
};

type Company = {
  id: string;
  name: string;
};

type SortField = 'ticket_number' | 'title' | 'company' | 'priority' | 'status' | 'category' | 'created_at' | 'assigned_to' | 'equipment_model';
type SortDirection = 'asc' | 'desc';

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (name),
          assigned_user:user_profiles!tickets_assigned_to_fkey (full_name),
          equipment_models (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className: string }> = {
      new: { variant: 'destructive', label: 'Novo', className: 'bg-red-500 hover:bg-red-600 text-white' },
      open: { variant: 'secondary', label: 'Aberto', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
      pending: { variant: 'outline', label: 'Aguardando', className: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' },
      resolved: { variant: 'default', label: 'Resolvido', className: 'bg-green-500 hover:bg-green-600 text-white' },
      unresolved: { variant: 'outline', label: 'Não resolvido', className: '' },
    };

    const config = statusConfig[status] || { variant: 'default', label: status, className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      low: { variant: 'outline', label: 'Baixa', className: 'bg-gray-200 text-gray-800' },
      medium: { variant: 'secondary', label: 'Média', className: 'bg-yellow-400 text-yellow-900' },
      high: { variant: 'destructive', label: 'Alta', className: 'bg-orange-500 text-white' },
      urgent: { variant: 'destructive', label: 'Urgente', className: 'bg-red-600 text-white' },
    };

    const config = priorityConfig[priority] || { variant: 'default', label: priority };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const sortedAndFilteredTickets = tickets
    .filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const matchesCompany = companyFilter === 'all' || ticket.company_id === companyFilter;
      const matchesAssigned = assignedFilter === 'all' || 
                              (assignedFilter === 'unassigned' && !ticket.assigned_to) ||
                              ticket.assigned_to === assignedFilter;
      
      // Filter by date range using date-fns for consistent formatting
      let matchesDateRange = true;
      if (startDate || endDate) {
        // Usar date-fns para formatar a data do ticket de forma consistente
        const ticketDateString = format(new Date(ticket.created_at), 'yyyy-MM-dd');
        
        // Log temporário para debug
        console.log('Ticket:', ticket.ticket_number, 'Date:', ticketDateString, 'Start:', startDate, 'End:', endDate);
        
        if (startDate) {
          matchesDateRange = matchesDateRange && ticketDateString >= startDate;
        }
        if (endDate) {
          matchesDateRange = matchesDateRange && ticketDateString <= endDate;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && 
             matchesCompany && matchesAssigned && matchesDateRange;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'company':
          aValue = a.companies?.name || '';
          bValue = b.companies?.name || '';
          break;
        case 'assigned_to':
          aValue = a.assigned_user?.full_name || '';
          bValue = b.assigned_user?.full_name || '';
          break;
        case 'equipment_model':
          aValue = a.equipment_models?.name || '';
          bValue = b.equipment_models?.name || '';
          break;
        case 'ticket_number':
          aValue = a.ticket_number;
          bValue = b.ticket_number;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <Button asChild>
          <Link to="/dashboard/tickets/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="relative md:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="pending">Aguardando</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="unresolved">Não resolvido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="Theoretical questions/principal of our instrument">Questões Teóricas</SelectItem>
                <SelectItem value="Instrument specific/technical information">Informações Técnicas</SelectItem>
                <SelectItem value="Suporte Técnico">Suporte Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {users.filter(user => user.full_name).map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data inicial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data final"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('ticket_number')} className="h-auto p-0">
                    ID {getSortIcon('ticket_number')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('title')} className="h-auto p-0">
                    Título {getSortIcon('title')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('company')} className="h-auto p-0">
                    Empresa {getSortIcon('company')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('priority')} className="h-auto p-0">
                    Prioridade {getSortIcon('priority')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0">
                    Status {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('category')} className="h-auto p-0">
                    Categoria {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('equipment_model')} className="h-auto p-0">
                    Equipamento {getSortIcon('equipment_model')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('assigned_to')} className="h-auto p-0">
                    Responsável {getSortIcon('assigned_to')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('created_at')} className="h-auto p-0">
                    Criado em {getSortIcon('created_at')}
                  </Button>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>#{ticket.ticket_number}</TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell>{ticket.companies?.name || 'N/A'}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>{ticket.category}</TableCell>
                  <TableCell>{ticket.equipment_models?.name || 'N/A'}</TableCell>
                  <TableCell>{ticket.assigned_user?.full_name || 'Não atribuído'}</TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/dashboard/tickets/${ticket.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {sortedAndFilteredTickets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ticket encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;