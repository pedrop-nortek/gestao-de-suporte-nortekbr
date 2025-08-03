-- Make rma_number nullable to allow creating RMAs without a number initially
ALTER TABLE public.rma_requests ALTER COLUMN rma_number DROP NOT NULL;