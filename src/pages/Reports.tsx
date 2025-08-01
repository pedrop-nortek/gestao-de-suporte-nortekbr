import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from '@/hooks/use-toast';
import { BarChart3, Clock, CheckCircle, AlertCircle, PieChart, TrendingUp, Users, Building2, Wrench, Tag, Filter } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExtendedReportData {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  pausedTickets: number;
  avgResolutionTime: number;
  ticketsByPriority: Array<{ name: string; value: number; color: string }>;
  ticketsByStatus: Array<{ name: string; value: number; color: string }>;
  ticketsByCompany: Array<{ name: string; value: number }>;
  ticketsByCategory: Array<{ name: string; value: number }>;
  ticketsByEquipment: Array<{ name: string; value: number }>;
  ticketsByUser: Array<{ name: string; value: number }>;
  ticketsOverTime: Array<{ month: string; tickets: number }>;
}

const chartConfig = {
  tickets: {
    label: "Tickets",
    color: "hsl(var(--chart-1))",
  },
  open: {
    label: "Abertos",
    color: "hsl(var(--chart-2))",
  },
  closed: {
    label: "Fechados", 
    color: "hsl(var(--chart-3))",
  },
  inProgress: {
    label: "Em Andamento",
    color: "hsl(var(--chart-4))",
  },
  paused: {
    label: "Pausados",
    color: "hsl(var(--chart-5))",
  },
  low: {
    label: "Baixa",
    color: "hsl(var(--chart-1))",
  },
  medium: {
    label: "Média", 
    color: "hsl(var(--chart-2))",
  },
  high: {
    label: "Alta",
    color: "hsl(var(--chart-3))",
  },
  urgent: {
    label: "Urgente",
    color: "hsl(var(--chart-4))",
  },
};

const STATUS_COLORS = {
  'open': 'hsl(var(--chart-2))',
  'in_progress': 'hsl(var(--chart-4))',
  'closed': 'hsl(var(--chart-3))',
  'paused': 'hsl(var(--chart-5))',
};

const PRIORITY_COLORS = {
  'low': 'hsl(var(--chart-1))',
  'medium': 'hsl(var(--chart-2))',
  'high': 'hsl(var(--chart-3))',
  'urgent': 'hsl(var(--chart-4))',
};

export const Reports = () => {
  const [data, setData] = useState<ExtendedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = [
    { value: 'all', label: 'Todos os meses' },
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  useEffect(() => {
    fetchReportData();
  }, [selectedYear, selectedMonth]);

  const getDateFilter = () => {
    const year = parseInt(selectedYear);
    let startDate: Date;
    let endDate: Date;

    if (selectedMonth === 'all') {
      startDate = startOfYear(new Date(year, 0, 1));
      endDate = endOfYear(new Date(year, 0, 1));
    } else {
      const month = parseInt(selectedMonth) - 1;
      startDate = startOfMonth(new Date(year, month, 1));
      endDate = endOfMonth(new Date(year, month, 1));
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateFilter();

      // Buscar tickets com filtro de data e dados relacionados
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (name),
          user_profiles!tickets_assigned_to_fkey (full_name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (ticketsError) throw ticketsError;

      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
      const pausedTickets = tickets?.filter(t => t.status === 'paused').length || 0;

      // Dados para gráfico de pizza - Status
      const ticketsByStatus = [
        { name: 'Abertos', value: openTickets, color: STATUS_COLORS.open },
        { name: 'Em Andamento', value: inProgressTickets, color: STATUS_COLORS.in_progress },
        { name: 'Fechados', value: closedTickets, color: STATUS_COLORS.closed },
        { name: 'Pausados', value: pausedTickets, color: STATUS_COLORS.paused },
      ].filter(item => item.value > 0);

      // Dados para gráfico de pizza - Prioridade
      const priorityData = {
        low: tickets?.filter(t => t.priority === 'low').length || 0,
        medium: tickets?.filter(t => t.priority === 'medium').length || 0,
        high: tickets?.filter(t => t.priority === 'high').length || 0,
        urgent: tickets?.filter(t => t.priority === 'urgent').length || 0,
      };

      const ticketsByPriority = [
        { name: 'Baixa', value: priorityData.low, color: PRIORITY_COLORS.low },
        { name: 'Média', value: priorityData.medium, color: PRIORITY_COLORS.medium },
        { name: 'Alta', value: priorityData.high, color: PRIORITY_COLORS.high },
        { name: 'Urgente', value: priorityData.urgent, color: PRIORITY_COLORS.urgent },
      ].filter(item => item.value > 0);

      // Tickets por empresa
      const companyMap = new Map();
      tickets?.forEach(ticket => {
        const companyName = ticket.companies?.name || 'Sem empresa';
        companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
      });
      const ticketsByCompany = Array.from(companyMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Tickets por categoria
      const categoryMap = new Map();
      tickets?.forEach(ticket => {
        const category = ticket.category || 'Sem categoria';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const ticketsByCategory = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Tickets por equipamento
      const equipmentMap = new Map();
      tickets?.forEach(ticket => {
        const equipment = ticket.equipment_model || 'Sem modelo';
        equipmentMap.set(equipment, (equipmentMap.get(equipment) || 0) + 1);
      });
      const ticketsByEquipment = Array.from(equipmentMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Tickets por responsável
      const userMap = new Map();
      tickets?.forEach(ticket => {
        const userName = ticket.user_profiles?.full_name || 'Não atribuído';
        userMap.set(userName, (userMap.get(userName) || 0) + 1);
      });
      const ticketsByUser = Array.from(userMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Evolução temporal (últimos 12 meses)
      const ticketsOverTime = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthTickets = tickets?.filter(ticket => {
          const ticketDate = parseISO(ticket.created_at);
          return ticketDate >= monthStart && ticketDate <= monthEnd;
        }).length || 0;

        ticketsOverTime.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          tickets: monthTickets
        });
      }

      const avgResolutionTime = 2.5; // Placeholder

      setData({
        totalTickets,
        openTickets,
        closedTickets,
        inProgressTickets,
        pausedTickets,
        avgResolutionTime,
        ticketsByPriority,
        ticketsByStatus,
        ticketsByCompany,
        ticketsByCategory,
        ticketsByEquipment,
        ticketsByUser,
        ticketsOverTime,
      });
    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados dos relatórios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.openTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Fechados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.closedTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgResolutionTime}d</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de pizza - Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Tickets por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByStatus}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Prioridade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Tickets por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByPriority}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tickets por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={data.ticketsByCompany}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de linha - Evolução temporal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={data.ticketsOverTime}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="tickets" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Categoria */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tickets por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={data.ticketsByCategory}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Equipamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tickets por Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={data.ticketsByEquipment}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Responsável */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tickets por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={data.ticketsByUser}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Resumo estatístico */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Estatístico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
                <p className="text-2xl font-bold">
                  {data.totalTickets > 0 ? Math.round((data.closedTickets / data.totalTickets) * 100) : 0}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tickets em Aberto</p>
                <p className="text-2xl font-bold">
                  {data.openTickets + data.inProgressTickets + data.pausedTickets}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Empresas Ativas</p>
                <p className="text-2xl font-bold">{data.ticketsByCompany.length}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{data.ticketsByCategory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};