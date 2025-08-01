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
  const { updatePassword, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [tokenProcessing, setTokenProcessing] = useState(true);

  useEffect(() => {
    const checkRecoveryToken = async () => {
      try {
        // Verificar se há tokens na URL (hash ou query params)
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Buscar tokens em diferentes locais
        const hashParams = new URLSearchParams(urlHash.substring(1));
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        const tokenType = hashParams.get('type') || urlParams.get('type');
        
        console.log('Recovery check:', { accessToken: !!accessToken, refreshToken: !!refreshToken, tokenType });
        
        if (accessToken && tokenType === 'recovery') {
          // Definir a sessão com os tokens da URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('Erro ao processar token de recovery:', error);
            toast({
              title: 'Erro',
              description: 'Link de recuperação inválido ou expirado.',
              variant: 'destructive',
            });
            navigate('/auth');
          } else {
            console.log('Token de recovery processado com sucesso');
            setIsRecoveryMode(true);
            // Limpar URL dos tokens após processar
            window.history.replaceState({}, document.title, '/auth/reset-password');
          }
        } else if (session?.user) {
          // Se há sessão mas não está em recovery mode, verificar se é sessão de recovery
          // Usuários em sessão normal não deveriam estar aqui
          console.log('Usuário já logado, verificando contexto...');
          setIsRecoveryMode(true);
        } else if (!session && !accessToken) {
          // Se não há tokens nem sessão, redirecionar para auth
          navigate('/auth');
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        navigate('/auth');
      } finally {
        setTokenProcessing(false);
      }
    };

    checkRecoveryToken();
  }, [session, navigate, toast]);

  // Se ainda está processando o token, mostrar loading
  if (tokenProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Processando link de recuperação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se usuário já está logado e não está em modo recovery, redirecionar para dashboard
  if (user && session && !isRecoveryMode) {
    return <Navigate to="/dashboard" replace />;
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
          description: error.message || 'Erro ao atualizar senha.',
          variant: 'destructive',
        });
      } else {
        console.log('Senha atualizada com sucesso');
        toast({
          title: 'Sucesso',
          description: 'Senha atualizada com sucesso!',
        });
        
        // Limpar a URL de tokens após sucesso
        window.history.replaceState({}, document.title, '/dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao atualizar senha.',
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
          <CardDescription>Digite sua nova senha</CardDescription>
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