import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ─── Palette (Tailwind equivalents used in JS configs/D3) ───────────────── */
const COLOR = {
  prior: "#a78bfa", // purple-400
  confirming: "#fbbf24", // amber-400
  contradicting: "#2dd4bf", // teal-400
  conclusion: "#fb7185", // rose-400
  bg: "#0f0f14",
  panel: "#16161f",
  border: "#2a2a3a",
  text: "#e2e8f0",
  muted: "#64748b",
};

/* ─── Initial Network Definition ──────────────────────────────────────────── */
const INITIAL_NODES = [
  { id: "p0", label: "Harm Belief", group: "prior" },
  { id: "p1", label: "Risk Pattern", group: "prior" },
  { id: "p2", label: "Danger Schema", group: "prior" },
  { id: "c0", label: "Side Effects", group: "confirming" },
  { id: "c1", label: "Adverse Event", group: "confirming" },
  { id: "c2", label: "Media Report", group: "confirming" },
  { id: "c3", label: "Anecdote Match", group: "confirming" },
  { id: "d0", label: "Safety Data", group: "contradicting" },
  { id: "d1", label: "Trial Results", group: "contradicting" },
  { id: "d2", label: "Expert Consensus", group: "contradicting" },
  { id: "d3", label: "Longitudinal Study", group: "contradicting" },
  { id: "k0", label: "Distrust ↑", group: "conclusion" },
  { id: "k1", label: "Avoidance", group: "conclusion" },
  { id: "k2", label: "Spread Belief", group: "conclusion" },
];

function buildEdges(nodes) {
  const edges = [];
  const nodeIds = nodes.map((n) => n.id);
  // Within-group: fully connected
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].group === nodes[j].group) {
        edges.push({ source: nodes[i].id, target: nodes[j].id });
      }
    }
  }
  // Cross-group connections (Prior connected to Confirming, conclusion, etc.)
  const crossLinks = [
    ["p0", "c0"], ["p0", "c1"], ["p0", "c2"],
    ["p1", "c1"], ["p1", "c3"],
    ["p2", "c2"], ["p2", "c3"],
    ["p0", "d0"], ["p1", "d2"], ["p2", "d1"],
    ["c0", "k0"], ["c1", "k0"], ["c2", "k1"], ["c3", "k2"], ["c1", "k2"],
    ["d0", "k0"], ["d1", "k0"], ["d2", "k1"], ["d3", "k2"],
    ["p0", "k0"], ["p1", "k1"], ["p2", "k2"],
    ["c0", "d0"], ["c2", "d2"],
  ];
  crossLinks.forEach(([s, t]) => {
    if (nodeIds.includes(s) && nodeIds.includes(t)) {
      edges.push({ source: s, target: t });
    }
  });
  return edges;
}

const INIT_WEIGHT = 0.05;

function edgeKey(a, b) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function hebbianTick(nodes, edges, activations, weights, learningRate, decayRate) {
  const newAct = { ...activations };
  const newW = { ...weights };

  // 1. SPREAD activation
  nodes.forEach((node) => {
    const neighbors = edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => (e.source === node.id ? e.target : e.source));
    const hasActiveNeighbor = neighbors.some((nid) => activations[nid] > 0.05);
    if (!hasActiveNeighbor) return;
    const sum = neighbors.reduce((acc, nid) => {
      const w = weights[edgeKey(node.id, nid)] ?? INIT_WEIGHT;
      return acc + w * activations[nid];
    }, 0);
    newAct[node.id] = Math.max(0, Math.min(1, Math.tanh(sum)));
  });

  // 3. DECAY
  nodes.forEach((n) => {
    newAct[n.id] = Math.max(0, newAct[n.id] * decayRate);
  });

  // 2. LEARN (Hebbian update based on new activations)
  edges.forEach((e) => {
    const key = edgeKey(e.source, e.target);
    const dw = learningRate * newAct[e.source] * newAct[e.target];
    newW[key] = Math.max(0, Math.min(1, (newW[key] ?? INIT_WEIGHT) + dw));
  });

  return { activations: newAct, weights: newW };
}

function edgeGroupClass(nodes, source, target) {
  const s = nodes.find((n) => n.id === source);
  const t = nodes.find((n) => n.id === target);
  if (!s || !t) return "neutral";
  const groups = new Set([s.group, t.group]);
  if (groups.has("confirming") && !groups.has("contradicting")) return "confirming";
  if (groups.has("contradicting") && !groups.has("confirming")) return "contradicting";
  return "neutral";
}

