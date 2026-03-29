import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Settings2, Play, Square, Eye, EyeOff, Wifi, WifiOff, TrendingUp, Wallet, BarChart3, Zap, RefreshCw, AlertTriangle, BookOpen, ChevronDown, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SYMBOLS = ["BTC", "ETH", "SOL", "APT"];

// ─── Helpers ───

function Dot({ on }) {
  return <span className={`w-2 h-2 rounded-full inline-block ${on ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]" : "bg-zinc-600"}`} />;
}

function Badge({ children, color = "zinc" }) {
  const c = { green: "bg-emerald-900/50 text-emerald-400", red: "bg-rose-900/50 text-rose-400", amber: "bg-amber-900/50 text-amber-400", zinc: "bg-zinc-800 text-zinc-400", cyan: "bg-cyan-900/50 text-cyan-400" };
  return <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${c[color] || c.zinc}`}>{children}</span>;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-500 hover:text-white transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Stat({ icon: Icon, label, value, prefix = "", color = "white" }) {
  const c = { white: "text-white", green: "text-emerald-400", red: "text-rose-400", amber: "text-amber-400", cyan: "text-cyan-400" };
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/80 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
        <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">{label}</span>
      </div>
      <div className={`text-xl font-semibold font-mono ${c[color] || c.white}`}>
        {prefix}{typeof value === "number" ? value.toFixed(2) : value}
      </div>
    </div>
  );
}

function PositionCard({ exchange, position, color = "amber" }) {
  const lc = { amber: "text-amber-500", cyan: "text-cyan-400" };
  if (!position) return (
    <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4">
      <div className={`text-[10px] uppercase tracking-[.15em] font-mono ${lc[color]}`}>{exchange}</div>
      <div className="text-zinc-600 text-sm mt-2 font-mono">No position</div>
    </div>
  );
  const long = position.side === "long";
  const pnl = position.pnl || position.unrealized_pnl || 0;
  return (
    <div className={`bg-zinc-900/60 border rounded-xl p-4 animate-fade-in ${long ? "border-emerald-800/40" : "border-rose-800/40"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] uppercase tracking-[.15em] font-mono ${lc[color]}`}>{exchange}</span>
        <Badge color={long ? "green" : "red"}>{position.side?.toUpperCase()}</Badge>
      </div>
      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between"><span className="text-zinc-500">Size</span><span className="text-white">{position.size?.toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Entry</span><span className="text-white">${position.entry_price?.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">PnL</span><span className={pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>${pnl.toFixed(4)}</span></div>
      </div>
    </div>
  );
}

function LogPanel({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div ref={ref} className="bg-black/50 border border-zinc-800/60 rounded-xl p-4 h-72 overflow-y-auto font-mono text-[11px] leading-[1.7] space-y-0.5">
      {logs.length === 0 ? <span className="text-zinc-600">Waiting for bot to start...</span> :
        logs.map((l, i) => (
          <div key={i} className={`${l.includes("ERROR") || l.includes("❌") ? "text-rose-400" : l.includes("✅") ? "text-emerald-400" : l.includes("⚠") ? "text-amber-400" : l.includes("===") ? "text-amber-300 font-semibold" : "text-zinc-400"}`}>{l}</div>
        ))}
    </div>
  );
}

function CycleTable({ cycles }) {
  if (!cycles?.length) return null;
  const totalPnl = cycles.reduce((s, c) => s + (c.decibel_pnl || 0), 0);
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">Cycle History</span>
          <Badge color="amber">{cycles.length}</Badge>
        </div>
        <span className={`text-xs font-mono font-semibold ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>Net: ${totalPnl.toFixed(4)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead><tr className="text-zinc-500 border-b border-zinc-800">
            {["#","Time","Decibel","Lighter","Size","PnL","Hold","Reason"].map(h => <th key={h} className="text-left py-1.5 px-2 font-normal">{h}</th>)}
          </tr></thead>
          <tbody>{cycles.map((c,i) => (
            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
              <td className="py-1.5 px-2 text-zinc-500">{c.cycle}</td>
              <td className="py-1.5 px-2 text-zinc-400">{c.entry_time?.split(" ")[1]||""}</td>
              <td className="py-1.5 px-2"><Badge color={c.decibel_side==="long"?"green":"red"}>{c.decibel_side?.toUpperCase()}</Badge></td>
              <td className="py-1.5 px-2"><Badge color={c.lighter_side==="long"?"green":"red"}>{c.lighter_side?.toUpperCase()}</Badge></td>
              <td className="py-1.5 px-2 text-white">${c.size_usd}</td>
              <td className={`py-1.5 px-2 ${(c.decibel_pnl||0)>=0?"text-emerald-400":"text-rose-400"}`}>${(c.decibel_pnl||0).toFixed(4)}</td>
              <td className="py-1.5 px-2 text-zinc-400">{c.hold_minutes?.toFixed(0)}m</td>
              <td className="py-1.5 px-2 text-zinc-600 truncate max-w-[120px]">{c.close_reason}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Setup Guide ───

function GuideStep({ step, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/20 transition-colors">
        <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
        <span className="text-sm font-medium text-white flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && <div className="px-4 pb-4 pt-0 text-[12px] text-zinc-400 font-mono leading-relaxed space-y-3 border-t border-zinc-800/40">{children}</div>}
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-white">Setup Guide — Get Trading in 5 Minutes</span>
      </div>

      <GuideStep step="1" title="Create Decibel Account & API Wallet" defaultOpen={true}>
        <div className="space-y-2">
          <p className="text-zinc-300">Go to <a href="https://app.decibel.trade" target="_blank" className="text-amber-400 hover:underline inline-flex items-center gap-1">app.decibel.trade <ExternalLink className="w-3 h-3" /></a></p>
          <p>1. Connect your Aptos wallet (Petra, Pontem, etc.)</p>
          <p>2. Deposit USDC into your Trading Account (this is your trading collateral)</p>
          <p>3. Click the <span className="text-white">gear icon ⚙️</span> → <span className="text-amber-400">API Wallets</span></p>
          <p>4. Click <span className="text-amber-400">Create API Wallet</span> — give it a name like "decibot"</p>
          <p>5. <span className="text-rose-400 font-semibold">IMPORTANT:</span> Copy the Private Key immediately — it's shown only once!</p>
          <p>6. Format: <span className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">ed25519-priv-0x...</span></p>
          <div className="bg-zinc-800/60 rounded-lg p-3 mt-2 space-y-1">
            <p className="text-amber-400 text-[11px] font-semibold">⚡ About Gas Fees</p>
            <p className="text-[11px]">Decibel runs on Aptos blockchain. Each trade is an on-chain transaction that costs a tiny amount of APT (~0.001 APT per trade). Send 0.1 APT to your API Wallet address — enough for hundreds of trades.</p>
            <p className="text-[11px]">USDC is your trading collateral. APT is only for gas.</p>
          </div>
        </div>
      </GuideStep>

      <GuideStep step="2" title="Get Your Subaccount Address">
        <div className="space-y-2">
          <p>Your subaccount (Trading Account) is where your USDC collateral lives.</p>
          <p>1. On Decibel app, look at the top-right corner — your account selector</p>
          <p>2. Click on <span className="text-amber-400">Primary</span> → copy the address</p>
          <p>3. Format: <span className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">0x28be...e9a0a</span> (full 64-char hex)</p>
          <p className="text-zinc-500">This is different from your wallet address — it's the on-chain trading account object.</p>
        </div>
      </GuideStep>

      <GuideStep step="3" title="Get Bearer Token from Geomi (Required)">
        <div className="space-y-2">
          <div className="bg-rose-900/20 border border-rose-800/40 rounded-lg p-3">
            <p className="text-rose-400 text-[11px] font-semibold">⚠️ Required</p>
            <p className="text-[11px] mt-1">The Bearer token is needed to read prices, positions, and balance from Decibel API. Without it, the bot cannot get market prices and will fail to trade.</p>
          </div>
          <p>1. Go to <a href="https://geomi.dev" target="_blank" className="text-amber-400 hover:underline inline-flex items-center gap-1">geomi.dev <ExternalLink className="w-3 h-3" /></a></p>
          <p>2. Sign in with your Google account or email</p>
          <p>3. Click <span className="text-amber-400">Create Project</span> → name it anything (e.g. "decibot")</p>
          <p>4. Inside the project, click <span className="text-amber-400">Create API Key</span></p>
          <p>5. Select <span className="text-white">Aptos Mainnet</span> as the network</p>
          <p>6. Copy the API key — this is your Bearer Token</p>
          <p>7. Paste it into the <span className="text-amber-400">Bearer Token</span> field in Configuration tab</p>
          <p className="text-zinc-500 mt-2">The token allows reading market data (prices, funding rates, positions). It cannot move funds or place orders.</p>
        </div>
      </GuideStep>

      <GuideStep step="4" title="Setup Lighter Exchange">
        <div className="space-y-2">
          <p>Lighter is the second exchange for delta hedging.</p>
          <p>1. Go to <a href="https://lighter.xyz" target="_blank" className="text-amber-400 hover:underline inline-flex items-center gap-1">lighter.xyz <ExternalLink className="w-3 h-3" /></a></p>
          <p>2. Connect wallet and create an account</p>
          <p>3. Deposit USDC as collateral</p>
          <p>4. Go to Settings → API Keys → Create new API key</p>
          <p>5. Copy the private key and note the Account Index and Key Index</p>
          <p>6. API Key format: <span className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">{`{"2": "your_private_key"}`}</span></p>
          <p className="text-zinc-500">The number "2" is your Key Index. Replace with your actual index.</p>
        </div>
      </GuideStep>

      <GuideStep step="5" title="Enter Keys & Start Trading">
        <div className="space-y-2">
          <p>1. Go to the <span className="text-amber-400">Configuration</span> tab above</p>
          <p>2. Enter your Decibel Private Key and Subaccount address</p>
          <p>3. Enter your Lighter API Key, Account ID, and Key Index</p>
          <p>4. Select your trading pair (BTC, ETH, SOL, or APT)</p>
          <p>5. Set your position size, hold time, and number of cycles</p>
          <p>6. Click <span className="text-amber-400 font-semibold">Start Hedge</span> 🚀</p>
          <div className="bg-zinc-800/60 rounded-lg p-3 mt-2">
            <p className="text-amber-400 text-[11px] font-semibold">How Delta Hedging Works</p>
            <p className="text-[11px] mt-1">DeciBot opens opposite positions on two exchanges simultaneously (e.g., LONG on Decibel + SHORT on Lighter). This creates a market-neutral position where you earn from OI farming rewards while being protected from price movements.</p>
          </div>
        </div>
      </GuideStep>
    </div>
  );
}

// ─── Input ───
function Input({ label, value, onChange, type = "text", placeholder = "", required, mono, half, step }) {
  return (
    <div className={half ? "" : "w-full"}>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1 mb-1">
        {label} {required && !value && <span className="text-rose-400">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        step={step || (type === "number" ? "any" : undefined)}
        className={`w-full bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all ${mono ? "font-mono text-xs" : ""}`} />
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════

export default function App() {
  const [tab, setTab] = useState("overview");
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [logs, setLogs] = useState([]);
  const [positions, setPositions] = useState({ decibel: null, lighter: null });
  const [balances, setBalances] = useState({ decibel: 0, lighter: 0 });
  const [stats, setStats] = useState({ total_trades: 0, total_volume: 0, total_pnl: 0 });
  const [cycles, setCycles] = useState([]);
  const [showKeys, setShowKeys] = useState(false);

  const [config, setConfig] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("decibot_config"));
      if (saved) return saved;
    } catch {}
    return { symbol: "BTC", size_usd: 100, leverage: 10, hold_hours: 8, rest_hours: 0.5, cycles: 1, auto_reenter: true };
  });

  const [keys, setKeys] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("decibot_keys"));
      if (saved) return saved;
    } catch {}
    return { decibel_private_key: "", decibel_subaccount: "", decibel_bearer_token: "", lighter_api_key: "", lighter_account_index: "0", lighter_api_key_index: "2" };
  });

  useEffect(() => { localStorage.setItem("decibot_config", JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem("decibot_keys", JSON.stringify(keys)); }, [keys]);

  const wsRef = useRef(null);
  const connectWs = useCallback((sid) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(API.replace("http", "ws") + `/ws/${sid}`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setTimeout(() => { if (sessionId) connectWs(sid); }, 3000); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "log") setLogs(p => [...p, ...(Array.isArray(m.data) ? m.data : [m.data])].slice(-400));
      else if (m.type === "state") { setIsRunning(m.data.is_running); if (m.data.stats) setStats(m.data.stats); }
      else if (m.type === "position") setPositions(p => ({ ...p, [m.data.exchange]: m.data.position }));
      else if (m.type === "balances") setBalances(m.data);
      else if (m.type === "stats") setStats(m.data);
      else if (m.type === "cycle_history") setCycles(m.data);
    };
    wsRef.current = ws;
  }, [sessionId]);

  useEffect(() => {
    fetch(`${API}/api/active-session`).then(r => r.json()).then(d => {
      if (d.session_id) { setSessionId(d.session_id); setIsRunning(true); connectWs(d.session_id); }
    }).catch(() => {});
  }, []);

  const handleStart = async () => {
    setLoading(true); setLogs([]);
    try {
      const r = await fetch(`${API}/api/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, api_keys: { ...keys, lighter_account_index: parseInt(keys.lighter_account_index) || 0, lighter_api_key_index: parseInt(keys.lighter_api_key_index) || 2 } })
      });
      const d = await r.json();
      if (d.session_id) { setSessionId(d.session_id); setIsRunning(true); connectWs(d.session_id); setTab("overview"); }
    } catch (e) { setLogs(p => [...p, `ERROR: ${e.message}`]); }
    setLoading(false);
  };

  const handleStop = async () => {
    if (!sessionId) return;
    setStopping(true);
    try { await fetch(`${API}/api/stop/${sessionId}`, { method: "POST" }); setIsRunning(false); } catch {}
    setStopping(false);
  };

  const canStart = keys.decibel_private_key && keys.decibel_subaccount && keys.decibel_bearer_token;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-amber-900/30">D</div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">DeciBot</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-[.2em] font-mono">Decibel × Lighter Hedge</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isRunning && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" /><span className="text-[10px] font-mono text-emerald-400">RUNNING</span></div>}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-600" />}
              {connected ? "Live" : "Offline"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 w-fit">
          {[["overview", Activity, "Overview"], ["config", Settings2, "Configuration"], ["guide", BookOpen, "Setup Guide"]].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW ══════ */}
        {tab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat icon={Wallet} label="Decibel" value={balances.decibel} prefix="$" color="amber" />
              <Stat icon={Wallet} label="Lighter" value={balances.lighter} prefix="$" color="cyan" />
              <Stat icon={Zap} label="Trades" value={stats.total_trades} color="white" />
              <Stat icon={TrendingUp} label="Net PnL" value={stats.total_pnl} prefix="$" color={stats.total_pnl >= 0 ? "green" : "red"} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PositionCard exchange="Decibel" position={positions.decibel} color="amber" />
              <PositionCard exchange="Lighter" position={positions.lighter} color="cyan" />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {!isRunning ? (
                <button onClick={handleStart} disabled={loading || !canStart}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? "Starting..." : "Start Hedge"}
                </button>
              ) : (
                <button onClick={handleStop} disabled={stopping}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all">
                  {stopping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  {stopping ? "Stopping..." : "Stop Bot"}
                </button>
              )}
              {!canStart && !isRunning && (
                <button onClick={() => setTab("guide")} className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-mono transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Setup required — click here for guide
                </button>
              )}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500 ml-auto">
                <Badge color="amber">{config.symbol}</Badge>
                <Badge>${config.size_usd}</Badge>
                <Badge>{config.leverage}x</Badge>
                <Badge>{config.hold_hours}h</Badge>
                <Badge>{config.cycles > 0 ? `${config.cycles}×` : "∞"}</Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">Live Logs</span>
              </div>
              <LogPanel logs={logs} />
            </div>
            <CycleTable cycles={cycles} />
          </div>
        )}

        {/* ══════ CONFIG ══════ */}
        {tab === "config" && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            {/* API Keys */}
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> API Keys</span>
                <button onClick={() => setShowKeys(!showKeys)} className="text-zinc-500 hover:text-white transition-colors">
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-mono font-semibold text-amber-500 uppercase tracking-wider">Decibel (Aptos)</div>
                <Input label="API Wallet Private Key" value={keys.decibel_private_key} onChange={v => setKeys({...keys, decibel_private_key: v})} type={showKeys?"text":"password"} placeholder="ed25519-priv-0x..." required mono />
                <Input label="Subaccount Address" value={keys.decibel_subaccount} onChange={v => setKeys({...keys, decibel_subaccount: v})} type={showKeys?"text":"password"} placeholder="0x..." required mono />
                <Input label="Bearer Token (Geomi)" value={keys.decibel_bearer_token} onChange={v => setKeys({...keys, decibel_bearer_token: v})} type={showKeys?"text":"password"} placeholder="Required — from geomi.dev" required mono />
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                <div className="text-[10px] font-mono font-semibold text-cyan-400 uppercase tracking-wider">Lighter</div>
                <Input label="API Key" value={keys.lighter_api_key} onChange={v => setKeys({...keys, lighter_api_key: v})} type={showKeys?"text":"password"} placeholder='{"2": "private_key"}' mono />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Account ID" value={keys.lighter_account_index} onChange={v => setKeys({...keys, lighter_account_index: v})} type="number" mono half />
                  <Input label="Key Index" value={keys.lighter_api_key_index} onChange={v => setKeys({...keys, lighter_api_key_index: v})} type="number" mono half />
                </div>
              </div>

              <p className="text-[10px] text-zinc-600 font-mono">Keys are saved in browser localStorage only. Never sent anywhere except the backend.</p>
            </div>

            {/* Trade Config */}
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-amber-500" /><span className="text-xs font-semibold text-white">Trade Configuration</span></div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-2 block">Symbol</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SYMBOLS.map(s => (
                      <button key={s} onClick={() => setConfig({...config, symbol: s})}
                        className={`py-2.5 rounded-lg font-mono text-sm font-medium transition-all ${config.symbol===s ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30" : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white border border-zinc-700/40"}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <Input label="Position Size (USD)" value={config.size_usd} onChange={v => setConfig({...config, size_usd: parseFloat(v)||100})} type="number" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Leverage" value={config.leverage} onChange={v => setConfig({...config, leverage: parseInt(v)||10})} type="number" half />
                  <Input label="Hold Time (hours)" value={config.hold_hours} onChange={v => setConfig({...config, hold_hours: parseFloat(v)||8})} type="number" half />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Cycles (-1 = ∞)" value={config.cycles} onChange={v => setConfig({...config, cycles: parseInt(v)||1})} type="number" half />
                  <Input label="Rest (hours)" value={config.rest_hours} onChange={v => setConfig({...config, rest_hours: parseFloat(v)||0.5})} type="number" half />
                </div>

                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${config.auto_reenter?"bg-amber-600":"bg-zinc-700"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.auto_reenter?"translate-x-5":"translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs text-zinc-400">Auto re-enter after cycle</span>
                </label>
              </div>

              {!isRunning ? (
                <button onClick={() => { handleStart(); }} disabled={loading||!canStart}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-30 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30 transition-all">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? "Starting..." : `Start ${config.symbol} Hedge`}
                </button>
              ) : (
                <button onClick={handleStop} disabled={stopping}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white transition-all">
                  {stopping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  {stopping ? "Stopping..." : "Stop Bot"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════ GUIDE ══════ */}
        {tab === "guide" && (
          <div className="max-w-2xl animate-fade-in">
            <SetupGuide />
          </div>
        )}
      </div>
    </div>
  );
}
