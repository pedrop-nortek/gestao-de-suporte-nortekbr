import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface RMA {
  id: string;
  ticket_id: string;
  rma_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  ticket?: {
    title: string;
    ticket_number: number;
  };
  completed_steps: number;
  total_steps: number;
}

export default function RMAs() {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRMAs();
    fetchStatistics();
  }, []);

  const fetchRMAs = async () => {
    try {
      const { data: rmaData, error } = await supabase
        .from('rma_requests')
        .select(`
          *,
          ticket:tickets(title, ticket_number),
          rma_steps(is_completed)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedRMAs = rmaData?.map(rma => ({
        ...rma,
        completed_steps: rma.rma_steps?.filter((step: any) => step.is_completed).length || 0,
        total_steps: rma.rma_steps?.length || 0
      })) || [];

      setRmas(processedRMAs);
    } catch (error) {
      console.error('Error fetching RMAs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os RMAs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase
        .from('rma_steps')
        .select(`
          step_name,
          step_order,
          is_completed,
          completed_at,
          rma_requests!inner(created_at)
        `)
        .eq('is_completed', true);

      if (error) {
        console.error('Error fetching RMA statistics:', error);
        return;
      }

      if (data) {
        // Calculate average time per step
        const stepStats = data.reduce((acc, step) => {
          const stepName = step.step_name;
          const createdAt = new Date(step.rma_requests.created_at);
          const completedAt = new Date(step.completed_at);
          const timeInDays = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (!acc[stepName]) {
            acc[stepName] = { times: [], order: step.step_order };
          }
          acc[stepName].times.push(timeInDays);
          return acc;
        }, {} as any);

        // Calculate averages and create chart data
        const chartData = Object.entries(stepStats).map(([stepName, data]: [string, any]) => {
          const avgTime = data.times.reduce((sum: number, time: number) => sum + time, 0) / data.times.length;
          return {
            step: stepName.length > 20 ? stepName.substring(0, 20) + '...' : stepName,
            fullStep: stepName,
            avgDays: Math.round(avgTime * 10) / 10,
            order: data.order
          };
        }).sort((a, b) => a.order - b.order);

        // Calculate total process time (completed RMAs)
        const completedRMAs = await supabase
          .from('rma_requests')
          .select(`
            created_at,
            rma_steps!inner(step_order, completed_at)
          `)
          .eq('rma_steps.step_order', 9)
          .eq('rma_steps.is_completed', true);

        let avgTotalTime = 0;
        if (completedRMAs.data && completedRMAs.data.length > 0) {
          const totalTimes = completedRMAs.data.map(rma => {
            const createdAt = new Date(rma.created_at);
            const lastStepCompleted = new Date(rma.rma_steps[0].completed_at);
            return (lastStepCompleted.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          });
          avgTotalTime = totalTimes.reduce((sum, time) => sum + time, 0) / totalTimes.length;
        }

        setStatistics({
          chartData,
          avgTotalTime: Math.round(avgTotalTime * 10) / 10,
          completedRMAs: completedRMAs.data?.length || 0
        });
      }
    } catch (error) {
      console.error('Error calculating statistics:', error);
    }
  };

  const getStatusBadge = (status: string, completedSteps: number, totalSteps: number) => {
    if (status === 'completed') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>;
    }
    if (completedSteps === 0) {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    return <Badge variant="outline">Em andamento ({completedSteps}/{totalSteps})</Badge>;
  };

  const filteredRMAs = rmas.filter(rma =>
    (rma.rma_number && rma.rma_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    rma.ticket?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: rmas.length,
    pending: rmas.filter(rma => rma.completed_steps === 0).length,
    inProgress: rmas.filter(rma => rma.completed_steps > 0 && rma.status !== 'completed').length,
    completed: rmas.filter(rma => rma.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RMAs</h1>
          <p className="text-muted-foreground">
            Gerencie autorizações de retorno para manutenção
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio por Etapa (dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  avgDays: {
                    label: "Dias",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="min-h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statistics.chartData}>
                    <XAxis 
                      dataKey="step" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name, props) => [
                          `${value} dias`,
                          `${props.payload.fullStep}`
                        ]}
                      />} 
                    />
                    <Bar dataKey="avgDays" fill="var(--color-avgDays)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Processo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tempo médio total:</span>
                <span className="text-lg font-bold">{statistics.avgTotalTime} dias</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">RMAs concluídos:</span>
                <span className="text-lg font-bold">{statistics.completedRMAs}</span>
              </div>
              {statistics.chartData.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Etapa mais demorada:</span>
                  <span className="text-lg font-bold">
                    {statistics.chartData.reduce((max, step) => 
                      step.avgDays > max.avgDays ? step : max
                    ).fullStep}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar RMAs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* RMA List */}
      <div className="grid gap-4">
        {filteredRMAs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum RMA encontrado</p>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar sua busca' : 'Ainda não há RMAs criados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRMAs.map((rma) => (
            <Card key={rma.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/dashboard/rmas/${rma.id}`)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">RMA #{rma.rma_number || 'Aguardando número'}</CardTitle>
                    <CardDescription>
                      Ticket #{rma.ticket?.ticket_number} - {rma.ticket?.title}
                    </CardDescription>
                  </div>
                  {getStatusBadge(rma.status, rma.completed_steps, rma.total_steps)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Criado em {new Date(rma.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Progresso: {rma.completed_steps}/{rma.total_steps} etapas
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}