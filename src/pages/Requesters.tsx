
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AuthTabs } from "@/components/requesters/AuthTabs";
import { CompanyAutocomplete } from "@/components/requesters/CompanyAutocomplete";
import { EquipmentModelAutocomplete } from "@/components/requesters/EquipmentModelAutocomplete";
import { PriorityHint } from "@/components/requesters/PriorityHint";
import { Database } from "@/integrations/supabase/types";
import { AlertCircle, ListChecks, PlusCircle, User, Phone, Mail, Ticket } from "lucide-react";

type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const LinkSchema = z.object({
  company_id: z.string().uuid({ message: "Selecione uma empresa." }),
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Email inválido."),
  phone: z.string().optional(),
});

const TicketSchema = z.object({
  title: z.string().min(10, "Mínimo de 10 caracteres.").max(120, "Máximo de 120 caracteres."),
  description: z.string().min(1, "Descrição é obrigatória."),
  country: z.string().min(2, "Informe o país."),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  modelMode: z.enum(["existing", "other"]),
  equipment_model_id: z.string().uuid().nullable().optional(),
  equipment_model_other: z.string().optional().refine(
    (val) => val === undefined || val.trim().length > 0,
    "Descreva o modelo quando selecionar 'Outro'."
  ),
  serial_number: z.string().regex(/^[A-Za-z0-9-]{4,64}$/, "Número de série inválido (4–64, letras/números/hífens).").optional(),
});

type LinkForm = z.infer<typeof LinkSchema>;
type TicketForm = z.infer<typeof TicketSchema>;

type Company = { id: string; name: string; country: string | null };

