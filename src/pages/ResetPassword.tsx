import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const { updatePassword, user, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [canResetPassword, setCanResetPassword] = useState(false);

  useEffect(() => {
    const initializeResetPassword = async () => {
      // Aguardar o auth carregar
      if (authLoading) return;

      try {
        // Verificar se há session ativa
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          toast({
            title: 'Link inválido',
            description: 'Link de recuperação inválido ou expirado. Solicite um novo link.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }

        if (currentSession?.user) {
          console.log('Sessão válida encontrada para reset de senha');
          setCanResetPassword(true);
          
          // Limpar tokens da URL se existirem
          if (window.location.hash || window.location.search.includes('access_token')) {
            window.history.replaceState({}, document.title, '/auth/reset-password');
          }
        } else {
          // Sem sessão válida
          toast({
            title: 'Acesso negado',
            description: 'É necessário um link válido de recuperação de senha. Verifique sua caixa de email.',
            variant: 'destructive',
          });
          navigate('/auth');
        }
      } catch (error) {
        console.error('Erro ao inicializar reset de senha:', error);
        navigate('/auth');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeResetPassword();
  }, [authLoading, navigate, toast]);

  // Se ainda está carregando o auth ou inicializando
  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Verificando link de recuperação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não pode redefinir senha, redirecionar
  if (!canResetPassword) {
    return <Navigate to="/auth" replace />;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        console.error('Erro ao atualizar senha:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao atualizar senha. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: 'Senha atualizada com sucesso! Redirecionando...',
        });
        
        // Aguardar um momento antes de redirecionar
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao atualizar senha. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha para finalizar o processo de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;