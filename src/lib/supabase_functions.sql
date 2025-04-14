
-- Function to add software_type_ids column to quotes table if it doesn't exist
CREATE OR REPLACE FUNCTION add_software_type_ids_column()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'software_type_ids') THEN
    EXECUTE 'ALTER TABLE quotes ADD COLUMN software_type_ids bigint[] DEFAULT ''{}''';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update quote software types
CREATE OR REPLACE FUNCTION update_quote_software_types(p_quote_id uuid, p_software_type_ids bigint[])
RETURNS void AS $$
BEGIN
  UPDATE quotes 
  SET software_type_ids = p_software_type_ids
  WHERE quote_id = p_quote_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get quote software types
CREATE OR REPLACE FUNCTION get_quote_software_types(p_quote_id uuid)
RETURNS bigint[] AS $$
DECLARE
  result bigint[];
BEGIN
  SELECT software_type_ids INTO result
  FROM quotes
  WHERE quote_id = p_quote_id;
  
  RETURN COALESCE(result, '{}'::bigint[]);
END;
$$ LANGUAGE plpgsql;
