import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface UserSettings {
  email_notifications: boolean;
  push_notifications: boolean;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    push_notifications: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('user_settings')
          .update(newSettings)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            ...settings,
            ...newSettings,
          });

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast({
        title: 'Sucesso',
        description: 'Configurações atualizadas',
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    }
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({
      title: 'Sucesso',
      description: 'Cache limpo com sucesso',
    });
  };

  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const exportData = async (format: 'json' | 'csv' = exportFormat) => {
    setExporting(true);
    try {
      // Remove filtro por created_by e buscar todos os tickets com dados relacionados
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          companies (
            name,
            primary_email,
            whatsapp_phone
          )
        `);

      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Não há dados para exportar',
        });
        return;
      }

      let fileContent: string;
      let fileName: string;
      let mimeType: string;

      if (format === 'csv') {
        // Flatten data for CSV
        const flattenedData = tickets.map(ticket => ({
          ...ticket,
          company_name: ticket.companies?.name || '',
          company_email: ticket.companies?.primary_email || '',
          company_phone: ticket.companies?.whatsapp_phone || ''
        }));
        
        // Remove nested company object for CSV
        const csvData = flattenedData.map(({ companies, ...rest }) => rest);
        
        fileContent = convertToCSV(csvData);
        fileName = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        fileContent = JSON.stringify(tickets, null, 2);
        fileName = `tickets-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const dataBlob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: `${tickets.length} registros exportados em formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar dados',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre novos tickets
                </p>
              </div>
              <Switch 
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações push</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações no navegador
                </p>
              </div>
              <Switch 
                checked={settings.push_notifications}
                onCheckedChange={(checked) => updateSettings({ push_notifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alternar entre tema claro e escuro
                </p>
              </div>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  Limpar cache
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar limpeza de cache</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá limpar todos os dados temporários armazenados no seu navegador.
                    Isso não afetará seus dados no servidor, apenas as informações em cache local.
                    Você pode precisar fazer login novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearCache}>
                    Limpar cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label>Exportar dados</Label>
                <p className="text-sm text-muted-foreground">
                  Baixar seus dados em formato JSON ou CSV
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => exportData()} 
                  disabled={exporting}
                  className="min-w-[140px]"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar dados
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;