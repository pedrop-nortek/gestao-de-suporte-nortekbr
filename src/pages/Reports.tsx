import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from '@/hooks/use-toast';
import { BarChart3, Clock, CheckCircle, AlertCircle, PieChart, TrendingUp, Users, Building2, Wrench, Tag, Filter } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, startOfWeek, endOfWeek, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExtendedReportData {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  pausedTickets: number;
  resolvedTickets: number;
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
  'new': '#dc2626', // red-600 - Novo (vermelho)
  'open': '#facc15', // yellow-400 - Aberto (amarelo)
  'pending': '#a855f7', // purple-500 - Aguardando (roxo)
  'resolved': '#22c55e', // green-500 - Resolvido (verde)
  'unresolved': '#6b7280', // gray-500 - Não resolvido
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
  const [selectedYears, setSelectedYears] = useState<string[]>(['all']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['all']);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({ 
    value: (currentYear - i).toString(), 
    label: (currentYear - i).toString() 
  }));
  const months = [
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
  }, [selectedYears, selectedMonths]);

  const getDateFilter = () => {
    const isAllYears = selectedYears.includes('all');
    const isAllMonths = selectedMonths.includes('all');
    
    if (isAllYears && isAllMonths) {
      // Se todos os anos e meses estão selecionados, usar um range amplo
      const currentYear = new Date().getFullYear();
      return {
        startDate: startOfYear(new Date(currentYear - 4, 0, 1)).toISOString(),
        endDate: endOfYear(new Date(currentYear, 0, 1)).toISOString()
      };
    }
    
    if (isAllYears) {
      // Todos os anos, mas meses específicos
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 4;
      const endYear = currentYear;
      
      // Para cada mês selecionado, pegar o range de todos os anos
      const startMonths = selectedMonths.map(month => parseInt(month) - 1);
      const minMonth = Math.min(...startMonths);
      const maxMonth = Math.max(...startMonths);
      
      return {
        startDate: startOfMonth(new Date(startYear, minMonth, 1)).toISOString(),
        endDate: endOfMonth(new Date(endYear, maxMonth, 1)).toISOString()
      };
    }
    
    if (isAllMonths) {
      // Anos específicos, todos os meses
      const yearNumbers = selectedYears.map(year => parseInt(year));
      const minYear = Math.min(...yearNumbers);
      const maxYear = Math.max(...yearNumbers);
      
      return {
        startDate: startOfYear(new Date(minYear, 0, 1)).toISOString(),
        endDate: endOfYear(new Date(maxYear, 0, 1)).toISOString()
      };
    }
    
    // Anos e meses específicos
    const yearNumbers = selectedYears.map(year => parseInt(year));
    const monthNumbers = selectedMonths.map(month => parseInt(month) - 1);
    
    const minYear = Math.min(...yearNumbers);
    const maxYear = Math.max(...yearNumbers);
    const minMonth = Math.min(...monthNumbers);
    const maxMonth = Math.max(...monthNumbers);
    
    return {
      startDate: startOfMonth(new Date(minYear, minMonth, 1)).toISOString(),
      endDate: endOfMonth(new Date(maxYear, maxMonth, 1)).toISOString()
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
          user_profiles!tickets_assigned_to_fkey (full_name),
          equipment_models (name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (ticketsError) throw ticketsError;

      const totalTickets = tickets?.length || 0;
      const newTickets = tickets?.filter(t => t.status === 'new').length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const pendingTickets = tickets?.filter(t => t.status === 'pending').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0;
      const unresolvedTickets = tickets?.filter(t => t.status === 'unresolved').length || 0;

      // Dados para gráfico de pizza - Status
      const ticketsByStatus = [
        { name: 'Novo', value: newTickets, color: STATUS_COLORS.new },
        { name: 'Aberto', value: openTickets, color: STATUS_COLORS.open },
        { name: 'Aguardando', value: pendingTickets, color: STATUS_COLORS.pending },
        { name: 'Resolvido', value: resolvedTickets, color: STATUS_COLORS.resolved },
        { name: 'Não resolvido', value: unresolvedTickets, color: STATUS_COLORS.unresolved },
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
        const equipment = ticket.equipment_models?.name || 'Sem modelo';
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

      // Evolução temporal semanal baseada nos filtros selecionados
      const ticketsOverTime = [];
      
      // Determinar o período baseado nos filtros
      const isAllYears = selectedYears.includes('all');
      const isAllMonths = selectedMonths.includes('all');
      
      let startPeriod: Date;
      let endPeriod: Date;
      
      if (isAllYears && isAllMonths) {
        // Usar últimos 12 meses se não há filtros específicos
        const now = new Date();
        startPeriod = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endPeriod = new Date();
      } else {
        // Usar período baseado nos filtros
        const { startDate, endDate } = getDateFilter();
        startPeriod = parseISO(startDate);
        endPeriod = parseISO(endDate);
      }
      
      // Gerar semanas baseadas no período filtrado
      const startMonth = startOfMonth(startPeriod);
      const endMonth = endOfMonth(endPeriod);
      let currentMonth = startMonth;
      
      while (currentMonth <= endMonth) {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        
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
          const monthLabel = week === 2 ? format(currentMonth, 'MMM/yy', { locale: ptBR }) : '';
          
          ticketsOverTime.push({
            week: monthLabel,
            weekDetail: `S${week} ${format(currentMonth, 'MMM/yy', { locale: ptBR })}`,
            tickets: weekTickets,
            weekOfMonth: week
          });
        }
        
        // Próximo mês
        currentMonth = addMonths(currentMonth, 1);
      }

      // Calculate real average resolution time
      const resolvedTicketsList = tickets?.filter(t => t.status === 'resolved') || [];
      let avgResolutionTime = 0;
      
      if (resolvedTicketsList.length > 0) {
        const totalResolutionDays = resolvedTicketsList.reduce((total, ticket) => {
          const createdAt = parseISO(ticket.created_at);
          const updatedAt = parseISO(ticket.updated_at);
          const diffInMs = updatedAt.getTime() - createdAt.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          return total + diffInDays;
        }, 0);
        
        avgResolutionTime = Number((totalResolutionDays / resolvedTicketsList.length).toFixed(1));
      }

      setData({
        totalTickets,
        openTickets: openTickets, // Renomeado mas mantido para compatibilidade
        closedTickets: unresolvedTickets, // Fechados agora são "Não resolvidos"
        inProgressTickets: newTickets, // Em andamento agora são "Novo"
        pausedTickets: pendingTickets, // Pausados agora são "Aguardando"
        avgResolutionTime,
        ticketsByPriority,
        ticketsByStatus,
        ticketsByCompany,
        ticketsByCategory,
        ticketsByEquipment,
        ticketsByUser,
        ticketsOverTime,
        resolvedTickets, // Add resolvedTickets to data
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
            <MultiSelect
              items={years}
              selectedValues={selectedYears}
              onSelectionChange={setSelectedYears}
              placeholder="Selecionar anos..."
              className="w-48"
              allOption={{ value: 'all', label: 'Todos os anos' }}
            />
            <MultiSelect
              items={months}
              selectedValues={selectedMonths}
              onSelectionChange={setSelectedMonths}
              placeholder="Selecionar meses..."
              className="w-52"
              allOption={{ value: 'all', label: 'Todos os meses' }}
            />
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
            <CardTitle className="text-sm font-medium">Tickets Novos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inProgressTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resolvedTickets}</div>
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

      {/* Gráficos de pizza - dois por linha */}
      <div className="space-y-8">
        {/* Primeira linha: Status e Prioridade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Tickets por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByStatus}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByStatus.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Tickets por Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByPriority}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByPriority.map((entry, index) => (
                          <Cell key={`priority-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha: Empresa e Categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Tickets por Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByCompany}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByCompany.map((entry, index) => (
                          <Cell key={`company-${index}`} fill={getChartColor(index)} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tickets por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByCategory.map((entry, index) => (
                          <Cell key={`category-${index}`} fill={getChartColor(index)} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Terceira linha: Equipamento e Responsável */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tickets por Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByEquipment}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByEquipment.map((entry, index) => (
                          <Cell key={`equipment-${index}`} fill={getChartColor(index)} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tickets por Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-[400px] h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={data.ticketsByUser}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={65}
                      >
                        {data.ticketsByUser.map((entry, index) => (
                          <Cell key={`user-${index}`} fill={getChartColor(index)} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráfico de evolução semanal */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução Semanal (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.ticketsOverTime}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false}
                  horizontal={false}
                />
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
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Resumo estatístico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo Estatístico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
                <p className="text-2xl font-bold">
                  {data.totalTickets > 0 ? Math.round((data.closedTickets / data.totalTickets) * 100) : 0}%
                </p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">Tickets em Aberto</p>
                <p className="text-2xl font-bold">
                  {data.openTickets + data.inProgressTickets + data.pausedTickets}
                </p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">Empresas Ativas</p>
                <p className="text-2xl font-bold">{data.ticketsByCompany.length}</p>
              </div>
              <div className="space-y-2 text-center">
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