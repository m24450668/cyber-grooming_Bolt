/*
  # Create topic analyses table for AI-powered analysis results

  1. New Tables
    - `topic_analyses`
      - `id` (uuid, primary key) - Unique identifier
      - `query` (text) - The search query that produced the articles
      - `article_count` (integer) - Number of articles analyzed (max 50)
      - `sources_queried` (jsonb) - Array of source names used
      - `main_topics` (jsonb) - Array of main topic objects with name, description, frequency, weight
      - `subtopics` (jsonb) - Array of subtopic objects grouped under main topics
      - `key_findings` (jsonb) - Array of key finding strings extracted from the articles
      - `research_gaps` (jsonb) - Array of identified research gaps
      - `temporal_trends` (jsonb) - Year-by-year article counts for trend analysis
      - `source_distribution` (jsonb) - Article count per source
      - `top_keywords` (jsonb) - Array of keyword objects with word and count
      - `summary` (text) - AI-generated summary of the topic landscape
      - `article_ids` (jsonb) - Array of article UUIDs that were analyzed
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `topic_analyses` table
    - Add policy for authenticated users to read analyses
    - Add policy for service role to insert/update/delete analyses

  3. Indexes
    - Index on `query` for searching by query term
    - Index on `created_at` for sorting by date
*/

CREATE TABLE IF NOT EXISTS topic_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  article_count integer NOT NULL DEFAULT 0,
  sources_queried jsonb DEFAULT '[]'::jsonb,
  main_topics jsonb DEFAULT '[]'::jsonb,
  subtopics jsonb DEFAULT '[]'::jsonb,
  key_findings jsonb DEFAULT '[]'::jsonb,
  research_gaps jsonb DEFAULT '[]'::jsonb,
  temporal_trends jsonb DEFAULT '{}'::jsonb,
  source_distribution jsonb DEFAULT '{}'::jsonb,
  top_keywords jsonb DEFAULT '[]'::jsonb,
  summary text DEFAULT '',
  article_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE topic_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read topic analyses"
  ON topic_analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert topic analyses"
  ON topic_analyses FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update topic analyses"
  ON topic_analyses FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete topic analyses"
  ON topic_analyses FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_topic_analyses_query ON topic_analyses(query);
CREATE INDEX IF NOT EXISTS idx_topic_analyses_created_at ON topic_analyses(created_at DESC);
