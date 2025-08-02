-- Step 2: Update existing tickets to use new status values
UPDATE tickets SET status = 'new' WHERE status = 'open';
UPDATE tickets SET status = 'open' WHERE status = 'in_progress';
UPDATE tickets SET status = 'pending' WHERE status = 'pending_customer';
UPDATE tickets SET status = 'unresolved' WHERE status = 'closed';

-- Add logging for the status migration
UPDATE tickets SET ticket_log = COALESCE(ticket_log, '') || 
  CASE 
    WHEN status = 'new' THEN '[' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || '] Status migrado de "Aberto" para "Novo"' || CHR(10)
    WHEN status = 'open' THEN '[' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || '] Status migrado de "Em Progresso" para "Aberto"' || CHR(10)  
    WHEN status = 'pending' THEN '[' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || '] Status migrado de "Aguardando Cliente" para "Aguardando"' || CHR(10)
    WHEN status = 'unresolved' THEN '[' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || '] Status migrado de "Fechado" para "Não Resolvido"' || CHR(10)
    ELSE ''
  END
WHERE status IN ('new', 'open', 'pending', 'unresolved');