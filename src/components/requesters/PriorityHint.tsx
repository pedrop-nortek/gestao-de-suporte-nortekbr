
import { Info } from "lucide-react";

export const PriorityHint = () => {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1">
      <Info className="h-4 w-4 mt-0.5" />
      <div className="space-y-0.5">
        <p><span className="font-medium">Urgente</span>: &lt; 1 dia</p>
        <p><span className="font-medium">Alta</span>: = 1 dia</p>
        <p><span className="font-medium">Média</span>: 1–3 dias</p>
        <p><span className="font-medium">Baixa</span>: &gt; 3 dias</p>
      </div>
    </div>
  );
};
