import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

// --- NLP Utilities ---

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","is","it","its","was","are","be","been","being","have","has","had","do","does","did","will","would","shall","should","may","might","can","could","this","that","these","those","i","we","you","he","she","they","me","us","him","her","them","my","our","your","his","their","what","which","who","when","where","how","not","no","nor","if","then","than","so","as","up","out","about","into","over","after","also","just","very","often","most","more","many","some","any","all","each","every","both","few","other","new","old","one","two","first","last","long","great","little","own","same","large","different","used","using","use","based","study","studies","research","paper","article","result","results","found","finding","findings","method","methods","analysis","approach","however","therefore","although","since","among","within","between","through","during","before","while","well","including","such","whether","given","overall","particularly","specifically","especially","significant","significantly","associated","related","compared","according","reported","identified","observed","conducted","examined","investigated","explored","evaluated","assessed","measured","analyzed","reviewed","proposed","developed","designed","implemented","applied","demonstrated","shown","indicate","suggest","provide","support","increase","decrease","higher","lower","important","necessary","relevant","possible","likely","potential","impact","effect","factor","level","group","model","data","information","process","system","program","intervention","participants","sample","population","age","gender","number","time","year","years","et","al","de","la","le","en","el","del","los","las","un","una","por","con","para","que","se","su","como","pero","sin","sobre","entre","hasta","todo","esta","este","esto","esa","ese","eso","otro","otra","muy","mismo","tambien","ademas","porque","aunque","siempre","nunca","cuando","donde","quien","cual","cada","todo","hace","hacer","puede","ha","han","ser","estar","tener","dijo","dice","digamos","grooming","online","cyber","internet","children","child","young","people","adolescents","youth",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function countWords(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return freq;
}

function extractBigrams(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    freq.set(bigram, (freq.get(bigram) || 0) + 1);
  }
  return freq;
}

function extractTrigrams(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    freq.set(trigram, (freq.get(trigram) || 0) + 1);
  }
  return freq;
}

