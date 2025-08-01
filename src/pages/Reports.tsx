import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from '@/hooks/use-toast';
import { BarChart3, Clock, CheckCircle, AlertCircle, PieChart, TrendingUp, Users, Building2, Wrench, Tag, Filter } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
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
  ticketsOverTime: Array<{ week: string; weekDetail: string; tickets: number; weekIndex: number; weekOfMonth: number }>;
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
  'open': '#ef4444', // red-500 - mesmo que na lista de tickets
  'in_progress': '#22c55e', // green-500
  'closed': '#3b82f6', // blue-500
  'paused': '#6b7280', // gray-500
};

const PRIORITY_COLORS = {
  'low': '#d1d5db', // gray-300
  'medium': '#facc15', // yellow-400
  'high': '#f97316', // orange-500
  'urgent': '#dc2626', // red-600
};

// Cores para gráficos de pizza (array rotativo)
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
];

const getChartColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];

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

      // Evolução temporal semanal (últimos 12 meses) - 4 semanas por mês
      const ticketsOverTime = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        // Dividir cada mês em exatamente 4 semanas
        for (let week = 1; week <= 4; week++) {
          let weekStart: Date;
          let weekEnd: Date;
          
          if (week === 1) {
            weekStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
            weekEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 7);
          } else if (week === 2) {
            weekStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 8);
            weekEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 14);
          } else if (week === 3) {
            weekStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 15);
            weekEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 21);
          } else { // week === 4
            weekStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 22);
            weekEnd = monthEnd; // Até o final do mês
          }
          
          const weekTickets = tickets?.filter(ticket => {
            const ticketDate = parseISO(ticket.created_at);
            return ticketDate >= weekStart && ticketDate <= weekEnd;
          }).length || 0;
          
          // Mostrar nome do mês apenas na semana 2 (centro do mês)
          const monthLabel = week === 2 ? format(monthDate, 'MMM/yy', { locale: ptBR }) : '';
          
          ticketsOverTime.push({
            week: monthLabel,
            weekDetail: `S${week} ${format(monthDate, 'MMM/yy', { locale: ptBR })}`,
            tickets: weekTickets,
            weekIndex: (11 - i) * 4 + (week - 1),
            weekOfMonth: week
          });
        }
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[350px] bg-muted rounded animate-pulse" />
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col sm:flex-row gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Gráfico de pizza - Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Tickets por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
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
            <ChartContainer config={chartConfig} className="h-[350px]">
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

        {/* Gráfico de pizza - Empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tickets por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByCompany}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByCompany.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de evolução semanal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolução Semanal (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <LineChart data={data.ticketsOverTime}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false}
                  horizontal={false}
                />
                {/* Linhas verticais para separar meses */}
                {Array.from({ length: 11 }, (_, i) => (
                  <line
                    key={i}
                    x1={`${((i + 1) * 4 - 0.5) * (100 / 48)}%`}
                    y1="0%"
                    x2={`${((i + 1) * 4 - 0.5) * (100 / 48)}%`}
                    y2="100%"
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                ))}
                <XAxis 
                  dataKey="week" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {data.weekDetail}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].value} tickets
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tickets" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))", r: 3 }}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-1))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos secundários */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Gráfico de pizza - Categoria */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tickets por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Equipamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tickets por Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByEquipment}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByEquipment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Responsável */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tickets por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.ticketsByUser}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.ticketsByUser.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
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