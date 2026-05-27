import type { SearchResult, SourceInfo, TopicAnalysis, SemanticOntology } from "./types";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-articles`;
const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-topics`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export async function searchArticles(
  query: string,
  sources?: string[],
  save = true,
  limit = 20
): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, save: String(save), limit: String(limit) });
  if (sources && sources.length > 0) {
    params.set("sources", sources.join(","));
  }
  const res = await fetch(`${API_URL}/search?${params}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getSources(): Promise<SourceInfo[]> {
  const res = await fetch(`${API_URL}/sources`, { headers });
  if (!res.ok) throw new Error("Failed to fetch sources");
  const data = await res.json();
  return data.sources;
}

export async function analyzeTopics(
  articleIds: string[],
  query: string
): Promise<TopicAnalysis> {
  const res = await fetch(`${ANALYZE_URL}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ article_ids: articleIds, query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Analysis failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAnalysis(id: string): Promise<TopicAnalysis> {
  const res = await fetch(`${ANALYZE_URL}/${id}`, { headers });
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function listAnalyses(): Promise<Pick<TopicAnalysis, "id" | "query" | "article_count" | "created_at" | "summary">[]> {
  const res = await fetch(ANALYZE_URL, { headers });
  if (!res.ok) throw new Error("Failed to fetch analyses");
  const data = await res.json();
  return data.analyses;
}

export async function generateOntology(analysisId: string): Promise<SemanticOntology> {
  const res = await fetch(`${ANALYZE_URL}/ontology`, {
    method: "POST",
    headers,
    body: JSON.stringify({ analysis_id: analysisId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Ontology generation failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.ontology;
}
