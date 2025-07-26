-- Criar tipos/enums para padronização
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed', 'paused');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.communication_channel AS ENUM ('email', 'whatsapp', 'manual', 'internal_note');
CREATE TYPE public.responsibility_type AS ENUM ('internal_support', 'awaiting_client', 'external_support', 'other');

-- Tabela de empresas/clientes
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  primary_email TEXT,
  whatsapp_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela principal de tickets
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number SERIAL UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  equipment_model TEXT,
  company_id UUID REFERENCES public.companies(id),
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'open',
  responsibility public.responsibility_type NOT NULL DEFAULT 'internal_support',
  channel public.communication_channel NOT NULL DEFAULT 'manual',
  external_message_id TEXT, -- Para threading de emails/WhatsApp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Histórico de mensagens/comunicação
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  channel public.communication_channel NOT NULL,
  sender_type TEXT NOT NULL, -- 'client' ou 'support'
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  content TEXT NOT NULL,
  external_message_id TEXT, -- ID da mensagem no sistema externo
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de anexos/dados enviados
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_extension TEXT,
  storage_location TEXT NOT NULL,
  context_description TEXT,
  file_size_bytes BIGINT,
  is_nortek_data BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de perfis de usuários (complementa auth.users)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'support_agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas relevantes
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (usuários autenticados podem ver todos os dados)
CREATE POLICY "Authenticated users can view companies" 
  ON public.companies FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can manage companies" 
  ON public.companies FOR ALL 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can view tickets" 
  ON public.tickets FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can manage tickets" 
  ON public.tickets FOR ALL 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can view messages" 
  ON public.ticket_messages FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can manage messages" 
  ON public.ticket_messages FOR ALL 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can view attachments" 
  ON public.ticket_attachments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can manage attachments" 
  ON public.ticket_attachments FOR ALL 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can view all profiles" 
  ON public.user_profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.user_profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_company ON public.tickets(company_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_tickets_updated_at ON public.tickets(updated_at);
CREATE INDEX idx_tickets_number ON public.tickets(ticket_number);

CREATE INDEX idx_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_messages_created_at ON public.ticket_messages(created_at);
CREATE INDEX idx_messages_channel ON public.ticket_messages(channel);

CREATE INDEX idx_attachments_ticket ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_attachments_nortek ON public.ticket_attachments(is_nortek_data);

CREATE INDEX idx_companies_email ON public.companies(primary_email);
CREATE INDEX idx_companies_name ON public.companies(name);

-- Inserir dados iniciais
INSERT INTO public.companies (name, primary_email, notes) VALUES
('Cliente Exemplo', 'cliente@exemplo.com', 'Cliente de teste para demonstração'),
('Empresa Demo', 'contato@demo.com', 'Empresa demo para testes');

-- Inserir ticket de exemplo
INSERT INTO public.tickets (title, description, category, equipment_model, company_id, priority, channel) 
SELECT 
  'Exemplo: ADCP não conecta ao software',
  'Cliente reporta que não consegue estabelecer conexão entre o equipamento ADCP e o software de coleta.',
  'Suporte Técnico',
  'Signature1000 ADCP',
  c.id,
  'medium',
  'manual'
FROM public.companies c WHERE c.name = 'Cliente Exemplo' LIMIT 1;