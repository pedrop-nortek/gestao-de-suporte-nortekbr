import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
  const { updatePassword, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Verificar se está em modo de recovery através da URL
    const urlHash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    
    const hasRecoveryType = urlHash.includes('type=recovery') || 
                           urlParams.get('type') === 'recovery' ||
                           searchParams.get('type') === 'recovery';
    
    const hasTokens = urlHash.includes('access_token') || 
                     !!urlParams.get('access_token') ||
                     !!searchParams.get('access_token');

    setIsRecoveryMode(hasRecoveryType && hasTokens);

    // Se não está em modo recovery e não há sessão, redirecionar para auth
    if (!hasRecoveryType && !hasTokens && !session) {
      navigate('/auth');
    }
  }, [session, navigate, searchParams]);

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

    const { error } = await updatePassword(password);
    
    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Senha atualizada com sucesso!',
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
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