function topN(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

// --- Topic extraction using keyword clustering ---

const TOPIC_PATTERNS: { keywords: string[]; name: string; description: string }[] = [
  {
    keywords: ["predator", "offender", "perpetrator", "abuser", "solicitation", "luring", "manipulation", "enticement"],
    name: "Offender Behavior & Modus Operandi",
    description: "Patterns of behavior, tactics, and strategies used by online predators to approach, groom, and exploit minors.",
  },
  {
    keywords: ["prevention", "intervention", "education", "awareness", "program", "training", "safeguard", "protection", "policy", "legislation"],
    name: "Prevention & Intervention Strategies",
    description: "Approaches to preventing cyber grooming through education, policy, technology, and community interventions.",
  },
  {
    keywords: ["detection", "identification", "monitoring", "surveillance", "screening", "algorithm", "machine", "learning", "classification", "predictive", "automated"],
    name: "Detection & Automated Identification",
    description: "Technological and algorithmic approaches to detecting grooming behavior in online communications.",
  },
  {
    keywords: ["victim", "survivor", "adolescent", "teenager", "minor", "vulnerability", "risk", "trauma", "impact", "psychological", "emotional", "mental"],
    name: "Victimology & Psychological Impact",
    description: "Characteristics of victims, vulnerability factors, and the psychological and emotional consequences of cyber grooming.",
  },
  {
    keywords: ["social", "media", "platform", "facebook", "instagram", "tiktok", "whatsapp", "messenger", "chat", "app", "online", "game", "gaming", "discord", "snapchat"],
    name: "Platform & Social Media Analysis",
    description: "Analysis of specific platforms and technologies where cyber grooming occurs and their role in facilitation.",
  },
  {
    keywords: ["law", "legal", "criminal", "justice", "police", "investigation", "prosecution", "regulation", "compliance", "forensic", "evidence"],
    name: "Legal & Criminal Justice Framework",
    description: "Legal frameworks, criminal justice responses, and law enforcement approaches to combating cyber grooming.",
  },
  {
    keywords: ["parent", "family", "guardian", "caregiver", "home", "supervision", "communication", "relationship", "trust", "attachment"],
    name: "Family & Parental Dynamics",
    description: "Role of family dynamics, parental supervision, and caregiver relationships in cyber grooming vulnerability and prevention.",
  },
  {
    keywords: ["school", "teacher", "educator", "curriculum", "student", "classroom", "pedagogy", "digital", "literacy", "citizenship"],
    name: "Educational & Digital Literacy Approaches",
    description: "School-based programs, digital literacy education, and pedagogical approaches to addressing cyber grooming.",
  },
  {
    keywords: ["communication", "linguistic", "language", "discourse", "conversation", "text", "message", "dialogue", "narrative", "rhetoric"],
    name: "Communication & Linguistic Analysis",
    description: "Analysis of communication patterns, language use, and discourse strategies in grooming interactions.",
  },
  {
    keywords: ["gender", "sex", "sexuality", "exploitation", "abuse", "sexual", "harassment", "violence", "coercion", "consent"],
    name: "Gender & Sexual Exploitation Dynamics",
    description: "Gendered aspects of cyber grooming and the intersection with sexual exploitation and coercion.",
  },
  {
    keywords: ["privacy", "data", "anonymity", "encryption", "security", "technology", "digital", "tool", "software", "artificial", "intelligence"],
    name: "Technology & Privacy Dimensions",
    description: "Technological infrastructure, privacy concerns, and digital security issues related to cyber grooming.",
  },
  {
    keywords: ["cross", "cultural", "international", "global", "comparative", "country", "region", "cultural", "societal", "norm"],
    name: "Cross-Cultural & International Perspectives",
    description: "Comparative and international perspectives on cyber grooming across different cultural and legal contexts.",
  },
];

function assignTopics(articles: ArticleRow[]): { topics: Topic[]; subtopics: Subtopic[] } {
  const topicCounts = new Map<string, { count: number; weight: number; titles: string[] }>();

  for (const pattern of TOPIC_PATTERNS) {
    topicCounts.set(pattern.name, { count: 0, weight: 0, titles: [] });
  }

  for (const article of articles) {
    const text = `${article.title} ${article.abstract} ${article.keywords.join(" ")}`.toLowerCase();
    const tokens = tokenize(text);

    for (const pattern of TOPIC_PATTERNS) {
      let matchCount = 0;
      for (const kw of pattern.keywords) {
        if (text.includes(kw)) matchCount++;
        if (tokens.includes(kw)) matchCount++;
      }
      if (matchCount > 0) {
        const entry = topicCounts.get(pattern.name)!;
        entry.count++;
        entry.weight += matchCount;
        if (entry.titles.length < 3) {
          entry.titles.push(article.title);
        }
      }
    }
  }

  const topics: Topic[] = [];
  for (const pattern of TOPIC_PATTERNS) {
    const entry = topicCounts.get(pattern.name)!;
    if (entry.count > 0) {
      topics.push({
        name: pattern.name,
        description: pattern.description,
        frequency: entry.count,
        weight: Math.round(entry.weight * 10) / 10,
        example_titles: entry.titles,
      });
    }
  }

  topics.sort((a, b) => b.frequency - a.frequency);

  // Generate subtopics from bigrams/trigrams that cluster under main topics
  const subtopics: Subtopic[] = [];
  const allText = articles.map((a) => `${a.title} ${a.abstract}`).join(" ");
  const allTokens = tokenize(allText);
  const bigrams = topN(extractBigrams(allTokens), 30);
  const trigrams = topN(extractTrigrams(allTokens), 20);

  const phraseCounts = new Map<string, number>();
  for (const [phrase, count] of [...bigrams, ...trigrams]) {
    if (count >= 2) phraseCounts.set(phrase, count);
  }

  for (const [phrase, count] of phraseCounts) {
    const phraseLower = phrase.toLowerCase();
    let assigned = false;
    for (const topic of topics) {
      const pattern = TOPIC_PATTERNS.find((p) => p.name === topic.name);
      if (pattern && pattern.keywords.some((kw) => phraseLower.includes(kw))) {
        subtopics.push({ parent: topic.name, name: phrase, count });
        assigned = true;
        break;
      }
    }
    if (!assigned && subtopics.length < 40) {
      subtopics.push({ parent: topics[0]?.name || "General", name: phrase, count });
    }
  }

  return { topics, subtopics };
}

function extractKeyFindings(articles: ArticleRow[]): string[] {
  const findings: string[] = [];
  const sentences: string[] = [];

  for (const article of articles) {
    if (!article.abstract) continue;
    const parts = article.abstract.split(/\.\s+/);
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (
        lower.includes("found") || lower.includes("revealed") ||
        lower.includes("showed") || lower.includes("demonstrated") ||
        lower.includes("indicated") || lower.includes("suggest") ||
        lower.includes("concluded") || lower.includes("significant") ||
        lower.includes("associated with") || lower.includes("linked to") ||
        lower.includes("result") || lower.includes("evidence")
      ) {
        sentences.push(part.trim().substring(0, 200));
      }
    }
  }

  // Deduplicate and return top findings
  const unique = [...new Set(sentences)];
  return unique.slice(0, 15);
}

