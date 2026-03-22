"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Navbar from "@/components/Navbar";

const SHELBY_COIN_TYPE = "0x249f5c642a63885ff88a5113b3ba0079840af5a1357706f8c7f3bfc5dd12511f::shelby_usd::ShelbyUSD";
const APT_COIN_TYPE    = "0x1::aptos_coin::AptosCoin";
const SHELBY_USD_METADATA = "0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1";

interface Asset {
  id:string; name:string; owner:string; price:number; supply:number; sold:number;
  fileType:string; shelbyUrl:string; thumbnailUrl?:string; listed:boolean; uploadedAt:string; likes:string[];
  listTxHash?:string; description?:string; listedAt?:string; buyers?:string[]; uploader?:string;
  currency?:string;
  buyHistory?:{buyer:string;txHash:string;price:number;currency:string;boughtAt:string}[];
}
interface LiveToken { symbol:string; name:string; price:number; change24h:number; icon:string; }
type SortOption = "default"|"price_low"|"price_high"|"most_liked";

function VideoThumbnail({ src, thumbnailUrl }: { src: string; thumbnailUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (thumbnailUrl) { setLoaded(true); return; }
    const video = document.createElement("video");
    video.crossOrigin = "anonymous"; video.muted = true; video.preload = "metadata"; video.src = src; video.currentTime = 1;
    video.addEventListener("seeked", () => {
      const canvas = canvasRef.current; if (!canvas) return;
      canvas.width = video.videoWidth||320; canvas.height = video.videoHeight||180;
      const ctx = canvas.getContext("2d"); if (ctx) ctx.drawImage(video,0,0,canvas.width,canvas.height);
      setLoaded(true); video.remove();
    });
    video.load();
  }, [src, thumbnailUrl]);
  if (thumbnailUrl) return (
    <div style={{width:"100%",height:"100%",position:"relative"}}>
      <img src={thumbnailUrl} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.2)"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"rgba(108,56,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(108,56,255,0.5)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{width:"100%",height:"100%",position:"relative",background:"#0d0820"}}>
      <canvas ref={canvasRef} style={{width:"100%",height:"100%",objectFit:"cover",display:loaded?"block":"none"}}/>
      {!loaded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#0d0820,#1a0d38)"}}/>}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:loaded?"rgba(0,0,0,0.25)":"transparent"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"rgba(108,56,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(108,56,255,0.5)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
    </div>
  );
}

