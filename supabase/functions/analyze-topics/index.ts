import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArticleRow {
  id: string;
  title: string;
  abstract: string;
  authors: { name: string; affiliation?: string }[];
  keywords: string[];
  year: number | null;
  journal: string;
  source: string;
  citation_count: number;
  is_open_access: boolean;
  doi: string;
}

interface Topic {
  name: string;
  description: string;
  frequency: number;
  weight: number;
  example_titles: string[];
}

interface Subtopic {
  parent: string;
  name: string;
  count: number;
}

interface KeywordEntry {
  word: string;
  count: number;
}

interface TrendEntry {
  year: number;
  count: number;
}

interface OntologyEntity {
  id: string;
  name: string;
  type: "domain" | "topic" | "subtopic" | "concept" | "method" | "actor" | "outcome";
  definition: string;
  frequency: number;
}

interface OntologyRelation {
  source: string;
  target: string;
  type: "broader" | "narrower" | "related" | "partOf" | "uses" | "affects" | "studies" | "produces";
  label: string;
}

interface SemanticOntology {
  entities: OntologyEntity[];
  relations: OntologyRelation[];
  hierarchy: { id: string; children: string[] }[];
  legend: Record<string, { label: string; color: string }>;
}

interface GeminiAnalysisResult {
  main_topics: Topic[];
  subtopics: Subtopic[];
  key_findings: string[];
  research_gaps: string[];
  top_keywords: KeywordEntry[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Gemini AI Integration
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment variables");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

async function analyzeWithGemini(articles: ArticleRow[], query: string): Promise<GeminiAnalysisResult> {
  // Build corpus summary — limit tokens by using title + first 300 chars of abstract
  const corpusSummary = articles
    .slice(0, 40)
    .map((a, i) => {
      const abstract = a.abstract ? a.abstract.substring(0, 300) : "No abstract available";
      const keywords = a.keywords.length > 0 ? a.keywords.slice(0, 5).join(", ") : "none";
      return `[${i + 1}] TITLE: "${a.title}" | YEAR: ${a.year || "N/A"} | KEYWORDS: ${keywords} | ABSTRACT: ${abstract}`;
    })
    .join("\n\n");

  const prompt = `You are a research analyst specializing in cyber safety and computational social science.
Analyze the following ${articles.length} scientific articles about "${query}" and return a structured JSON analysis.

ARTICLES CORPUS:
${corpusSummary}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "main_topics": [
    {
      "name": "Topic name (concise, 3-6 words)",
      "description": "One paragraph describing what this topic covers and its relevance to ${query}",
      "frequency": <number of articles related to this topic>,
      "weight": <relevance weight 1.0-10.0>,
      "example_titles": ["title1", "title2", "title3"]
    }
  ],
  "subtopics": [
    {
      "parent": "Parent topic name (must match a name in main_topics)",
      "name": "Subtopic phrase (2-4 words)",
      "count": <number of articles>
    }
  ],
  "key_findings": [
    "Finding 1: specific insight extracted from the literature",
    "Finding 2: ...",
    "...up to 12 findings"
  ],
  "research_gaps": [
    "Gap 1: area where research is lacking or insufficient",
    "Gap 2: ...",
    "...up to 6 gaps"
  ],
  "top_keywords": [
    { "word": "keyword", "count": <frequency in corpus> }
  ],
  "summary": "A 3-5 sentence executive summary of the research landscape on ${query}, covering dominant themes, methodology trends, and implications."
}

Requirements:
- Identify 5-10 main_topics, each backed by actual articles in the corpus
- Each topic must have 2-5 subtopics
- Extract 10-15 top_keywords that are domain-specific (not generic words)
- key_findings must be concrete insights, not generic statements
- research_gaps must be actionable and specific to the corpus
- All topic names in subtopics.parent must exactly match a name in main_topics`;

  const raw = await callGemini(prompt);

  // Clean and parse JSON
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: GeminiAnalysisResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned invalid JSON");
    parsed = JSON.parse(match[0]);
  }

  // Validate and sanitize structure
  return {
    main_topics: (parsed.main_topics || []).map((t) => ({
      name: String(t.name || ""),
      description: String(t.description || ""),
      frequency: Number(t.frequency) || 0,
      weight: Number(t.weight) || 1,
      example_titles: Array.isArray(t.example_titles) ? t.example_titles.slice(0, 3) : [],
    })),
    subtopics: (parsed.subtopics || []).map((s) => ({
      parent: String(s.parent || ""),
      name: String(s.name || ""),
      count: Number(s.count) || 1,
    })),
    key_findings: (parsed.key_findings || []).map(String).slice(0, 15),
    research_gaps: (parsed.research_gaps || []).map(String).slice(0, 8),
    top_keywords: (parsed.top_keywords || []).map((k) => ({
      word: String(k.word || ""),
      count: Number(k.count) || 1,
    })).slice(0, 30),
    summary: String(parsed.summary || ""),
  };
}

async function generateOntologyWithGemini(
  analysis: GeminiAnalysisResult,
  articles: ArticleRow[],
  searchQuery: string
): Promise<SemanticOntology> {
  const topicsJson = JSON.stringify(analysis.main_topics.slice(0, 8), null, 2);
  const keywordsJson = JSON.stringify(analysis.top_keywords.slice(0, 20), null, 2);
  const findingsJson = JSON.stringify(analysis.key_findings.slice(0, 6), null, 2);

  const prompt = `You are a knowledge engineer specializing in semantic ontologies for cybersecurity research.
Build a semantic ontology for the research domain "${searchQuery}" based on this topic analysis.

MAIN TOPICS:
${topicsJson}

TOP KEYWORDS:
${keywordsJson}

KEY FINDINGS:
${findingsJson}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "entities": [
    {
      "id": "snake_case_unique_id",
      "name": "Human readable name",
      "type": "domain|topic|subtopic|concept|method|actor|outcome",
      "definition": "One sentence definition",
      "frequency": <number>
    }
  ],
  "relations": [
    {
      "source": "entity_id",
      "target": "entity_id",
      "type": "broader|narrower|related|partOf|uses|affects|studies|produces",
      "label": "short relation label"
    }
  ],
  "hierarchy": [
    { "id": "parent_entity_id", "children": ["child_id1", "child_id2"] }
  ],
  "legend": {
    "domain":   { "label": "Domain",   "color": "#0d9488" },
    "topic":    { "label": "Topic",    "color": "#0284c7" },
    "subtopic": { "label": "Subtopic", "color": "#7c3aed" },
    "concept":  { "label": "Concept",  "color": "#d97706" },
    "method":   { "label": "Method",   "color": "#059669" },
    "actor":    { "label": "Actor",    "color": "#dc2626" },
    "outcome":  { "label": "Outcome",  "color": "#ea580c" }
  }
}

Requirements:
- Create exactly 1 "domain" entity as the root node (the central concept)
- Create 1 entity per main topic with type "topic"
- Create 2-3 "actor" entities (e.g., predator, victim, researcher)
- Create 3-5 "method" entities (e.g., machine learning, survey, nlp)
- Create 3-5 "outcome" entities (e.g., prevention, detection, policy)
- Create 5-8 "concept" entities from top keywords
- All entity ids must be snake_case and unique
- Relations must reference valid entity ids
- Hierarchy must have the domain as root with topics as children`;

  const raw = await callGemini(prompt);

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: SemanticOntology;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned invalid ontology JSON");
    parsed = JSON.parse(match[0]);
  }

