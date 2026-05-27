import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { DEFAULT_SEARCH_TERMS } from "../types";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export default function SearchBar({ query, onQueryChange, onSearch, loading }: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSearch();
  }

  function pickSuggestion(term: string) {
    onQueryChange(term);
    setShowSuggestions(false);
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search scientific articles about cyber grooming..."
          className="w-full pl-12 pr-24 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all text-base shadow-sm"
        />
        <div className="absolute right-2 flex items-center gap-1">
          <button
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Suggested searches
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {DEFAULT_SEARCH_TERMS.map((term) => (
              <li key={term}>
                <button
                  onClick={() => pickSuggestion(term)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                >
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
