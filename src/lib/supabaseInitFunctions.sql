
-- SQL functions to be run once in the Supabase SQL Editor

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