function identifyResearchGaps(articles: ArticleRow[], topics: Topic[]): string[] {
  const gaps: string[] = [];
  const text = articles.map((a) => `${a.title} ${a.abstract}`).join(" ").toLowerCase();

  // Check which topic patterns have low coverage
  for (const pattern of TOPIC_PATTERNS) {
    const matchCount = pattern.keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount <= 1) {
      gaps.push(`Limited research on "${pattern.name}" — only ${matchCount} keyword match(es) found across the corpus.`);
    }
  }

  // Check temporal gaps
  const years = articles.map((a) => a.year).filter(Boolean) as number[];
  if (years.length > 0) {
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    if (maxY - minY > 5) {
      gaps.push(`Longitudinal studies spanning the full ${minY}-${maxY} range are underrepresented.`);
    }
  }

  // Check for methodological gaps
  if (!text.includes("longitudinal") || text.split("longitudinal").length < 3) {
    gaps.push("Longitudinal studies tracking grooming dynamics over time are scarce.");
  }
  if (!text.includes("qualitative") || text.split("qualitative").length < 3) {
    gaps.push("More qualitative research is needed to understand lived experiences of victims.");
  }

  return gaps.slice(0, 8);
}

function computeTemporalTrends(articles: ArticleRow[]): TrendEntry[] {
  const yearMap = new Map<number, number>();
  for (const a of articles) {
    if (a.year) {
      yearMap.set(a.year, (yearMap.get(a.year) || 0) + 1);
    }
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

function generateSummary(
  articles: ArticleRow[],
  topics: Topic[],
  trends: TrendEntry[],
  gaps: string[]
): string {
  const totalArticles = articles.length;
  const yearRange = trends.length > 0
    ? `${trends[0].year}–${trends[trends.length - 1].year}`
    : "N/A";
  const topTopic = topics[0]?.name || "cyber grooming";
  const topTopicPct = topics[0] ? Math.round((topics[0].frequency / totalArticles) * 100) : 0;

  const openAccessCount = articles.filter((a) => a.is_open_access).length;
  const oaPct = Math.round((openAccessCount / totalArticles) * 100);

  return [
    `Analysis of ${totalArticles} scientific documents reveals a multifaceted research landscape on ${topTopic.toLowerCase()}, with ${topics.length} distinct thematic clusters identified.`,
    `"${topTopic}" emerges as the dominant research theme, appearing in ${topTopicPct}% of the analyzed literature.`,
    `The publications span from ${yearRange}, with ${trends.length > 0 ? trends[trends.length - 1].count : 0} articles in the most recent year, ${openAccessCount} (${oaPct}%) are open access.`,
    gaps.length > 0
      ? `Key research gaps include: ${gaps.slice(0, 2).join("; ")}.`
      : "The research coverage across identified topics appears relatively well-distributed.",
  ].join(" ");
}

// --- Semantic Ontology Generation ---

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

const ENTITY_TYPE_LEGEND: Record<string, { label: string; color: string }> = {
  domain: { label: "Domain", color: "#0d9488" },
  topic: { label: "Topic", color: "#0284c7" },
  subtopic: { label: "Subtopic", color: "#7c3aed" },
  concept: { label: "Concept", color: "#d97706" },
  method: { label: "Method", color: "#059669" },
  actor: { label: "Actor", color: "#dc2626" },
  outcome: { label: "Outcome", color: "#ea580c" },
};

const METHOD_KEYWORDS = ["detection", "identification", "monitoring", "algorithm", "machine learning", "classification", "predictive", "automated", "screening", "nlp", "analysis", "framework", "model", "tool", "software", "survey", "interview", "qualitative", "quantitative", "longitudinal", "experimental", "systematic review", "meta-analysis", "content analysis", "discourse analysis", "case study"];

const ACTOR_KEYWORDS = ["predator", "offender", "perpetrator", "abuser", "victim", "adolescent", "teenager", "minor", "child", "children", "youth", "parent", "teacher", "educator", "police", "law enforcement", "caregiver", "guardian", "investigator", "researcher", "practitioner"];

const OUTCOME_KEYWORDS = ["prevention", "protection", "safeguard", "intervention", "reduction", "awareness", "education", "policy", "legislation", "regulation", "trauma", "impact", "psychological", "emotional", "mental health", "resilience", "recovery", "prosecution", "conviction"];

function classifyEntity(name: string, context: string): OntologyEntity["type"] {
  const lower = `${name} ${context}`.toLowerCase();
  if (ACTOR_KEYWORDS.some((k) => lower.includes(k))) return "actor";
  if (METHOD_KEYWORDS.some((k) => lower.includes(k))) return "method";
  if (OUTCOME_KEYWORDS.some((k) => lower.includes(k))) return "outcome";
  if (lower.split(" ").length <= 2) return "concept";
  return "concept";
}

function generateOntology(
  topics: Topic[],
  subtopics: Subtopic[],
  keywords: KeywordEntry[],
  articles: ArticleRow[],
  findings: string[],
  gaps: string[],
  searchQuery: string
): SemanticOntology {
  const entities: OntologyEntity[] = [];
  const relations: OntologyRelation[] = [];
  const entityIds = new Set<string>();

  function addEntity(e: OntologyEntity): string {
    const safeId = e.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    e.id = safeId;
    if (!entityIds.has(safeId)) {
      entityIds.add(safeId);
      entities.push(e);
    }
    return safeId;
  }

  function addRelation(source: string, target: string, type: OntologyRelation["type"], label: string) {
    if (source !== target && entityIds.has(source) && entityIds.has(target)) {
      relations.push({ source, target, type, label });
    }
  }

  // Root domain entity based on the search query
  const domainId = addEntity({
    id: searchQuery.replace(/\s+/g, "_"),
    name: searchQuery.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    type: "domain",
    definition: `The interdisciplinary research domain centered on "${searchQuery}", encompassing its detection, prevention, legal, psychological, and technological dimensions as revealed by the analysis of ${articles.length} scientific documents.`,
    frequency: articles.length,
  });

  // Topic entities
  const topicEntityIds: string[] = [];
  for (const topic of topics) {
    const tid = addEntity({
      id: topic.name.replace(/\s+/g, "_"),
      name: topic.name,
      type: "topic",
      definition: topic.description,
      frequency: topic.frequency,
    });
    topicEntityIds.push(tid);
    addRelation(domainId, tid, "narrower", "includes topic");
  }

  // Subtopic entities linked to parent topics
  for (const sub of subtopics) {
    const stid = addEntity({
      id: sub.name.replace(/\s+/g, "_"),
      name: sub.name,
      type: "subtopic",
      definition: `Specific aspect of ${sub.parent}: "${sub.name}"`,
      frequency: sub.count,
    });
    const parentId = sub.parent.replace(/\s+/g, "_").toLowerCase();
    if (entityIds.has(parentId)) {
      addRelation(parentId, stid, "narrower", "includes subtopic");
    } else {
      addRelation(domainId, stid, "narrower", "includes subtopic");
    }
  }

  // Keyword entities - classify them
  const conceptIds: string[] = [];
  const methodIds: string[] = [];
  const actorIds: string[] = [];
  const outcomeIds: string[] = [];

  for (const kw of keywords.slice(0, 25)) {
    const kwType = classifyEntity(kw.word, findings.join(" "));
    const kid = addEntity({
      id: kw.word.replace(/\s+/g, "_"),
      name: kw.word,
      type: kwType,
      definition: `Key term found in ${kw.count} article(s) related to cyber grooming research`,
      frequency: kw.count,
    });

    if (kwType === "method") methodIds.push(kid);
    else if (kwType === "actor") actorIds.push(kid);
    else if (kwType === "outcome") outcomeIds.push(kid);
    else conceptIds.push(kid);

    // Link keyword to the best matching topic
    let bestTopic = "";
    let bestScore = 0;
    for (const topic of topics) {
      const topicLower = `${topic.name} ${topic.description}`.toLowerCase();
      if (topicLower.includes(kw.word)) {
        const score = topic.frequency;
        if (score > bestScore) { bestScore = score; bestTopic = topic.name.replace(/\s+/g, "_").toLowerCase(); }
      }
    }
    if (bestTopic && entityIds.has(bestTopic)) {
      addRelation(bestTopic, kid, "related", "involves");
    }
  }

  // Cross-cutting relations: methods affect outcomes
  for (const mid of methodIds) {
    for (const oid of outcomeIds) {
      addRelation(mid, oid, "affects", "contributes to");
    }
  }

  // Actors studied by topics
  for (const aid of actorIds) {
    for (const tid of topicEntityIds) {
      addRelation(tid, aid, "studies", "investigates");
    }
  }

  // Topic-to-topic relations based on keyword overlap
  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const shared = topics[i].description.split(/\s+/).filter(
        (w) => topics[j].description.toLowerCase().includes(w.toLowerCase()) && w.length > 4
      );
      if (shared.length >= 2) {
        const tid1 = topics[i].name.replace(/\s+/g, "_").toLowerCase();
        const tid2 = topics[j].name.replace(/\s+/g, "_").toLowerCase();
        addRelation(tid1, tid2, "related", "related to");
      }
    }
  }

  // Build hierarchy tree
  const hierarchy: { id: string; children: string[] }[] = [];
  const topChildren = topicEntityIds;
  hierarchy.push({ id: domainId, children: topChildren });

  for (const topic of topics) {
    const tid = topic.name.replace(/\s+/g, "_").toLowerCase();
    const childSubs = subtopics
      .filter((s) => s.parent === topic.name)
      .map((s) => s.name.replace(/\s+/g, "_").toLowerCase())
      .filter((id) => entityIds.has(id));
    if (childSubs.length > 0) {
      hierarchy.push({ id: tid, children: childSubs });
    }
  }

  return {
    entities,
    relations,
    hierarchy,
    legend: ENTITY_TYPE_LEGEND,
  };
}

