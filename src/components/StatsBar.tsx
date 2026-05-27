import { BookOpen, Database, Download, Unlock } from "lucide-react";
import type { Article } from "../types";

interface StatsBarProps {
  articles: Article[];
  totalFromSearch: number;
  savedCount: number;
  loading: boolean;
}

export default function StatsBar({ articles, totalFromSearch, savedCount, loading }: StatsBarProps) {
  const openAccessCount = articles.filter((a) => a.is_open_access).length;
  const totalCitations = articles.reduce((sum, a) => sum + a.citation_count, 0);

  const stats = [
    {
      icon: BookOpen,
      label: "Articles Found",
      value: totalFromSearch,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      icon: Unlock,
      label: "Open Access",
      value: openAccessCount,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Database,
      label: "Citations",
      value: totalCitations,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Download,
      label: "Saved",
      value: savedCount,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 ${stat.bg} transition-all`}
        >
          <stat.icon className={`w-5 h-5 ${stat.color}`} />
          <div>
            <p className="text-lg font-bold text-slate-900">
              {loading ? "..." : stat.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