function getAnnotation({ priorInjected, confirmInjected, contradictInjected, biasRatio }) {
  if (!priorInjected && !confirmInjected && !contradictInjected) {
    return "Activate nodes to begin. Prior belief creates the first pathway.";
  }
  if (priorInjected && !confirmInjected && !contradictInjected) {
    return "Prior belief is live. Confirming evidence will now have an advantage — it shares hot edges.";
  }
  if (confirmInjected && !contradictInjected) {
    return "Notice how quickly confirming weights climb. They ride the prior's warm edges.";
  }
  if (contradictInjected && biasRatio < 3) {
    return "Contradicting evidence barely moves the weights. No warm edges to amplify it. This is the bias.";
  }
  if (biasRatio >= 3) {
    return `${biasRatio.toFixed(1)}× entrenchment. The network is deeply locked in. This mirrors real belief rigidity.`;
  }
  return "Observe the divergence. Hebbian learning, nothing more.";
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border rounded-lg p-2.5 text-xs font-mono">
      <div className="text-gray-400 mb-1">Tick {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(4)}
        </div>
      ))}
    </div>
  );
};

export default function ConfirmationBiasSimulation() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const intervalRef = useRef(null);

  const NODES = useRef(INITIAL_NODES).current;
  const EDGES = useRef(buildEdges(INITIAL_NODES)).current;

  const [activations, setActivations] = useState(() => {
    const a = {};
    NODES.forEach((n) => (a[n.id] = 0));
    return a;
  });

  const [weights, setWeights] = useState(() => {
    const w = {};
    EDGES.forEach((e) => {
      w[edgeKey(e.source, e.target)] = INIT_WEIGHT;
    });
    return w;
  });

  const [running, setRunning] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [learningRate, setLearningRate] = useState(0.08);
  const [decayRate, setDecayRate] = useState(0.85);
  const [history, setHistory] = useState([]);
  const [priorInjected, setPriorInjected] = useState(false);
  const [confirmInjected, setConfirmInjected] = useState(false);
  const [contradictInjected, setContradictInjected] = useState(false);

  const actRef = useRef(activations);
  const wRef = useRef(weights);
  const lrRef = useRef(learningRate);
  const drRef = useRef(decayRate);
  const tickRef = useRef(0);

  useEffect(() => { actRef.current = activations; }, [activations]);
  useEffect(() => { wRef.current = weights; }, [weights]);
  useEffect(() => { lrRef.current = learningRate; }, [learningRate]);
  useEffect(() => { drRef.current = decayRate; }, [decayRate]);

  const avgWeight = useCallback((groupFilter, w) => {
    const relevant = EDGES.filter((e) => edgeGroupClass(NODES, e.source, e.target) === groupFilter);
    if (!relevant.length) return 0;
    const sum = relevant.reduce((acc, e) => acc + (w[edgeKey(e.source, e.target)] ?? INIT_WEIGHT), 0);
    return sum / relevant.length;
  }, [EDGES, NODES]);

  const step = useCallback(() => {
    const { activations: newAct, weights: newW } = hebbianTick(
      NODES, EDGES, actRef.current, wRef.current, lrRef.current, drRef.current
    );
    tickRef.current += 1;
    actRef.current = newAct;
    wRef.current = newW;
    const cw = avgWeight("confirming", newW);
    const dw = avgWeight("contradicting", newW);
    setActivations({ ...newAct });
    setWeights({ ...newW });
    setTicks(tickRef.current);
    setHistory((h) => [
      ...h.slice(-200),
      { tick: tickRef.current, confirming: +cw.toFixed(5), contradicting: +dw.toFixed(5) }
    ]);
  }, [NODES, EDGES, avgWeight]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(step, 400);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, step]);

  const handleReset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const initAct = {};
    NODES.forEach((n) => (initAct[n.id] = 0));
    const initW = {};
    EDGES.forEach((e) => { initW[edgeKey(e.source, e.target)] = INIT_WEIGHT; });
    actRef.current = initAct;
    wRef.current = initW;
    tickRef.current = 0;
    setActivations(initAct);
    setWeights(initW);
    setTicks(0);
    setHistory([]);
    setPriorInjected(false);
    setConfirmInjected(false);
    setContradictInjected(false);
  };

  const injectNodes = (ids) => {
    const newAct = { ...actRef.current };
    ids.forEach((id) => { newAct[id] = 1.0; });
    actRef.current = newAct;
    setActivations({ ...newAct });
  };

  const injectPrior = () => {
    injectNodes(["p0", "p1", "p2"]);
    setPriorInjected(true);
  };
  const injectConfirming = () => {
    const pool = ["c0", "c1", "c2", "c3"];
    injectNodes(pool.sort(() => Math.random() - 0.5).slice(0, 2));
    setConfirmInjected(true);
  };
  const injectContradicting = () => {
    const pool = ["d0", "d1", "d2", "d3"];
    injectNodes(pool.sort(() => Math.random() - 0.5).slice(0, 2));
    setContradictInjected(true);
  };

  /* Helper to update D3 visual properties from external state */
  const updateD3Visuals = useCallback((act, w) => {
    if (!simRef.current) return;
    const { svg, nodeData, edgeData } = simRef.current;

    // Node circles (radius and opacity)
    svg.selectAll("circle.node")
      .data(nodeData)
      .attr("fill-opacity", (d) => 0.12 + act[d.id] * 0.88)
      .attr("r", (d) => 14 + act[d.id] * 14)
      .attr("stroke-width", (d) => 1.5 + act[d.id] * 2.5);

    // Glowing/pulse ring size and opacity
    svg.selectAll("circle.pulse")
      .data(nodeData)
      .attr("r", (d) => 20 + act[d.id] * 14)
      .attr("opacity", (d) => (act[d.id] > 0.65 ? 0.35 : 0));

    // Edge lines (stroke width and opacity)
    svg.selectAll("line")
      .data(edgeData)
      .attr("stroke-width", (d) => {
        const key = edgeKey(d.source.id ?? d.source, d.target.id ?? d.target);
        return 0.5 + (w[key] ?? INIT_WEIGHT) * 5.5;
      })
      .attr("stroke-opacity", (d) => {
        const key = edgeKey(d.source.id ?? d.source, d.target.id ?? d.target);
        return 0.18 + (w[key] ?? INIT_WEIGHT) * 0.75;
      });
  }, []);

  /* ── D3 Force Graph Initialization ── */
  useEffect(() => {
    if (!svgRef.current) return;
    const W = 420, H = 480;
    const svg = d3.select(svgRef.current).attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    ["prior", "confirming", "contradicting", "conclusion"].forEach((g) => {
      const f = defs.append("filter").attr("id", `glow-${g}`)
        .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      f.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
      const m = f.append("feMerge");
      m.append("feMergeNode").attr("in", "blur");
      m.append("feMergeNode").attr("in", "SourceGraphic");
    });

    const edgeLayer = svg.append("g").attr("class", "edges");
    const nodeLayer = svg.append("g").attr("class", "nodes");

    const nodeData = NODES.map((n) => ({ ...n }));
    const edgeData = EDGES.map((e) => ({ ...e }));

    // Apply custom horizontal semantic group layout
    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(edgeData).id((d) => d.id).distance(75).strength(0.35))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(36))
      .force("x", d3.forceX((d) => {
        if (d.group === "prior") return W * 0.16;
        if (d.group === "conclusion") return W * 0.84;
        return W * 0.5; // confirming / contradicting
      }).strength(0.18))
      .force("y", d3.forceY((d) => {
        if (d.group === "confirming") return H * 0.26;
        if (d.group === "contradicting") return H * 0.74;
        return H * 0.5; // prior / conclusion
      }).strength(0.18));

    const link = edgeLayer.selectAll("line")
      .data(edgeData).enter().append("line")
      .attr("stroke", (d) => {
        const cls = edgeGroupClass(NODES, d.source.id ?? d.source, d.target.id ?? d.target);
        return cls === "confirming" ? COLOR.confirming : cls === "contradicting" ? COLOR.contradicting : COLOR.border;
      })
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1);

    nodeLayer.selectAll("circle.pulse")
      .data(nodeData).enter().append("circle")
      .attr("class", "pulse")
      .attr("r", 18).attr("fill", "none")
      .attr("stroke", (d) => COLOR[d.group])
      .attr("stroke-width", 1.5)
      .attr("opacity", 0);

    const circle = nodeLayer.selectAll("circle.node")
      .data(nodeData).enter().append("circle")
      .attr("class", "node")
      .attr("r", 16)
      .attr("fill", (d) => COLOR[d.group])
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => COLOR[d.group])
      .attr("stroke-width", 1.5)
      .attr("cursor", "pointer")
      .attr("filter", (d) => `url(#glow-${d.group})`)
      .on("click", (event, d) => {
        const newAct = { ...actRef.current, [d.id]: 1.0 };
        actRef.current = newAct;
        setActivations({ ...newAct });
      });

    nodeLayer.selectAll("text")
      .data(nodeData).enter().append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("fill", COLOR.muted)
      .attr("dy", 30)
      .text((d) => d.label)
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      circle
        .attr("cx", (d) => { d.x = Math.max(16, Math.min(W - 16, d.x)); return d.x; })
        .attr("cy", (d) => { d.y = Math.max(16, Math.min(H - 32, d.y)); return d.y; });
      nodeLayer.selectAll("circle.pulse")
        .attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      nodeLayer.selectAll("text")
        .attr("x", (d) => d.x).attr("y", (d) => d.y);
    });

    circle.call(
      d3.drag()
        .on("start", (e, d) => {
          if (!e.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (e, d) => {
          d.fx = e.x; d.fy = e.y;
        })
        .on("end", (e, d) => {
          if (!e.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
    );

    simRef.current = { simulation, nodeData, edgeData, svg };

    // Apply the initial weights/activations directly to the loaded SVG
    updateD3Visuals(actRef.current, wRef.current);

    return () => simulation.stop();
  }, [updateD3Visuals]);

  /* ── Update D3 on state change ── */
  useEffect(() => {
    updateD3Visuals(activations, weights);
  }, [activations, weights, updateD3Visuals]);

  const confirmAvg = avgWeight("confirming", weights);
  const contradictAvg = avgWeight("contradicting", weights);
  const ratio = contradictAvg > 0.001 ? confirmAvg / contradictAvg : 1;
  const annotation = getAnnotation({ priorInjected, confirmInjected, contradictInjected, biasRatio: ratio });

  return (
    <div className="min-h-screen bg-[#080810] text-gray-200 font-sans flex flex-col p-5 gap-4 box-border">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          <span className="text-prior">Confirmation Bias</span> as Emergent Network Behavior
        </h1>
        <p className="mt-1.5 text-gray-500 text-sm">
          Hebbian learning · No hardcoded bias · The prior is the only asymmetry
        </p>
      </header>

      {/* Main Grid Layout */}
      <main className="flex gap-4 items-start flex-wrap w-full justify-center max-w-5xl mx-auto">
        
        {/* LEFT — Neural Network Panel */}
        <section className="bg-panel border border-border rounded-xl p-4.5 flex-none flex flex-col items-center">
          <header className="w-full text-left">
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-2">
              Neural Network — click nodes to fire
            </span>
          </header>
          <div className="relative rounded-lg overflow-hidden border border-border bg-[#0f0f14]">
            <svg ref={svgRef} className="block" />
          </div>

          {/* Legend */}
          <div className="flex gap-3.5 flex-wrap mt-3 justify-center w-full">
            {[
              ["prior", "Prior Belief"],
              ["confirming", "Confirming"],
              ["contradicting", "Contradicting"],
              ["conclusion", "Conclusion"]
            ].map(([g, label]) => (
              <div key={g} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full block flex-shrink-0" style={{ background: COLOR[g] }} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Dynamic Annotation Overlay */}
          <div className="mt-3.5 w-full max-w-[420px]">
            <div className="bg-darkbg/90 border border-border border-l-4 border-l-prior rounded-lg p-3 text-xs leading-relaxed text-gray-300 animate-anno-shimmer">
              {annotation}
            </div>
          </div>
        </section>

        {/* RIGHT — Controls & Stats Panel */}
        <section className="flex-1 min-w-[280px] max-w-sm flex flex-col gap-3.5">
          
          {/* Inject Activation Panel */}
          <div className="bg-panel border border-border rounded-xl p-4.5">
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-2">
              Inject Activation
            </span>
            <div className="flex flex-col gap-2">
              <button
                onClick={injectPrior}
                className="btn text-left py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 border border-prior/30 bg-prior/10 text-prior hover:bg-prior/20 hover:scale-[1.01] active:scale-[0.99] active:brightness-95"
              >
                ◆ Inject Prior Belief
              </button>
              <button
                onClick={injectConfirming}
                className="btn text-left py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 border border-confirming/30 bg-confirming/10 text-confirming hover:bg-confirming/20 hover:scale-[1.01] active:scale-[0.99] active:brightness-95"
              >
                ▲ Inject Confirming Evidence
              </button>
              <button
                onClick={injectContradicting}
                className="btn text-left py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 border border-contradicting/30 bg-contradicting/10 text-contradicting hover:bg-contradicting/20 hover:scale-[1.01] active:scale-[0.99] active:brightness-95"
              >
                ▼ Inject Contradicting Evidence
              </button>
            </div>
          </div>

          {/* Simulation Controls Panel */}
          <div className="bg-panel border border-border rounded-xl p-4.5">
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-2">
              Simulation Controls
            </span>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRunning((r) => !r)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  running
                    ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                }`}
              >
                {running ? "⏸ Pause" : "▶ Run"}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium border border-gray-600/30 bg-gray-600/10 text-gray-400 hover:bg-gray-600/20 transition-all duration-200"
              >
                ↺ Reset
              </button>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between mb-1.5 text-xs">
                  <span className="text-gray-400">Learning Rate (η)</span>
                  <span className="font-mono text-white">{learningRate.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="slider w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-prior"
                  min="0.01"
                  max="0.3"
                  step="0.01"
                  value={learningRate}
                  onChange={(e) => {
                    setLearningRate(+e.target.value);
                    lrRef.current = +e.target.value;
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-xs">
                  <span className="text-gray-400">Decay Rate</span>
                  <span className="font-mono text-white">{decayRate.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="slider w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-prior"
                  min="0.7"
                  max="0.99"
                  step="0.01"
                  value={decayRate}
                  onChange={(e) => {
                    setDecayRate(+e.target.value);
                    drRef.current = +e.target.value;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Live Stats Panel */}
          <div className="bg-panel border border-border rounded-xl p-4.5">
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-2">
              Live Statistics
            </span>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-darkbg/50 rounded-lg p-2.5 border border-border/50">
                <div className="text-[10px] text-gray-500 mb-1">Confirming avg w</div>
                <div className="font-mono font-bold text-confirming text-lg">{confirmAvg.toFixed(4)}</div>
              </div>
              <div className="bg-darkbg/50 rounded-lg p-2.5 border border-border/50">
                <div className="text-[10px] text-gray-500 mb-1">Contradicting avg w</div>
                <div className="font-mono font-bold text-contradicting text-lg">{contradictAvg.toFixed(4)}</div>
              </div>
            </div>

            <div
              className={`rounded-lg p-3 border transition-all duration-300 ${
                ratio > 3
                  ? "bg-prior/5 border-prior/30 text-white"
                  : "bg-darkbg/50 border-border text-gray-300"
              }`}
            >
              <div className="text-[10px] text-gray-500 mb-1">Bias Ratio</div>
              <div className="font-mono font-bold text-2xl" style={{ color: ratio > 3 ? COLOR.prior : "#ffffff" }}>
                {ratio.toFixed(2)}×
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {ratio > 3
                  ? "🔴 Strong entrenchment (Rigid Belief)"
                  : ratio > 1.5
                  ? "🟡 Bias forming (Hebbian Reinforcement)"
                  : "⚪ Near-neutral state"}
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 text-xs">
              <span className="text-gray-400">Ticks elapsed</span>
              <span className="font-mono text-white text-sm">{ticks}</span>
            </div>
          </div>

          {/* Tip / Quick Help */}
          <div className="bg-panel border border-border rounded-xl p-3.5 text-xs text-gray-400 leading-relaxed">
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-1">
              Suggested Path
            </span>
            1. Inject Prior → Run → Inject Confirming<br />
            2. Watch the amber weight line climb, teal stay flat<br />
            3. Reset → Inject Contradicting first → compare outcomes<br />
            4. Drag nodes / adjust learning rate (η) to test speed
          </div>
        </section>
      </main>

      {/* BOTTOM — Weight History Chart Panel */}
      <footer className="bg-panel border border-border rounded-xl p-4.5 max-w-5xl mx-auto w-full">
        <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block mb-3">
          Weight History — The Divergence Is Confirmation Bias
        </span>
        <div className="w-full h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 4, right: 15, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
              <XAxis
                dataKey="tick"
                tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2a2a3a" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 0.8]}
                tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2a2a3a" }}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                formatter={(v) => <span className="text-gray-400">{v}</span>}
              />
              <Line
                type="monotone"
                dataKey="confirming"
                name="Confirming avg weight"
                stroke={COLOR.confirming}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="contradicting"
                name="Contradicting avg weight"
                stroke={COLOR.contradicting}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-3 text-xs text-gray-500 italic">
          "Confirmation bias doesn't require a biased learner — it requires only that one belief was active first."
        </div>
      </footer>
    </div>
  );
}
