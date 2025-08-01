import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface MultiSelectItem {
  value: string
  label: string
}

interface MultiSelectProps {
  items: MultiSelectItem[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  className?: string
  allOption?: { value: string; label: string }
}

export function MultiSelect({
  items,
  selectedValues,
  onSelectionChange,
  placeholder = "Selecionar...",
  className,
  allOption
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelectAll = () => {
    if (allOption) {
      onSelectionChange([allOption.value])
    } else {
      onSelectionChange(items.map(item => item.value))
    }
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handleItemToggle = (value: string, event?: React.MouseEvent) => {
    // Previne o fechamento do dropdown
    event?.stopPropagation()
    
    if (allOption && value === allOption.value) {
      // Se selecionou "Todos", limpa outras seleções
      onSelectionChange([allOption.value])
    } else {
      // Remove "Todos" se existir e seleciona/deseleciona o item
      const filteredValues = allOption 
        ? selectedValues.filter(v => v !== allOption.value)
        : selectedValues
      
      if (filteredValues.includes(value)) {
        onSelectionChange(filteredValues.filter(v => v !== value))
      } else {
        onSelectionChange([...filteredValues, value])
      }
    }
  }

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder
    }
    
    if (allOption && selectedValues.includes(allOption.value)) {
      return allOption.label
    }
    
    if (selectedValues.length === 1) {
      const item = items.find(item => item.value === selectedValues[0])
      return item?.label || placeholder
    }
    
    return `${selectedValues.length} selecionados`
  }

  const isAllSelected = allOption && selectedValues.includes(allOption.value)
  const hasSpecificSelections = selectedValues.length > 0 && !isAllSelected

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {getDisplayText()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-0" 
        align="start"
        onPointerDownOutside={() => setOpen(false)}
        onInteractOutside={(event) => {
          // Previne o fechamento quando clica em elementos internos
          if (event.target instanceof Element && 
              event.target.closest('[data-radix-popper-content-wrapper]')) {
            event.preventDefault()
          }
        }}
      >
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1 text-xs"
            >
              Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1 text-xs"
            >
              Limpar
            </Button>
          </div>
          
          {allOption && (
            <div 
              className="flex items-center space-x-2 py-1 cursor-pointer"
              onClick={(e) => handleItemToggle(allOption.value, e)}
            >
              <Checkbox
                id={`all-option`}
                checked={isAllSelected}
                onCheckedChange={() => {}}
              />
              <label
                htmlFor={`all-option`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {allOption.label}
              </label>
            </div>
          )}
          
          <div className="border-t pt-2 space-y-1">
            {items.map((item) => (
              <div 
                key={item.value} 
                className="flex items-center space-x-2 py-1 cursor-pointer"
                onClick={(e) => handleItemToggle(item.value, e)}
              >
                <Checkbox
                  id={item.value}
                  checked={selectedValues.includes(item.value) && !isAllSelected}
                  onCheckedChange={() => {}}
                />
                <label
                  htmlFor={item.value}
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {item.label}
                </label>
                {selectedValues.includes(item.value) && !isAllSelected && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}