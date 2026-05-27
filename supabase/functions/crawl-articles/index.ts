import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ArticleResult {
  source: string;
  source_id: string;
  title: string;
  authors: { name: string; affiliation?: string }[];
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
  id?: string;
}

async function searchCrossRef(query: string, rows = 20): Promise<ArticleResult[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&sort=relevance&filter=has-abstract:true`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CyberGroomingCrawler/1.0 (mailto:research@example.com)" },
  });
  const data = await response.json();
  const items = data?.message?.items || [];

  return items.map((item: any) => ({
    source: "crossref",
    source_id: item.DOI || item.URL || "",
    title: item.title?.[0] || "",
    authors: (item.author || []).map((a: any) => ({
      name: `${a.given || ""} ${a.family || ""}`.trim(),
      affiliation: a.affiliation?.[0]?.name || "",
    })),
    abstract: (item.abstract || "").replace(/<[^>]*>/g, ""),
    doi: item.DOI || "",
    url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
    pdf_url: item.link?.find((l: any) => l["content-type"] === "application/pdf")?.URL || "",
    journal: item["container-title"]?.[0] || "",
    year: item.published?.["date-parts"]?.[0]?.[0] || item.created?.["date-parts"]?.[0]?.[0] || null,
    keywords: item.subject || [],
    citation_count: item["is-referenced-by-count"] || 0,
    is_open_access: item.license?.some((l: any) => l.URL?.includes("creativecommons")) || false,
    raw_data: item,
  }));
}

async function searchSemanticScholar(query: string, limit = 20): Promise<ArticleResult[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,authors,abstract,externalIds,url,openAccessPdf,venue,year,citationCount,fieldsOfStudy,isOpenAccess`;
  const response = await fetch(url);
  const data = await response.json();
  const items = data?.data || [];

  return items
    .filter((item: any) => item.paperId)
    .map((item: any) => ({
      source: "semantic_scholar",
      source_id: item.paperId || "",
      title: item.title || "",
      authors: (item.authors || []).map((a: any) => ({
        name: a.name || "",
      })),
      abstract: item.abstract || "",
      doi: item.externalIds?.DOI || "",
      url: item.url || (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : ""),
      pdf_url: item.openAccessPdf?.url || "",
      journal: item.venue || "",
      year: item.year || null,
      keywords: item.fieldsOfStudy || [],
      citation_count: item.citationCount || 0,
      is_open_access: item.isOpenAccess || false,
      raw_data: item,
    }));
}

async function searchOpenAlex(query: string, perPage = 20): Promise<ArticleResult[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${perPage}&sort=cited_by_count:desc`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CyberGroomingCrawler/1.0 (mailto:research@example.com)" },
  });
  const data = await response.json();
  const items = data?.results || [];

  return items.map((item: any) => ({
    source: "openalex",
    source_id: item.id || "",
    title: item.title || "",
    authors: (item.authorships || []).map((a: any) => ({
      name: a.author?.display_name || "",
      affiliation: a.institutions?.[0]?.display_name || "",
    })),
    abstract: reconstructAbstract(item.abstract_inverted_index),
    doi: item.doi?.replace("https://doi.org/", "") || "",
    url: item.doi || item.id || "",
    pdf_url: item.primary_location?.pdf_url || "",
    journal: item.primary_location?.source?.display_name || "",
    year: item.publication_year || null,
    keywords: item.concepts?.map((c: any) => c.display_name) || [],
    citation_count: item.cited_by_count || 0,
    is_open_access: item.open_access?.is_oa || false,
    raw_data: item,
  }));
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
  if (!invertedIndex) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(" ");
}

async function searchDOAJ(query: string, pageSize = 20): Promise<ArticleResult[]> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?page=1&pageSize=${pageSize}`;
  const response = await fetch(url);
  const data = await response.json();
  const items = data?.results || [];

  return items.map((item: any) => ({
    source: "doaj",
    source_id: item.id || "",
    title: item.bibjson?.title || "",
    authors: (item.bibjson?.author || []).map((a: any) => ({
      name: a.name || "",
      affiliation: a.affiliation || "",
    })),
    abstract: item.bibjson?.abstract || "",
    doi: item.bibjson?.identifier?.find((i: any) => i.type === "doi")?.id || "",
    url: item.bibjson?.link?.find((l: any) => l.type === "fulltext")?.url || "",
    pdf_url: item.bibjson?.link?.find((l: any) => l.content_type === "application/pdf")?.url || "",
    journal: item.bibjson?.journal?.title || "",
    year: item.bibjson?.year ? parseInt(item.bibjson.year) : null,
    keywords: item.bibjson?.keywords || [],
    citation_count: 0,
    is_open_access: true,
    raw_data: item,
  }));
}