// --- Main Handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Route: POST /analyze-topics/analyze
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
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

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

      // Perform analysis
      const { topics, subtopics } = assignTopics(articleRows);
      const keyFindings = extractKeyFindings(articleRows);
      const researchGaps = identifyResearchGaps(articleRows, topics);
      const temporalTrends = computeTemporalTrends(articleRows);
      const sourceDistribution = computeSourceDistribution(articleRows);
      const summary = generateSummary(articleRows, topics, temporalTrends, researchGaps);

      // Extract top keywords
      const allTokens = articleRows.flatMap((a) =>
        tokenize(`${a.title} ${a.abstract} ${a.keywords.join(" ")}`)
      );
      const topKeywords = topN(countWords(allTokens), 30).map(([word, count]) => ({ word, count }));

      // Save analysis to database
      const { data: savedAnalysis, error: insertError } = await supabase
        .from("topic_analyses")
        .insert({
          query: query || "",
          article_count: articleRows.length,
          sources_queried: Object.keys(sourceDistribution),
          main_topics: topics,
          subtopics,
          key_findings: keyFindings,
          research_gaps: researchGaps,
          temporal_trends: temporalTrends,
          source_distribution: sourceDistribution,
          top_keywords: topKeywords,
          summary,
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
          main_topics: topics,
          subtopics,
          key_findings: keyFindings,
          research_gaps: researchGaps,
          temporal_trends: temporalTrends,
          source_distribution: sourceDistribution,
          top_keywords: topKeywords,
          summary,
          article_ids: ids,
          created_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: POST /analyze-topics/ontology
    if (req.method === "POST" && pathParts.length >= 2 && pathParts[1] === "ontology") {
      const body = await req.json();
      const { analysis_id } = body as { analysis_id?: string };

      if (!analysis_id) {
        return new Response(JSON.stringify({ error: "analysis_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

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

      // Check if ontology already generated
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

      // Generate ontology from analysis data using the search query as center
      const searchQuery = (analysisData.query as string) || "cyber grooming";
      const ontology = generateOntology(
        (analysisData.main_topics || []) as Topic[],
        (analysisData.subtopics || []) as Subtopic[],
        (analysisData.top_keywords || []) as KeywordEntry[],
        articleRows,
        (analysisData.key_findings || []) as string[],
        (analysisData.research_gaps || []) as string[],
        searchQuery
      );

      // Save ontology to the analysis record
      await supabase
        .from("topic_analyses")
        .update({ semantic_ontology: ontology })
        .eq("id", analysis_id);

      return new Response(JSON.stringify({ ontology }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /analyze-topics/:id
    if (req.method === "GET" && pathParts.length >= 2 && pathParts[1] !== "analyze" && pathParts[1] !== "ontology") {
      const analysisId = pathParts[1];
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error: fetchError } = await supabase
        .from("topic_analyses")
        .select("*")
        .eq("id", analysisId)
        .maybeSingle();

      if (fetchError || !data) {
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

    // Route: GET /analyze-topics (list all)
    if (req.method === "GET" && pathParts.length === 1) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error: fetchError } = await supabase
        .from("topic_analyses")
        .select("id, query, article_count, created_at, summary")
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) {
        return new Response(JSON.stringify({ error: fetchError.message }), {
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
