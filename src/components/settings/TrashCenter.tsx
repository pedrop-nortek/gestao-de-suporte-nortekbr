import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

// Types
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type EquipmentModel = Database["public"]["Tables"]["equipment_models"]["Row"];
type RmaRequest = Database["public"]["Tables"]["rma_requests"]["Row"];

type TabKey = "companies" | "contacts" | "tickets" | "equipment_models" | "rmas";

export function TrashCenter() {
  const { toast } = useToast();
  const [active, setActive] = useState<TabKey>("companies");

  // State per tab
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [rmas, setRmas] = useState<RmaRequest[]>([]);

  const [loading, setLoading] = useState(false);
  const [emptying, setEmptying] = useState(false);

  const fetchers: Record<TabKey, () => Promise<void>> = useMemo(
    () => ({
      companies: async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_deleted_companies");
        if (error) {
          toast({ title: "Erro", description: "Falha ao carregar lixeira de empresas", variant: "destructive" });
        } else {
          setCompanies(data || []);
        }
        setLoading(false);
      },
      contacts: async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_deleted_contacts");
        if (error) {
          toast({ title: "Erro", description: "Falha ao carregar lixeira de contatos", variant: "destructive" });
        } else {
          setContacts(data || []);
        }
        setLoading(false);
      },
      tickets: async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_deleted_tickets");
        if (error) {
          toast({ title: "Erro", description: "Falha ao carregar lixeira de tickets", variant: "destructive" });
        } else {
          setTickets(data || []);
        }
        setLoading(false);
      },
      equipment_models: async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_deleted_equipment_models");
        if (error) {
          toast({ title: "Erro", description: "Falha ao carregar lixeira de modelos", variant: "destructive" });
        } else {
          setModels(data || []);
        }
        setLoading(false);
      },
      rmas: async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_deleted_rma_requests");
        if (error) {
          toast({ title: "Erro", description: "Falha ao carregar lixeira de RMAs", variant: "destructive" });
        } else {
          setRmas(data || []);
        }
        setLoading(false);
      },
    }),
    [toast]
  );

  useEffect(() => {
    fetchers[active]();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const refresh = () => fetchers[active]();

  const restore = async (id: string, tab: TabKey) => {
    try {
      switch (tab) {
        case "companies":
          await supabase.rpc("restore_company", { _id: id });
          break;
        case "contacts":
          await supabase.rpc("restore_contact", { _id: id });
          break;
        case "tickets":
          await supabase.rpc("restore_ticket", { _id: id });
          break;
        case "equipment_models":
          await supabase.rpc("restore_equipment_model", { _id: id });
          break;
        case "rmas":
          await supabase.rpc("restore_rma_request", { _id: id });
          break;
      }
      toast({ title: "Restaurado", description: "Item restaurado com sucesso" });
      fetchers[tab]();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao restaurar", variant: "destructive" });
    }
  };

  const emptyExpired = async () => {
    try {
      setEmptying(true);
      await Promise.all([
        supabase.rpc("hard_delete_old_companies"),
        supabase.rpc("hard_delete_old_contacts"),
        supabase.rpc("hard_delete_old_tickets"),
        supabase.rpc("hard_delete_old_equipment_models"),
        supabase.rpc("hard_delete_old_rma_requests"),
        supabase.rpc("hard_delete_old_rma_steps"),
      ]);
      toast({ title: "Lixeira esvaziada", description: "Itens expirados removidos permanentemente" });
      refresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao esvaziar lixeira", variant: "destructive" });
    } finally {
      setEmptying(false);
    }
  };

  const renderTable = (tab: TabKey) => {
    if (loading) return <p className="text-muted-foreground">Carregando...</p>;

    const rows =
      tab === "companies" ? companies :
      tab === "contacts" ? contacts :
      tab === "tickets" ? tickets :
      tab === "equipment_models" ? models :
      rmas;

    if (!rows || rows.length === 0) {
      return <p className="text-muted-foreground">Nada na lixeira (últimos 30 dias)</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{
              tab === "tickets" ? "Ticket" :
              tab === "equipment_models" ? "Modelo" :
              tab === "rmas" ? "RMA" :
              tab === "contacts" ? "Contato" : "Empresa"
            }</TableHead>
            <TableHead>Deletado em</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {tab === "tickets" && (`#${item.ticket_number} - ${item.title}`)}
                {tab === "equipment_models" && (item.name)}
                {tab === "rmas" && (item.rma_number || "(sem número)")}
                {tab === "contacts" && (item.name)}
                {tab === "companies" && (item.name)}
              </TableCell>
              <TableCell>{item.deleted_at ? new Date(item.deleted_at).toLocaleString("pt-BR") : "-"}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => restore(item.id, tab)}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
        <Button variant="destructive" onClick={emptyExpired} disabled={emptying}>
          <Trash2 className="h-4 w-4 mr-2" /> {emptying ? "Esvaziando..." : "Esvaziar lixeira (itens expirados)"}
        </Button>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)} className="w-full">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="equipment_models">Modelos</TabsTrigger>
          <TabsTrigger value="rmas">RMAs</TabsTrigger>
        </TabsList>
        <TabsContent value="companies">{renderTable("companies")}</TabsContent>
        <TabsContent value="contacts">{renderTable("contacts")}</TabsContent>
        <TabsContent value="tickets">{renderTable("tickets")}</TabsContent>
        <TabsContent value="equipment_models">{renderTable("equipment_models")}</TabsContent>
        <TabsContent value="rmas">{renderTable("rmas")}</TabsContent>
      </Tabs>
    </div>
  );
}
