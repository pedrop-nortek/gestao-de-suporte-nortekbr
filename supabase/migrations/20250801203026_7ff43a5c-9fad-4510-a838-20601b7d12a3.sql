-- Migration to fix equipment model data consistency
-- Map existing equipment_model text values to equipment_model_id references

-- First, let's update tickets that have equipment_model but no equipment_model_id
-- Map common equipment model names to their IDs

UPDATE tickets 
SET equipment_model_id = (
  SELECT id FROM equipment_models 
  WHERE LOWER(name) LIKE '%' || LOWER(tickets.equipment_model) || '%'
  LIMIT 1
)
WHERE equipment_model IS NOT NULL 
  AND equipment_model != '' 
  AND equipment_model_id IS NULL;

-- Clean up any empty string equipment_model_id values to null
UPDATE tickets 
SET equipment_model_id = NULL 
WHERE equipment_model_id = '';

-- Update any tickets with specific known mappings
UPDATE tickets 
SET equipment_model_id = (
  SELECT id FROM equipment_models WHERE name = 'AQP - S2VP' LIMIT 1
)
WHERE equipment_model = 'S2VP' AND equipment_model_id IS NULL;

UPDATE tickets 
SET equipment_model_id = (
  SELECT id FROM equipment_models WHERE name = 'AQP - S2SP' LIMIT 1
)
WHERE equipment_model = 'S2SP' AND equipment_model_id IS NULL;