import { useState, useEffect, useCallback } from "react";
import { Shield, AlertCircle, Loader2, Search as SearchIcon, Brain, Sparkles } from "lucide-react";
import SearchBar from "./components/SearchBar";
import SourceFilter from "./components/SourceFilter";
import ArticleCard from "./components/ArticleCard";
import StatsBar from "./components/StatsBar";
import SavedArticles from "./components/SavedArticles";
import AnalysisView from "./components/AnalysisView";
import { searchArticles, getSources, analyzeTopics } from "./api";
import type { Article, SourceInfo, SearchResult, TopicAnalysis } from "./types";

type View = "search" | "analysis";

export default function App() {
  const [view, setView] = useState<View>("search");
  const [analysis, setAnalysis] = useState<TopicAnalysis | null>(null);

  const [query, setQuery] = useState("cyber grooming");
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [oaFilter, setOaFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<"citations" | "year" | "relevance">("citations");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    getSources()
      .then((s) => {
        setSources(s);
        setSelectedSources(s.map((x) => x.id));
      })
      .catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setHasSearched(true);

    if (!searchHistory.includes(query.trim())) {
      setSearchHistory((prev) => [query.trim(), ...prev.slice(0, 9)]);
    }

    try {
      const data = await searchArticles(query.trim(), selectedSources, true, 20);
      setResult(data);
      setArticles(data.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, selectedSources, searchHistory]);

  const toggleSource = (id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (articles.length === 0) return;
    setAnalyzing(true);
    setError("");
    try {
      const ids = articles.slice(0, 50).map((a) => a.id);
      const result = await analyzeTopics(ids, query.trim());
      setAnalysis(result);
      setView("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredArticles = articles
    .filter((a) => {
      if (yearFilter !== "all" && a.year !== yearFilter) return false;
      if (oaFilter && !a.is_open_access) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "citations") return b.citation_count - a.citation_count;
      if (sortOrder === "year") return (b.year || 0) - (a.year || 0);
      return 0;
    });

  const years = [...new Set(articles.map((a) => a.year).filter(Boolean))].sort(
    (a, b) => (b as number) - (a as number)
  ) as number[];

  if (view === "analysis" && analysis) {
    return <AnalysisView analysis={analysis} onBack={() => setView("search")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-teal-500/20 rounded-xl border border-teal-400/30">
              <Shield className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Cyber Grooming Research Crawler
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Scientific Article & Document Discovery
              </p>
            </div>
          </div>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Search and collect academic articles, papers, and documents related to cyber grooming
            across five major scientific databases. Results are automatically saved for your research.
          </p>

          <div className="mt-8">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
              loading={loading}
            />
          </div>

          {sources.length > 0 && (
            <div className="mt-4">
              <SourceFilter
                sources={sources}
                selected={selectedSources}
                onToggle={toggleSource}
                onSelectAll={() => setSelectedSources(sources.map((s) => s.id))}
                onDeselectAll={() => setSelectedSources([])}
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search History */}
        {searchHistory.length > 0 && !hasSearched && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recent Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((term) => (
                <button
                  key={term}
                  onClick={() => { setQuery(term); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors border border-slate-200 hover:border-teal-200"
                >
                  <SearchIcon className="w-3 h-3" />
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            <p className="mt-4 text-sm text-slate-500 font-medium">
              Crawling scientific databases...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Searching {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            <div className="mb-6">
              <StatsBar
                articles={articles}
                totalFromSearch={result.total_results}
                savedCount={result.saved}
                loading={false}
              />
            </div>

            {/* Analyze with AI Button */}
            {articles.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98]"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Topics...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze Topics with AI
                      <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full">
                        up to {Math.min(articles.length, 50)} docs
                      </span>
                    </>
                  )}
                </button>
                <span className="text-xs text-slate-400">
                  Extracts topics, trends, findings & research gaps from {Math.min(articles.length, 50)} articles
                </span>
              </div>
            )}

            {/* Filters & Sort */}
            {articles.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Filter:
                </span>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                >
                  <option value="all">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setOaFilter(!oaFilter)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    oaFilter
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Open Access Only
                </button>
                <div className="flex-1" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sort:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "citations" | "year" | "relevance")}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                >
                  <option value="citations">Citations</option>
                  <option value="year">Year (Newest)</option>
                  <option value="relevance">Relevance</option>
                </select>
                <span className="text-xs text-slate-400">
                  {filteredArticles.length} of {articles.length} articles
                </span>
              </div>
            )}

            {/* API Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  Some sources returned errors:
                </p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-600">{err}</p>
                ))}
              </div>
            )}

            {/* Article Grid */}
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {filteredArticles.map((article) => (
                  <ArticleCard key={`${article.source}-${article.source_id}`} article={article} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <SearchIcon className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium">No articles match your filters</p>
                <p className="text-xs mt-1">Try adjusting the year or open access filter</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-teal-50 rounded-2xl mb-5">
              <Shield className="w-12 h-12 text-teal-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Start Your Research
            </h2>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Search across CrossRef, Semantic Scholar, OpenAlex, DOAJ, and Europe PMC to find
              scientific articles about cyber grooming and related topics.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full">
              {[
                { icon: SearchIcon, label: "5 Databases", desc: "CrossRef, Semantic Scholar, OpenAlex, DOAJ, Europe PMC" },
                { icon: Brain, label: "AI Analysis", desc: "Extract topics, trends & research gaps automatically" },
                { icon: Sparkles, label: "Smart Filters", desc: "By year, open access, citations, keywords" },
              ].map((feature) => (
                <div key={feature.label} className="px-4 py-3 bg-white rounded-lg border border-slate-200 text-center">
                  <feature.icon className="w-5 h-5 text-teal-500 mx-auto mb-1.5" />
                  <p className="text-sm font-semibold text-slate-800">{feature.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Articles Section */}
        <div className="mt-4">
          <SavedArticles />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">Cyber Grooming Research Crawler</span>
            </div>
            <p className="text-xs text-slate-400">
              Data sourced from public scientific APIs. For research purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
