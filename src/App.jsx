import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Settings2, Play, Square, Eye, EyeOff, Wifi, WifiOff, TrendingUp, Wallet, BarChart3, Zap, RefreshCw, AlertTriangle, BookOpen, ChevronDown, ChevronRight, ExternalLink, Copy, Check, Grid3X3, ArrowDownUp, DollarSign, ShieldAlert, Layers } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SYMBOLS = ["BTC", "ETH", "SOL", "APT"];

const DECIBEL_PACKAGE = "0x50ead22afd6ffd9769e3b3d6e0e64a2a350d68e8b102c4e72e33d0b8cfdfdb06";
const BUILDER_SUBACCOUNT = "0x28bea8456e7eb0fef55469e4f464ef0705dd1c02d88bed374d0f0e42717e9a0a";
const BUILDER_FEE_BPS = 80;

// ─── Helpers ───

function Dot({ on }) {
  return <span className={`w-2 h-2 rounded-full inline-block ${on ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]" : "bg-zinc-600"}`} />;
}

function Badge({ children, color = "zinc" }) {
  const c = { green: "bg-emerald-900/50 text-emerald-400", red: "bg-rose-900/50 text-rose-400", amber: "bg-[#caaf32]/20 text-[#caaf32]", zinc: "bg-zinc-800 text-zinc-400", cyan: "bg-cyan-900/50 text-cyan-400", purple: "bg-purple-900/50 text-purple-400" };
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

function Stat({ icon: Icon, label, value, prefix = "", suffix = "", color = "white", small }) {
  const c = { white: "text-white", green: "text-emerald-400", red: "text-rose-400", amber: "text-[#caaf32]", cyan: "text-cyan-400", purple: "text-purple-400" };
  return (
    <div className="bg-[#0c0c10]/65 backdrop-blur-xl border border-[#caaf32]/10 rounded-xl p-4 hover:border-[#caaf32]/25 transition-all hover:shadow-[0_0_20px_rgba(202,175,50,0.05)]">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#caaf32]/50" />}
        <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">{label}</span>
      </div>
      <div className={`${small ? "text-base" : "text-xl"} font-semibold font-mono ${c[color] || c.white}`}>
        {prefix}{typeof value === "number" ? value.toFixed(2) : value}{suffix}
      </div>
    </div>
  );
}

function PositionCard({ exchange, position, color = "amber" }) {
  const lc = { amber: "text-[#caaf32]", cyan: "text-cyan-400" };
  if (!position) return (
    <div className="bg-[#0c0c10]/50 backdrop-blur-xl border border-[#caaf32]/5 rounded-xl p-4">
      <div className={`text-[10px] uppercase tracking-[.15em] font-mono ${lc[color]}`}>{exchange}</div>
      <div className="text-zinc-600 text-sm mt-2 font-mono">No position</div>
    </div>
  );
  const long = position.side === "long";
  const pnl = position.pnl || position.unrealized_pnl || 0;
  return (
    <div className={`bg-[#0c0c10]/65 backdrop-blur-xl border rounded-xl p-4 animate-fade-in ${long ? "border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]" : "border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]"}`}>
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
    <div ref={ref} className="bg-[#050508]/70 backdrop-blur-lg border border-[#caaf32]/6 rounded-xl p-4 h-72 overflow-y-auto font-mono text-[11px] leading-[1.7] space-y-0.5">
      {logs.length === 0 ? <span className="text-zinc-600">Waiting for bot to start...</span> :
        logs.map((l, i) => (
          <div key={i} className={`${l.includes("ERROR") || l.includes("❌") ? "text-rose-400" : l.includes("✅") ? "text-emerald-400" : l.includes("⚠") ? "text-[#caaf32]" : l.includes("===") ? "text-amber-300 font-semibold" : l.includes("🛑") ? "text-rose-400 font-semibold" : l.includes("📉") ? "text-cyan-400" : l.includes("📈") ? "text-emerald-300" : "text-zinc-400"}`}>{l}</div>
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
          <BarChart3 className="w-4 h-4 text-[#caaf32]" />
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

// ─── Grid Visualization ───

function GridVisualization({ gridState }) {
  if (!gridState?.grids?.length) return null;
  const { grids, current_price, lower, upper, spacing, spacing_pct, stats } = gridState;
  const range = upper - lower || 1;

  return (
    <div className="bg-[#0c0c10]/65 backdrop-blur-xl border border-purple-500/15 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">Grid levels</span>
          <Badge color="purple">{grids.length} levels</Badge>
          <Badge color="amber">Δ${spacing?.toFixed(0)} ({spacing_pct}%)</Badge>
        </div>
        {current_price > 0 && <span className="text-xs font-mono text-white">${current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>}
      </div>

      {/* Grid bar visualization */}
      <div className="relative h-auto min-h-[120px] bg-zinc-900/60 rounded-lg border border-zinc-800/50 p-3 overflow-hidden">
        {/* Current price marker */}
        {current_price > 0 && current_price >= lower && current_price <= upper && (
          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${(1 - (current_price - lower) / range) * 100}%` }}>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-px bg-[#caaf32]/60 border-t border-dashed border-[#caaf32]/40" />
              <span className="text-[9px] font-mono text-[#caaf32] bg-zinc-900/90 px-1.5 py-0.5 rounded">${current_price.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>
        )}

        {/* Grid levels */}
        <div className="space-y-1">
          {[...grids].reverse().map((g) => {
            const stateColors = {
              empty: "bg-zinc-800/60 border-zinc-700/40",
              bought: "bg-emerald-900/40 border-emerald-600/40",
              cooldown: "bg-amber-900/30 border-amber-600/30",
              pending: "bg-cyan-900/30 border-cyan-600/30",
            };
            const isPriceHere = current_price > 0 && Math.abs(g.price - current_price) < (spacing || 1) * 0.5;
            return (
              <div key={g.index} className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] font-mono transition-all ${stateColors[g.state] || stateColors.empty} ${isPriceHere ? "ring-1 ring-[#caaf32]/40" : ""}`}>
                <span className="text-zinc-500 w-5">#{g.index}</span>
                <span className="text-zinc-300 w-24">${g.price.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                <span className={`w-14 text-center rounded px-1 py-0.5 text-[9px] font-semibold ${
                  g.state === "bought" ? "bg-emerald-800/60 text-emerald-300" :
                  g.state === "cooldown" ? "bg-amber-800/40 text-amber-300" :
                  "bg-zinc-800/60 text-zinc-500"
                }`}>{g.state}</span>
                <span className="text-zinc-500 flex-1">B:{g.buy_count} S:{g.sell_count}</span>
                {g.pnl !== 0 && <span className={`${g.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>${g.pnl.toFixed(4)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-zinc-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-mono uppercase">Taker fees</div>
            <div className="text-xs font-mono text-rose-400">${(stats.total_taker_fees || 0).toFixed(4)}</div>
          </div>
          <div className="bg-zinc-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-mono uppercase">Builder rev</div>
            <div className="text-xs font-mono text-emerald-400">${(stats.total_builder_fees || 0).toFixed(4)}</div>
          </div>
          <div className="bg-zinc-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-500 font-mono uppercase">Uptime</div>
            <div className="text-xs font-mono text-zinc-300">{(stats.uptime_hours || 0).toFixed(1)}h</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Setup Guide ───

function GuideStep({ step, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/20 transition-colors">
        <span className="w-6 h-6 rounded-full bg-[#caaf32] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
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
        <BookOpen className="w-4 h-4 text-[#caaf32]" />
        <span className="text-xs font-semibold text-white">Setup Guide — Get Trading in 5 Minutes</span>
      </div>

      <GuideStep step="1" title="Create Decibel Account & API Wallet" defaultOpen={true}>
        <div className="space-y-2">
          <p className="text-zinc-300">Go to <a href="https://app.decibel.trade" target="_blank" className="text-[#caaf32] hover:underline inline-flex items-center gap-1">app.decibel.trade <ExternalLink className="w-3 h-3" /></a></p>
          <p>1. Connect your Aptos wallet (Petra, Pontem, etc.)</p>
          <p>2. Deposit USDC into your Trading Account</p>
          <p>3. Click <span className="text-white">gear icon ⚙️</span> → <span className="text-[#caaf32]">API Wallets</span></p>
          <p>4. Click <span className="text-[#caaf32]">Create API Wallet</span> — name it "decibot"</p>
          <p>5. <span className="text-rose-400 font-semibold">IMPORTANT:</span> Copy the Private Key immediately — shown only once!</p>
          <div className="bg-zinc-800/60 rounded-lg p-3 mt-2 space-y-1">
            <p className="text-[#caaf32] text-[11px] font-semibold">⚡ APT Gas Fee</p>
            <p className="text-[11px]">Every trade = on-chain TX needing ~0.001 APT gas.</p>
            <p className="text-[11px] text-white font-semibold">Send 0.1–0.5 APT to your API Wallet before trading.</p>
          </div>
        </div>
      </GuideStep>

      <GuideStep step="2" title="Get Your Subaccount Address">
        <div className="space-y-2">
          <p>On Decibel app → top-right account selector → copy <span className="text-[#caaf32]">Primary</span> address</p>
          <p>Format: <span className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">0x28be...e9a0a</span></p>
        </div>
      </GuideStep>

      <GuideStep step="3" title="Get Bearer Token from Geomi (Required)">
        <div className="space-y-2">
          <div className="bg-rose-900/20 border border-rose-800/40 rounded-lg p-3">
            <p className="text-rose-400 text-[11px] font-semibold">⚠️ Required for price data</p>
          </div>
          <p>1. Go to <a href="https://geomi.dev" target="_blank" className="text-[#caaf32] hover:underline inline-flex items-center gap-1">geomi.dev <ExternalLink className="w-3 h-3" /></a></p>
          <p>2. Create Project → Create API Key → Select <span className="text-white">Aptos Mainnet</span></p>
          <p>3. Copy API key = Bearer Token</p>
        </div>
      </GuideStep>

      <GuideStep step="4" title="Setup Lighter Exchange (Hedge mode only)">
        <div className="space-y-2">
          <p className="text-zinc-500">Not needed for Grid mode — Lighter is only used for delta hedging.</p>
          <p>Go to <a href="https://lighter.xyz" target="_blank" className="text-[#caaf32] hover:underline inline-flex items-center gap-1">lighter.xyz <ExternalLink className="w-3 h-3" /></a> → Create account → API Keys</p>
        </div>
      </GuideStep>

      <GuideStep step="5" title="Approve Builder Fee (One-time)">
        <div className="space-y-2">
          <div className="bg-[#caaf32]/20 border border-amber-700/40 rounded-lg p-3">
            <p className="text-[#caaf32] text-[11px] font-semibold">Required before trading</p>
            <p className="text-[11px] mt-1">0.1% builder fee per trade. Approve once via Petra wallet in Configuration tab.</p>
          </div>
        </div>
      </GuideStep>

      <GuideStep step="6" title="Choose Mode & Start">
        <div className="space-y-2">
          <div className="bg-zinc-800/60 rounded-lg p-3 space-y-2">
            <p className="text-[#caaf32] text-[11px] font-semibold">Grid Mode (Decibel only)</p>
            <p className="text-[11px]">Sets buy/sell levels in a price range. Profits from sideways movement. No second exchange needed.</p>
            <p className="text-[11px] text-zinc-500">Fees: 0.05% taker + 0.1% builder = 0.15% per trade. Grid spacing auto-adjusts to stay profitable.</p>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3 space-y-2">
            <p className="text-cyan-400 text-[11px] font-semibold">Hedge Mode (Decibel + Lighter)</p>
            <p className="text-[11px]">Opens opposite positions on 2 exchanges. Market-neutral for OI farming.</p>
          </div>
        </div>
      </GuideStep>
    </div>
  );
}

// ─── Input ───
function Input({ label, value, onChange, type = "text", placeholder = "", required, mono, half, step, hint }) {
  return (
    <div className={half ? "" : "w-full"}>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1 mb-1">
        {label} {required && !value && <span className="text-rose-400">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        step={step || (type === "number" ? "any" : undefined)}
        className={`w-full bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#caaf32]/60 focus:ring-1 focus:ring-[#caaf32]/15 outline-none transition-all ${mono ? "font-mono text-xs" : ""}`} />
      {hint && <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Approve Builder Fee ───

function ApproveBuilderFee({ subaccountAddress }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [walletAddr, setWalletAddr] = useState("");

  const handleApprove = async () => {
    try {
      setStatus("connecting"); setError("");
      const wallets = [];
      window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: { register: w => wallets.push(w) } }));
      const aptosWallets = wallets.filter(w => w.chains?.some(c => c.startsWith("aptos:")));
      const wallet = aptosWallets.find(w => w.name?.includes("Petra")) || aptosWallets[0];
      if (!wallet) { setError("No Aptos wallet found. Install Petra."); setStatus("error"); return; }
      const connectResult = await wallet.features["aptos:connect"].connect();
      const addr = String(wallet.accounts?.[0]?.address || connectResult?.args?.address || "");
      setWalletAddr(addr);
      setStatus("approving");
      const result = await wallet.features["aptos:signAndSubmitTransaction"].signAndSubmitTransaction({
        payload: { function: `${DECIBEL_PACKAGE}::dex_accounts_entry::approve_max_builder_fee_for_subaccount`, typeArguments: [], functionArguments: [subaccountAddress || BUILDER_SUBACCOUNT, BUILDER_SUBACCOUNT, BUILDER_FEE_BPS] },
      });
      const txHash = String(result?.args?.hash || result?.hash || result?.args || "");
      if (!txHash || txHash.length < 10) { setError("No TX hash returned."); setStatus("error"); return; }
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const res = await fetch(`https://fullnode.mainnet.aptoslabs.com/v1/transactions/by_hash/${txHash}`);
          if (res.ok) { const data = await res.json(); if (data.success === true) { setStatus("success"); localStorage.setItem("decibot_builder_approved", "true"); return; } if (data.success === false) { setError(`TX failed: ${(data.vm_status || "").slice(0, 120)}`); setStatus("error"); return; } }
        } catch {}
      }
      setStatus("success"); localStorage.setItem("decibot_builder_approved", "true");
    } catch (e) {
      const msg = String(e?.message || e || "");
      setError(msg.includes("rejected") || msg.includes("denied") ? "Transaction rejected." : msg.slice(0, 200));
      setStatus("error");
    }
  };

  const isApproved = localStorage.getItem("decibot_builder_approved") === "true";
  if (isApproved && status !== "error") {
    return (
      <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3">
        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span className="text-[11px] font-semibold text-emerald-400">Builder Fee Approved</span></div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">0.1% builder + 0.034% taker per trade</p>
        <button onClick={() => { localStorage.removeItem("decibot_builder_approved"); setStatus("idle"); }} className="text-[9px] text-zinc-600 hover:text-zinc-400 font-mono mt-1 underline">Reset</button>
      </div>
    );
  }
  return (
    <div className="bg-rose-900/20 border border-rose-700/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" /><span className="text-[11px] font-semibold text-rose-400">Builder Fee Approval Required</span></div>
      <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">Connect <span className="text-white">Aptos wallet</span> (owner of subaccount) to approve 0.1% builder fee.</p>
      {error && <p className="text-[10px] text-rose-400 font-mono bg-rose-900/30 rounded p-2">{error}</p>}
      <button onClick={handleApprove} disabled={status === "connecting" || status === "approving"}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-xs font-semibold transition-all disabled:opacity-50 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white">
        {status === "connecting" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...</> :
         status === "approving" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Confirm in wallet...</> :
         <><Wallet className="w-3.5 h-3.5" /> Connect Wallet &amp; Approve</>}
      </button>
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
  const [botMode, setBotMode] = useState("off"); // "hedge" | "grid" | "off"
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [logs, setLogs] = useState([]);
  const [positions, setPositions] = useState({ decibel: null, lighter: null });
  const [balances, setBalances] = useState({ decibel: 0, lighter: 0 });
  const [stats, setStats] = useState({ total_trades: 0, total_volume: 0, total_pnl: 0 });
  const [cycles, setCycles] = useState([]);
  const [gridState, setGridState] = useState(null);
  const [showKeys, setShowKeys] = useState(false);
  const [selectedMode, setSelectedMode] = useState("grid"); // default mode to start

  const [config, setConfig] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("decibot_config")); if (s) return s; } catch {}
    return { symbol: "BTC", size_usd: 100, leverage: 10, hold_hours: 8, rest_hours: 0.5, cycles: 1, auto_reenter: true };
  });

  const [gridConfig, setGridConfig] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("decibot_grid_config")); if (s) return s; } catch {}
    return { symbol: "BTC", upper_price: 0, lower_price: 0, num_grids: 10, size_per_grid: 20, leverage: 10, poll_interval: 3, cooldown_sec: 10, stop_loss_pct: 1, max_open_grids: 3, max_loss_usd: 0, auto_range: true, auto_range_pct: 2 };
  });

  const [keys, setKeys] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("decibot_keys")); if (s) return s; } catch {}
    return { decibel_private_key: "", decibel_subaccount: "", decibel_bearer_token: "", lighter_api_key: "", lighter_account_index: "0", lighter_api_key_index: "2" };
  });

  useEffect(() => { localStorage.setItem("decibot_config", JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem("decibot_grid_config", JSON.stringify(gridConfig)); }, [gridConfig]);
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
      else if (m.type === "state") {
        setIsRunning(m.data.is_running);
        if (m.data.mode) setBotMode(m.data.mode);
        if (m.data.stats) setStats(m.data.stats);
      }
      else if (m.type === "position") setPositions(p => ({ ...p, [m.data.exchange]: m.data.position }));
      else if (m.type === "balances") setBalances(m.data);
      else if (m.type === "stats") setStats(m.data);
      else if (m.type === "cycle_history") setCycles(m.data);
      else if (m.type === "grid_state") setGridState(m.data);
    };
    wsRef.current = ws;
  }, [sessionId]);

  useEffect(() => {
    const savedSid = localStorage.getItem("decibot_session_id");
    if (savedSid) {
      fetch(`${API}/api/status/${savedSid}`).then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }).then(sd => {
        setSessionId(savedSid);
        if (sd.logs?.length) setLogs(sd.logs);
        if (sd.balances) setBalances(sd.balances);
        if (sd.stats) setStats(sd.stats);
        if (sd.mode) setBotMode(sd.mode);
        if (sd.positions?.decibel) setPositions(p => ({...p, decibel: sd.positions.decibel}));
        if (sd.positions?.lighter) setPositions(p => ({...p, lighter: sd.positions.lighter}));
        if (sd.is_running) { setIsRunning(true); connectWs(savedSid); }
        else setIsRunning(false);
      }).catch(() => { localStorage.removeItem("decibot_session_id"); });
    }
  }, []);

  const handleStart = async () => {
    setLoading(true); setLogs([]); setGridState(null);
    const body = { mode: selectedMode, api_keys: { ...keys, lighter_account_index: parseInt(keys.lighter_account_index) || 0, lighter_api_key_index: parseInt(keys.lighter_api_key_index) || 2 } };
    if (selectedMode === "grid") {
      body.grid_config = {
        ...gridConfig,
        upper_price: parseFloat(gridConfig.upper_price) || 0,
        lower_price: parseFloat(gridConfig.lower_price) || 0,
        num_grids: parseInt(gridConfig.num_grids) || 10,
        size_per_grid: parseFloat(gridConfig.size_per_grid) || 20,
        leverage: parseInt(gridConfig.leverage) || 10,
        poll_interval: parseFloat(gridConfig.poll_interval) || 3,
        max_open_grids: parseInt(gridConfig.max_open_grids) || 3,
        max_loss_usd: parseFloat(gridConfig.max_loss_usd) || 0,
        auto_range: gridConfig.auto_range,
        auto_range_pct: parseFloat(gridConfig.auto_range_pct) || 2,
      };
    } else {
      body.config = config;
    }
    try {
      const r = await fetch(`${API}/api/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.session_id) {
        setSessionId(d.session_id); setIsRunning(true); setBotMode(d.mode || selectedMode);
        localStorage.setItem("decibot_session_id", d.session_id);
        connectWs(d.session_id); setTab("overview");
        setTimeout(async () => {
          try { const st = await fetch(`${API}/api/status/${d.session_id}`); const sd = await st.json(); if (sd.logs?.length) setLogs(sd.logs); if (sd.balances) setBalances(sd.balances); } catch {}
        }, 2000);
      }
    } catch (e) { setLogs(p => [...p, `ERROR: ${e.message}`]); }
    setLoading(false);
  };

  const handleStop = async () => {
    if (!sessionId) return;
    setStopping(true);
    try { await fetch(`${API}/api/stop/${sessionId}`, { method: "POST" }); setIsRunning(false); setBotMode("off"); localStorage.removeItem("decibot_session_id"); } catch {}
    setStopping(false);
  };

  const canStartDecibel = keys.decibel_private_key && keys.decibel_subaccount && keys.decibel_bearer_token;
  const canStart = canStartDecibel && (selectedMode === "grid" || true); // grid only needs decibel

  const activeMode = isRunning ? botMode : selectedMode;
  const isGrid = activeMode === "grid";

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-[#caaf32]/10 bg-[#050508]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-amber-900/30">D</div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">DeciBot</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-[.2em] font-mono">
                {isRunning ? (isGrid ? "Grid Trading · Decibel" : "Delta Hedge · Decibel × Lighter") : "Decibel Trading Bot"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#caaf32] animate-pulse" />
                <Badge color={isGrid ? "purple" : "amber"}>{isGrid ? "GRID" : "HEDGE"}</Badge>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-600" />}
              {connected ? "Live" : "Offline"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#0c0c10]/60 backdrop-blur-xl border border-[#caaf32]/8 rounded-xl p-1 w-fit">
          {[["overview", Activity, "Overview"], ["config", Settings2, "Configuration"], ["guide", BookOpen, "Guide"]].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-gradient-to-r from-[#caaf32]/20 to-[#b8981a]/15 border border-[#caaf32]/30 text-[#caaf32]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW ══════ */}
        {tab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats row */}
            <div className={`grid gap-3 ${isGrid ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
              <Stat icon={Wallet} label="Decibel" value={balances.decibel} prefix="$" color="amber" />
              {!isGrid && <Stat icon={Wallet} label="Lighter" value={balances.lighter} prefix="$" color="cyan" />}
              <Stat icon={Zap} label="Trades" value={stats.total_trades} color="white" />
              <Stat icon={BarChart3} label="Volume" value={stats.total_volume} prefix="$" color="white" />
              <Stat icon={TrendingUp} label="Net PnL" value={stats.total_pnl} prefix="$" color={stats.total_pnl >= 0 ? "green" : "red"} />
              {isGrid && <Stat icon={DollarSign} label="Builder Rev" value={stats.total_builder_fees || 0} prefix="$" color="purple" small />}
            </div>

            {/* Positions / Grid viz */}
            {isGrid ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PositionCard exchange="Decibel" position={positions.decibel} color="amber" />
                <GridVisualization gridState={gridState} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PositionCard exchange="Decibel" position={positions.decibel} color="amber" />
                <PositionCard exchange="Lighter" position={positions.lighter} color="cyan" />
              </div>
            )}

            {/* Start/Stop + badges */}
            <div className="flex flex-wrap gap-3 items-center">
              {!isRunning ? (
                <>
                  {/* Mode selector */}
                  <div className="flex bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-0.5">
                    <button onClick={() => setSelectedMode("grid")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${selectedMode === "grid" ? "bg-purple-900/40 border border-purple-500/30 text-purple-300" : "text-zinc-500 hover:text-white"}`}>
                      <Grid3X3 className="w-3.5 h-3.5" /> Grid
                    </button>
                    <button onClick={() => setSelectedMode("hedge")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${selectedMode === "hedge" ? "bg-[#caaf32]/20 border border-[#caaf32]/30 text-[#caaf32]" : "text-zinc-500 hover:text-white"}`}>
                      <ArrowDownUp className="w-3.5 h-3.5" /> Hedge
                    </button>
                  </div>
                  <button onClick={handleStart} disabled={loading || !canStart}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#b8981a] to-[#d4b82c] hover:from-[#caaf32] hover:to-[#e0c840] text-[#050508] shadow-[0_0_20px_rgba(202,175,50,0.25)]">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {loading ? "Starting..." : `Start ${selectedMode === "grid" ? "Grid" : "Hedge"}`}
                  </button>
                </>
              ) : (
                <button onClick={handleStop} disabled={stopping}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all">
                  {stopping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  {stopping ? "Stopping..." : "Stop Bot"}
                </button>
              )}
              {!canStart && !isRunning && (
                <button onClick={() => setTab("guide")} className="flex items-center gap-2 text-xs text-[#caaf32] hover:text-amber-300 font-mono transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Setup required
                </button>
              )}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500 ml-auto">
                {isGrid ? (
                  <>
                    <Badge color="purple">{gridConfig.symbol}</Badge>
                    <Badge>${gridConfig.size_per_grid}/grid</Badge>
                    <Badge>{gridConfig.num_grids} grids</Badge>
                    {gridConfig.max_loss_usd > 0 && <Badge color="red">SL ${gridConfig.max_loss_usd}</Badge>}
                  </>
                ) : (
                  <>
                    <Badge color="amber">{config.symbol}</Badge>
                    <Badge>${config.size_usd}</Badge>
                    <Badge>{config.leverage}x</Badge>
                    <Badge>{config.hold_hours}h</Badge>
                  </>
                )}
              </div>
            </div>

            {/* Logs */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] uppercase tracking-[.15em] text-zinc-500 font-mono">Live Logs</span>
              </div>
              <LogPanel logs={logs} />
            </div>

            {/* Cycle table (hedge only) */}
            {!isGrid && <CycleTable cycles={cycles} />}
          </div>
        )}

        {/* ══════ CONFIG ══════ */}
        {tab === "config" && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            {/* API Keys */}
            <div className="bg-[#0c0c10]/65 backdrop-blur-xl border border-[#caaf32]/8 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-[#caaf32]" /> API Keys</span>
                <button onClick={() => setShowKeys(!showKeys)} className="text-zinc-500 hover:text-white transition-colors">
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-semibold text-[#caaf32] uppercase tracking-wider">Decibel (Aptos)</div>
                <Input label="API Wallet Private Key" value={keys.decibel_private_key} onChange={v => setKeys({...keys, decibel_private_key: v})} type={showKeys?"text":"password"} placeholder="ed25519-priv-0x..." required mono />
                <Input label="Subaccount Address" value={keys.decibel_subaccount} onChange={v => setKeys({...keys, decibel_subaccount: v})} type={showKeys?"text":"password"} placeholder="0x..." required mono />
                <Input label="Bearer Token (Geomi)" value={keys.decibel_bearer_token} onChange={v => setKeys({...keys, decibel_bearer_token: v})} type={showKeys?"text":"password"} placeholder="from geomi.dev" required mono />
                <div className="bg-[#caaf32]/20 border border-amber-700/40 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#caaf32]" /><span className="text-[11px] font-semibold text-[#caaf32]">APT Gas Required</span></div>
                  <p className="text-[10px] text-zinc-400 font-mono">Send <span className="text-white">0.1–0.5 APT</span> to API Wallet for on-chain gas (~0.001 APT/trade)</p>
                </div>
                <ApproveBuilderFee subaccountAddress={keys.decibel_subaccount} />
              </div>
              {selectedMode === "hedge" && (
                <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                  <div className="text-[10px] font-mono font-semibold text-cyan-400 uppercase tracking-wider">Lighter (Hedge only)</div>
                  <Input label="API Key" value={keys.lighter_api_key} onChange={v => setKeys({...keys, lighter_api_key: v})} type={showKeys?"text":"password"} placeholder='{"2": "private_key"}' mono />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Account ID" value={keys.lighter_account_index} onChange={v => setKeys({...keys, lighter_account_index: v})} type="number" mono half />
                    <Input label="Key Index" value={keys.lighter_api_key_index} onChange={v => setKeys({...keys, lighter_api_key_index: v})} type="number" mono half />
                  </div>
                </div>
              )}
              <p className="text-[10px] text-zinc-600 font-mono">Keys saved in browser localStorage only.</p>
            </div>

            {/* Trade Config — switches between Grid and Hedge */}
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1">
                <button onClick={() => setSelectedMode("grid")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${selectedMode === "grid" ? "bg-purple-900/40 border border-purple-500/30 text-purple-300" : "text-zinc-500 hover:text-white"}`}>
                  <Grid3X3 className="w-3.5 h-3.5" /> Grid Trading
                </button>
                <button onClick={() => setSelectedMode("hedge")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${selectedMode === "hedge" ? "bg-[#caaf32]/20 border border-[#caaf32]/30 text-[#caaf32]" : "text-zinc-500 hover:text-white"}`}>
                  <ArrowDownUp className="w-3.5 h-3.5" /> Delta Hedge
                </button>
              </div>

              {selectedMode === "grid" ? (
                /* ── GRID CONFIG ── */
                <div className="bg-[#0c0c10]/65 backdrop-blur-xl border border-purple-500/10 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-purple-400" /><span className="text-xs font-semibold text-white">Grid Configuration</span></div>

                  {/* Symbol */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-2 block">Symbol</label>
                    <div className="grid grid-cols-4 gap-2">
                      {SYMBOLS.map(s => (
                        <button key={s} onClick={() => setGridConfig({...gridConfig, symbol: s})}
                          className={`py-2.5 rounded-lg font-mono text-sm font-medium transition-all ${gridConfig.symbol===s ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.2)]" : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 border border-zinc-700/40"}`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Auto range toggle */}
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${gridConfig.auto_range ? "bg-purple-500" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${gridConfig.auto_range ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-zinc-400">Auto-range from current price</span>
                  </label>
                  <input type="checkbox" className="hidden" checked={gridConfig.auto_range} onChange={e => setGridConfig({...gridConfig, auto_range: e.target.checked})} />

                  {gridConfig.auto_range ? (
                    <Input label="Range %" value={gridConfig.auto_range_pct} onChange={v => setGridConfig({...gridConfig, auto_range_pct: v === "" ? "" : parseFloat(v)})} type="number" hint="±% from current price" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Lower Price" value={gridConfig.lower_price} onChange={v => setGridConfig({...gridConfig, lower_price: v === "" ? "" : parseFloat(v)})} type="number" half />
                      <Input label="Upper Price" value={gridConfig.upper_price} onChange={v => setGridConfig({...gridConfig, upper_price: v === "" ? "" : parseFloat(v)})} type="number" half />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Grids" value={gridConfig.num_grids} onChange={v => setGridConfig({...gridConfig, num_grids: parseInt(v) || 10})} type="number" half hint="Auto-capped if spacing < fees" />
                    <Input label="$/Grid" value={gridConfig.size_per_grid} onChange={v => setGridConfig({...gridConfig, size_per_grid: v === "" ? "" : parseFloat(v)})} type="number" half />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Max Open Grids" value={gridConfig.max_open_grids} onChange={v => setGridConfig({...gridConfig, max_open_grids: parseInt(v) || 3})} type="number" half hint="Position cap" />
                    <Input label="Leverage" value={gridConfig.leverage} onChange={v => setGridConfig({...gridConfig, leverage: parseInt(v) || 10})} type="number" half />
                  </div>

                  {/* Max loss */}
                  <div className="bg-rose-900/15 border border-rose-800/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[11px] font-semibold text-rose-400">Loss Limit</span>
                    </div>
                    <Input label="Max Loss (USD)" value={gridConfig.max_loss_usd} onChange={v => setGridConfig({...gridConfig, max_loss_usd: v === "" ? "" : parseFloat(v)})} type="number" hint="0 = disabled. Bot stops when net PnL hits this loss." mono />
                  </div>

                  {/* Fee info */}
                  <div className="bg-zinc-800/40 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] font-mono text-zinc-500">Fee breakdown per trade:</p>
                    <div className="flex gap-4 text-[10px] font-mono">
                      <span className="text-zinc-400">Taker: <span className="text-rose-400">0.034%</span></span>
                      <span className="text-zinc-400">Builder: <span className="text-purple-400">0.10%</span></span>
                      <span className="text-zinc-400">Round-trip: <span className="text-white">0.268%</span></span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600">Grid spacing auto-adjusts to stay &gt; 0.30% for profitability</p>
                  </div>
                </div>
              ) : (
                /* ── HEDGE CONFIG ── */
                <div className="bg-[#0c0c10]/65 backdrop-blur-xl border border-[#caaf32]/8 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4 text-[#caaf32]" /><span className="text-xs font-semibold text-white">Hedge Configuration</span></div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-2 block">Symbol</label>
                    <div className="grid grid-cols-4 gap-2">
                      {SYMBOLS.map(s => (
                        <button key={s} onClick={() => setConfig({...config, symbol: s})}
                          className={`py-2.5 rounded-lg font-mono text-sm font-medium transition-all ${config.symbol===s ? "bg-[#caaf32] text-[#050508]" : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 border border-zinc-700/40"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <Input label="Position Size (USD)" value={config.size_usd} onChange={v => setConfig({...config, size_usd: v === "" ? "" : parseFloat(v)})} type="number" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Leverage" value={config.leverage} onChange={v => setConfig({...config, leverage: parseInt(v)||10})} type="number" half />
                    <Input label="Hold Time (hours)" value={config.hold_hours} onChange={v => setConfig({...config, hold_hours: v === "" ? "" : parseFloat(v)})} type="number" half />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Cycles (-1 = ∞)" value={config.cycles} onChange={v => setConfig({...config, cycles: parseInt(v)||1})} type="number" half />
                    <Input label="Rest (hours)" value={config.rest_hours} onChange={v => setConfig({...config, rest_hours: v === "" ? "" : parseFloat(v)})} type="number" half />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${config.auto_reenter?"bg-[#caaf32]":"bg-zinc-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.auto_reenter?"translate-x-5":"translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-zinc-400">Auto re-enter after cycle</span>
                  </label>
                </div>
              )}

              {/* Start/Stop button */}
              {!isRunning ? (
                <button onClick={handleStart} disabled={loading || !canStart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-30 transition-all ${
                    selectedMode === "grid"
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.2)]"
                      : "bg-gradient-to-r from-[#b8981a] to-[#d4b82c] hover:from-[#caaf32] hover:to-[#e0c840] text-[#050508] shadow-[0_0_20px_rgba(202,175,50,0.25)]"
                  }`}>
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? "Starting..." : `Start ${selectedMode === "grid" ? gridConfig.symbol + " Grid" : config.symbol + " Hedge"}`}
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
