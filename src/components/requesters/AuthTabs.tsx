
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

export const AuthTabs = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"signin" | "signup" | "reset" | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleSignIn = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: "Atenção", description: "Informe email e senha.", variant: "destructive" });
      return;
    }
    setLoading("signin");
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(null);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message || "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    }
  };

  const checkIfUserExists = async (email: string): Promise<boolean> => {
    try {
      // Tenta fazer login com uma senha inválida para detectar se o email existe
      const { error } = await signIn(email, "invalid_password_check_12345");
      
      // Se retornar "Invalid login credentials", o email existe
      if (error?.message?.includes("Invalid login credentials")) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSignUp = async () => {
    if (!signupEmail || !signupPassword) {
      toast({ title: "Atenção", description: "Informe email e senha.", variant: "destructive" });
      return;
    }
    
    setLoading("signup");
    
    // Verifica se o email já existe
    const userExists = await checkIfUserExists(signupEmail);
    
    if (userExists) {
      setLoading(null);
      toast({
        title: "Email já cadastrado",
        description: "Este email já possui uma conta. Use 'Esqueci minha senha' para recuperar o acesso.",
        variant: "destructive",
      });
      
      // Abrir automaticamente o dialog de recuperação
      setTimeout(() => {
        setResetEmail(signupEmail);
        setForgotPasswordOpen(true);
      }, 100);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword);
    setLoading(null);
    
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message || "Tente novamente.", variant: "destructive" });
    } else {
      toast({
        title: "Cadastro iniciado",
        description: "Verifique seu email (inclusive na pasta spam) para confirmar o acesso. Se não receber, use 'Esqueci minha senha'.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetEmail(signupEmail);
              setForgotPasswordOpen(true);
            }}
          >
            Não recebi o email
          </Button>
        ),
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({ title: "Atenção", description: "Informe seu email.", variant: "destructive" });
      return;
    }
    setLoading("reset");
    const { error } = await resetPassword(resetEmail);
    setLoading(null);
    if (error) {
      toast({ title: "Erro", description: error.message || "Tente novamente.", variant: "destructive" });
    } else {
      toast({
        title: "Email enviado",
        description: "Verifique seu email para redefinir a senha.",
      });
      setForgotPasswordOpen(false);
      setResetEmail("");
    }
  };

  return (
    <div className="w-full max-w-md">
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="signin">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Cadastrar</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="voce@empresa.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input
              type="password"
              placeholder="Sua senha"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleSignIn} className="w-full" disabled={loading === "signin"}>
            {loading === "signin" ? "Entrando..." : "Entrar"}
          </Button>
          
          <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="w-full mt-2 text-sm">
                Esqueci minha senha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recuperar Senha</DialogTitle>
                <DialogDescription>
                  Digite seu email para receber um link de recuperação.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setForgotPasswordOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading === "reset"}>
                    {loading === "reset" ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="signup" className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="voce@empresa.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input
              type="password"
              placeholder="Crie uma senha"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleSignUp} className="w-full" disabled={loading === "signup"}>
            {loading === "signup" ? "Cadastrando..." : "Cadastrar"}
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Mail className="h-3 w-3" />
            Você receberá um email para confirmar o cadastro.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
