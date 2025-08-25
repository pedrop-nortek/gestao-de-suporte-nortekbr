import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import { TicketMessages } from '@/components/TicketMessages';

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
}

export function TicketDetailDialog({ isOpen, onClose, ticket }: TicketDetailDialogProps) {
  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Ticket #{ticket.ticket_number} - {ticket.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <Badge variant="outline">{String(ticket.status)}</Badge>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
              {ticket.priority}
            </Badge>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Empresa</h4>
                <p className="text-sm">{ticket.companies?.name || "Não informada"}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">País</h4>
                <p className="text-sm">{ticket.country || "Não informado"}</p>
              </div>

              {ticket.category && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Categoria</h4>
                  <p className="text-sm">{ticket.category}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {ticket.user_profiles?.full_name && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Responsável</h4>
                  <p className="text-sm">{ticket.user_profiles.full_name}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Criado em</h4>
                <p className="text-sm">{new Date(ticket.created_at).toLocaleString()}</p>
              </div>

              {ticket.resolved_at && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Resolvido em</h4>
                  <p className="text-sm">{new Date(ticket.resolved_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipment Info */}
          {(ticket.equipment_models?.name || ticket.equipment_model || ticket.serial_number) && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Informações do Equipamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {(ticket.equipment_models?.name || ticket.equipment_model) && (
                  <div>
                    <span className="text-muted-foreground">Equipamento:</span>
                    <span className="ml-2 font-medium">
                      {ticket.equipment_models?.name ? 
                        `${ticket.equipment_models.name}${ticket.equipment_models.manufacturer ? ` (${ticket.equipment_models.manufacturer})` : ''}` 
                        : ticket.equipment_model
                      }
                    </span>
                  </div>
                )}
                
                {ticket.serial_number && (
                  <div>
                    <span className="text-muted-foreground">Série:</span>
                    <span className="ml-2 font-medium">{ticket.serial_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {ticket.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Descrição</h4>
              <div className="p-3 bg-muted/50 rounded text-sm">
                {ticket.description}
              </div>
            </div>
          )}

          {/* RMA Requests */}
          {ticket.rma_requests && ticket.rma_requests.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Solicitações RMA</h4>
              <div className="space-y-2">
                {ticket.rma_requests.map((rma: any) => (
                  <div key={rma.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="font-medium">#{rma.rma_number}</span>
                    <Badge variant="secondary">{rma.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens do Ticket */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Conversas do Ticket</h4>
            <TicketMessages ticketId={ticket.id} allowAddMessage={true} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}