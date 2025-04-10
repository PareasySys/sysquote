
-- SQL functions to be run once in the Supabase SQL Editor

-- Add weekend columns to quotes table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'work_on_saturday'
    ) THEN
        ALTER TABLE public.quotes ADD COLUMN work_on_saturday BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'work_on_sunday'
    ) THEN
        ALTER TABLE public.quotes ADD COLUMN work_on_sunday BOOLEAN DEFAULT false;
    END IF;
END
$$;

-- Function to get quote machines with their details
CREATE OR REPLACE FUNCTION public.get_quote_machines(quote_id_param UUID)
RETURNS TABLE (
  id UUID, 
  quote_id UUID,
  machine_type_id BIGINT,
  created_at TIMESTAMPTZ,
  machine_details JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    qm.id,
    qm.quote_id,
    qm.machine_type_id,
    qm.created_at,
    json_build_object(
      'machine_type_id', mt.machine_type_id,
      'name', mt.name,
      'description', mt.description,
      'photo_url', mt.photo_url
    ) as machine_details
  FROM 
    quote_machines qm
    LEFT JOIN machine_types mt ON qm.machine_type_id = mt.machine_type_id
  WHERE 
    qm.quote_id = quote_id_param
$$;

-- Function to update quote machines
CREATE OR REPLACE FUNCTION public.update_quote_machines(
  quote_id_param UUID,
  machine_ids BIGINT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing machines for this quote
  DELETE FROM public.quote_machines
  WHERE quote_id = quote_id_param;
  
  -- Insert new machines if any are provided
  IF array_length(machine_ids, 1) > 0 THEN
    INSERT INTO public.quote_machines (quote_id, machine_type_id)
    SELECT quote_id_param, unnest(machine_ids);
  END IF;
END;
$$;

-- Comment explaining how to use these functions
COMMENT ON FUNCTION public.get_quote_machines IS 'Gets all machines for a quote with their details';
COMMENT ON FUNCTION public.update_quote_machines IS 'Updates the machines for a quote';

-- Function to get training requirements for a quote and plan
CREATE OR REPLACE FUNCTION public.get_quote_training_requirements(
  quote_id_param UUID,
  plan_id_param BIGINT
)
RETURNS TABLE (
  requirement_id BIGINT,
  resource_id BIGINT,
  resource_name TEXT,
  training_hours INTEGER,
  start_day INTEGER,
  duration_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH quote_machines AS (
    SELECT unnest(machine_type_ids) AS machine_type_id
    FROM quotes
    WHERE quote_id = quote_id_param
  ),
  quote_resources AS (
    -- Get resources from machine training requirements
    SELECT DISTINCT
      mtr.resource_id
    FROM 
      machine_training_requirements mtr
    JOIN
      quote_machines qm ON mtr.machine_type_id = qm.machine_type_id
    WHERE 
      mtr.plan_id = plan_id_param
    
    UNION
    
    -- Get resources from software training requirements
    SELECT DISTINCT
      str.resource_id
    FROM 
      software_training_requirements str
    JOIN
      quotes q ON q.quote_id = quote_id_param
    WHERE 
      str.plan_id = plan_id_param
  )
  SELECT
    ROW_NUMBER() OVER() AS requirement_id,
    r.resource_id,
    r.name AS resource_name,
    CAST(COALESCE(qph.training_hours, 8) AS INTEGER) AS training_hours,
    -- Simple spacing algorithm
    CAST((ROW_NUMBER() OVER()) * 5 AS INTEGER) AS start_day,
    -- Assume 8 hours per day for duration calculation
    CAST(CEILING(COALESCE(qph.training_hours, 8) / 8.0) AS INTEGER) AS duration_days
  FROM
    quote_resources qr
  JOIN
    resources r ON r.resource_id = qr.resource_id
  LEFT JOIN
    quote_training_plan_hours qph ON 
      qph.quote_id = quote_id_param AND 
      qph.plan_id = plan_id_param AND
      qph.resource_id = qr.resource_id;
END;
$$;

COMMENT ON FUNCTION public.get_quote_training_requirements IS 'Gets all training requirements for resources related to the selected quote and plan';
