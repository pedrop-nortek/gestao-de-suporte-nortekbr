
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Plus, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Company = { id: string; name: string; country: string | null; website: string | null };

interface Props {
  value?: string;
  onChange: (companyId: string) => void;
  onCompanyLoaded?: (company: Company | null) => void; // para preencher país
  placeholder?: string;
  disabled?: boolean;
}

export const CompanyAutocomplete = ({ value, onChange, onCompanyLoaded, placeholder = "Selecione uma empresa", disabled }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", country: "", website: "" });

  const selectedCompany = useMemo(() => companies.find(c => c.id === value) || null, [companies, value]);

  useEffect(() => {
    const fetch = async () => {
      const like = debounced.trim();
      const query = supabase
        .from("companies")
        .select("id, name, country, website")
        .order("name")
        .limit(20);
      const { data, error } = like
        ? await query.ilike("name", `%${like}%`)
        : await query;
      if (error) {
        console.error(error);
        return;
      }
      setCompanies(data || []);
    };
    fetch();
  }, [debounced]);

  useEffect(() => {
    if (!value) {
      onCompanyLoaded?.(null);
      return;
    }
    const comp = companies.find(c => c.id === value);
    if (comp) onCompanyLoaded?.(comp);
  }, [value, companies, onCompanyLoaded]);

  const handleCreate = async () => {
    if (!newCompany.name.trim() || !newCompany.country.trim()) {
      toast({ title: "Atenção", description: "Informe nome e país.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.rpc("upsert_company_by_name_country", {
      _name: newCompany.name.trim(),
      _country: newCompany.country.trim(),
      _website: newCompany.website.trim() || null,
    });
    if (error) {
      console.error(error);
      toast({ title: "Erro", description: error.message || "Falha ao salvar empresa", variant: "destructive" });
      return;
    }
    // data é uuid
    const createdId: string = data as unknown as string;
    // recarrega a lista pegando a empresa criada/achada
    const { data: fetched } = await supabase.from("companies").select("id, name, country, website").eq("id", createdId).single();
    if (fetched) {
      setCompanies((prev) => {
        const exists = prev.find(c => c.id === fetched.id);
        return exists ? prev : [fetched as Company, ...prev];
      });
      onChange(createdId);
      onCompanyLoaded?.(fetched as Company);
      setCreatingOpen(false);
      setNewCompany({ name: "", country: "", website: "" });
      toast({ title: "Empresa vinculada", description: "Empresa selecionada com sucesso." });
    }
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between" disabled={disabled}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {selectedCompany ? `${selectedCompany.name}${selectedCompany.country ? ` • ${selectedCompany.country}` : ""}` : (placeholder || "Selecionar empresa")}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0 z-50 bg-popover">
          <Command>
            <CommandInput placeholder="Buscar empresa..." value={term} onValueChange={setTerm} />
            <CommandList>
              <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
              <CommandGroup heading="Empresas">
                {companies.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.country ?? ""}`}
                    onSelect={() => {
                      onChange(c.id);
                      onCompanyLoaded?.(c);
                      setOpen(false);
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="flex-1">{c.name}</span>
                    {c.country && <span className="text-muted-foreground">{c.country}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" type="button" disabled={disabled} title="Cadastrar nova empresa">
            <Plus className="h-4 w-4 mr-2" />
            Nova
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar nova empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">País</label>
              <Input
                value={newCompany.country}
                onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                placeholder="Ex.: Brasil, Norway, USA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" /> Website (opcional)
              </label>
              <Input
                value={newCompany.website}
                onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                placeholder="https://www.exemplo.com"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreatingOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
