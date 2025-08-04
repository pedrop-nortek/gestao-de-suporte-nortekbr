import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Package, Calendar, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RMAStep {
  id: string;
  step_name: string;
  step_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  functionality_notes: string | null;
}

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
}

export default function RMADetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rma, setRma] = useState<RMA | null>(null);
  const [steps, setSteps] = useState<RMAStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [functionalityNotes, setFunctionalityNotes] = useState('');
  const [showFunctionalityNotes, setShowFunctionalityNotes] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRMADetails();
    }
  }, [id]);

  const fetchRMADetails = async () => {
    try {
      const { data: rmaData, error: rmaError } = await supabase
        .from('rma_requests')
        .select(`
          *,
          ticket:tickets(title, ticket_number)
        `)
        .eq('id', id)
        .single();

      if (rmaError) throw rmaError;

      const { data: stepsData, error: stepsError } = await supabase
        .from('rma_steps')
        .select('*')
        .eq('rma_id', id)
        .order('step_order');

      if (stepsError) throw stepsError;

      setRma(rmaData);
      setSteps(stepsData || []);

      // Check if last step is unchecked to show functionality notes
      const lastStep = stepsData?.find(step => step.step_order === 9);
      if (lastStep && !lastStep.is_completed) {
        setShowFunctionalityNotes(true);
        setFunctionalityNotes(lastStep.functionality_notes || '');
      }
    } catch (error) {
      console.error('Error fetching RMA details:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do RMA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStepStatus = async (stepId: string, isCompleted: boolean, stepOrder: number) => {
    try {
      const updateData: any = {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? user?.id : null,
      };

      // Handle first step - add RMA number
      if (stepOrder === 1 && isCompleted) {
        const rmaNumber = prompt('Digite o número do RMA:');
        if (!rmaNumber?.trim()) {
          toast({
            title: "Erro",
            description: "Número do RMA é obrigatório para concluir esta etapa",
            variant: "destructive",
          });
          return;
        }

        // Update RMA with the number
        await supabase
          .from('rma_requests')
          .update({ rma_number: rmaNumber.trim() })
          .eq('id', id);

        // Add log entry to ticket for RMA number assignment
        const { data: ticket } = await supabase
          .from('tickets')
          .select('ticket_log')
          .eq('id', rma?.ticket_id)
          .single();

        if (ticket) {
          const logEntry = `RMA #${rmaNumber.trim()} criado e número atribuído em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
          const currentLog = ticket.ticket_log || '';
          const updatedLog = currentLog ? `${currentLog}\n${logEntry}` : logEntry;

          await supabase
            .from('tickets')
            .update({ ticket_log: updatedLog })
            .eq('id', rma?.ticket_id);
        }
      }

      // Handle functionality notes for the last step
      if (stepOrder === 9) {
        if (!isCompleted) {
          setShowFunctionalityNotes(true);
          updateData.functionality_notes = functionalityNotes;
        } else {
          setShowFunctionalityNotes(false);
          updateData.functionality_notes = null;
          
          // Mark RMA as completed
          await supabase
            .from('rma_requests')
            .update({ status: 'completed' })
            .eq('id', id);
        }
      }

      const { error } = await supabase
        .from('rma_steps')
        .update(updateData)
        .eq('id', stepId);

      if (error) throw error;

      await fetchRMADetails();
      
      toast({
        title: "Sucesso",
        description: `Etapa ${isCompleted ? 'marcada como concluída' : 'desmarcada'}`,
      });
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a etapa",
        variant: "destructive",
      });
    }
  };

  const deleteRMA = async () => {
    if (!rma) return;

    try {
      // Delete all RMA steps first (foreign key constraint)
      await supabase
        .from('rma_steps')
        .delete()
        .eq('rma_id', rma.id);

      // Delete the RMA request
      await supabase
        .from('rma_requests')
        .delete()
        .eq('id', rma.id);

      // Add log entry to ticket
      const { data: ticket } = await supabase
        .from('tickets')
        .select('ticket_log')
        .eq('id', rma.ticket_id)
        .single();

      if (ticket) {
        const logEntry = `RMA ${rma.rma_number || 'sem número'} excluído em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
        const currentLog = ticket.ticket_log || '';
        const updatedLog = currentLog ? `${currentLog}\n${logEntry}` : logEntry;

        await supabase
          .from('tickets')
          .update({ ticket_log: updatedLog })
          .eq('id', rma.ticket_id);
      }

      toast({
        title: "Sucesso",
        description: "RMA excluído com sucesso.",
      });

      navigate('/dashboard/rmas');
    } catch (error) {
      console.error('Error deleting RMA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o RMA.",
        variant: "destructive",
      });
    }
  };

  const saveFunctionalityNotes = async () => {
    if (!functionalityNotes.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, descreva a não funcionalidade do equipamento",
        variant: "destructive",
      });
      return;
    }

    try {
      const lastStep = steps.find(step => step.step_order === 9);
      if (lastStep) {
        const { error } = await supabase
          .from('rma_steps')
          .update({ functionality_notes: functionalityNotes })
          .eq('id', lastStep.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Observações sobre funcionalidade salvas",
        });
      }
    } catch (error) {
      console.error('Error saving functionality notes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as observações",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!rma) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium">RMA não encontrado</p>
        <Button onClick={() => navigate('/dashboard/rmas')} className="mt-4">
          Voltar para RMAs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/rmas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RMA #{rma.rma_number || 'Aguardando número'}</h1>
            <p className="text-muted-foreground">
              Ticket #{rma.ticket?.ticket_number} - {rma.ticket?.title}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir RMA
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este RMA? Esta ação não pode ser desfeita.
                Todas as etapas e dados relacionados serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteRMA} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir RMA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* RMA Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações do RMA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número RMA</label>
              <p className="text-sm text-muted-foreground">{rma.rma_number || 'Aguardando número'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <div className="mt-1">
                <Badge variant={rma.status === 'completed' ? 'default' : 'secondary'}>
                  {rma.status === 'completed' ? 'Concluído' : 'Em andamento'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Criado em</label>
              <p className="text-sm text-muted-foreground">
                {new Date(rma.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <Button 
              onClick={() => navigate(`/dashboard/tickets/${rma.ticket_id}`)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Ver Ticket
            </Button>
          </CardContent>
        </Card>

        {/* RMA Steps */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Etapas do RMA</CardTitle>
            <CardDescription>
              Marque cada etapa conforme ela for concluída
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={step.is_completed}
                  onCheckedChange={(checked) => 
                    updateStepStatus(step.id, checked as boolean, step.step_order)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{step.step_name}</h4>
                    <span className="text-sm text-muted-foreground">
                      Etapa {step.step_order}
                    </span>
                  </div>
                  
                  {step.is_completed && step.completed_at && (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(step.completed_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {/* Show functionality notes field for last step when unchecked */}
                  {step.step_order === 9 && showFunctionalityNotes && (
                    <div className="mt-3 space-y-2">
                      <label className="text-sm font-medium text-red-600">
                        Descreva a não funcionalidade do equipamento:
                      </label>
                      <Textarea
                        value={functionalityNotes}
                        onChange={(e) => setFunctionalityNotes(e.target.value)}
                        placeholder="Descreva os problemas encontrados no equipamento..."
                        className="min-h-[100px]"
                      />
                      <Button onClick={saveFunctionalityNotes} size="sm">
                        Salvar Observações
                      </Button>
                    </div>
                  )}

                  {/* Show existing functionality notes */}
                  {step.functionality_notes && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                      <label className="text-sm font-medium text-red-600">
                        Problemas reportados:
                      </label>
                      <p className="text-sm text-red-800 mt-1">{step.functionality_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}