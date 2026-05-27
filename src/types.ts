export interface Article {
  id: string;
  source: string;
  source_id: string;
  title: string;
  authors: Author[];
  abstract: string;
  doi: string;
  url: string;
  pdf_url: string;
  journal: string;
  year: number | null;
  keywords: string[];
  citation_count: number;
  is_open_access: boolean;
  raw_data: Record<string, unknown>;
  search_query: string;
  created_at: string;
}

export interface Author {
  name: string;
  affiliation?: string;
}

export interface SearchResult {
  query: string;
  total_results: number;
  saved: number;
  sources_queried: string[];
  errors?: string[];
  articles: Article[];
}

export interface SourceInfo {
  id: string;
  name: string;
  description: string;
}

export interface Topic {
  name: string;
  description: string;
  frequency: number;
  weight: number;
  example_titles: string[];
}

export interface Subtopic {
  parent: string;
  name: string;
  count: number;
}

export interface KeywordEntry {
  word: string;
  count: number;
}

export interface TrendEntry {
  year: number;
  count: number;
}

export interface TopicAnalysis {
  id: string;
  query: string;
  article_count: number;
  sources_queried: string[];
  main_topics: Topic[];
  subtopics: Subtopic[];
  key_findings: string[];
  research_gaps: string[];
  temporal_trends: TrendEntry[];
  source_distribution: Record<string, number>;
  top_keywords: KeywordEntry[];
  summary: string;
  article_ids: string[];
  created_at: string;
}

export interface OntologyEntity {
  id: string;
  name: string;
  type: "domain" | "topic" | "subtopic" | "concept" | "method" | "actor" | "outcome";
  definition: string;
  frequency: number;
}

export interface OntologyRelation {
  source: string;
  target: string;
  type: "broader" | "narrower" | "related" | "partOf" | "uses" | "affects" | "studies" | "produces";
  label: string;
}

export interface SemanticOntology {
  entities: OntologyEntity[];
  relations: OntologyRelation[];
  hierarchy: { id: string; children: string[] }[];
  legend: Record<string, { label: string; color: string }>;
}

export const SOURCE_LABELS: Record<string, string> = {
  crossref: "CrossRef",
  semantic_scholar: "Semantic Scholar",
  openalex: "OpenAlex",
  doaj: "DOAJ",
  europe_pmc: "Europe PMC",
};

export const SOURCE_COLORS: Record<string, string> = {
  crossref: "bg-amber-100 text-amber-800 border-amber-200",
  semantic_scholar: "bg-emerald-100 text-emerald-800 border-emerald-200",
  openalex: "bg-sky-100 text-sky-800 border-sky-200",
  doaj: "bg-rose-100 text-rose-800 border-rose-200",
  europe_pmc: "bg-orange-100 text-orange-800 border-orange-200",
};

export const DEFAULT_SEARCH_TERMS = [
  "cyber grooming",
  "online grooming",
  "internet grooming children",
  "online child exploitation",
  "cyber grooming prevention",
  "online predator behavior",
  "grooming social media minors",
  "online sexual solicitation youth",
  "cyber grooming detection",
  "child online protection grooming",
];
