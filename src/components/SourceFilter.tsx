import { SOURCE_LABELS, SOURCE_COLORS } from "../types";
import type { SourceInfo } from "../types";

interface SourceFilterProps {
  sources: SourceInfo[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function SourceFilter({
  sources,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: SourceFilterProps) {
  const allSelected = selected.length === sources.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
        Sources:
      </span>
      {sources.map((s) => {
        const isActive = selected.includes(s.id);
        const colorClass = isActive ? SOURCE_COLORS[s.id] || "bg-slate-100 text-slate-600 border-slate-200" : "bg-slate-50 text-slate-400 border-slate-100";
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${colorClass} ${
              isActive ? "shadow-sm" : "hover:bg-slate-100"
            }`}
            title={s.description}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? "bg-current" : "bg-slate-300"
              }`}
            />
            {SOURCE_LABELS[s.id] || s.name}
          </button>
        );
      })}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
    </div>
  );
}