export default function Requesters() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Estado de vínculo
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  // Tickets do solicitante
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Forms
  const linkForm = useForm<LinkForm>({
    resolver: zodResolver(LinkSchema),
    defaultValues: {
      company_id: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  const ticketForm = useForm<TicketForm>({
    resolver: zodResolver(TicketSchema),
    defaultValues: {
      title: "",
      description: "",
      country: "",
      priority: "medium",
      modelMode: "existing",
      equipment_model_id: null,
      equipment_model_other: "",
      serial_number: "",
    },
  });

  // Quando logar, tentar carregar contato existente e empresa associada
  useEffect(() => {
    const loadExistingContact = async () => {
      if (!user) return;
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, name, email, phone, company_id, company:companies(id, name, country)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (contact) {
        setContactId(contact.id);
        if (contact.company) {
          linkForm.setValue("company_id", contact.company.id);
          setSelectedCompany({ id: contact.company.id, name: contact.company.name, country: contact.company.country });
          ticketForm.setValue("country", contact.company.country || "");
        }
        if (contact.name) linkForm.setValue("name", contact.name);
        if (contact.email) linkForm.setValue("email", contact.email);
        if (contact.phone) linkForm.setValue("phone", contact.phone);
      } else {
        // Pré-preenche email com o do usuário
        linkForm.setValue("email", user.email || "");
      }
    };
    loadExistingContact();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLink = async (data: LinkForm) => {
    if (!user) return;
    setLinkLoading(true);
    const { data: contactUuid, error } = await supabase.rpc("ensure_contact_for_current_user", {
      _company_id: data.company_id,
      _name: data.name,
      _email: data.email,
      _phone: data.phone || null,
    });
    setLinkLoading(false);
    if (error) {
      console.error(error);
      toast({ title: "Erro ao vincular", description: error.message || "Tente novamente.", variant: "destructive" });
      return;
    }
    setContactId(contactUuid as unknown as string);
    toast({ title: "Vinculado!", description: "Dados do solicitante atualizados." });
  };

  // Lista tickets do solicitante (RLS já limita aos próprios)
  const fetchMyTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, ticket_number, title, status, priority, created_at, country, companies(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingTickets(false);
    if (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível carregar seus tickets.", variant: "destructive" });
      return;
    }
    setMyTickets(data || []);
  };

  useEffect(() => {
    if (user) fetchMyTickets();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao trocar empresa, pré-preencher país
  const handleCompanyLoaded = (c: Company | null) => {
    setSelectedCompany(c);
    if (c?.country) {
      ticketForm.setValue("country", c.country);
    }
    if (c?.id) {
      linkForm.setValue("company_id", c.id);
    }
  };

  const creatingTicket = ticketForm.formState.isSubmitting;

  const onCreateTicket = async (data: TicketForm) => {
    if (!user || !contactId || !linkForm.getValues("company_id")) {
      toast({ title: "Atenção", description: "Vincule-se a uma empresa antes de criar o ticket.", variant: "destructive" });
      return;
    }

    // Ajusta campos de equipamento conforme modo
    const equipment_model_id = data.modelMode === "existing" ? (data.equipment_model_id || null) : null;
    const equipment_model = data.modelMode === "other" ? (data.equipment_model_other?.trim() || null) : null;

    const { data: newTicket, error } = await supabase
      .from("tickets")
      .insert({
        title: data.title.trim(),
        description: data.description.trim(),
        company_id: linkForm.getValues("company_id"),
        contact_id: contactId,
        created_by: user.id,
        priority: data.priority as TicketPriority,
        equipment_model_id,
        equipment_model,
        serial_number: data.serial_number || null,
        channel: "manual",
        responsibility: "internal_support",
        country: data.country || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      toast({ title: "Erro", description: error.message || "Falha ao criar ticket.", variant: "destructive" });
      return;
    }

    toast({ title: "Ticket criado!", description: "Seu ticket foi registrado com sucesso." });
    ticketForm.reset({
      title: "",
      description: "",
      country: selectedCompany?.country || "",
      priority: "medium",
      modelMode: "existing",
      equipment_model_id: null,
      equipment_model_other: "",
      serial_number: "",
    });
    fetchMyTickets();
  };

  const isLinked = useMemo(() => Boolean(user && linkForm.getValues("company_id") && contactId), [user, contactId, linkForm]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Portal do Solicitante</h1>
          <p className="text-muted-foreground">Acesse para criar novos tickets e acompanhar o status.</p>
        </div>
        <div className="flex justify-center">
          <AuthTabs />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Portal do Solicitante</h1>
          <p className="text-muted-foreground">Vincule sua empresa e abra novos tickets de suporte.</p>
        </div>
      </div>

      {/* Vincular Empresa/Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Seus dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <CompanyAutocomplete
                value={linkForm.watch("company_id")}
                onChange={(val) => linkForm.setValue("company_id", val)}
                onCompanyLoaded={handleCompanyLoaded}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={linkForm.watch("name")} onChange={(e) => linkForm.setValue("name", e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
              <Input type="email" value={linkForm.watch("email")} onChange={(e) => linkForm.setValue("email", e.target.value)} placeholder="voce@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Telefone</Label>
              <Input value={linkForm.watch("phone") || ""} onChange={(e) => linkForm.setValue("phone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={linkForm.handleSubmit(handleLink)} disabled={linkLoading}>
              {linkLoading ? "Salvando..." : "Vincular Atualizações"}
            </Button>
          </div>
          {!isLinked && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Vincule-se a uma empresa para liberar o formulário de ticket.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de novo ticket */}
      <Card className={isLinked ? "" : "opacity-50 pointer-events-none"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Novo Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={ticketForm.handleSubmit(onCreateTicket)} className="space-y-5">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={ticketForm.watch("title")}
                onChange={(e) => ticketForm.setValue("title", e.target.value)}
                placeholder="Resuma o problema (10–120)"
              />
              {ticketForm.formState.errors.title && (
                <p className="text-destructive text-sm">{ticketForm.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={ticketForm.watch("description")}
                onChange={(e) => ticketForm.setValue("description", e.target.value)}
                placeholder="Descreva com detalhes o problema."
              />
              {ticketForm.formState.errors.description && (
                <p className="text-destructive text-sm">{ticketForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>País da ocorrência</Label>
                <Input
                  value={ticketForm.watch("country")}
                  onChange={(e) => ticketForm.setValue("country", e.target.value)}
                  placeholder="Pré-preenchido pelo país da empresa (editável)"
                />
                {ticketForm.formState.errors.country && (
                  <p className="text-destructive text-sm">{ticketForm.formState.errors.country.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                  value={ticketForm.watch("priority")}
                  onChange={(e) => ticketForm.setValue("priority", e.target.value as TicketPriority)}
                >
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
                <PriorityHint />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo do equipamento</Label>
                <EquipmentModelAutocomplete
                  value={ticketForm.watch("modelMode") === "existing" ? (ticketForm.watch("equipment_model_id") || null) : null}
                  onPickExisting={(id) => {
                    ticketForm.setValue("modelMode", "existing");
                    ticketForm.setValue("equipment_model_id", id);
                    ticketForm.setValue("equipment_model_other", "");
                  }}
                  onPickOther={() => {
                    ticketForm.setValue("modelMode", "other");
                    ticketForm.setValue("equipment_model_id", null);
                  }}
                />
                {ticketForm.watch("modelMode") === "other" && (
                  <div className="mt-2 space-y-1">
                    <Label>Descreva o modelo</Label>
                    <Input
                      placeholder="Informe o modelo"
                      value={ticketForm.watch("equipment_model_other")}
                      onChange={(e) => ticketForm.setValue("equipment_model_other", e.target.value)}
                    />
                    {ticketForm.formState.errors.equipment_model_other && (
                      <p className="text-destructive text-sm">{ticketForm.formState.errors.equipment_model_other.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Número de série</Label>
                <Input
                  placeholder="XXXX-YYYY"
                  value={ticketForm.watch("serial_number")}
                  onChange={(e) => ticketForm.setValue("serial_number", e.target.value)}
                />
                {ticketForm.formState.errors.serial_number && (
                  <p className="text-destructive text-sm">{ticketForm.formState.errors.serial_number.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={creatingTicket}>
                {creatingTicket ? "Criando..." : "Criar Ticket"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Seus Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="grid gap-3">
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
          ) : myTickets.length === 0 ? (
            <p className="text-muted-foreground">Você ainda não criou tickets.</p>
          ) : (
            <div className="grid gap-3">
              {myTickets.map((t) => (
                <div key={t.id} className="border rounded p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">#{t.ticket_number}</span>
                    </div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.companies?.name ? `${t.companies.name} • ` : ""}{t.country || "País não informado"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      {String(t.status)}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs mt-1">
                      Prioridade: <span className="font-medium">{t.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
