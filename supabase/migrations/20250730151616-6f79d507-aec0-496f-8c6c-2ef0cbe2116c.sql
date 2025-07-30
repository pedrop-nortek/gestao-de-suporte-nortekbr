-- Fix RLS policies for companies table
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Create proper RLS policies for companies
CREATE POLICY "Authenticated users can view companies" 
  ON public.companies FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert companies" 
  ON public.companies FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies" 
  ON public.companies FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can delete companies" 
  ON public.companies FOR DELETE 
  TO authenticated 
  USING (true);

-- Fix RLS policies for user_settings table
DROP POLICY IF EXISTS "Users can create their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;

-- Create proper RLS policies for user_settings
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);