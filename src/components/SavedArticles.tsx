import { useState, useEffect, useCallback } from "react";
import { Database, Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import ArticleCard from "./ArticleCard";
import type { Article } from "../types";

export default function SavedArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const { count: c } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true });
    setCount(c || 0);
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  async function loadSaved() {
    setLoading(true);
    const { data } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setArticles(data || []);
    setLoading(false);
    setExpanded(true);
  }

  async function deleteArticle(id: string) {
    await supabase.from("articles").delete().eq("id", id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => (expanded ? setExpanded(false) : loadSaved())}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-slate-900">Saved Articles</span>
          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-100">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadSaved();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-teal-500 animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Loading saved articles...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              No saved articles yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {articles.map((article) => (
                <div key={article.id} className="relative">
                  <ArticleCard article={article} />
                  <button
                    onClick={() => deleteArticle(article.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
