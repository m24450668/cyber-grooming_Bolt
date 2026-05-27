import { useState } from "react";
import { ArrowLeft, Brain, TrendingUp, Lightbulb, AlertTriangle, Hash, BarChart3, BookOpen, Clock, Network, Loader2 } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS } from "../types";
import type { TopicAnalysis, SemanticOntology } from "../types";
import { generateOntology } from "../api";
import OntologyView from "./OntologyView";

interface AnalysisViewProps {
  analysis: TopicAnalysis;
  onBack: () => void;
}

export default function AnalysisView({ analysis, onBack }: AnalysisViewProps) {
  const [ontology, setOntology] = useState<SemanticOntology | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showOntology, setShowOntology] = useState(false);
  const [error, setError] = useState("");

  const maxKeywordCount = Math.max(...analysis.top_keywords.map((k) => k.count), 1);
  const maxTrendCount = Math.max(...analysis.temporal_trends.map((t) => t.count), 1);
  const maxTopicFreq = Math.max(...analysis.main_topics.map((t) => t.frequency), 1);

  async function handleGenerateOntology() {
    setGenerating(true);
    setError("");
    try {
      const ont = await generateOntology(analysis.id);
      setOntology(ont);
      setShowOntology(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ontology generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </button>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/20 rounded-xl border border-teal-400/30">
                <Brain className="w-7 h-7 text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Topic Analysis</h1>
                <p className="text-sm text-slate-400">
                  {analysis.article_count} articles analyzed &middot; {analysis.query || "All saved articles"}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateOntology}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Ontology...
                </>
              ) : (
                <>
                  <Network className="w-5 h-5" />
                  Generate Semantic Ontology
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Ontology error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Ontology Error</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Ontology Section */}
        {showOntology && ontology && (
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <Network className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Semantic Ontology</h2>
                <p className="text-xs text-slate-500">Interactive knowledge graph with entities, relations, and hierarchy</p>
              </div>
              <button
                onClick={() => setShowOntology(false)}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Collapse
              </button>
            </div>
            <OntologyView ontology={ontology} />
          </section>
        )}

        {/* Summary */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Summary</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-100">
              <BookOpen className="w-3.5 h-3.5" />
              {analysis.article_count} Articles
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
              <Brain className="w-3.5 h-3.5" />
              {analysis.main_topics.length} Topics
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
              <Hash className="w-3.5 h-3.5" />
              {analysis.top_keywords.length} Keywords
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              {analysis.research_gaps.length} Gaps
            </span>
          </div>
        </section>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Topics */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Main Topics</h2>
            </div>
            <div className="space-y-4">
              {analysis.main_topics.map((topic, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-semibold text-slate-800">{topic.name}</h3>
                    <span className="text-xs font-mono text-slate-500">{topic.frequency} articles</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all"
                      style={{ width: `${(topic.frequency / maxTopicFreq) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{topic.description}</p>
                  {topic.example_titles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {topic.example_titles.map((t, j) => (
                        <p key={j} className="text-[11px] text-slate-400 truncate pl-3 border-l-2 border-teal-200">
                          {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Temporal Trends */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Publication Trends</h2>
            </div>
            {analysis.temporal_trends.length > 0 ? (
              <div className="space-y-2">
                {analysis.temporal_trends.map((trend, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-600 w-10 text-right flex-shrink-0">
                      {trend.year}
                    </span>
                    <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500/80 to-teal-400/60 rounded-md transition-all flex items-center"
                        style={{ width: `${(trend.count / maxTrendCount) * 100}%`, minWidth: trend.count > 0 ? '2rem' : '0' }}
                      >
                        <span className="text-[10px] font-semibold text-white ml-2">{trend.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No temporal data available</p>
            )}

            {/* Source Distribution */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Source Distribution</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.source_distribution).map(([source, count]) => (
                  <span
                    key={source}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${SOURCE_COLORS[source] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                  >
                    {SOURCE_LABELS[source] || source}
                    <span className="font-mono">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Key Findings & Research Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Findings */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Key Findings</h2>
            </div>
            {analysis.key_findings.length > 0 ? (
              <ul className="space-y-3">
                {analysis.key_findings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center border border-amber-100">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">{finding}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No key findings extracted</p>
            )}
          </section>

          {/* Research Gaps */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900">Research Gaps</h2>
            </div>
            {analysis.research_gaps.length > 0 ? (
              <ul className="space-y-3">
                {analysis.research_gaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed">{gap}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No research gaps identified</p>
            )}
          </section>
        </div>

        {/* Top Keywords */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Top Keywords</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.top_keywords.map((kw, i) => {
              const opacity = 0.4 + (kw.count / maxKeywordCount) * 0.6;
              const size = kw.count / maxKeywordCount > 0.5 ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 ${size} rounded-full bg-teal-50 text-teal-800 border border-teal-100 font-medium transition-all hover:scale-105`}
                  style={{ opacity }}
                >
                  {kw.word}
                  <span className="text-[10px] text-teal-500 font-mono">{kw.count}</span>
                </span>
              );
            })}
          </div>
        </section>

        {/* Subtopics */}
        {analysis.subtopics.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Subtopics & Phrases</h2>
            </div>
            <div className="space-y-4">
              {analysis.main_topics.map((topic) => {
                const subs = analysis.subtopics.filter((s) => s.parent === topic.name);
                if (subs.length === 0) return null;
                return (
                  <div key={topic.name}>
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">{topic.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200"
                        >
                          {sub.name}
                          <span className="text-[10px] text-slate-400 font-mono">({sub.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
