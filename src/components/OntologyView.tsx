import { useState, useMemo } from "react";
import { Network, ChevronDown, ChevronRight, Info, Zap } from "lucide-react";
import type { SemanticOntology, OntologyEntity, OntologyRelation } from "../types";

interface OntologyViewProps {
  ontology: SemanticOntology;
}

function ForceGraph({ ontology }: { ontology: SemanticOntology }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const entityMap = useMemo(() => {
    const m = new Map<string, OntologyEntity>();
    ontology.entities.forEach((e) => m.set(e.id, e));
    return m;
  }, [ontology]);

  const { nodes, links, W: svgW, H: svgH } = useMemo(() => {
    const W = 900;
    const H = 600;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(cx, cy) - 40; // safe margin for labels

    // Each type gets its own orbit ring, scaled to fit canvas
    const typeConfig: Record<string, { ring: number; nodeRadius: number }> = {
      domain:   { ring: 0, nodeRadius: 26 },
      topic:    { ring: 1, nodeRadius: 16 },
      subtopic: { ring: 2, nodeRadius: 12 },
      concept:  { ring: 3, nodeRadius: 10 },
      method:   { ring: 4, nodeRadius: 9 },
      actor:    { ring: 5, nodeRadius: 9 },
      outcome:  { ring: 6, nodeRadius: 9 },
    };

    const maxRing = 6;
    // Distribute rings evenly from 0..maxR, center stays at 0
    const ringRadius = (ring: number) => ring === 0 ? 0 : (ring / maxRing) * maxR;

    // Group entities by type
    const byType = new Map<string, OntologyEntity[]>();
    ontology.entities.forEach((e) => {
      const arr = byType.get(e.type) || [];
      arr.push(e);
      byType.set(e.type, arr);
    });

    const typeIndex = new Map<string, number>();

    const positioned = ontology.entities.map((e) => {
      const cfg = typeConfig[e.type] ?? typeConfig.concept;
      const idx = typeIndex.get(e.type) ?? 0;
      typeIndex.set(e.type, idx + 1);
      const total = byType.get(e.type)?.length ?? 1;
      const baseRadius = e.type === "actor" ? 285 : ringRadius(cfg.ring);
      const radius = baseRadius + (idx % 2 === 0 ? 0 : 15);

      // Small angle offset per type to stagger rings visually
      const offsets: Record<string, number> = {
        domain: 0, topic: 0, subtopic: 0.15,
        concept: 0.35, method: 0.55,
        actor: 0.75, outcome: 1.05,
      };
      const offset = offsets[e.type] ?? 0;
      const angle = (2 * Math.PI * idx) / total + offset - Math.PI / 2;

      const rawX = cx + radius * Math.cos(angle);
      const rawY = cy + radius * Math.sin(angle);
      const nodeR = cfg.nodeRadius;
      const clampedX = Math.max(nodeR + 30, Math.min(W - nodeR - 30, rawX));
      const clampedY = Math.max(nodeR + 30, Math.min(H - nodeR - 30, rawY));

      return {
        ...e,
        x: clampedX,
        y: clampedY,
        color: ontology.legend[e.type]?.color || "#94a3b8",
        r: nodeR,
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

    return { nodes: positioned, links: positionedLinks, W, H };
  }, [ontology]);

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
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto border border-slate-200 rounded-xl bg-slate-50/50"
      >
        {/* Orbit ring guides */}
        {[1, 2, 3, 4, 5, 6].map((ring) => {
          const maxR = Math.min(svgW / 2, svgH / 2) - 40;
          const r = (ring / 6) * maxR;
          return (
            <circle
              key={ring}
              cx={svgW / 2}
              cy={svgH / 2}
              r={r}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {/* Links */}
        {links.map((l, i) => {
          const isActive = hovered && (l.source === hovered || l.target === hovered);
          // Curved paths for better readability
          const mx = (l.sx + l.tx) / 2;
          const my = (l.sy + l.ty) / 2;
          const dx = l.tx - l.sx;
          const dy = l.ty - l.sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const curve = len * 0.12;
          const cpx = mx - (dy / len) * curve;
          const cpy = my + (dx / len) * curve;
          return (
            <g key={i}>
              <path
                d={`M ${l.sx} ${l.sy} Q ${cpx} ${cpy} ${l.tx} ${l.ty}`}
                stroke={relationColors[l.type] || "#cbd5e1"}
                strokeWidth={isActive ? 2.5 : 1}
                strokeOpacity={hovered ? (isActive ? 0.85 : 0.1) : 0.3}
                strokeDasharray={l.type === "related" ? "4 3" : undefined}
                fill="none"
              />
              <text
                x={cpx}
                y={cpy - 4}
                textAnchor="middle"
                fontSize="7"
                fill={relationColors[l.type] || "#94a3b8"}
                opacity={isActive ? 1 : 0}
                className="transition-opacity pointer-events-none"
              >
                {l.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const cx2 = svgW / 2;
          const cy2 = svgH / 2;
          // Determine label anchor based on position relative to center
          const dx = n.x - cx2;
          const dy = n.y - cy2;
          const isRight = dx > 20;
          const isLeft = dx < -20;
          const isBelow = dy > 0;
          const labelX = n.type === "domain" ? n.x : isRight ? n.x + n.r + 4 : isLeft ? n.x - n.r - 4 : n.x;
          const labelY = n.type === "domain" ? n.y + n.r + 14 : isRight || isLeft ? n.y + 4 : isBelow ? n.y + n.r + 12 : n.y - n.r - 5;
          const anchor = n.type === "domain" ? "middle" : isRight ? "start" : isLeft ? "end" : "middle";
          const maxLen = n.type === "domain" ? 30 : n.type === "topic" ? 22 : 18;

          return (
            <g
              key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 5}
                fill="transparent"
                stroke={hovered === n.id ? n.color : "transparent"}
                strokeWidth={2}
                strokeOpacity={0.4}
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.color}
                fillOpacity={hovered && hovered !== n.id ? 0.25 : 0.88}
                stroke="white"
                strokeWidth={hovered === n.id ? 2.5 : 1.5}
                className="transition-all"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                fontSize={n.type === "domain" ? 11 : n.type === "topic" ? 8.5 : 6.5}
                fontWeight={n.type === "domain" || n.type === "topic" ? 700 : 400}
                fill="#1e293b"
                opacity={hovered && hovered !== n.id ? 0.2 : 1}
                className="transition-opacity pointer-events-none"
              >
                {n.name.length > maxLen ? n.name.slice(0, maxLen - 2) + "…" : n.name}
              </text>
            </g>
          );
        })}
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
