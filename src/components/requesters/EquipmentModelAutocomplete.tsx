
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Cpu, Type } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type Model = { id: string; name: string };

interface Props {
  value?: string | null;
  onPickExisting: (id: string) => void;
  onPickOther: () => void;
  placeholder?: string;
}

export const EquipmentModelAutocomplete = ({ value, onPickExisting, onPickOther, placeholder = "Selecione um modelo" }: Props) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const like = debounced.trim();
      const query = supabase.from("equipment_models").select("id, name").order("name").limit(20);
      const { data, error } = like ? await query.ilike("name", `%${like}%`) : await query;
      if (!error) setModels(data || []);
    };
    fetch();
  }, [debounced]);

  const selected = models.find(m => m.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {selected ? selected.name : placeholder}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 z-50 bg-popover">
        <Command>
          <CommandInput placeholder="Buscar modelo..." value={term} onValueChange={setTerm} />
          <CommandList>
            <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
            <CommandGroup heading="Modelos">
              {models.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.name}
                  onSelect={() => {
                    onPickExisting(m.id);
                    setOpen(false);
                  }}
                >
                  <Cpu className="mr-2 h-4 w-4" />
                  <span>{m.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Outro">
              <CommandItem
                key="other"
                value="Outro"
                onSelect={() => {
                  onPickOther();
                  setOpen(false);
                }}
              >
                <Type className="mr-2 h-4 w-4" />
                <span>Outro (descrever)</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
