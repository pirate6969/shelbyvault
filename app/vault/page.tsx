"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Navbar from "@/components/Navbar";

interface Asset {
  id: string; name: string; owner: string; price: number; supply: number;
  sold: number; fileType: string; shelbyUrl: string; listed: boolean;
  uploadedAt: string; likes: string[];
}

export default function VaultPage() {
  const { account, connected, network, signAndSubmitTransaction } = useWallet();
  const [assets, setAssets]               = useState<Asset[]>([]);
  const [loading, setLoading]             = useState(false);
  const [liking, setLiking]               = useState<string | null>(null);
  const [removing, setRemoving]           = useState<string | null>(null);
  const [showListModal, setShowListModal] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset]   = useState<Asset | null>(null);
  const [listName, setListName]           = useState("");
  const [listDesc, setListDesc]           = useState("");
  const [price, setPrice]                 = useState("");
  const [supply, setSupply]               = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [filter, setFilter]               = useState<"all"|"listed"|"unlisted">("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const networkName = network?.name?.toLowerCase() ?? "";
  const isShelby    = networkName.includes("shelby") || (!!networkName && !["testnet","mainnet","devnet","localnet"].includes(networkName));
  const currency    = isShelby ? "ShelbyUSD" : "APT";

  // ── Animated canvas lines ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Lines that drift diagonally
    const lines: { x: number; y: number; len: number; speed: number; opacity: number; angle: number }[] = [];
    for (let i = 0; i < 18; i++) {
      lines.push({
        x: Math.random() * 1600,
        y: Math.random() * 300,
        len: 80 + Math.random() * 160,
        speed: 0.18 + Math.random() * 0.28,
        opacity: 0.04 + Math.random() * 0.10,
        angle: Math.PI / 5 + (Math.random() - 0.5) * 0.3,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lines.forEach(l => {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        const grad = ctx.createLinearGradient(l.x, l.y, l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.4, "rgba(160,120,255,1)");
        grad.addColorStop(0.7, "rgba(212,168,255,0.8)");
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len);
        ctx.stroke();
        ctx.restore();

        // drift rightward and slightly down
        l.x += l.speed;
        l.y += l.speed * 0.35;

        // wrap around
        if (l.x > canvas.width + 200) { l.x = -200; l.y = Math.random() * canvas.height; }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => { if (connected && account) fetchMyAssets(); else setAssets([]); }, [connected, account]);

  const fetchMyAssets = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/marketplace?all=true");
      const data = await res.json();
      setAssets(data.filter((a: Asset) => a.owner === account?.address.toString()));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleLike = async (asset: Asset) => {
    if (!account) return alert("Connect wallet first!");
    setLiking(asset.id);
    try {
      const tx   = await signAndSubmitTransaction({ data: { function:"0x1::coin::transfer", typeArguments:["0x1::aptos_coin::AptosCoin"], functionArguments:[account.address.toString(),"1000"] } });
      const res  = await fetch("/api/likes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:asset.id, wallet:account.address.toString(), txHash:tx.hash }) });
      const data = await res.json();
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, likes: data.likes } : a));
    } catch (err: any) { alert("Failed: " + (err?.message || "User rejected")); }
    setLiking(null);
  };

  const handleRemove = async (asset: Asset) => {
    if (!account || !confirm(`Delete "${asset.name}"?`)) return;
    setRemoving(asset.id);
    try {
      await fetch("/api/delete", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:asset.id, owner:account.address.toString() }) });
      setAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (err: any) { alert("Remove failed: " + (err?.message || "Error")); }
    setRemoving(null);
  };

  const openListModal = (asset: Asset) => { setShowListModal(asset); setListName(asset.name); setListDesc(""); setPrice(""); setSupply(""); };

  const handleListSubmit = async () => {
    if (!price || !supply || !showListModal || !account) return;
    const supplyInt  = parseInt(supply);
    const priceFloat = parseFloat(price);
    if (isNaN(supplyInt)  || supplyInt  < 1) return alert("Supply must be at least 1!");
    if (isNaN(priceFloat) || priceFloat <= 0) return alert("Price must be greater than 0!");
    setSubmitting(true);
    try {
      const tx = await signAndSubmitTransaction({ data: { function:"0x1::coin::transfer", typeArguments:["0x1::aptos_coin::AptosCoin"], functionArguments:[account.address.toString(),"1000"] } });
      await fetch("/api/marketplace", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:showListModal.id, name:listName||showListModal.name, description:listDesc, price:priceFloat, supply:supplyInt, txHash:tx.hash }) });
      setShowListModal(null); setListName(""); setListDesc(""); setPrice(""); setSupply("");
      await fetchMyAssets();
    } catch (err: any) { alert("Listing failed: " + (err?.message || "User rejected")); }
    setSubmitting(false);
  };

  const isLiked    = (a: Asset) => (a.likes ?? []).includes(account?.address.toString() ?? "");
  const likeCount  = (a: Asset) => (a.likes ?? []).length;
  const remaining  = (a: Asset) => (a.supply ?? 1) - (a.sold ?? 0);
  const isSoldOut  = (a: Asset) => a.listed && remaining(a) <= 0;
  const filtered   = assets.filter(a => filter === "all" ? true : filter === "listed" ? a.listed : !a.listed);
  const totalLikes  = assets.reduce((s, a) => s + likeCount(a), 0);
  const totalListed = assets.filter(a => a.listed).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes cardIn  { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes orb1    { 0%,100%{transform:translate(0,0) scale(1)} 45%{transform:translate(35px,-25px) scale(1.08)} }
        @keyframes orb2    { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-28px,20px)} }

        .mv-root { font-family:'Outfit',sans-serif; background:#06050f; color:#fff; }

        /* ══ HEADER with canvas ══ */
        .mv-header {
          position: relative; overflow: hidden;
          background: linear-gradient(160deg, #0d0b1e 0%, #0b0918 60%, #080614 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 34px 64px;
          display: flex; align-items: center;
          justify-content: space-between;
          gap: 24px; flex-wrap: wrap;
        }
        .mv-canvas {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          pointer-events: none; z-index: 1;
        }
        .mv-orb1 { position:absolute; top:-90px; left:-110px; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle,rgba(108,56,255,0.2) 0%,transparent 65%); filter:blur(48px); pointer-events:none; z-index:0; animation:orb1 13s ease-in-out infinite; }
        .mv-orb2 { position:absolute; bottom:-90px; right:-90px; width:360px; height:360px; border-radius:50%; background:radial-gradient(circle,rgba(180,60,200,0.13) 0%,transparent 65%); filter:blur(44px); pointer-events:none; z-index:0; animation:orb2 17s ease-in-out infinite; }

        /* Title */
        .mv-title-wrap { position:relative; z-index:3; }
        .mv-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(155,120,255,0.55); margin-bottom: 7px;
        }
        .mv-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem; font-weight: 800;
          color: rgba(255,255,255,0.93);
          letter-spacing: -0.025em; line-height: 1.06;
        }
        .mv-addr {
          font-size: 11px; color: rgba(255,255,255,0.18);
          margin-top: 7px; font-family: monospace; letter-spacing: 0.04em;
        }

        /* Stat pills */
        .mv-stats { display:flex; gap:8px; align-items:center; flex-wrap:wrap; position:relative; z-index:3; }
        .mv-stat {
          display:flex; flex-direction:column; align-items:center;
          padding: 11px 20px; border-radius: 13px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          min-width: 80px; transition: border-color 0.18s, transform 0.18s;
        }
        .mv-stat:hover { border-color: rgba(120,70,255,0.35); transform: translateY(-2px); }
        .mv-stat-v { font-size: 1.35rem; font-weight: 800; color: rgba(255,255,255,0.9); line-height: 1; }
        .mv-stat-l { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-top: 4px; white-space: nowrap; }

        /* ══ BODY ══ */
        .mv-body { padding: 24px 64px 56px; }

        /* Divider */
        .mv-divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07) 20%,rgba(255,255,255,0.07) 80%,transparent); margin-bottom:20px; }

        /* Filter chips */
        .mv-chips { display:flex; gap:8px; margin-bottom:24px; flex-wrap:wrap; }
        .mv-chip {
          padding: 6px 16px; border-radius:999px; font-size:11px; font-weight:600;
          border:1px solid rgba(255,255,255,0.09); background:transparent;
          color:rgba(255,255,255,0.32); cursor:pointer; transition:all 0.15s;
          font-family:'Outfit',sans-serif;
        }
        .mv-chip.on { background:rgba(108,56,255,0.14); border-color:rgba(108,56,255,0.42); color:rgba(180,150,255,0.95); }
        .mv-chip:hover:not(.on) { color:rgba(255,255,255,0.65); border-color:rgba(255,255,255,0.2); }

        /* ══ GRID — auto-fill so only complete rows show, no orphan half-row ══ */
        .mv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 16px;
          /* align-content keeps rows tight, no stretching */
          align-content: start;
        }

        /* ══ CARD ══ */
        .mv-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; overflow:hidden;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          animation: cardIn 0.38s ease both;
          display: flex; flex-direction: column;
        }
        .mv-card:hover {
          border-color: rgba(108,56,255,0.45);
          transform: translateY(-5px);
          box-shadow: 0 24px 56px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,56,255,0.1), 0 0 32px rgba(108,56,255,0.07);
        }
        .mv-card.is-listed { border-color: rgba(52,211,153,0.13); }
        .mv-card.is-listed:hover { border-color: rgba(52,211,153,0.4); box-shadow:0 24px 56px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.08); }

        /* Square image */
        .mv-img {
          position:relative; aspect-ratio:1/1;
          overflow:hidden; background:rgba(255,255,255,0.025);
          cursor:pointer; flex-shrink:0;
        }
        .mv-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.42s cubic-bezier(0.4,0,0.2,1); display:block; }
        .mv-card:hover .mv-img img { transform:scale(1.08); }

        /* Overlay */
        .mv-img-ov {
          position:absolute; inset:0;
          background:linear-gradient(to top,rgba(6,5,15,0.88),transparent 55%);
          opacity:0; transition:opacity 0.22s;
          display:flex; align-items:center; justify-content:center;
        }
        .mv-card:hover .mv-img-ov { opacity:1; }
        .mv-pill {
          padding:6px 20px; border-radius:999px;
          background:rgba(255,255,255,0.16); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.22);
          color:#fff; font-size:11px; font-weight:600; font-family:'Outfit',sans-serif;
        }

        /* Status */
        .mv-badge {
          position:absolute; top:10px; left:10px;
          padding:3px 10px; border-radius:999px;
          font-size:9px; font-weight:700; letter-spacing:0.05em;
          backdrop-filter:blur(10px); font-family:'Outfit',sans-serif;
        }

        /* Like */
        .mv-like {
          position:absolute; top:10px; right:10px;
          display:flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:999px;
          backdrop-filter:blur(10px); cursor:pointer; border:none;
          transition:all 0.18s; font-family:'Outfit',sans-serif;
        }
        .mv-like:disabled { opacity:0.5; cursor:not-allowed; }

        /* Price overlay tag */
        .mv-price-tag {
          position:absolute; bottom:10px; right:10px;
          padding:4px 10px; border-radius:9px;
          background:rgba(6,5,15,0.9); backdrop-filter:blur(10px);
          border:1px solid rgba(160,130,255,0.32);
          font-size:11px; font-weight:700; color:rgba(160,130,255,0.92);
          font-family:'Outfit',sans-serif;
        }

        /* Card body */
        .mv-card-body { padding:13px 14px 14px; display:flex; flex-direction:column; gap:10px; }
        .mv-card-name { font-size:13px; font-weight:600; color:rgba(255,255,255,0.87); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:0.01em; }
        .mv-card-meta { display:flex; justify-content:space-between; align-items:center; }
        .mv-card-price { font-size:13px; font-weight:700; color:rgba(160,130,255,0.92); }
        .mv-card-date  { font-size:10px; color:rgba(255,255,255,0.2); }
        .mv-card-likes { font-size:10px; color:rgba(255,255,255,0.22); }

        /* Supply bar */
        .mv-supply { display:flex; flex-direction:column; gap:4px; }
        .mv-supply-row { display:flex; justify-content:space-between; }
        .mv-supply-lbl { font-size:9px; color:rgba(255,255,255,0.24); font-weight:500; }
        .mv-supply-val { font-size:9px; color:rgba(255,255,255,0.42); font-weight:600; }
        .mv-bar { height:2px; border-radius:999px; background:rgba(255,255,255,0.06); overflow:hidden; }
        .mv-bar-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#6c38ff,#a855f7,#ec4899); transition:width 0.45s ease; }

        /* Action buttons */
        .mv-actions { display:flex; gap:6px; }
        .mv-btn-list {
          flex:1; padding:8px 10px; border-radius:9px;
          background:rgba(108,56,255,0.1); border:1px solid rgba(108,56,255,0.26);
          color:rgba(160,130,255,0.9); font-size:11px; font-weight:700;
          font-family:'Outfit',sans-serif; cursor:pointer; transition:all 0.15s;
        }
        .mv-btn-list:hover { background:rgba(108,56,255,0.22); border-color:rgba(108,56,255,0.52); }
        .mv-btn-delist {
          flex:1; padding:8px 10px; border-radius:9px;
          background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.22);
          color:rgba(248,113,113,0.82); font-size:11px; font-weight:700;
          font-family:'Outfit',sans-serif; cursor:pointer; transition:all 0.15s;
        }
        .mv-btn-delist:hover { background:rgba(239,68,68,0.16); border-color:rgba(239,68,68,0.42); }
        .mv-btn-ok {
          flex:1; padding:8px 10px; border-radius:9px;
          background:rgba(52,211,153,0.07); border:1px solid rgba(52,211,153,0.2);
          color:rgba(52,211,153,0.82); font-size:11px; font-weight:700;
          font-family:'Outfit',sans-serif; cursor:default;
          display:flex; align-items:center; justify-content:center; gap:5px;
        }
        .mv-btn-del {
          width:34px; flex-shrink:0; padding:8px; border-radius:9px;
          background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.17);
          color:rgba(248,113,113,0.72); cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all 0.15s;
        }
        .mv-btn-del:hover { background:rgba(239,68,68,0.16); border-color:rgba(239,68,68,0.4); }
        .mv-btn-del:disabled { opacity:0.4; cursor:not-allowed; }

        /* Empty + overlay + modal */
        .mv-empty { text-align:center; padding:80px 20px; border:1px solid rgba(255,255,255,0.055); border-radius:18px; background:rgba(255,255,255,0.018); }
        .mv-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:500; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(20px); animation:fadeIn 0.15s ease; }
        .mv-modal-wrap { padding:2px; border-radius:22px; background:linear-gradient(135deg,rgba(108,56,255,0.55),rgba(168,85,247,0.4),rgba(236,72,153,0.42)); box-shadow:0 40px 80px rgba(0,0,0,0.7); width:100%; max-width:400px; }
        .mv-modal-body { background:#0d0820; border-radius:20px; padding:26px 22px; display:flex; flex-direction:column; gap:14px; max-height:90vh; overflow-y:auto; }
        .mv-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:10px; padding:10px 13px; color:rgba(255,255,255,0.9); font-size:13px; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.2s; }
        .mv-input:focus { border-color:rgba(108,56,255,0.5); background:rgba(108,56,255,0.04); }
        .mv-input::placeholder { color:rgba(255,255,255,0.18); }
        .mv-btn-submit { width:100%; padding:12px; border-radius:10px; font-weight:700; font-size:13px; color:#fff; border:none; background:linear-gradient(135deg,#6c38ff,#a855f7,#ec4899); font-family:'Outfit',sans-serif; cursor:pointer; transition:all 0.18s; letter-spacing:0.02em; }
        .mv-btn-submit:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        .mv-btn-submit:disabled { opacity:0.35; cursor:not-allowed; transform:none; }

        .lbl { font-size:9px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.22); display:block; margin-bottom:5px; }
        .spin { animation:spin 0.8s linear infinite; }
      `}</style>

      <main className="mv-root">
        <Navbar />

        {/* ══════════════ ANIMATED HEADER ══════════════ */}
        <div className="mv-header">
          <div className="mv-orb1"/>
          <div className="mv-orb2"/>
          {/* Live moving lines canvas */}
          <canvas ref={canvasRef} className="mv-canvas"/>

          {/* Title */}
          <div className="mv-title-wrap">
            <p className="mv-eyebrow">My Collection</p>
            <h1 className="mv-title">My Vault</h1>
            {connected && account && (
              <p className="mv-addr">{account.address.toString().slice(0,10)}...{account.address.toString().slice(-6)}</p>
            )}
          </div>

          {/* Stat pills */}
          {connected && assets.length > 0 && (
            <div className="mv-stats">
              {[
                { l:"Items",    v: assets.length },
                { l:"Listed",   v: totalListed },
                { l:"Unlisted", v: assets.length - totalListed },
                { l:"Likes",    v: totalLikes },
              ].map((s, i) => (
                <div key={i} className="mv-stat">
                  <span className="mv-stat-v">{s.v}</span>
                  <span className="mv-stat-l">{s.l}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════ BODY ══════════════ */}
        <div className="mv-body">

          {!connected && (
            <div className="mv-empty">
              <div style={{fontSize:"34px",marginBottom:"12px"}}>🔒</div>
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:"14px",fontWeight:600,marginBottom:"5px",fontFamily:"'Outfit',sans-serif"}}>Wallet not connected</p>
              <p style={{color:"rgba(255,255,255,0.2)",fontSize:"12px",fontFamily:"'Outfit',sans-serif"}}>Connect your wallet to view your vault</p>
            </div>
          )}

          {connected && loading && (
            <div style={{display:"flex",justifyContent:"center",padding:"80px 0"}}>
              <div className="spin" style={{width:"28px",height:"28px",border:"2px solid rgba(108,56,255,0.2)",borderTopColor:"#6c38ff",borderRadius:"50%"}}/>
            </div>
          )}

          {connected && !loading && assets.length === 0 && (
            <div className="mv-empty">
              <div style={{fontSize:"34px",marginBottom:"12px"}}>📭</div>
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:"14px",fontWeight:600,marginBottom:"5px",fontFamily:"'Outfit',sans-serif"}}>No assets yet</p>
              <p style={{color:"rgba(255,255,255,0.2)",fontSize:"12px",fontFamily:"'Outfit',sans-serif"}}>Upload files from the home page to get started</p>
            </div>
          )}

          {connected && !loading && assets.length > 0 && (
            <>
              <div className="mv-divider"/>
              <div className="mv-chips">
                {([
                  {key:"all",      label:`All (${assets.length})`},
                  {key:"listed",   label:`Listed (${totalListed})`},
                  {key:"unlisted", label:`Unlisted (${assets.length - totalListed})`},
                ] as const).map(f => (
                  <button key={f.key} className={`mv-chip${filter===f.key?" on":""}`} onClick={()=>setFilter(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── GRID ── */}
          {connected && !loading && filtered.length > 0 && (
            <div className="mv-grid">
              {filtered.map((asset, idx) => {
                const liked   = isLiked(asset);
                const count   = likeCount(asset);
                const rem     = remaining(asset);
                const soldOut = isSoldOut(asset);
                const fillPct = asset.listed ? `${Math.max(0,(rem/(asset.supply??1))*100).toFixed(0)}%` : "100%";

                return (
                  <div key={asset.id} className={`mv-card${asset.listed?" is-listed":""}`} style={{animationDelay:`${idx*0.04}s`}}>

                    {/* Image */}
                    <div className="mv-img" onClick={()=>asset.fileType.startsWith("image/") && setPreviewAsset(asset)}>
                      {asset.fileType.startsWith("image/")
                        ? <img src={asset.shelbyUrl} alt={asset.name}/>
                        : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px"}}>🎵</div>
                      }
                      <div className="mv-img-ov">
                        {asset.fileType.startsWith("image/") && <div className="mv-pill">View</div>}
                      </div>

                      {/* Status badge */}
                      <div className="mv-badge" style={{
                        background: soldOut?"rgba(70,70,70,0.75)":asset.listed?"rgba(52,211,153,0.13)":"rgba(0,0,0,0.58)",
                        border: soldOut?"1px solid rgba(120,120,120,0.3)":asset.listed?"1px solid rgba(52,211,153,0.3)":"1px solid rgba(255,255,255,0.1)",
                        color: soldOut?"rgba(255,255,255,0.4)":asset.listed?"rgba(52,211,153,0.9)":"rgba(255,255,255,0.32)",
                      }}>
                        {soldOut ? "Sold Out" : asset.listed ? "● Listed" : "Unlisted"}
                      </div>

                      {/* Like */}
                      <button className="mv-like"
                        onClick={e=>{e.stopPropagation();handleLike(asset);}}
                        disabled={liking===asset.id}
                        style={{background:liked?"rgba(236,72,153,0.3)":"rgba(0,0,0,0.6)",border:liked?"1px solid rgba(236,72,153,0.52)":"1px solid rgba(255,255,255,0.12)"}}>
                        <span style={{fontSize:"11px"}}>{liked?"❤️":"🤍"}</span>
                        <span style={{fontSize:"10px",fontWeight:700,color:"rgba(255,255,255,0.75)"}}>{count}</span>
                      </button>

                      {/* Price */}
                      {asset.listed && !soldOut && <div className="mv-price-tag">{asset.price} {currency}</div>}
                    </div>

                    {/* Body */}
                    <div className="mv-card-body">
                      <div className="mv-card-name">{asset.name}</div>

                      <div className="mv-card-meta">
                        {asset.listed
                          ? <span className="mv-card-price">{asset.price} {currency}</span>
                          : <span className="mv-card-date">{new Date(asset.uploadedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                        }
                        <span className="mv-card-likes">♥ {count}</span>
                      </div>

                      {/* Supply bar */}
                      {asset.listed && !soldOut && (
                        <div className="mv-supply">
                          <div className="mv-supply-row">
                            <span className="mv-supply-lbl">Supply</span>
                            <span className="mv-supply-val">{rem}/{asset.supply??1} left</span>
                          </div>
                          <div className="mv-bar"><div className="mv-bar-fill" style={{width:fillPct}}/></div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mv-actions" onClick={e=>e.stopPropagation()}>
                        {!asset.listed && !soldOut && (
                          <button className="mv-btn-list" onClick={()=>openListModal(asset)}>+ List</button>
                        )}
                        {asset.listed && !soldOut && (
                          <>
                            <button className="mv-btn-delist" onClick={()=>openListModal(asset)}>Delist</button>
                            <div className="mv-btn-ok">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              Listed
                            </div>
                          </>
                        )}
                        {soldOut && (
                          <div className="mv-btn-ok" style={{color:"rgba(255,255,255,0.26)",background:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.07)"}}>
                            Sold Out
                          </div>
                        )}
                        <button className="mv-btn-del" onClick={()=>handleRemove(asset)} disabled={removing===asset.id} title="Delete">
                          {removing===asset.id
                            ? <div className="spin" style={{width:"10px",height:"10px",border:"1.5px solid rgba(248,113,113,0.4)",borderTopColor:"#f87171",borderRadius:"50%"}}/>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {connected && !loading && assets.length > 0 && filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(255,255,255,0.22)",fontSize:"13px",fontFamily:"'Outfit',sans-serif"}}>
              No {filter} assets found
            </div>
          )}
        </div>

        {/* ══════════════ PREVIEW MODAL ══════════════ */}
        {previewAsset && (
          <div className="mv-overlay" onClick={()=>setPreviewAsset(null)}>
            <div style={{position:"relative",maxWidth:"80vw",maxHeight:"88vh"}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setPreviewAsset(null)}
                style={{position:"absolute",top:"-42px",right:0,width:"32px",height:"32px",borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)",color:"white",fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}
                onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.16)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>✕
              </button>
              <div style={{borderRadius:"16px",overflow:"hidden",boxShadow:"0 0 60px rgba(108,56,255,0.28)",border:"1px solid rgba(255,255,255,0.07)",position:"relative"}}>
                <img src={previewAsset.shelbyUrl} alt={previewAsset.name} style={{display:"block",maxWidth:"80vw",maxHeight:"85vh",objectFit:"contain"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"18px 20px",background:"linear-gradient(to top,rgba(6,5,15,0.96),transparent)"}}>
                  <p style={{color:"white",fontWeight:700,fontSize:"13px",margin:0,fontFamily:"'Outfit',sans-serif"}}>{previewAsset.name}</p>
                  <p style={{color:"rgba(255,255,255,0.3)",fontSize:"10px",margin:"3px 0 0",fontFamily:"'Outfit',sans-serif"}}>{new Date(previewAsset.uploadedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ LIST MODAL ══════════════ */}
        {showListModal && (
          <div className="mv-overlay" onClick={e=>{if(e.target===e.currentTarget) setShowListModal(null);}}>
            <div className="mv-modal-wrap">
              <div className="mv-modal-body">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:800,color:"rgba(255,255,255,0.92)",margin:0}}>List on Marketplace</h2>
                    <p style={{fontSize:"11px",color:"rgba(255,255,255,0.26)",margin:"4px 0 0",fontFamily:"'Outfit',sans-serif"}}>Fill in the details to list your asset</p>
                  </div>
                  <button onClick={()=>setShowListModal(null)}
                    style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>✕
                  </button>
                </div>

                {showListModal.fileType.startsWith("image/") && (
                  <div style={{borderRadius:"10px",overflow:"hidden",height:"86px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <img src={showListModal.shelbyUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                )}

                <div>
                  <label className="lbl">Name <span style={{color:"rgba(236,72,153,0.7)"}}>*</span></label>
                  <input className="mv-input" type="text" value={listName} onChange={e=>setListName(e.target.value)} placeholder="Asset name"/>
                </div>
                <div>
                  <label className="lbl">Description</label>
                  <textarea className="mv-input" value={listDesc} onChange={e=>setListDesc(e.target.value)} placeholder="Describe your asset... (optional)" rows={2} style={{resize:"none"}}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  <div>
                    <label className="lbl">Price ({currency}) <span style={{color:"rgba(236,72,153,0.7)"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <input className="mv-input" type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" style={{paddingRight:"44px"}}/>
                      <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"9px",fontWeight:700,color:isShelby?"rgba(244,114,182,0.8)":"rgba(96,165,250,0.8)",fontFamily:"'Outfit',sans-serif"}}>{currency}</span>
                    </div>
                  </div>
                  <div>
                    <label className="lbl">Supply <span style={{color:"rgba(236,72,153,0.7)"}}>*</span></label>
                    <input className="mv-input" type="number" min="1" step="1" value={supply} onChange={e=>setSupply(e.target.value.replace(/\D/g,""))} placeholder="e.g. 10"/>
                  </div>
                </div>

                <p style={{fontSize:"10px",color:"rgba(255,255,255,0.16)",textAlign:"center",fontFamily:"'Outfit',sans-serif"}}>A small gas fee confirms listing on-chain</p>

                <button className="mv-btn-submit" onClick={handleListSubmit} disabled={submitting||!price||!supply||!listName}>
                  {submitting
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}>
                        <div className="spin" style={{width:"12px",height:"12px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%"}}/>
                        Confirming...
                      </span>
                    : "Confirm & List →"
                  }
                </button>

                <button onClick={()=>setShowListModal(null)}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:"11px",color:"rgba(255,255,255,0.22)",textAlign:"center",fontFamily:"'Outfit',sans-serif",transition:"color 0.15s"}}
                  onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.55)"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.22)"}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}