  // Sanitize entity ids
  const entityIds = new Set<string>();
  const entities: OntologyEntity[] = (parsed.entities || []).map((e) => {
    const safeId = String(e.id || e.name || "entity")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");
    entityIds.add(safeId);
    return {
      id: safeId,
      name: String(e.name || ""),
      type: e.type as OntologyEntity["type"],
      definition: String(e.definition || ""),
      frequency: Number(e.frequency) || 1,
    };
  });

  const relations: OntologyRelation[] = (parsed.relations || [])
    .filter((r) => entityIds.has(r.source) && entityIds.has(r.target) && r.source !== r.target)
    .map((r) => ({
      source: String(r.source),
      target: String(r.target),
      type: r.type as OntologyRelation["type"],
      label: String(r.label || "related to"),
    }));

  return {
    entities,
    relations,
    hierarchy: parsed.hierarchy || [],
    legend: parsed.legend || {
      domain:   { label: "Domain",   color: "#0d9488" },
      topic:    { label: "Topic",    color: "#0284c7" },
      subtopic: { label: "Subtopic", color: "#7c3aed" },
      concept:  { label: "Concept",  color: "#d97706" },
      method:   { label: "Method",   color: "#059669" },
      actor:    { label: "Actor",    color: "#dc2626" },
      outcome:  { label: "Outcome",  color: "#ea580c" },
    },
  };
}

// ---------------------------------------------------------------------------
// Utility: temporal trends and source distribution (kept local, no need for AI)
// ---------------------------------------------------------------------------

function computeTemporalTrends(articles: ArticleRow[]): TrendEntry[] {
  const yearMap = new Map<number, number>();
  for (const a of articles) {
    if (a.year) yearMap.set(a.year, (yearMap.get(a.year) || 0) + 1);
  }
  return [...yearMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }));
}

function computeSourceDistribution(articles: ArticleRow[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const a of articles) {
    dist[a.source] = (dist[a.source] || 0) + 1;
  }
  return dist;
}