async function searchEuropePMC(query: string, pageSize = 20): Promise<ArticleResult[]> {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${pageSize}&resultType=core`;
  const response = await fetch(url);
  const data = await response.json();
  const items = data?.resultList?.result || [];

  return items.map((item: any) => ({
    source: "europe_pmc",
    source_id: item.pmid || item.doi || "",
    title: item.title || "",
    authors: (item.authorString || "").split(", ").map((name: string) => ({ name })),
    abstract: item.abstractText || "",
    doi: item.doi || "",
    url: item.doi ? `https://doi.org/${item.doi}` : (item.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/` : ""),
    pdf_url: item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === "pdf")?.url || "",
    journal: item.journalInfo?.journal?.title || item.bookOrReportDetails?.publisher || "",
    year: item.pubYear ? parseInt(item.pubYear) : null,
    keywords: (item.keywordList?.keyword || []).map((k: any) => typeof k === "string" ? k : k.name || ""),
    citation_count: item.citedByCount || 0,
    is_open_access: item.isOpenAccess === "Y" || item.inEPMC === "Y" || false,
    raw_data: item,
  }));
}

const SOURCE_MAP: Record<string, (query: string, limit: number) => Promise<ArticleResult[]>> = {
  crossref: searchCrossRef,
  semantic_scholar: searchSemanticScholar,
  openalex: searchOpenAlex,
  doaj: searchDOAJ,
  europe_pmc: searchEuropePMC,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Route: /crawl-articles/search
    if (pathParts.length >= 2 && pathParts[1] === "search") {
      const query = url.searchParams.get("q");
      const sourcesParam = url.searchParams.get("sources");
      const save = url.searchParams.get("save") === "true";
      const limit = parseInt(url.searchParams.get("limit") || "20");

      if (!query) {
        return new Response(JSON.stringify({ error: "Missing query parameter 'q'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sources = sourcesParam
        ? sourcesParam.split(",").filter((s) => SOURCE_MAP[s])
        : Object.keys(SOURCE_MAP);

      const results: ArticleResult[] = [];
      const errors: string[] = [];

      const searchPromises = sources.map(async (source) => {
        try {
          const articles = await SOURCE_MAP[source](query, limit);
          results.push(...articles);
        } catch (err) {
          errors.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      await Promise.all(searchPromises);

      // Deduplicate by DOI
      const seen = new Set<string>();
      const unique = results.filter((a) => {
        const key = a.doi || `${a.source}:${a.source_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by citation count descending
      unique.sort((a, b) => b.citation_count - a.citation_count);

      // Optionally save to database
      let savedCount = 0;
      if (save) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const rows = unique.map((a) => ({
          source: a.source,
          source_id: a.source_id,
          title: a.title,
          authors: a.authors,
          abstract: a.abstract,
          doi: a.doi,
          url: a.url,
          pdf_url: a.pdf_url,
          journal: a.journal,
          year: a.year,
          keywords: a.keywords,
          citation_count: a.citation_count,
          is_open_access: a.is_open_access,
          raw_data: a.raw_data,
          search_query: query,
        }));

        // Bulk upsert
        const { error: upsertError } = await supabase
          .from("articles")
          .upsert(rows, { onConflict: "source,source_id" });

        if (!upsertError) {
          savedCount = unique.length;

          // Fetch back the IDs for the saved articles
          const compositeKeys = unique.map((a) => `${a.source}:${a.source_id}`);
          const { data: savedRows } = await supabase
            .from("articles")
            .select("id, source, source_id")
            .or(
              compositeKeys.map((k) => {
                const [src, ...rest] = k.split(":");
                const sid = rest.join(":");
                return `and(source.eq.${src},source_id.eq.${sid})`;
              }).join(",")
            );

          if (savedRows) {
            const idMap = new Map<string, string>();
            for (const row of savedRows) {
              idMap.set(`${row.source}:${row.source_id}`, row.id);
            }
            for (const article of unique) {
              const dbId = idMap.get(`${article.source}:${article.source_id}`);
              if (dbId) article.id = dbId;
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          query,
          total_results: unique.length,
          saved: savedCount,
          sources_queried: sources,
          errors: errors.length > 0 ? errors : undefined,
          articles: unique,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /crawl-articles/sources
    if (pathParts.length >= 2 && pathParts[1] === "sources") {
      return new Response(
        JSON.stringify({
          sources: Object.keys(SOURCE_MAP).map((key) => ({
            id: key,
            name: key
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            description: {
              crossref: "CrossRef - Multi-publisher metadata registry with citation data",
              semantic_scholar: "Semantic Scholar - AI-powered academic search by Allen Institute",
              openalex: "OpenAlex - Open scholarly metadata catalog",
              doaj: "DOAJ - Directory of Open Access Journals",
              europe_pmc: "Europe PMC - Life sciences literature database",
            }[key],
          })),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
