import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ReportData {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  pausedTickets: number;
  avgResolutionTime: number;
  ticketsByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  ticketsByCompany: Array<{
    company_name: string;
    count: number;
  }>;
}

export const Reports = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Buscar tickets com dados das empresas
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (name)
        `);

      if (ticketsError) throw ticketsError;

      // Calcular estatísticas
      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
      const pausedTickets = tickets?.filter(t => t.status === 'paused').length || 0;

      // Tickets por prioridade
      const ticketsByPriority = {
        low: tickets?.filter(t => t.priority === 'low').length || 0,
        medium: tickets?.filter(t => t.priority === 'medium').length || 0,
        high: tickets?.filter(t => t.priority === 'high').length || 0,
        urgent: tickets?.filter(t => t.priority === 'urgent').length || 0,
      };

      // Tickets por empresa
      const companyMap = new Map();
      tickets?.forEach(ticket => {
        const companyName = ticket.companies?.name || 'Sem empresa';
        companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
      });

      const ticketsByCompany = Array.from(companyMap.entries())
        .map(([company_name, count]) => ({ company_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Tempo médio de resolução (simulado)
      const avgResolutionTime = 2.5; // em dias

      setData({
        totalTickets,
        openTickets,
        closedTickets,
        inProgressTickets,
        pausedTickets,
        avgResolutionTime,
        ticketsByPriority,
        ticketsByCompany,
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

  const getStatusBadge = (status: string, count: number) => {
    const variants = {
      open: { variant: 'secondary' as const, label: 'Abertos' },
      in_progress: { variant: 'default' as const, label: 'Em Andamento' },
      closed: { variant: 'outline' as const, label: 'Fechados' },
      paused: { variant: 'destructive' as const, label: 'Pausados' },
    };

    const config = variants[status as keyof typeof variants];
    return (
      <div className="flex items-center justify-between">
        <span>{config.label}</span>
        <Badge variant={config.variant}>{count}</Badge>
      </div>
    );
  };

  const getPriorityBadge = (priority: string, count: number) => {
    const variants = {
      low: { variant: 'secondary' as const, label: 'Baixa' },
      medium: { variant: 'default' as const, label: 'Média' },
      high: { variant: 'outline' as const, label: 'Alta' },
      urgent: { variant: 'destructive' as const, label: 'Urgente' },
    };

    const config = variants[priority as keyof typeof variants];
    return (
      <div className="flex items-center justify-between">
        <span>{config.label}</span>
        <Badge variant={config.variant}>{count}</Badge>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse" />
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
      <h1 className="text-3xl font-bold">Relatórios</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {getStatusBadge('open', data.openTickets)}
            {getStatusBadge('in_progress', data.inProgressTickets)}
            {getStatusBadge('paused', data.pausedTickets)}
            {getStatusBadge('closed', data.closedTickets)}
          </CardContent>
        </Card>

        {/* Prioridade dos tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {getPriorityBadge('urgent', data.ticketsByPriority.urgent)}
            {getPriorityBadge('high', data.ticketsByPriority.high)}
            {getPriorityBadge('medium', data.ticketsByPriority.medium)}
            {getPriorityBadge('low', data.ticketsByPriority.low)}
          </CardContent>
        </Card>
      </div>

      {/* Tickets por empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Empresas por Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ticketsByCompany.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Nenhum dado disponível
            </p>
          ) : (
            <div className="space-y-3">
              {data.ticketsByCompany.map((item, index) => (
                <div key={item.company_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span>{item.company_name}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};