// ---------------------------------------------------------------------------
// Main Deno Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // -----------------------------------------------------------------------
    // POST /analyze-topics/analyze
    // -----------------------------------------------------------------------
    if (req.method === "POST" && pathParts.length >= 2 && pathParts[1] === "analyze") {
      const body = await req.json();
      const { article_ids, query } = body as { article_ids?: string[]; query?: string };

      if (!article_ids || article_ids.length === 0) {
        return new Response(JSON.stringify({ error: "article_ids is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ids = article_ids.slice(0, 50);
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: articles, error: dbError } = await supabase
        .from("articles")
        .select("id, title, abstract, authors, keywords, year, journal, source, citation_count, is_open_access, doi")
        .in("id", ids);

      if (dbError) {
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const articleRows: ArticleRow[] = (articles || []) as ArticleRow[];

      if (articleRows.length === 0) {
        return new Response(JSON.stringify({ error: "No articles found with given IDs" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call Gemini for AI-powered topic modeling
      const aiAnalysis = await analyzeWithGemini(articleRows, query || "cyber grooming");

      const temporalTrends = computeTemporalTrends(articleRows);
      const sourceDistribution = computeSourceDistribution(articleRows);

      // Save to database
      const { data: savedAnalysis, error: insertError } = await supabase
        .from("topic_analyses")
        .insert({
          query: query || "",
          article_count: articleRows.length,
          sources_queried: Object.keys(sourceDistribution),
          main_topics: aiAnalysis.main_topics,
          subtopics: aiAnalysis.subtopics,
          key_findings: aiAnalysis.key_findings,
          research_gaps: aiAnalysis.research_gaps,
          temporal_trends: temporalTrends,
          source_distribution: sourceDistribution,
          top_keywords: aiAnalysis.top_keywords,
          summary: aiAnalysis.summary,
          article_ids: ids,
        })
        .select("id")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          id: savedAnalysis.id,
          query: query || "",
          article_count: articleRows.length,
          sources_queried: Object.keys(sourceDistribution),
          ...aiAnalysis,
          temporal_trends: temporalTrends,
          source_distribution: sourceDistribution,
          article_ids: ids,
          created_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -----------------------------------------------------------------------
    // POST /analyze-topics/ontology
    // -----------------------------------------------------------------------
    if (req.method === "POST" && pathParts.length >= 2 && pathParts[1] === "ontology") {
      const body = await req.json();
      const { analysis_id } = body as { analysis_id?: string };

      if (!analysis_id) {
        return new Response(JSON.stringify({ error: "analysis_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: analysisData, error: fetchError } = await supabase
        .from("topic_analyses")
        .select("*")
        .eq("id", analysis_id)
        .maybeSingle();

      if (fetchError || !analysisData) {
        return new Response(JSON.stringify({ error: "Analysis not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return cached ontology if it already exists
      if (analysisData.semantic_ontology && Object.keys(analysisData.semantic_ontology).length > 0) {
        return new Response(JSON.stringify({ ontology: analysisData.semantic_ontology }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch articles for context
      const articleIds = (analysisData.article_ids || []) as string[];
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, abstract, authors, keywords, year, journal, source, citation_count, is_open_access, doi")
        .in("id", articleIds);

      const articleRows: ArticleRow[] = (articles || []) as ArticleRow[];
      const searchQuery = (analysisData.query as string) || "cyber grooming";

      const aiAnalysis: GeminiAnalysisResult = {
        main_topics: analysisData.main_topics || [],
        subtopics: analysisData.subtopics || [],
        key_findings: analysisData.key_findings || [],
        research_gaps: analysisData.research_gaps || [],
        top_keywords: analysisData.top_keywords || [],
        summary: analysisData.summary || "",
      };

      // Generate ontology with Gemini
      const ontology = await generateOntologyWithGemini(aiAnalysis, articleRows, searchQuery);

      // Cache in database
      await supabase
        .from("topic_analyses")
        .update({ semantic_ontology: ontology })
        .eq("id", analysis_id);

      return new Response(JSON.stringify({ ontology }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -----------------------------------------------------------------------
    // GET /analyze-topics/:id
    // -----------------------------------------------------------------------
    if (
      req.method === "GET" &&
      pathParts.length >= 2 &&
      pathParts[1] !== "analyze" &&
      pathParts[1] !== "ontology"
    ) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data, error } = await supabase
        .from("topic_analyses")
        .select("*")
        .eq("id", pathParts[1])
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Analysis not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -----------------------------------------------------------------------
    // GET /analyze-topics  (list all)
    // -----------------------------------------------------------------------
    if (req.method === "GET" && pathParts.length === 1) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data, error } = await supabase
        .from("topic_analyses")
        .select("id, query, article_count, created_at, summary")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ analyses: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
