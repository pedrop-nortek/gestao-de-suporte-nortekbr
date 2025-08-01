import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Ticket, Building2, Users, BarChart3 } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  // Check if this is a recovery token redirect
  const urlHash = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(urlHash.substring(1));
  const hasRecoveryToken = hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery';

  if (user && !hasRecoveryToken) {
    window.location.href = "/dashboard";
    return null;
  }

  // If there's a recovery token, redirect to reset password page
  if (hasRecoveryToken) {
    window.location.href = "/auth/reset-password";
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Sistema de Tickets</h1>
          </div>
          <Button asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Gerencie seus tickets de suporte
          <br />
          <span className="text-primary">de forma eficiente</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Sistema completo para gestão de tickets de suporte com múltiplos canais, 
          categorização inteligente e acompanhamento em tempo real.
        </p>
        <Button size="lg" asChild>
          <Link to="/auth">Começar Agora</Link>
        </Button>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Funcionalidades</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Gestão de Empresas</h4>
              <p className="text-muted-foreground">
                Organize tickets por empresa e mantenha controle total sobre cada cliente.
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Múltiplos Canais</h4>
              <p className="text-muted-foreground">
                Receba tickets via email, telefone, chat, WhatsApp e atendimento presencial.
              </p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Relatórios Detalhados</h4>
              <p className="text-muted-foreground">
                Acompanhe métricas de desempenho e gere relatórios completos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Sistema de Tickets. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
