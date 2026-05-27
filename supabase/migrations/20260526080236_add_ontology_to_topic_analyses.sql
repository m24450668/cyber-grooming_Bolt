/*
  # Add semantic_ontology column to topic_analyses

  1. Modified Tables
    - `topic_analyses`
      - Add `semantic_ontology` (jsonb) column to store the generated semantic ontology
  
  2. Ontology Structure
    The ontology JSON contains:
      - `entities`: Array of entity objects with id, name, type, definition
      - `relations`: Array of relation objects with source, target, type, label
      - `hierarchy`: Array of hierarchical groupings for tree visualization
      - `legend`: Mapping of entity types to colors for visualization

  3. Security
    - No new security changes, existing RLS policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topic_analyses' AND column_name = 'semantic_ontology'
  ) THEN
    ALTER TABLE topic_analyses ADD COLUMN semantic_ontology jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
