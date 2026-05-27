import { ExternalLink, FileText, BookOpen, Quote, Unlock } from "lucide-react";
import { SOURCE_LABELS, SOURCE_COLORS } from "../types";
import type { Article } from "../types";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const sourceColor = SOURCE_COLORS[article.source] || "bg-slate-100 text-slate-600 border-slate-200";
  const sourceLabel = SOURCE_LABELS[article.source] || article.source;

  return (
    <article className="group bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-teal-700 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {article.is_open_access && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
              <Unlock className="w-2.5 h-2.5" /> OA
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sourceColor}`}>
            {sourceLabel}
          </span>
        </div>
      </div>

      {article.authors && article.authors.length > 0 && (
        <p className="text-sm text-slate-500 mb-2 line-clamp-1">
          {article.authors.slice(0, 5).map((a) => a.name).join(", ")}
          {article.authors.length > 5 && ` +${article.authors.length - 5} more`}
        </p>
      )}

      {article.abstract && (
        <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-3">
          {article.abstract}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {article.journal && (
          <span className="inline-flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span className="text-slate-600 truncate max-w-[200px]">{article.journal}</span>
          </span>
        )}
        {article.year && (
          <span className="font-medium text-slate-600">{article.year}</span>
        )}
        {article.citation_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Quote className="w-3 h-3" />
            {article.citation_count} citations
          </span>
        )}
        {article.doi && (
          <span className="inline-flex items-center gap-1 font-mono text-slate-500">
            DOI: {article.doi}
          </span>
        )}
      </div>

      {article.keywords && article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {article.keywords.slice(0, 6).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[10px] font-medium border border-slate-100"
            >
              {kw}
            </span>
          ))}
          {article.keywords.length > 6 && (
            <span className="px-2 py-0.5 text-[10px] text-slate-400">
              +{article.keywords.length - 6} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors border border-slate-100 hover:border-teal-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Article
          </a>
        )}
        {article.pdf_url && (
          <a
            href={article.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors border border-slate-100 hover:border-teal-200"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </a>
        )}
      </div>
    </article>
  );
}
