import { useState, useMemo } from "react";
import { Network, ChevronDown, ChevronRight, Info, Zap } from "lucide-react";
import type { SemanticOntology, OntologyEntity, OntologyRelation } from "../types";

interface OntologyViewProps {
  ontology: SemanticOntology;
}

function ForceGraph({ ontology }: { ontology: SemanticOntology }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [dimensions] = useState({ w: 900, h: 600 });

  const entityMap = useMemo(() => {
    const m = new Map<string, OntologyEntity>();
    ontology.entities.forEach((e) => m.set(e.id, e));
    return m;
  }, [ontology]);

  const { nodes, links } = useMemo(() => {
    // Position entities in a radial layout grouped by type
    const typeGroups: Record<string, number> = {
      domain: 0,
      topic: 1,
      subtopic: 2,
      concept: 3,
      method: 4,
      actor: 5,
      outcome: 6,
    };

    const groupCount = new Map<number, number>();
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;

    const positioned = ontology.entities.map((e) => {
      const group = typeGroups[e.type] ?? 3;
      const count = groupCount.get(group) || 0;
      groupCount.set(group, count + 1);

      const angleStep = (2 * Math.PI) / Math.max(ontology.entities.filter((x) => typeGroups[x.type] === group).length, 1);
      const baseAngle = angleStep * count;
      const radius = e.type === "domain" ? 0 : e.type === "topic" ? 120 : e.type === "subtopic" ? 210 : 270;

      return {
        ...e,
        x: cx + radius * Math.cos(baseAngle - Math.PI / 2),
        y: cy + radius * Math.sin(baseAngle - Math.PI / 2),
        color: ontology.legend[e.type]?.color || "#94a3b8",
        r: e.type === "domain" ? 28 : e.type === "topic" ? 18 : e.type === "subtopic" ? 14 : 10,
      };
    });

    const positionedMap = new Map(positioned.map((n) => [n.id, n]));
    const positionedLinks = ontology.relations
      .map((r) => {
        const s = positionedMap.get(r.source);
        const t = positionedMap.get(r.target);
        if (!s || !t) return null;
        return { ...r, sx: s.x, sy: s.y, tx: t.x, ty: t.y };
      })
      .filter(Boolean) as (OntologyRelation & { sx: number; sy: number; tx: number; ty: number })[];

    return { nodes: positioned, links: positionedLinks };
  }, [ontology, dimensions]);

  const relationColors: Record<string, string> = {
    broader: "#94a3b8",
    narrower: "#0d9488",
    related: "#0284c7",
    partOf: "#7c3aed",
    uses: "#059669",
    affects: "#d97706",
    studies: "#dc2626",
    produces: "#ea580c",
  };

  const hoveredEntity = hovered ? entityMap.get(hovered) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
        className="w-full h-auto border border-slate-200 rounded-xl bg-slate-50/50"
      >
        {/* Links */}
        {links.map((l, i) => (
          <g key={i}>
            <line
              x1={l.sx}
              y1={l.sy}
              x2={l.tx}
              y2={l.ty}
              stroke={relationColors[l.type] || "#cbd5e1"}
              strokeWidth={hovered && (l.source === hovered || l.target === hovered) ? 2.5 : 1}
              strokeOpacity={hovered ? (l.source === hovered || l.target === hovered ? 0.8 : 0.15) : 0.35}
              strokeDasharray={l.type === "related" ? "4 3" : undefined}
            />
            <text
              x={(l.sx + l.tx) / 2}
              y={(l.sy + l.ty) / 2 - 4}
              textAnchor="middle"
              fontSize="7"
              fill={relationColors[l.type] || "#94a3b8"}
              opacity={hovered && (l.source === hovered || l.target === hovered) ? 1 : 0}
              className="transition-opacity"
            >
              {l.label}
            </text>
          </g>
        ))}

        {/* Nodes */}
        {nodes.map((n) => (
          <g
            key={n.id}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r + 3}
              fill="transparent"
              stroke={hovered === n.id ? n.color : "transparent"}
              strokeWidth={2}
              strokeOpacity={0.5}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.color}
              fillOpacity={hovered && hovered !== n.id ? 0.3 : 0.85}
              stroke="white"
              strokeWidth={1.5}
              className="transition-all"
            />
            <text
              x={n.x}
              y={n.y + n.r + 12}
              textAnchor="middle"
              fontSize={n.type === "domain" ? 10 : n.type === "topic" ? 8 : 6.5}
              fontWeight={n.type === "domain" || n.type === "topic" ? 600 : 400}
              fill="#334155"
              opacity={hovered && hovered !== n.id ? 0.3 : 1}
              className="transition-opacity pointer-events-none"
            >
              {n.name.length > 25 ? n.name.slice(0, 22) + "..." : n.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Hovered entity tooltip */}
      {hoveredEntity && (
        <div className="absolute bottom-3 left-3 max-w-xs bg-white/95 backdrop-blur rounded-lg border border-slate-200 p-3 shadow-lg text-xs">
          <p className="font-semibold text-slate-900 mb-1">{hoveredEntity.name}</p>
          <p className="text-slate-600 leading-relaxed">{hoveredEntity.definition}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
              style={{ backgroundColor: ontology.legend[hoveredEntity.type]?.color }}
            >
              {ontology.legend[hoveredEntity.type]?.label}
            </span>
            <span className="text-slate-400">Freq: {hoveredEntity.frequency}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HierarchyTree({ ontology }: { ontology: SemanticOntology }) {
  const rootId = ontology.hierarchy[0]?.id || ontology.entities.find((e) => e.type === "domain")?.id || "";
  const [expanded, setExpanded] = useState<Set<string>>(new Set(rootId ? [rootId] : []));
  const entityMap = useMemo(() => {
    const m = new Map<string, OntologyEntity>();
    ontology.entities.forEach((e) => m.set(e.id, e));
    return m;
  }, [ontology]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(id: string, depth: number): React.ReactNode {
    const entity = entityMap.get(id);
    if (!entity) return null;
    const children = ontology.hierarchy.find((h) => h.id === id)?.children || [];
    const isOpen = expanded.has(id);
    const color = ontology.legend[entity.type]?.color || "#94a3b8";

    return (
      <div key={id} style={{ marginLeft: depth * 20 }}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
          onClick={() => children.length > 0 && toggle(id)}
        >
          {children.length > 0 ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )
          ) : (
            <span className="w-4" />
          )}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-slate-800 font-medium group-hover:text-teal-700 transition-colors">
            {entity.name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({entity.frequency})</span>
        </div>
        {isOpen && children.map((cid) => renderNode(cid, depth + 1))}
      </div>
    );
  }

  const root = ontology.hierarchy[0];
  return <div className="max-h-96 overflow-y-auto">{root ? renderNode(root.id, 0) : <p className="text-sm text-slate-400">No hierarchy data</p>}</div>;
}

function EntityTable({ ontology }: { ontology: SemanticOntology }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? ontology.entities : ontology.entities.filter((e) => e.type === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${filter === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          All ({ontology.entities.length})
        </button>
        {Object.entries(ontology.legend).map(([type, info]) => {
          const count = ontology.entities.filter((e) => e.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${filter === type ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              style={filter === type ? { backgroundColor: info.color } : {}}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 font-semibold text-slate-500">Entity</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-500">Type</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-500">Definition</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-500">Freq</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-2 px-2 font-medium text-slate-800 max-w-[200px] truncate">{e.name}</td>
                <td className="py-2 px-2">
                  <span
                    className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: ontology.legend[e.type]?.color }}
                  >
                    {ontology.legend[e.type]?.label}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-600 max-w-[400px] truncate">{e.definition}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-500">{e.frequency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelationsTable({ ontology }: { ontology: SemanticOntology }) {
  const entityMap = useMemo(() => {
    const m = new Map<string, OntologyEntity>();
    ontology.entities.forEach((e) => m.set(e.id, e));
    return m;
  }, [ontology]);

  const relationStyles: Record<string, { color: string; label: string }> = {
    broader: { color: "bg-slate-100 text-slate-600", label: "broader than" },
    narrower: { color: "bg-teal-50 text-teal-700", label: "narrower than" },
    related: { color: "bg-sky-50 text-sky-700", label: "related to" },
    partOf: { color: "bg-violet-50 text-violet-700", label: "part of" },
    uses: { color: "bg-emerald-50 text-emerald-700", label: "uses" },
    affects: { color: "bg-amber-50 text-amber-700", label: "affects" },
    studies: { color: "bg-rose-50 text-rose-700", label: "studies" },
    produces: { color: "bg-orange-50 text-orange-700", label: "produces" },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 font-semibold text-slate-500">Source</th>
            <th className="text-center py-2 px-2 font-semibold text-slate-500">Relation</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">Target</th>
          </tr>
        </thead>
        <tbody>
          {ontology.relations.map((r, i) => {
            const src = entityMap.get(r.source);
            const tgt = entityMap.get(r.target);
            const style = relationStyles[r.type] || { color: "bg-slate-100 text-slate-600", label: r.type };
            return (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-2 px-2 font-medium text-slate-800">{src?.name || r.source}</td>
                <td className="py-2 px-2 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${style.color}`}>
                    {style.label}
                  </span>
                </td>
                <td className="py-2 px-2 font-medium text-slate-800">{tgt?.name || r.target}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Tab = "graph" | "hierarchy" | "entities" | "relations";

export default function OntologyView({ ontology }: OntologyViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("graph");

  const tabs: { id: Tab; label: string; icon: typeof Network }[] = [
    { id: "graph", label: "Network Graph", icon: Network },
    { id: "hierarchy", label: "Hierarchy", icon: ChevronRight },
    { id: "entities", label: "Entities", icon: Info },
    { id: "relations", label: "Relations", icon: Zap },
  ];

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 border border-teal-100">
          <Network className="w-5 h-5 text-teal-600" />
          <div>
            <p className="text-lg font-bold text-slate-900">{ontology.entities.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Entities</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-50 border border-sky-100">
          <Zap className="w-5 h-5 text-sky-600" />
          <div>
            <p className="text-lg font-bold text-slate-900">{ontology.relations.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Relations</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
          <ChevronRight className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-lg font-bold text-slate-900">{ontology.hierarchy.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Hierarchy Levels</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <Info className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-lg font-bold text-slate-900">{Object.keys(ontology.legend).filter((k) => ontology.entities.some((e) => e.type === k)).length}</p>
            <p className="text-[11px] text-slate-500 font-medium">Entity Types</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(ontology.legend).map(([type, info]) => {
          const count = ontology.entities.filter((e) => e.type === type).length;
          if (count === 0) return null;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: info.color }}
            >
              <span className="w-2 h-2 rounded-full bg-white/40" />
              {info.label} ({count})
            </span>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {activeTab === "graph" && <ForceGraph ontology={ontology} />}
        {activeTab === "hierarchy" && (
          <div className="p-4">
            <HierarchyTree ontology={ontology} />
          </div>
        )}
        {activeTab === "entities" && (
          <div className="p-4">
            <EntityTable ontology={ontology} />
          </div>
        )}
        {activeTab === "relations" && (
          <div className="p-4">
            <RelationsTable ontology={ontology} />
          </div>
        )}
      </div>
    </div>
  );
}
