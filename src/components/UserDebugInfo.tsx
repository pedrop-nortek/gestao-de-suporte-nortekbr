import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const UserDebugInfo = () => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState<number>(0);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setProfile(profileData);

        // Fetch tickets accessible to this user
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, created_by, contact_id');
        
        setTicketCount(tickets?.length || 0);
        
        console.log('[DEBUG] Profile:', profileData);
        console.log('[DEBUG] Accessible tickets:', tickets?.length);
        console.log('[DEBUG] User ID:', user.id);
        console.log('[DEBUG] Session valid:', !!session);
      } catch (error) {
        console.error('[DEBUG] Error fetching debug info:', error);
      }
    };

    fetchDebugInfo();
  }, [user, session]);

  if (!user) {
    return (
      <Card className="mb-4 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Debug: Usuário não autenticado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Nenhum usuário logado encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-600">🔍 Debug: Informações do Usuário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div><strong>User ID:</strong> {user.id}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div>
          <strong>Role:</strong> 
          <Badge variant={profile?.role === 'support_agent' ? 'default' : 'secondary'} className="ml-2">
            {profile?.role || 'carregando...'}
          </Badge>
        </div>
        <div><strong>Nome:</strong> {profile?.full_name || 'não definido'}</div>
        <div><strong>Session válida:</strong> {session ? '✅' : '❌'}</div>
        <div><strong>Tickets acessíveis:</strong> {ticketCount}</div>
        
        {profile?.role === 'requester' && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <strong>⚠️ Solicitante:</strong> Você só pode ver tickets próprios
          </div>
        )}
        
        {profile?.role === 'support_agent' && (
          <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded">
            <strong>✅ Agente:</strong> Você pode ver todos os tickets
          </div>
        )}
      </CardContent>
    </Card>
  );
};