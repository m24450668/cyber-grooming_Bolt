/*
  # Create scientific articles table for cyber grooming research

  1. New Tables
    - `articles`
      - `id` (uuid, primary key) - Unique identifier
      - `source` (text) - API source (crossref, semantic_scholar, openalex, doaj, europe_pmc)
      - `source_id` (text) - Original ID from the source API
      - `title` (text) - Article title
      - `authors` (jsonb) - Array of author objects with name and affiliation
      - `abstract` (text) - Article abstract/summary
      - `doi` (text) - Digital Object Identifier
      - `url` (text) - URL to the article
      - `pdf_url` (text) - URL to PDF if available
      - `journal` (text) - Journal or publication name
      - `year` (integer) - Publication year
      - `keywords` (jsonb) - Array of keyword strings
      - `citation_count` (integer) - Number of citations
      - `is_open_access` (boolean) - Whether the article is open access
      - `raw_data` (jsonb) - Raw response data from the source API
      - `search_query` (text) - The search query that found this article
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `articles` table
    - Add policy for authenticated users to read articles
    - Add policy for service role to insert/update articles
    - No public access - articles are only visible to authenticated users

  3. Indexes
    - Index on `source` for filtering by API source
    - Index on `year` for filtering by publication year
    - Index on `doi` for deduplication lookups
    - Index on `search_query` for filtering by search term
    - GIN index on `keywords` for keyword-based searches
*/

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  authors jsonb DEFAULT '[]'::jsonb,
  abstract text DEFAULT '',
  doi text DEFAULT '',
  url text DEFAULT '',
  pdf_url text DEFAULT '',
  journal text DEFAULT '',
  year integer,
  keywords jsonb DEFAULT '[]'::jsonb,
  citation_count integer DEFAULT 0,
  is_open_access boolean DEFAULT false,
  raw_data jsonb DEFAULT '{}'::jsonb,
  search_query text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(source, source_id)
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read articles"
  ON articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert articles"
  ON articles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update articles"
  ON articles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete articles"
  ON articles FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year);
CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles(doi) WHERE doi != '';
CREATE INDEX IF NOT EXISTS idx_articles_search_query ON articles(search_query);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON articles USING gin(keywords);
