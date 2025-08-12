
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export const AuthTabs = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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

  const handleSignUp = async () => {
    if (!signupEmail || !signupPassword) {
      toast({ title: "Atenção", description: "Informe email e senha.", variant: "destructive" });
      return;
    }
    setLoading("signup");
    const { error } = await signUp(signupEmail, signupPassword);
    setLoading(null);
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message || "Tente novamente.", variant: "destructive" });
    } else {
      toast({
        title: "Cadastro realizado",
        description: "Verifique seu email para confirmar o acesso.",
      });
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