function VideoPlayerOverlay({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [muted, setMuted]               = useState(false);
  const [copied, setCopied]             = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    v.volume = volume; v.loop = true;
    const onTime  = () => setProgress(v.currentTime);
    const onLoad  = () => setDuration(v.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate",onTime); v.addEventListener("loadedmetadata",onLoad); v.addEventListener("play",onPlay); v.addEventListener("pause",onPause);
    return () => { v.pause(); v.removeEventListener("timeupdate",onTime); v.removeEventListener("loadedmetadata",onLoad); v.removeEventListener("play",onPlay); v.removeEventListener("pause",onPause); };
  }, []);

  const togglePlay   = (e: React.MouseEvent) => { e.stopPropagation(); const v=videoRef.current; if(!v) return; v.paused?v.play():v.pause(); };
  const seek         = (e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); const v=videoRef.current; if(!v) return; const val=parseFloat(e.target.value); v.currentTime=val; setProgress(val); };
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); const v=videoRef.current; const val=parseFloat(e.target.value); setVolume(val); if(v){v.volume=val;v.muted=val===0;} setMuted(val===0); };
  const toggleMute   = (e: React.MouseEvent) => { e.stopPropagation(); const v=videoRef.current; if(!v) return; v.muted=!muted; setMuted(!muted); };
  const handleFullscreen = (e: React.MouseEvent) => { e.stopPropagation(); const el=wrapperRef.current; if(el?.requestFullscreen) el.requestFullscreen(); };
  const handleDownload   = (e: React.MouseEvent) => { e.stopPropagation(); const a=document.createElement("a"); a.href=asset.shelbyUrl; a.download=asset.name; a.click(); };
  const handleCopyLink   = (e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(asset.shelbyUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const fmt = (s: number) => { if(!s||isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`; };
  const handleMouseMove = () => { setShowControls(true); if(hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current=setTimeout(()=>{ if(playing) setShowControls(false); },2800); };
  const pct = duration?(progress/duration)*100:0;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.97)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <button onClick={onClose} style={{position:"fixed",top:"18px",right:"18px",zIndex:600,width:"40px",height:"40px",borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:"17px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)",transition:"all 0.18s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.22)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>✕</button>
      <div ref={wrapperRef} onClick={e=>e.stopPropagation()} style={{position:"relative",width:"94vw",maxWidth:"1120px",background:"#000",borderRadius:"14px",overflow:"hidden",boxShadow:"0 0 80px rgba(108,56,255,0.2)",border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{position:"relative",width:"100%",background:"#000",cursor:"pointer"}} onMouseMove={handleMouseMove} onClick={togglePlay}>
          <video ref={videoRef} src={asset.shelbyUrl} loop playsInline preload="auto" style={{width:"100%",maxHeight:"76vh",display:"block",background:"#000",objectFit:"contain"}}/>
          {!playing&&(<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.28)",pointerEvents:"none"}}><div style={{width:"72px",height:"72px",borderRadius:"50%",background:"rgba(108,56,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 50px rgba(108,56,255,0.7)"}}><svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>)}
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.5) 60%,transparent 100%)",opacity:showControls?1:0,transition:"opacity 0.3s",pointerEvents:showControls?"all":"none"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"0 16px",marginBottom:"6px",position:"relative",height:"18px",display:"flex",alignItems:"center"}}>
              <div style={{position:"absolute",left:"16px",right:"16px",height:"3px",background:"rgba(255,255,255,0.15)",borderRadius:"999px",overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6c38ff,#a855f7)",borderRadius:"999px",transition:"width 0.1s linear"}}/></div>
              <input type="range" min={0} max={duration||100} step={0.1} value={progress} onChange={seek} style={{position:"absolute",left:"16px",right:"16px",width:"calc(100% - 32px)",height:"18px",opacity:0,cursor:"pointer",margin:0}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 12px",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={togglePlay} style={{background:"none",border:"none",color:"white",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}>
                  {playing?<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                </button>
                <button onClick={toggleMute} style={{background:"none",border:"none",color:"white",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}>
                  {muted?<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
                </button>
                <div style={{position:"relative",height:"18px",width:"72px",display:"flex",alignItems:"center"}}>
                  <div style={{position:"absolute",left:0,right:0,height:"3px",background:"rgba(255,255,255,0.15)",borderRadius:"999px",overflow:"hidden"}}><div style={{height:"100%",width:((muted?0:volume)*100)+"%",background:"rgba(168,85,247,0.9)",borderRadius:"999px"}}/></div>
                  <input type="range" min={0} max={1} step={0.02} value={muted?0:volume} onChange={changeVolume} style={{position:"absolute",left:0,right:0,width:"100%",height:"18px",opacity:0,cursor:"pointer",margin:0}}/>
                </div>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.55)",fontFamily:"monospace",whiteSpace:"nowrap",flexShrink:0}}>{fmt(progress)} / {fmt(duration)}</span>
              </div>
              <button onClick={handleFullscreen} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div style={{padding:"13px 18px",background:"#0d0820",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
          <p style={{margin:0,fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.85)",fontFamily:"'Outfit',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{asset.name}</p>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={handleCopyLink} style={{padding:"7px 14px",borderRadius:"8px",background:copied?"rgba(52,211,153,0.15)":"rgba(108,56,255,0.12)",border:copied?"1px solid rgba(52,211,153,0.4)":"1px solid rgba(108,56,255,0.35)",color:copied?"rgba(52,211,153,0.9)":"rgba(160,130,255,0.9)",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all 0.18s"}}>{copied?"✓ Copied!":"⎘ Share Link"}</button>
            <button onClick={handleDownload} style={{padding:"7px 14px",borderRadius:"8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.7)",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}>↓ Download</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioPlayerOverlay({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume]     = useState(1);
  const [muted, setMuted]       = useState(false);
  const [copied, setCopied]     = useState(false);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = volume; a.loop = true;
    const onCanPlay = () => { setReady(true); a.play().catch(()=>{}); };
    const onTime    = () => setProgress(a.currentTime);
    const onLoad    = () => setDuration(a.duration);
    const onPlay    = () => setPlaying(true);
    const onPause   = () => setPlaying(false);
    a.addEventListener("canplay",onCanPlay); a.addEventListener("timeupdate",onTime); a.addEventListener("loadedmetadata",onLoad); a.addEventListener("play",onPlay); a.addEventListener("pause",onPause);
    a.load();
    return () => { a.pause(); a.removeEventListener("canplay",onCanPlay); a.removeEventListener("timeupdate",onTime); a.removeEventListener("loadedmetadata",onLoad); a.removeEventListener("play",onPlay); a.removeEventListener("pause",onPause); };
  }, []);

  const togglePlay    = () => { const a=audioRef.current; if(!a) return; a.paused?a.play():a.pause(); };
  const seek          = (e: React.ChangeEvent<HTMLInputElement>) => { const a=audioRef.current; if(!a) return; const v=parseFloat(e.target.value); a.currentTime=v; setProgress(v); };
  const changeVolume  = (e: React.ChangeEvent<HTMLInputElement>) => { const a=audioRef.current; const v=parseFloat(e.target.value); setVolume(v); if(a){a.volume=v;a.muted=v===0;} setMuted(v===0); };
  const toggleMute    = () => { const a=audioRef.current; if(!a) return; a.muted=!muted; setMuted(!muted); };
  const handleDownload = () => { const el=document.createElement("a"); el.href=asset.shelbyUrl; el.download=asset.name; el.click(); };
  const handleCopy    = () => { navigator.clipboard.writeText(asset.shelbyUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const fmt = (s: number) => { if(!s||isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`; };
  const pct = duration?(progress/duration)*100:0;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(24px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <audio ref={audioRef} src={asset.shelbyUrl} preload="auto" loop/>
      <div onClick={e=>e.stopPropagation()} style={{width:"90vw",maxWidth:"440px",background:"linear-gradient(160deg,#0d0820,#120a28)",borderRadius:"20px",overflow:"hidden",boxShadow:"0 0 80px rgba(108,56,255,0.35)",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px 0"}}>
          <span style={{fontSize:"10px",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(168,85,247,0.6)",fontFamily:"'Outfit',sans-serif"}}>Now Playing</span>
          <button onClick={onClose} style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 24px 20px",gap:"20px"}}>
          <div style={{width:"160px",height:"160px",borderRadius:"16px",background:"linear-gradient(135deg,rgba(108,56,255,0.3),rgba(168,85,247,0.2),rgba(236,72,153,0.15))",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 20px 60px rgba(108,56,255,0.25)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(108,56,255,0.15),transparent 70%)"}}/>
            {!ready&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"28px",height:"28px",border:"2px solid rgba(108,56,255,0.3)",borderTopColor:"#a855f7",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>}
            {ready&&<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.7)" strokeWidth="1.2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
            {playing&&ready&&(<div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"3px",alignItems:"flex-end"}}>{[1,2,3,4].map(i=>(<div key={i} style={{width:"3px",background:"rgba(168,85,247,0.8)",borderRadius:"2px",height:"8px",animation:`audioBar${i} 0.8s ease-in-out infinite`}}/>))}</div>)}
          </div>
          <div style={{textAlign:"center",width:"100%"}}>
            <p style={{fontSize:"15px",fontWeight:700,color:"rgba(255,255,255,0.9)",margin:"0 0 4px",fontFamily:"'Outfit',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{asset.name.replace(/\.[^/.]+$/,"")}</p>
            <p style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",margin:0,fontFamily:"'Outfit',sans-serif"}}>ShelbyVault · Shelbynet</p>
          </div>
          <div style={{width:"100%"}}>
            <div style={{position:"relative",height:"4px",background:"rgba(255,255,255,0.08)",borderRadius:"999px",marginBottom:"8px"}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6c38ff,#a855f7)",borderRadius:"999px",transition:"width 0.1s"}}/>
              <input type="range" min={0} max={duration||100} step={0.1} value={progress} onChange={seek} style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer",height:"100%"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(progress)}</span>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(duration)}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
            <button onClick={toggleMute} style={{background:"none",border:"none",color:muted?"rgba(236,72,153,0.7)":"rgba(255,255,255,0.35)",cursor:"pointer",padding:"4px"}}>
              {muted?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            </button>
            <button onClick={togglePlay} style={{width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg,#6c38ff,#a855f7)",border:"none",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 28px rgba(108,56,255,0.5)",transition:"transform 0.18s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.06)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
              {playing?<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            </button>
            <div style={{position:"relative",height:"18px",width:"64px",display:"flex",alignItems:"center"}}>
              <div style={{position:"absolute",left:0,right:0,height:"3px",background:"rgba(255,255,255,0.12)",borderRadius:"999px",overflow:"hidden"}}><div style={{height:"100%",width:((muted?0:volume)*100)+"%",background:"rgba(168,85,247,0.9)",borderRadius:"999px"}}/></div>
              <input type="range" min={0} max={1} step={0.02} value={muted?0:volume} onChange={changeVolume} style={{position:"absolute",left:0,right:0,width:"100%",height:"18px",opacity:0,cursor:"pointer",margin:0}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px",width:"100%"}}>
            <button onClick={handleCopy} style={{flex:1,padding:"9px",borderRadius:"10px",background:copied?"rgba(52,211,153,0.12)":"rgba(108,56,255,0.1)",border:copied?"1px solid rgba(52,211,153,0.35)":"1px solid rgba(108,56,255,0.3)",color:copied?"rgba(52,211,153,0.9)":"rgba(160,130,255,0.85)",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all 0.18s"}}>{copied?"✓ Copied!":"⎘ Share Link"}</button>
            <button onClick={handleDownload} style={{flex:1,padding:"9px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.09)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}>↓ Download</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes audioBar1{0%,100%{height:4px}50%{height:14px}}
        @keyframes audioBar2{0%,100%{height:10px}30%{height:4px}60%{height:18px}}
        @keyframes audioBar3{0%,100%{height:14px}40%{height:5px}70%{height:10px}}
        @keyframes audioBar4{0%,100%{height:6px}55%{height:16px}}
      `}</style>
    </div>
  );
}

export default function MarketplacePage() {
  const { account, connected, signAndSubmitTransaction, network } = useWallet();
  const [assets,      setAssets]      = useState<Asset[]>([]);
  const [allAssets,   setAllAssets]   = useState<Asset[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [buying,      setBuying]      = useState<string|null>(null);
  const [delisting,   setDelisting]   = useState<string|null>(null);
  const [liking,      setLiking]      = useState<string|null>(null);
  const [success,     setSuccess]     = useState<string|null>(null);
  const [sort,        setSort]        = useState<SortOption>("default");
  const [previewAsset,setPreviewAsset]= useState<Asset|null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset|null>(null);
  const [liveTokens,  setLiveTokens]  = useState<LiveToken[]>([]);
  const [aptPrice,    setAptPrice]    = useState<number|null>(null);
  const [aptChange,   setAptChange]   = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied,      setCopied]      = useState<string|null>(null);
  const [typeFilter,  setTypeFilter]  = useState("all");
  const tickerRef = useRef<HTMLDivElement>(null);

  const networkName = network?.name?.toLowerCase()??"";
  const isShelby    = networkName.includes("shelby")||(!!networkName&&!["testnet","mainnet","devnet","localnet"].includes(networkName));
  const currency    = isShelby?"ShelbyUSD":"$APT";
  const coinType    = isShelby?SHELBY_COIN_TYPE:APT_COIN_TYPE;

  const getDisplayCurrency = (asset:Asset) => asset.currency??currency;
  const isVideo = (a:Asset) => a.fileType?.startsWith("video/");
  const isAudio = (a:Asset) => a.fileType?.startsWith("audio/");
  const isImage = (a:Asset) => a.fileType?.startsWith("image/");

  useEffect(()=>{
    const fetchPrices=async()=>{
      try{
        const res=await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=aptos,bitcoin,ethereum,solana,sui,dogecoin,pepe,shiba-inu&order=market_cap_desc&sparkline=false&price_change_percentage=24h",{cache:"no-store"});
        const data=await res.json(); if(!Array.isArray(data)) return;
        const tokens:LiveToken[]=data.map((c:any)=>({symbol:c.symbol.toUpperCase(),name:c.name,price:c.current_price,change24h:c.price_change_percentage_24h??0,icon:c.image}));
        setLiveTokens(tokens);
        const apt=tokens.find(t=>t.symbol==="APT"); if(apt){setAptPrice(apt.price);setAptChange(apt.change24h);}
      }catch{}
    };
    fetchPrices(); const iv=setInterval(fetchPrices,20000); return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    if(liveTokens.length===0) return;
    let frame:number,pos=0;
    const tick=()=>{ pos-=0.55; const el=tickerRef.current; if(el){const half=el.scrollWidth/2;if(Math.abs(pos)>=half)pos=0;el.style.transform=`translateX(${pos}px)`;} frame=requestAnimationFrame(tick); };
    frame=requestAnimationFrame(tick); return()=>cancelAnimationFrame(frame);
  },[liveTokens]);

  useEffect(()=>{fetchAssets();},[]);

  const fetchAssets=async()=>{
    setLoading(true);
    try{ const [lr,ar]=await Promise.all([fetch("/api/marketplace"),fetch("/api/marketplace?all=true")]); setAssets(await lr.json()); setAllAssets(await ar.json()); }catch{}
    setLoading(false);
  };

  const handleBuy=async(asset:Asset)=>{
    if(!connected||!account) return alert("Connect wallet first!");
    if(asset.owner===account.address.toString()) return alert("You own this asset!");
    if(isSoldOut(asset)) return alert("Sold out!");
    const assetCurrency=getDisplayCurrency(asset);
    if(assetCurrency==="ShelbyUSD"&&!isShelby) return alert("⚠️ This asset is listed in ShelbyUSD.\nPlease switch your wallet to Shelbynet.");
    if((assetCurrency==="$APT"||assetCurrency==="APT")&&isShelby) return alert("⚠️ This asset is listed in APT.\nPlease switch your wallet to Aptos Testnet.");
    setBuying(asset.id);
    try{
      const octas=Math.floor(asset.price*100_000_000);
      const tx=await signAndSubmitTransaction({ data: assetCurrency==="ShelbyUSD"?{function:"0x1::primary_fungible_store::transfer",typeArguments:["0x1::fungible_asset::Metadata"],functionArguments:[SHELBY_USD_METADATA,asset.owner,octas.toString()]}:{function:"0x1::coin::transfer",typeArguments:[APT_COIN_TYPE],functionArguments:[asset.owner,octas.toString()]} });
      await fetch("/api/buy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:asset.id,owner:account.address.toString(),txHash:tx.hash,currency:assetCurrency})});
      setSuccess(asset.id); setTimeout(()=>setSuccess(null),3000); await fetchAssets();
    }catch(err:any){ alert("Purchase failed: "+(err?.message||"User rejected")); }
    setBuying(null);
  };

  const handleDelist=async(asset:Asset)=>{
    if(!connected||!account) return; setDelisting(asset.id);
    try{
      const tx=await signAndSubmitTransaction({ data: isShelby?{function:"0x1::primary_fungible_store::transfer",typeArguments:["0x1::fungible_asset::Metadata"],functionArguments:[SHELBY_USD_METADATA,account.address.toString(),"10000"]}:{function:"0x1::coin::transfer",typeArguments:[APT_COIN_TYPE],functionArguments:[account.address.toString(),"10000"]} });
      await fetch("/api/marketplace",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:asset.id,owner:account.address.toString(),txHash:tx.hash})}); await fetchAssets();
    }catch(err:any){ alert("Delist failed: "+(err?.message||"User rejected")); }
    setDelisting(null);
  };

  const handleLike=async(asset:Asset,e:React.MouseEvent)=>{
    e.stopPropagation(); if(!account) return alert("Connect wallet first!"); setLiking(asset.id);
    try{
      const tx=await signAndSubmitTransaction({ data: isShelby?{function:"0x1::primary_fungible_store::transfer",typeArguments:["0x1::fungible_asset::Metadata"],functionArguments:[SHELBY_USD_METADATA,account.address.toString(),"10000"]}:{function:"0x1::coin::transfer",typeArguments:[APT_COIN_TYPE],functionArguments:[account.address.toString(),"10000"]} });
      const res=await fetch("/api/likes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:asset.id,wallet:account.address.toString(),txHash:tx.hash})});
      const data=await res.json(); setAssets(prev=>prev.map(a=>a.id===asset.id?{...a,likes:data.likes}:a));
    }catch(err:any){ alert("Like failed: "+(err?.message||"User rejected")); }
    setLiking(null);
  };

  const copy=(text:string,key:string)=>{navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(null),2000);};
  const isOwner  =(a:Asset)=>connected&&account?.address.toString()===a.owner;
  const isSoldOut=(a:Asset)=>(a.sold??0)>=(a.supply??1);
  const remaining=(a:Asset)=>(a.supply??1)-(a.sold??0);
  const isLiked  =(a:Asset)=>(a.likes??[]).includes(account?.address.toString()??"");
  const likeCount=(a:Asset)=>(a.likes??[]).length;
  const fmtUSD   =(n:number)=>n>=1000?`$${(n/1000).toFixed(1)}k`:`$${n<1?n.toFixed(4):n.toFixed(2)}`;
  const fmtTime  =(d:string)=>new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  const short    =(a:string)=>`${a.slice(0,8)}...${a.slice(-6)}`;
  const detailAssetCurrency = detailAsset?getDisplayCurrency(detailAsset):"";

  const filtered=[...assets]
    .filter(a=>!isSoldOut(a)&&(!searchQuery||a.name?.toLowerCase().includes(searchQuery.toLowerCase()))&&(typeFilter==="all"||(typeFilter==="video"&&isVideo(a))||(typeFilter==="audio"&&isAudio(a))||(typeFilter==="image"&&isImage(a))))
    .sort((a,b)=>{ if(sort==="price_low") return a.price-b.price; if(sort==="price_high") return b.price-a.price; if(sort==="most_liked") return (b.likes?.length??0)-(a.likes?.length??0); return 0; });
  const soldOutFiltered=[...assets].filter(a=>isSoldOut(a)&&(!searchQuery||a.name?.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b)=>(b.likes?.length??0)-(a.likes?.length??0));
  const networkCurrency=isShelby?"ShelbyUSD":"$APT";
  const totalVol=allAssets.reduce((s,a)=>s+(a.buyHistory??[]).filter(bh=>{const c=bh.currency??"";return isShelby?c==="ShelbyUSD":(c==="APT"||c==="$APT");}).reduce((sum,bh)=>sum+(bh.price??0),0),0);
  const totalItems=assets.length;
  const floorPrice=assets.length?Math.min(...assets.map(a=>a.price)):0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn {from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse  {0%,100%{opacity:1}50%{opacity:0.4}}

        /* ── ELECTRIC BORDER ANIMATION ── */
        @keyframes elec{0%{background-position:0% 50%}100%{background-position:300% 50%}}
        .mp-type-btn{position:relative;padding:9px 22px;border-radius:12px;font-size:12px;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer;transition:color 0.2s,background 0.2s;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.04);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.45);white-space:nowrap;}
        .mp-type-btn:hover{color:rgba(255,255,255,0.8);background:rgba(108,56,255,0.08);}
        /* ON state: background-clip trick — gradient only on border, dark fill inside */
        .mp-type-btn.on{color:#fff;}
        .mp-type-btn.all-on.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#6c38ff,#a855f7,#ec4899,#a855f7,#6c38ff);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:elec 1s linear infinite;}
        .mp-type-btn.video-on.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#4f46e5,#818cf8,#c7d2fe,#818cf8,#4f46e5);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:elec 1s linear infinite;}
        .mp-type-btn.music-on.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#a855f7,#ec4899,#fda4af,#ec4899,#a855f7);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:elec 1s linear infinite;}
        .mp-type-btn.image-on.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#0891b2,#38bdf8,#bae6fd,#38bdf8,#0891b2);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:elec 1s linear infinite;}

        .mp-root{font-family:'Outfit',sans-serif;background:#06050f;min-height:100vh;color:#fff;overflow-x:hidden;}
        .mp-ticker{background:rgba(255,255,255,0.018);border-bottom:1px solid rgba(255,255,255,0.055);height:38px;overflow:hidden;display:flex;align-items:center;}
        .mp-ticker-label{flex-shrink:0;padding:0 14px;border-right:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:6px;height:100%;}
        .mp-stat{background:rgba(255,255,255,0.026);border:1px solid rgba(255,255,255,0.055);border-radius:14px;padding:18px 22px;display:flex;flex-direction:column;gap:4px;flex:1;min-width:120px;transition:border-color 0.2s;}
        .mp-stat:hover{border-color:rgba(108,56,255,0.3);}
        .mp-stat-val{font-size:1.3rem;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.02em;}
        .mp-stat-lbl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.22);}
        .mp-sort{padding:7px 16px;border-radius:999px;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.35);cursor:pointer;transition:all 0.18s;white-space:nowrap;}
        .mp-sort:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.18);}
        .mp-sort.on{background:rgba(108,56,255,0.14);border-color:rgba(108,56,255,0.45);color:rgba(180,150,255,0.95);}
        .mp-search{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:9px 14px 9px 36px;color:#fff;font-size:12px;font-family:'Outfit',sans-serif;outline:none;width:210px;transition:all 0.2s;}
        .mp-search:focus{border-color:rgba(108,56,255,0.45);background:rgba(108,56,255,0.04);}
        .mp-search::placeholder{color:rgba(255,255,255,0.2);}
        .mp-card{background:rgba(255,255,255,0.028);border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden;cursor:pointer;transition:all 0.22s cubic-bezier(0.4,0,0.2,1);animation:fadeUp 0.35s ease both;}
        .mp-card:hover{border-color:rgba(108,56,255,0.45);transform:translateY(-6px);box-shadow:0 28px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(108,56,255,0.12),0 0 40px rgba(108,56,255,0.06);}
        .mp-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;backdrop-filter:blur(8px);}
        .mp-drow{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.045);}
        .mp-drow:last-child{border-bottom:none;}
        .mp-copy{padding:3px 9px;border-radius:6px;background:rgba(108,56,255,0.1);border:1px solid rgba(108,56,255,0.25);color:rgba(180,150,255,0.9);font-size:10px;font-weight:700;cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:'Outfit',sans-serif;}
        .mp-copy:hover{background:rgba(108,56,255,0.22);}
        .mp-buy{width:100%;padding:14px;border-radius:13px;font-weight:700;font-size:14px;color:#fff;border:none;cursor:pointer;transition:all 0.2s;font-family:'Outfit',sans-serif;background:linear-gradient(135deg,#6c38ff,#a855f7,#ec4899);box-shadow:0 4px 22px rgba(108,56,255,0.35);}
        .mp-buy:hover:not(:disabled){box-shadow:0 6px 30px rgba(108,56,255,0.55);transform:translateY(-1px);}
        .mp-buy:disabled{opacity:0.35;cursor:not-allowed;transform:none;}
        .mp-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.84);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.18s ease;}
        .mp-modal{width:100%;max-width:700px;background:#0e0c1f;border:1px solid rgba(255,255,255,0.07);border-radius:22px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.7);animation:slideUp 0.22s ease;max-height:90vh;overflow-y:auto;}
        .spin{animation:spin 0.8s linear infinite;}
        .lbl{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.22);}
        .network-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;}
        .network-pill.shelby{background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:rgba(196,130,252,0.95);}
        .network-pill.aptos{background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:rgba(52,211,153,0.9);}
        .mp-media-thumb{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0d0820,#1a0d38);position:relative;}
        .mp-media-icon{width:44px;height:44px;border-radius:50%;background:rgba(108,56,255,0.85);display:flex;align-items:center;justifyContent:center;box-shadow:0 0 24px rgba(108,56,255,0.5);position:relative;z-index:1;transition:transform 0.18s;}
        .mp-card:hover .mp-media-icon{transform:scale(1.1);}
      `}</style>

      <main className="mp-root">
        <Navbar/>

        {liveTokens.length>0&&(
          <div className="mp-ticker">
            <div className="mp-ticker-label">
              <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:"9px",fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.12em"}}>LIVE</span>
            </div>
            <div style={{overflow:"hidden",flex:1}}>
              <div ref={tickerRef} style={{display:"flex",willChange:"transform"}}>
                {[...liveTokens,...liveTokens].map((t,i)=>(
                  <div key={i} style={{display:"inline-flex",alignItems:"center",gap:"7px",padding:"0 18px",borderRight:"1px solid rgba(255,255,255,0.04)",flexShrink:0,height:"38px"}}>
                    <img src={t.icon} alt={t.symbol} style={{width:"15px",height:"15px",borderRadius:"50%"}}/>
                    <span style={{fontSize:"11px",fontWeight:600,color:"rgba(255,255,255,0.6)"}}>{t.symbol}</span>
                    <span style={{fontSize:"11px",color:"rgba(255,255,255,0.38)"}}>{fmtUSD(t.price)}</span>
                    <span style={{fontSize:"10px",fontWeight:700,color:t.change24h>=0?"#34d399":"#f87171"}}>{t.change24h>=0?"▲":"▼"}{Math.abs(t.change24h).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
          <div style={{position:"absolute",top:"-80px",left:"-80px",width:"480px",height:"480px",borderRadius:"50%",background:"radial-gradient(circle,rgba(108,56,255,0.1) 0%,transparent 70%)",filter:"blur(55px)"}}/>
          <div style={{position:"absolute",bottom:"-80px",right:"-80px",width:"440px",height:"440px",borderRadius:"50%",background:"radial-gradient(circle,rgba(212,100,180,0.07) 0%,transparent 70%)",filter:"blur(60px)"}}/>
        </div>

        <div style={{position:"relative",zIndex:10,maxWidth:"1400px",margin:"0 auto",padding:"0 40px 80px"}}>
          <div style={{padding:"36px 0 28px"}}>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"24px"}}>
              <div>
                <p style={{fontSize:"11px",fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(108,56,255,0.7)",marginBottom:"8px",fontFamily:"'Outfit',sans-serif"}}>ShelbyVault</p>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"2.2rem",fontWeight:800,color:"#fff",letterSpacing:"-0.02em",margin:0}}>Marketplace</h1>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"9px",flexWrap:"wrap"}}>
                  <span style={{fontSize:"13px",color:"rgba(255,255,255,0.28)",fontFamily:"'Outfit',sans-serif"}}>Buy & sell using{" "}<span style={{color:isShelby?"rgba(196,130,252,0.85)":"rgba(52,211,153,0.85)",fontWeight:600}}>{isShelby?"ShelbyUSD":"$APT"}</span>{" "}on {isShelby?"Shelbynet":"Aptos Testnet"}</span>
                  <span className={`network-pill ${isShelby?"shelby":"aptos"}`}><span style={{width:"5px",height:"5px",borderRadius:"50%",background:isShelby?"rgba(196,130,252,0.9)":"rgba(52,211,153,0.9)",display:"inline-block"}}/>{isShelby?"Shelbynet":"Aptos Testnet"}</span>
                  {aptPrice&&!isShelby&&(<div style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"3px 11px",borderRadius:"999px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}><span style={{fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.9)"}}>$APT</span><span style={{fontSize:"12px",fontWeight:700,color:"#fff"}}>${aptPrice.toFixed(2)}</span><span style={{fontSize:"10px",fontWeight:700,color:aptChange>=0?"#34d399":"#f87171"}}>{aptChange>=0?"▲":"▼"}{Math.abs(aptChange).toFixed(2)}%</span></div>)}
                </div>
              </div>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {[{label:"Total Items",value:totalItems.toString()},{label:"Volume",value:totalVol.toFixed(2)+" "+networkCurrency},{label:"Floor Price",value:totalItems?floorPrice.toFixed(2)+" "+networkCurrency:"—"},{label:"Total Likes",value:assets.reduce((s,a)=>s+likeCount(a),0).toString()}].map((s,i)=>(
                  <div key={i} className="mp-stat"><span className="mp-stat-val">{s.value}</span><span className="mp-stat-lbl">{s.label}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div style={{height:"1px",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.07) 20%,rgba(255,255,255,0.07) 80%,transparent)",marginBottom:"24px"}}/>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",marginBottom:"24px",flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {([["default","✦ Latest"],["price_low","↑ Price"],["price_high","↓ Price"],["most_liked","♥ Most Liked"]] as [SortOption,string][]).map(([v,l])=>(
                <button key={v} className={`mp-sort${sort===v?" on":""}`} onClick={()=>setSort(v)}>{l}</button>
              ))}
            </div>
            {/* ── TYPE FILTER BUTTONS ── */}
            <div style={{display:"flex",gap:"8px"}}>
              <button className={"mp-type-btn all-on"+(typeFilter==="all"?" on":"")} onClick={()=>setTypeFilter("all")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                All
              </button>
              <button className={"mp-type-btn video-on"+(typeFilter==="video"?" on":"")} onClick={()=>setTypeFilter("video")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Videos
              </button>
              <button className={"mp-type-btn music-on"+(typeFilter==="audio"?" on":"")} onClick={()=>setTypeFilter("audio")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                Music
              </button>
              <button className={"mp-type-btn image-on"+(typeFilter==="image"?" on":"")} onClick={()=>setTypeFilter("image")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Photos
              </button>
            </div>
            <div style={{position:"relative",display:"flex",alignItems:"center"}}>
              <svg style={{position:"absolute",left:"11px",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="mp-search" placeholder="Search assets..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
              {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:"10px",background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:"14px"}}>✕</button>}
            </div>
          </div>

          {!loading&&<p style={{fontSize:"11px",color:"rgba(255,255,255,0.2)",marginBottom:"20px",fontWeight:500,fontFamily:"'Outfit',sans-serif"}}>{filtered.length} item{filtered.length!==1?"s":""}{searchQuery?` for "${searchQuery}"`:""}</p>}
          {loading&&<div style={{display:"flex",justifyContent:"center",padding:"120px 0"}}><span className="spin" style={{width:"34px",height:"34px",border:"2px solid rgba(108,56,255,0.2)",borderTopColor:"#6c38ff",borderRadius:"50%",display:"inline-block"}}/></div>}

          {!loading&&filtered.length===0&&typeFilter==="all"&&(
            <div style={{textAlign:"center",padding:"100px 0",border:"1px solid rgba(255,255,255,0.055)",borderRadius:"20px",background:"rgba(255,255,255,0.018)"}}>
              <div style={{fontSize:"42px",marginBottom:"14px"}}>🏪</div>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:"15px",fontWeight:700,marginBottom:"6px",fontFamily:"'Playfair Display',serif"}}>{searchQuery?"No results found":"No listings yet"}</p>
              <p style={{color:"rgba(255,255,255,0.2)",fontSize:"12px",fontFamily:"'Outfit',sans-serif"}}>{searchQuery?`No assets match "${searchQuery}"`:"Upload and list an asset to see it here"}</p>
            </div>
          )}
          {!loading&&typeFilter!=="all"&&filtered.length===0&&(
            <div style={{textAlign:"center",padding:"80px 0",border:"1px solid rgba(255,255,255,0.055)",borderRadius:"20px",background:"rgba(255,255,255,0.018)"}}>
              <div style={{fontSize:"38px",marginBottom:"12px"}}>{typeFilter==="video"?"🎬":typeFilter==="audio"?"🎵":"🖼️"}</div>
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:"14px",fontWeight:700,marginBottom:"5px",fontFamily:"'Playfair Display',serif"}}>{typeFilter==="video"?"No videos listed yet":typeFilter==="audio"?"No music listed yet":"No photos listed yet"}</p>
              <p style={{color:"rgba(255,255,255,0.2)",fontSize:"12px",fontFamily:"'Outfit',sans-serif"}}>{typeFilter==="video"?"Upload and list a video to see it here":typeFilter==="audio"?"Upload and list an audio file to see it here":"Upload and list a photo to see it here"}</p>
            </div>
          )}

          {!loading&&filtered.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"16px"}}>
              {filtered.map((asset,idx)=>{
                const soldOut=isSoldOut(asset),owner=isOwner(asset),assetCurrency=getDisplayCurrency(asset),video=isVideo(asset),audio=isAudio(asset),image=isImage(asset);
                return (
                  <div key={asset.id} className="mp-card" style={{animationDelay:`${idx*0.04}s`}} onClick={()=>setDetailAsset(asset)}>
                    <div style={{position:"relative",aspectRatio:"1",background:"rgba(255,255,255,0.02)",overflow:"hidden"}}>
                      {image&&<img src={asset.shelbyUrl} alt={asset.name} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.4s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.07)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}/>}
                      {video&&<VideoThumbnail src={asset.shelbyUrl} thumbnailUrl={asset.thumbnailUrl}/>}
                      {audio&&(<div className="mp-media-thumb"><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(108,56,255,0.1),transparent 70%)"}}/><div className="mp-media-icon" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div></div>)}
                      {soldOut&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}}/>}
                      <div style={{position:"absolute",top:"10px",left:"10px"}}>
                        {soldOut?<div className="mp-tag" style={{background:"rgba(0,0,0,0.65)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.38)"}}>Sold Out</div>:owner?<div className="mp-tag" style={{background:"rgba(108,56,255,0.2)",border:"1px solid rgba(108,56,255,0.4)",color:"rgba(180,150,255,0.9)"}}>Yours</div>:<div className="mp-tag" style={{background:"rgba(16,185,129,0.14)",border:"1px solid rgba(16,185,129,0.32)",color:"#34d399"}}>● Live</div>}
                      </div>
                      <button onClick={e=>handleLike(asset,e)} disabled={liking===asset.id} style={{position:"absolute",top:"10px",right:"10px",display:"flex",alignItems:"center",gap:"5px",padding:"5px 10px",borderRadius:"999px",background:isLiked(asset)?"rgba(236,72,153,0.28)":"rgba(0,0,0,0.5)",border:isLiked(asset)?"1px solid rgba(236,72,153,0.55)":"1px solid rgba(255,255,255,0.1)",backdropFilter:"blur(8px)",cursor:"pointer",transition:"all 0.2s"}}>
                        <span style={{fontSize:"11px"}}>{isLiked(asset)?"❤️":"🤍"}</span><span style={{fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.7)",fontFamily:"'Outfit',sans-serif"}}>{likeCount(asset)}</span>
                      </button>
                      {!soldOut&&<div style={{position:"absolute",bottom:"10px",right:"10px",padding:"4px 10px",borderRadius:"8px",background:"rgba(6,5,15,0.88)",backdropFilter:"blur(8px)",border:"1px solid rgba(108,56,255,0.3)",fontSize:"11px",fontWeight:700,color:"rgba(180,150,255,0.9)",fontFamily:"'Outfit',sans-serif"}}>{asset.price} {assetCurrency}</div>}
                    </div>
                    <div style={{padding:"14px 16px 16px",display:"flex",flexDirection:"column",gap:"11px"}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:"13px",color:"rgba(255,255,255,0.88)",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"'Outfit',sans-serif"}}>{asset.name}</p>
                        <p style={{fontSize:"11px",color:"rgba(255,255,255,0.22)",margin:"3px 0 0",fontFamily:"'Outfit',sans-serif"}}>{new Date(asset.uploadedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                        <p style={{fontSize:"10px",color:"rgba(108,56,255,0.6)",margin:"4px 0 0",fontFamily:"'Outfit',sans-serif"}}>See full details →</p>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div><p className="lbl" style={{marginBottom:"3px"}}>Price</p><p style={{fontSize:"15px",fontWeight:800,color:soldOut?"rgba(255,255,255,0.22)":"rgba(160,130,255,0.95)",fontFamily:"'Outfit',sans-serif"}}>{soldOut?"—":`${asset.price} ${assetCurrency}`}</p>{aptPrice&&!soldOut&&assetCurrency!=="ShelbyUSD"&&<p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",fontFamily:"'Outfit',sans-serif"}}>≈ ${(asset.price*aptPrice).toFixed(2)}</p>}</div>
                        <div style={{textAlign:"right"}}><p className="lbl" style={{marginBottom:"3px"}}>Supply</p><p style={{fontSize:"13px",fontWeight:700,color:soldOut?"#f87171":"rgba(255,255,255,0.55)",fontFamily:"'Outfit',sans-serif"}}>{soldOut?"Sold Out":`${remaining(asset)} / ${asset.supply??1}`}</p></div>
                      </div>
                      <div style={{height:"3px",borderRadius:"999px",background:"rgba(255,255,255,0.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:"999px",transition:"width 0.4s",width:`${Math.min(100,((asset.sold??0)/(asset.supply??1))*100)}%`,background:soldOut?"#ef4444":"linear-gradient(90deg,#6c38ff,#a855f7)"}}/></div>
                      <p style={{fontSize:"10px",color:"rgba(255,255,255,0.18)",textAlign:"center",fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>tap for full details →</p>
                      {success===asset.id&&<p style={{fontSize:"11px",color:"#4ade80",fontWeight:700,textAlign:"center",fontFamily:"'Outfit',sans-serif"}}>✓ Purchased!</p>}
                      {owner&&!soldOut?<button onClick={e=>{e.stopPropagation();handleDelist(asset);}} disabled={!!delisting} style={{width:"100%",padding:"10px",borderRadius:"11px",fontSize:"12px",fontWeight:600,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.24)",color:"rgba(248,113,113,0.8)",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}} onMouseOver={e=>e.currentTarget.style.background="rgba(239,68,68,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(239,68,68,0.07)"}>{delisting===asset.id?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}><span className="spin" style={{width:"11px",height:"11px",border:"1.5px solid #f87171",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block"}}/>Delisting...</span>:"Delist"}</button>:soldOut?<div style={{width:"100%",padding:"10px",borderRadius:"11px",fontSize:"12px",fontWeight:600,textAlign:"center",background:"rgba(80,80,80,0.08)",border:"1px solid rgba(80,80,80,0.2)",color:"rgba(255,255,255,0.28)",fontFamily:"'Outfit',sans-serif"}}>Sold Out</div>:<button className="mp-buy" onClick={e=>{e.stopPropagation();handleBuy(asset);}} disabled={!!buying}>{buying===asset.id?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}><span className="spin" style={{width:"13px",height:"13px",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:"white",borderRadius:"50%",display:"inline-block"}}/>Confirming...</span>:`Buy · ${asset.price} ${assetCurrency}`}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading&&soldOutFiltered.length>0&&(
            <div style={{marginTop:"48px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
                <div style={{height:"1px",flex:1,background:"rgba(255,255,255,0.06)"}}/>
                <p style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>🏆 Sold Out</p>
                <div style={{height:"1px",flex:1,background:"rgba(255,255,255,0.06)"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"16px"}}>
                {soldOutFiltered.map((asset,idx)=>{
                  const assetCurrency=getDisplayCurrency(asset),video=isVideo(asset),audio=isAudio(asset),image=isImage(asset);
                  return(
                    <div key={asset.id} className="mp-card" style={{animationDelay:`${idx*0.04}s`,opacity:0.7}} onClick={()=>setDetailAsset(asset)}>
                      <div style={{position:"relative",aspectRatio:"1",background:"rgba(255,255,255,0.02)",overflow:"hidden"}}>
                        {image&&<img src={asset.shelbyUrl} alt={asset.name} style={{width:"100%",height:"100%",objectFit:"cover",filter:"grayscale(30%)"}}/>}
                        {video&&<VideoThumbnail src={asset.shelbyUrl} thumbnailUrl={asset.thumbnailUrl}/>}
                        {audio&&(<div className="mp-media-thumb"><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(108,56,255,0.1),transparent 70%)"}}/><div className="mp-media-icon" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div></div>)}
                        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)"}}/>
                        <div style={{position:"absolute",top:"10px",left:"10px"}}><div className="mp-tag" style={{background:"rgba(0,0,0,0.65)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.38)"}}>🏆 Sold Out</div></div>
                        <div style={{position:"absolute",top:"10px",right:"10px",display:"flex",alignItems:"center",gap:"5px",padding:"5px 10px",borderRadius:"999px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)"}}><span style={{fontSize:"11px"}}>❤️</span><span style={{fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.7)",fontFamily:"'Outfit',sans-serif"}}>{likeCount(asset)}</span></div>
                      </div>
                      <div style={{padding:"14px 16px 16px",display:"flex",flexDirection:"column",gap:"8px"}}>
                        <p style={{fontWeight:600,fontSize:"13px",color:"rgba(255,255,255,0.55)",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"'Outfit',sans-serif"}}>{asset.name}</p>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><p style={{fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.25)",fontFamily:"'Outfit',sans-serif"}}>{asset.price} {assetCurrency}</p><p style={{fontSize:"11px",color:"rgba(239,68,68,0.7)",fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>{asset.supply}/{asset.supply} sold</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {previewAsset&&isVideo(previewAsset)&&<VideoPlayerOverlay asset={previewAsset} onClose={()=>setPreviewAsset(null)}/>}
        {previewAsset&&isAudio(previewAsset)&&<AudioPlayerOverlay asset={previewAsset} onClose={()=>setPreviewAsset(null)}/>}

        {previewAsset&&isImage(previewAsset)&&(
          <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(22px)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setPreviewAsset(null)}>
            <button onClick={()=>setPreviewAsset(null)} style={{position:"fixed",top:"18px",right:"18px",width:"38px",height:"38px",borderRadius:"50%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",fontSize:"15px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            <div onClick={e=>e.stopPropagation()} style={{maxWidth:"80vw",maxHeight:"85vh",borderRadius:"18px",overflow:"hidden",boxShadow:"0 0 80px rgba(108,56,255,0.25)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <img src={previewAsset.shelbyUrl} alt={previewAsset.name} style={{display:"block",maxWidth:"80vw",maxHeight:"85vh",objectFit:"contain"}}/>
            </div>
          </div>
        )}

        {detailAsset&&(
          <div className="mp-overlay" onClick={e=>{if(e.target===e.currentTarget)setDetailAsset(null);}}>
            <div className="mp-modal">
              {isImage(detailAsset)&&(
                <div style={{position:"relative",aspectRatio:"16/7",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setPreviewAsset(detailAsset);setDetailAsset(null);}}>
                  <img src={detailAsset.shelbyUrl} alt={detailAsset.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(14,12,31,1) 0%,transparent 55%)"}}/>
                  <div style={{position:"absolute",bottom:"14px",right:"14px",padding:"5px 11px",borderRadius:"7px",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.1)",fontSize:"10px",fontWeight:600,color:"rgba(255,255,255,0.55)",fontFamily:"'Outfit',sans-serif"}}>Click to expand ↗</div>
                </div>
              )}
              {isVideo(detailAsset)&&(
                <div style={{position:"relative",aspectRatio:"16/7",overflow:"hidden",cursor:"pointer",background:"#000"}} onClick={()=>{setPreviewAsset(detailAsset);setDetailAsset(null);}}>
                  <VideoThumbnail src={detailAsset.shelbyUrl} thumbnailUrl={detailAsset.thumbnailUrl}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(14,12,31,0.8) 0%,transparent 50%)"}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px"}}>
                      <div style={{width:"64px",height:"64px",borderRadius:"50%",background:"rgba(108,56,255,0.9)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(108,56,255,0.7)"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                      <span style={{fontSize:"12px",color:"rgba(255,255,255,0.7)",fontFamily:"'Outfit',sans-serif",fontWeight:600}}>▶ Watch Full Video</span>
                    </div>
                  </div>
                </div>
              )}
              {isAudio(detailAsset)&&(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",background:"linear-gradient(135deg,#0d0820,#1a0d38)",gap:"16px"}}>
                  <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,rgba(108,56,255,0.4),rgba(168,85,247,0.3))",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(108,56,255,0.3)"}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.9)" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
                  <p style={{fontSize:"13px",color:"rgba(255,255,255,0.5)",fontFamily:"'Outfit',sans-serif",textAlign:"center"}}>{detailAsset.name.replace(/\.[^/.]+$/,"")}</p>
                  <button onClick={()=>{setPreviewAsset(detailAsset);setDetailAsset(null);}} style={{padding:"10px 28px",borderRadius:"999px",background:"linear-gradient(135deg,#6c38ff,#a855f7)",border:"none",color:"white",fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:"0 0 20px rgba(108,56,255,0.4)",display:"flex",alignItems:"center",gap:"8px"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>Play Song
                  </button>
                </div>
              )}
              <div style={{padding:"28px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"22px",gap:"12px"}}>
                  <div>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:"1.4rem",color:"#fff",margin:0,letterSpacing:"-0.02em"}}>{detailAsset.name}</h2>
                    {detailAsset.description&&<p style={{fontSize:"13px",color:"rgba(255,255,255,0.32)",marginTop:"6px",lineHeight:1.7,maxWidth:"420px",fontFamily:"'Outfit',sans-serif"}}>{detailAsset.description}</p>}
                    <span className={`network-pill ${detailAssetCurrency==="ShelbyUSD"?"shelby":"aptos"}`} style={{marginTop:"8px",display:"inline-flex"}}>{detailAssetCurrency==="ShelbyUSD"?"🟣 ShelbyUSD":"🟢 APT"}</span>
                  </div>
                  <button onClick={()=>setDetailAsset(null)} style={{flexShrink:0,width:"34px",height:"34px",borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.45)",cursor:"pointer",fontSize:"13px"}}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"22px"}}>
                  {[{label:"Price",value:`${detailAsset.price} ${detailAssetCurrency}`,sub:aptPrice&&detailAssetCurrency!=="ShelbyUSD"?`≈ $${(detailAsset.price*aptPrice).toFixed(2)}`:"",color:"rgba(160,130,255,0.95)"},{label:"Supply",value:`${detailAsset.sold??0} / ${detailAsset.supply??1}`,sub:"sold / total",color:"rgba(244,114,182,0.9)"},{label:"Remaining",value:isSoldOut(detailAsset)?"0":remaining(detailAsset).toString(),sub:"editions left",color:isSoldOut(detailAsset)?"#f87171":"#34d399"}].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px",padding:"14px 16px"}}>
                      <p className="lbl" style={{marginBottom:"5px"}}>{s.label}</p>
                      <p style={{fontSize:"1.05rem",fontWeight:800,color:s.color,margin:0,fontFamily:"'Outfit',sans-serif"}}>{s.value}</p>
                      {s.sub&&<p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",margin:"3px 0 0",fontFamily:"'Outfit',sans-serif"}}>{s.sub}</p>}
                    </div>
                  ))}
                </div>
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.055)",borderRadius:"14px",padding:"4px 16px",marginBottom:"14px"}}>
                  <div className="mp-drow">
                    <span style={{fontSize:"12px",color:"rgba(255,255,255,0.28)",fontWeight:500,fontFamily:"'Outfit',sans-serif"}}>Seller</span>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <a href={`/profile/${detailAsset.owner}`} style={{fontSize:"12px",color:"rgba(160,130,255,0.85)",fontFamily:"monospace",textDecoration:"none"}} onMouseOver={e=>e.currentTarget.style.color="rgba(196,181,253,1)"} onMouseOut={e=>e.currentTarget.style.color="rgba(160,130,255,0.85)"}>{detailAsset.owner.slice(0,10)}...{detailAsset.owner.slice(-8)}</a>
                      <button className="mp-copy" onClick={()=>copy(detailAsset.owner,"owner")}>{copied==="owner"?"✓ Copied":"Copy"}</button>
                    </div>
                  </div>
                  {[{label:"Listed",value:detailAsset.listedAt?new Date(detailAsset.listedAt).toLocaleString():new Date(detailAsset.uploadedAt).toLocaleString()},{label:"Likes",value:`❤️ ${likeCount(detailAsset)}`},...(detailAsset.listTxHash?[{label:"Tx Hash",value:`${detailAsset.listTxHash.slice(0,14)}...`,copyKey:"tx",copyVal:detailAsset.listTxHash}]:[])].map((row,i)=>(
                    <div key={i} className="mp-drow">
                      <span style={{fontSize:"12px",color:"rgba(255,255,255,0.28)",fontWeight:500,fontFamily:"'Outfit',sans-serif"}}>{row.label}</span>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontSize:"12px",color:"rgba(255,255,255,0.6)",fontFamily:(row as any).copyKey?"monospace":"'Outfit',sans-serif"}}>{row.value}</span>
                        {(row as any).copyKey&&(row as any).copyVal&&<button className="mp-copy" onClick={()=>copy((row as any).copyVal,(row as any).copyKey)}>{copied===(row as any).copyKey?"✓ Copied":"Copy"}</button>}
                      </div>
                    </div>
                  ))}
                </div>
                {detailAsset.buyHistory&&detailAsset.buyHistory.length>0&&(
                  <div style={{marginBottom:"14px"}}>
                    <p className="lbl" style={{marginBottom:"10px"}}>Purchase History</p>
                    <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                      {detailAsset.buyHistory.map((bh,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 13px",borderRadius:"11px",background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.055)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"9px"}}><a href={`/profile/${bh.buyer}`} style={{fontSize:"11px",color:"rgba(160,130,255,0.8)",fontFamily:"monospace",textDecoration:"none"}} onMouseOver={e=>e.currentTarget.style.color="rgba(196,181,253,1)"} onMouseOut={e=>e.currentTarget.style.color="rgba(160,130,255,0.8)"}>{short(bh.buyer)}</a><span style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",fontFamily:"'Outfit',sans-serif"}}>{fmtTime(bh.boughtAt)}</span></div>
                          <span style={{fontSize:"12px",fontWeight:700,color:"rgba(160,130,255,0.95)",fontFamily:"'Outfit',sans-serif"}}>{bh.price} {bh.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailAsset.listTxHash&&(
                  <a href={`https://explorer.aptoslabs.com/txn/${detailAsset.listTxHash}?network=${isShelby?"shelbynet":"testnet"}`} target="_blank" rel="noopener noreferrer"
                    style={{display:"block",textAlign:"center",padding:"10px",borderRadius:"10px",fontSize:"11px",fontWeight:600,color:"rgba(160,130,255,0.6)",border:"1px solid rgba(108,56,255,0.15)",background:"rgba(108,56,255,0.04)",textDecoration:"none",marginBottom:"16px",transition:"all 0.18s",fontFamily:"'Outfit',sans-serif"}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(108,56,255,0.35)";e.currentTarget.style.color="rgba(180,150,255,0.9)";}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(108,56,255,0.15)";e.currentTarget.style.color="rgba(160,130,255,0.6)";}}>
                    View on Explorer ↗
                  </a>
                )}
                {!isOwner(detailAsset)&&!isSoldOut(detailAsset)&&(
                  <button className="mp-buy" onClick={()=>{setDetailAsset(null);handleBuy(detailAsset);}} disabled={!!buying}>
                    {buying===detailAsset.id?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}><span className="spin" style={{width:"14px",height:"14px",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:"white",borderRadius:"50%",display:"inline-block"}}/>Confirming...</span>:`Buy Now · ${detailAsset.price} ${detailAssetCurrency}`}
                  </button>
                )}
                {isOwner(detailAsset)&&!isSoldOut(detailAsset)&&(
                  <button onClick={()=>{setDetailAsset(null);handleDelist(detailAsset);}} style={{width:"100%",padding:"13px",borderRadius:"12px",fontSize:"13px",fontWeight:700,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.28)",color:"rgba(248,113,113,0.85)",cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all 0.18s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(239,68,68,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(239,68,68,0.07)"}>Delist from Marketplace</button>
                )}
                {isSoldOut(detailAsset)&&<div style={{textAlign:"center",padding:"13px",borderRadius:"12px",background:"rgba(80,80,80,0.07)",border:"1px solid rgba(80,80,80,0.14)",fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.22)",fontFamily:"'Outfit',sans-serif"}}>Sold Out</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}