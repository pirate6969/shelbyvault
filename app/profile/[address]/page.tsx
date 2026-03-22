"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

// ── VIDEO THUMBNAIL ────────────────────────────────────────────────────────────
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

// ── VIDEO PLAYER OVERLAY ────────────────────────────────────────────────────────
function VideoPlayerOverlay({ asset, onClose }: { asset: any; onClose: () => void }) {
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
    const onTime=()=>setProgress(v.currentTime),onLoad=()=>setDuration(v.duration),onPlay=()=>setPlaying(true),onPause=()=>setPlaying(false);
    v.addEventListener("timeupdate",onTime); v.addEventListener("loadedmetadata",onLoad); v.addEventListener("play",onPlay); v.addEventListener("pause",onPause);
    return ()=>{ v.pause(); v.removeEventListener("timeupdate",onTime); v.removeEventListener("loadedmetadata",onLoad); v.removeEventListener("play",onPlay); v.removeEventListener("pause",onPause); };
  }, []);
  const togglePlay=(e:React.MouseEvent)=>{e.stopPropagation();const v=videoRef.current;if(!v)return;v.paused?v.play():v.pause();};
  const seek=(e:React.ChangeEvent<HTMLInputElement>)=>{e.stopPropagation();const v=videoRef.current;if(!v)return;const val=parseFloat(e.target.value);v.currentTime=val;setProgress(val);};
  const changeVolume=(e:React.ChangeEvent<HTMLInputElement>)=>{e.stopPropagation();const v=videoRef.current;const val=parseFloat(e.target.value);setVolume(val);if(v){v.volume=val;v.muted=val===0;}setMuted(val===0);};
  const toggleMute=(e:React.MouseEvent)=>{e.stopPropagation();const v=videoRef.current;if(!v)return;v.muted=!muted;setMuted(!muted);};
  const handleFullscreen=(e:React.MouseEvent)=>{e.stopPropagation();const el=wrapperRef.current;if(el?.requestFullscreen)el.requestFullscreen();};
  const handleDownload=(e:React.MouseEvent)=>{e.stopPropagation();const a=document.createElement("a");a.href=asset.shelbyUrl;a.download=asset.name;a.click();};
  const handleCopyLink=(e:React.MouseEvent)=>{e.stopPropagation();navigator.clipboard.writeText(asset.shelbyUrl);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const fmt=(s:number)=>{if(!s||isNaN(s))return"0:00";return;};
  const handleMouseMove=()=>{setShowControls(true);if(hideTimer.current)clearTimeout(hideTimer.current);hideTimer.current=setTimeout(()=>{if(playing)setShowControls(false);},2800);};
  const pct=duration?(progress/duration)*100:0;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.97)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <button onClick={onClose} style={{position:"fixed",top:"18px",right:"18px",zIndex:700,width:"40px",height:"40px",borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:"17px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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
                <button onClick={togglePlay} style={{background:"none",border:"none",color:"white",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}>{playing?<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}</button>
                <button onClick={toggleMute} style={{background:"none",border:"none",color:"white",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}>{muted?<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}</button>
                <div style={{position:"relative",height:"18px",width:"72px",display:"flex",alignItems:"center"}}><div style={{position:"absolute",left:0,right:0,height:"3px",background:"rgba(255,255,255,0.15)",borderRadius:"999px",overflow:"hidden"}}><div style={{height:"100%",width:((muted?0:volume)*100)+"%",background:"rgba(168,85,247,0.9)",borderRadius:"999px"}}/></div><input type="range" min={0} max={1} step={0.02} value={muted?0:volume} onChange={changeVolume} style={{position:"absolute",left:0,right:0,width:"100%",height:"18px",opacity:0,cursor:"pointer",margin:0}}/></div>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.55)",fontFamily:"monospace",whiteSpace:"nowrap",flexShrink:0}}>{fmt(progress)} / {fmt(duration)}</span>
              </div>
              <button onClick={handleFullscreen} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",padding:"0",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>
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

// ── AUDIO PLAYER OVERLAY ────────────────────────────────────────────────────────
function AudioPlayerOverlay({ asset, onClose }: { asset: any; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(1),[muted,setMuted]=useState(false),[copied,setCopied]=useState(false),[ready,setReady]=useState(false);
  useEffect(()=>{
    const a=audioRef.current; if(!a) return;
    a.volume=volume; a.loop=true;
    const onCanPlay=()=>{setReady(true);a.play().catch(()=>{});},onTime=()=>setProgress(a.currentTime),onLoad=()=>setDuration(a.duration),onPlay=()=>setPlaying(true),onPause=()=>setPlaying(false);
    a.addEventListener("canplay",onCanPlay); a.addEventListener("timeupdate",onTime); a.addEventListener("loadedmetadata",onLoad); a.addEventListener("play",onPlay); a.addEventListener("pause",onPause);
    a.load();
    return()=>{a.pause();a.removeEventListener("canplay",onCanPlay);a.removeEventListener("timeupdate",onTime);a.removeEventListener("loadedmetadata",onLoad);a.removeEventListener("play",onPlay);a.removeEventListener("pause",onPause);};
  },[]);
  const togglePlay=()=>{const a=audioRef.current;if(!a)return;a.paused?a.play():a.pause();};
  const seek=(e:React.ChangeEvent<HTMLInputElement>)=>{const a=audioRef.current;if(!a)return;const v=parseFloat(e.target.value);a.currentTime=v;setProgress(v);};
  const changeVolume=(e:React.ChangeEvent<HTMLInputElement>)=>{const a=audioRef.current;const v=parseFloat(e.target.value);setVolume(v);if(a){a.volume=v;a.muted=v===0;}setMuted(v===0);};
  const toggleMute=()=>{const a=audioRef.current;if(!a)return;a.muted=!muted;setMuted(!muted);};
  const handleDownload=()=>{const el=document.createElement("a");el.href=asset.shelbyUrl;el.download=asset.name;el.click();};
  const handleCopy=()=>{navigator.clipboard.writeText(asset.shelbyUrl);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const fmt=(s:number)=>{if(!s||isNaN(s))return"0:00";return;};
  const pct=duration?(progress/duration)*100:0;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(24px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <audio ref={audioRef} src={asset.shelbyUrl} preload="auto" loop/>
      <div onClick={e=>e.stopPropagation()} style={{width:"90vw",maxWidth:"440px",background:"linear-gradient(160deg,#0d0820,#120a28)",borderRadius:"20px",overflow:"hidden",boxShadow:"0 0 80px rgba(108,56,255,0.35)",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px 0"}}>
          <span style={{fontSize:"10px",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(168,85,247,0.6)",fontFamily:"'Outfit',sans-serif"}}>Now Playing</span>
          <button onClick={onClose} style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 24px 20px",gap:"20px"}}>
          <div style={{width:"160px",height:"160px",borderRadius:"16px",background:"linear-gradient(135deg,rgba(108,56,255,0.3),rgba(168,85,247,0.2),rgba(236,72,153,0.15))",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 20px 60px rgba(108,56,255,0.25)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(108,56,255,0.15),transparent 70%)"}}/>
            {!ready&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"28px",height:"28px",border:"2px solid rgba(108,56,255,0.3)",borderTopColor:"#a855f7",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>}
            {ready&&<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.7)" strokeWidth="1.2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
            {playing&&ready&&(<div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"3px",alignItems:"flex-end"}}>{[1,2,3,4].map(i=>(<div key={i} style={{width:"3px",background:"rgba(168,85,247,0.8)",borderRadius:"2px",height:"8px",animation:`audioBar${i} 0.8s ease-in-out infinite`}}/>))}</div>)}
          </div>
          <div style={{textAlign:"center",width:"100%"}}><p style={{fontSize:"15px",fontWeight:700,color:"rgba(255,255,255,0.9)",margin:"0 0 4px",fontFamily:"'Outfit',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{asset.name.replace(/\.[^/.]+$/, "")}</p><p style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",margin:0,fontFamily:"'Outfit',sans-serif"}}>ShelbyVault</p></div>
          <div style={{width:"100%"}}>
            <div style={{position:"relative",height:"4px",background:"rgba(255,255,255,0.08)",borderRadius:"999px",marginBottom:"8px"}}><div style={{position:"absolute",left:0,top:0,height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6c38ff,#a855f7)",borderRadius:"999px",transition:"width 0.1s"}}/><input type="range" min={0} max={duration||100} step={0.1} value={progress} onChange={seek} style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer",height:"100%"}}/></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(progress)}</span><span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(duration)}</span></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
            <button onClick={toggleMute} style={{background:"none",border:"none",color:muted?"rgba(236,72,153,0.7)":"rgba(255,255,255,0.35)",cursor:"pointer",padding:"4px"}}>{muted?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}</button>
            <button onClick={togglePlay} style={{width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg,#6c38ff,#a855f7)",border:"none",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 28px rgba(108,56,255,0.5)",transition:"transform 0.18s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.06)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
              {playing?<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            </button>
            <div style={{position:"relative",height:"18px",width:"64px",display:"flex",alignItems:"center"}}><div style={{position:"absolute",left:0,right:0,height:"3px",background:"rgba(255,255,255,0.12)",borderRadius:"999px",overflow:"hidden"}}><div style={{height:"100%",width:((muted?0:volume)*100)+"%",background:"rgba(168,85,247,0.9)",borderRadius:"999px"}}/></div><input type="range" min={0} max={1} step={0.02} value={muted?0:volume} onChange={changeVolume} style={{position:"absolute",left:0,right:0,width:"100%",height:"18px",opacity:0,cursor:"pointer",margin:0}}/></div>
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


interface BuyRecord { buyer:string; txHash:string; price:number; currency:string; boughtAt:string; assetId:string; assetName:string; assetImage:string; assetFileType:string; }
interface Asset { id:string; name:string; owner:string; price:number; supply:number; sold:number; fileType:string; shelbyUrl:string; listed:boolean; uploadedAt:string; likes:string[]; description?:string; listedAt?:string; buyHistory?:BuyRecord[]; uploader?:string; }
interface ProfileData { address:string; name:string; bio:string; avatar:string; banner:string; joinedAt:string|null; owned:Asset[]; listed:Asset[]; bought:BuyRecord[]; created:Asset[]; stats:{ totalOwned:number; totalListed:number; totalBought:number; totalCreated:number; totalLikes:number; }; }
type Tab = "owned"|"listed"|"bought"|"created"|"activity"|"archived";
type SettingsTab = "profile"|"social"|"wallets";

export default function ProfilePage() {
  const { account, connected, signAndSubmitTransaction, network } = useWallet();
  const params = useParams();
  const router = useRouter();
  const address = (params?.address as string) ?? "";

  const [profile,      setProfile]      = useState<ProfileData|null>(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<Tab>("owned");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState<SettingsTab>("profile");
  const [editName,     setEditName]     = useState("");
  const [editBio,      setEditBio]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset|null>(null);
  const [mediaAsset,   setMediaAsset]   = useState<Asset|null>(null);
  const [listModal,    setListModal]    = useState<Asset|null>(null);
  const [listPrice,    setListPrice]    = useState("");
  const [listSupply,   setListSupply]   = useState("");
  const [listing,      setListing]      = useState(false);
  const [searchQ,      setSearchQ]      = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"listed"|"unlisted">("all");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [archived,     setArchived]     = useState<string[]>([]);
  const [avatarImg,    setAvatarImg]    = useState("");

  // ── NEW: User Search states ──
  const [userSearch,   setUserSearch]   = useState("");
  const [searching,    setSearching]    = useState(false);
  const [searchErr,    setSearchErr]    = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);

  const networkName = network?.name?.toLowerCase() ?? "";
  const isShelby    = networkName.includes("shelby") || (!!networkName && !["testnet","mainnet","devnet","localnet"].includes(networkName));
  const currency    = isShelby ? "ShelbyUSD" : "$APT";
  const isMe        = connected && account?.address.toString().toLowerCase() === address.toLowerCase();
  const short       = (a:string) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "—";
  const fmtDate     = (d:string) => new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const fmtTime     = (d:string) => new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

  useEffect(()=>{ if(address) fetchProfile(); },[address]);

  useEffect(()=>{
    try {
      const saved = localStorage.getItem(`shelbyvault_archived_${address}`);
      if(saved) setArchived(JSON.parse(saved));
    } catch{}
  },[address]);

  const toggleArchive = (assetId:string) => {
    setArchived(prev=>{
      const next = prev.includes(assetId) ? prev.filter(id=>id!==assetId) : [...prev,assetId];
      try{ localStorage.setItem(`shelbyvault_archived_${address}`, JSON.stringify(next)); }catch{}
      return next;
    });
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/profile?address=${address}`);
      const d = await r.json();
      setProfile(d);
      setEditName(d.name??"");
      setEditBio(d.bio??"");
      setAvatarImg(d.avatar??"");
    } catch{}
    setLoading(false);
  };

  // ── NEW: User Search handler ──
  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = userSearch.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(false);
    try {
      const r = await fetch(`/api/profile/search?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const d = await r.json();
        if (d.address) {
          router.push(`/profile/${d.address}`);
          setUserSearch("");
          setSearching(false);
          return;
        }
      }
      setSearchErr(true);
      setTimeout(() => setSearchErr(false), 2500);
    } catch {
      setSearchErr(true);
      setTimeout(() => setSearchErr(false), 2500);
    }
    setSearching(false);
  };

  const saveProfile = async () => {
    if(!isMe) return;
    setSaving(true);
    try {
      await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({address,name:editName,bio:editBio,avatar:avatarImg})});
      await fetchProfile();
      setSaved(true); setTimeout(()=>setSaved(false),2500);
      setShowSettings(false);
    } catch{}
    setSaving(false);
  };

  const handleImgUpload = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>setAvatarImg(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleList = async (asset:Asset) => {
    if(!listPrice||!listSupply||!account) return;
    setListing(true);
    try {
      const tx = await signAndSubmitTransaction({data:{function:"0x1::coin::transfer",typeArguments:["0x1::aptos_coin::AptosCoin"],functionArguments:[account.address.toString(),"1000"]}});
      await fetch("/api/marketplace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:asset.id,price:parseFloat(listPrice),supply:parseInt(listSupply),txHash:tx.hash})});
      setListModal(null); setListPrice(""); setListSupply(""); await fetchProfile();
    } catch(e:any){alert("Listing failed: "+(e?.message||"rejected"));}
    setListing(false);
  };

  const handleDelist = async (asset:Asset) => {
    if(!account) return;
    try {
      const tx = await signAndSubmitTransaction({data:{function:"0x1::coin::transfer",typeArguments:["0x1::aptos_coin::AptosCoin"],functionArguments:[account.address.toString(),"1000"]}});
      await fetch("/api/marketplace",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:asset.id,owner:account.address.toString(),txHash:tx.hash})});
      await fetchProfile();
    } catch(e:any){alert("Delist failed: "+(e?.message||"rejected"));}
  };

  const displayName  = profile?.name || short(address);
  const avatarLetter = (profile?.name||address||"?")[0].toUpperCase();
  const avatarHue    = parseInt(address.slice(2,4)||"60",16)%360;
  const currentAvatar = avatarImg || profile?.avatar || "";
  const totalVolume  = (profile?.bought??[]).reduce((s,b)=>s+b.price,0);

  const filteredOwned = (profile?.owned??[]).filter(a=>{
    if(archived.includes(a.id)) return false;
    if(searchQ && !a.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if(statusFilter==="listed" && !a.listed) return false;
    if(statusFilter==="unlisted" && a.listed) return false;
    if(typeFilter==="video" && !a.fileType?.startsWith("video/")) return false;
    if(typeFilter==="audio" && !a.fileType?.startsWith("audio/")) return false;
    if(typeFilter==="image" && !a.fileType?.startsWith("image/")) return false;
    return true;
  });

  const archivedItems = (profile?.owned??[]).filter(a=>archived.includes(a.id));

  const tabDefs:{key:Tab;label:string;count:number}[] = [
    {key:"owned",    label:"Items",     count:(profile?.owned??[]).filter(a=>!archived.includes(a.id)).length},
    {key:"listed",   label:"Listings",  count:profile?.stats.totalListed??0},
    {key:"bought",   label:"Purchases", count:profile?.stats.totalBought??0},
    {key:"created",  label:"Created",   count:profile?.stats.totalCreated??0},
    {key:"activity", label:"Activity",  count:0},
    {key:"archived", label:"Archived",  count:archived.length},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes goldFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes orb1     { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(40px,-30px) scale(1.1)} 70%{transform:translate(-20px,20px) scale(0.95)} }
        @keyframes orb2     { 0%,100%{transform:translate(0,0)} 35%{transform:translate(-30px,25px)} 65%{transform:translate(25px,-15px)} }
        @keyframes orb3     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,-30px)} }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,168,83,0.4),0 0 16px rgba(212,168,83,0.2)} 50%{box-shadow:0 0 0 4px rgba(212,168,83,0.1),0 0 28px rgba(212,168,83,0.35)} }
        @keyframes nameGlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes cardIn   { from{opacity:0;transform:translateY(12px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes goldBorder{0%{background-position:0% 50%}100%{background-position:300% 50%}}
        @keyframes shineSwipe{0%{left:-100%;opacity:0}15%{opacity:1}50%{left:130%;opacity:0.6}100%{left:130%;opacity:0}}
        @keyframes shimmerPulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes searchShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        .search-shake { animation: searchShake 0.35s ease; }
        .pf-premium-card{
          position:relative;
          padding:2px;
          border-radius:20px;
          background:linear-gradient(135deg,rgba(212,168,83,0.6),rgba(255,215,120,0.3),rgba(180,130,50,0.5),rgba(255,230,140,0.4),rgba(212,168,83,0.6));
          background-size:300% 300%;
          animation:goldBorder 3s linear infinite;
          box-shadow:0 0 24px rgba(212,168,83,0.18),0 8px 40px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,215,120,0.12);
          max-width:420px;
          flex-shrink:0;
        }
        .pf-premium-card::before{
          content:"";
          position:absolute;
          inset:0;
          border-radius:20px;
          background:linear-gradient(135deg,rgba(212,168,83,0.4),rgba(255,215,120,0.15),rgba(212,168,83,0.35));
          background-size:300% 300%;
          animation:goldBorder 3s linear infinite;
          filter:blur(6px);
          z-index:-1;
        }
        .pf-premium-inner{
          position:relative;
          background:linear-gradient(145deg,#0e0b1e,#120d24,#0a0817);
          border-radius:18px;
          padding:16px 20px;
          display:flex;
          align-items:center;
          gap:16px;
          overflow:hidden;
        }
        .pf-premium-inner::after{
          content:"";
          position:absolute;
          top:0;
          left:-100%;
          width:60%;
          height:100%;
          background:linear-gradient(105deg,transparent 20%,rgba(255,215,120,0.07) 40%,rgba(255,230,160,0.12) 50%,rgba(255,215,120,0.07) 60%,transparent 80%);
          animation:shineSwipe 4s ease-in-out infinite;
          pointer-events:none;
        }

        @keyframes pf-elec{0%{background-position:0% 50%}100%{background-position:300% 50%}}
        .pf-type-btn{position:relative;padding:5px 14px;border-radius:10px;font-size:11px;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer;transition:color 0.2s,background 0.2s;display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.04);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.45);white-space:nowrap;}
        .pf-type-btn:hover{color:rgba(255,255,255,0.8);background:rgba(108,56,255,0.08);}
        .pf-type-btn.on{color:#fff;}
        .pf-type-btn.all-t.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#6c38ff,#a855f7,#ec4899,#a855f7,#6c38ff);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:pf-elec 1s linear infinite;}
        .pf-type-btn.vid-t.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#4f46e5,#818cf8,#c7d2fe,#818cf8,#4f46e5);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:pf-elec 1s linear infinite;}
        .pf-type-btn.mus-t.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#a855f7,#ec4899,#fda4af,#ec4899,#a855f7);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:pf-elec 1s linear infinite;}
        .pf-type-btn.img-t.on{border:2.5px solid transparent;background:#0c061c;background-image:linear-gradient(#0c061c,#0c061c),linear-gradient(90deg,#0891b2,#38bdf8,#bae6fd,#38bdf8,#0891b2);background-origin:border-box;background-clip:padding-box,border-box;background-size:auto,300% 100%;animation:pf-elec 1s linear infinite;}

        .pf-root { font-family: 'Outfit', sans-serif; background: #06050f; min-height: 100vh; color: #fff; }
        .pf-banner { position: relative; height: 50px; overflow: hidden; background: #0b0918; }
        .pf-banner-orb1 { position:absolute; top:-80px; left:-100px; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle, rgba(108,56,255,0.28) 0%, transparent 65%); filter:blur(40px); animation:orb1 14s ease-in-out infinite; }
        .pf-banner-orb2 { position:absolute; top:-40px; right:-80px; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle, rgba(212,100,180,0.22) 0%, transparent 65%); filter:blur(45px); animation:orb2 17s ease-in-out infinite; }
        .pf-banner-orb3 { position:absolute; bottom:-60px; left:40%; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle, rgba(80,120,255,0.18) 0%, transparent 65%); filter:blur(38px); animation:orb3 20s ease-in-out infinite; }
        .pf-banner-grid { position:absolute; inset:0; opacity:0.04; background-image: linear-gradient(rgba(180,160,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(180,160,255,1) 1px, transparent 1px); background-size: 52px 52px; }
        .pf-banner-streak1 { position:absolute; top:0; left:22%; width:1px; height:100%; background:linear-gradient(to bottom, transparent 0%, rgba(180,130,255,0.2) 40%, rgba(212,168,83,0.15) 60%, transparent 100%); transform:rotate(18deg) scaleY(2); transform-origin:center; }
        .pf-banner-streak2 { position:absolute; top:0; right:28%; width:1px; height:100%; background:linear-gradient(to bottom, transparent 0%, rgba(212,100,180,0.14) 50%, transparent 100%); transform:rotate(18deg) scaleY(2); transform-origin:center; }
        .pf-banner-fade { position:absolute; inset:0; background:linear-gradient(to bottom, transparent 20%, #06050f 100%); }
        .pf-area { padding: 0 64px; position:relative; z-index:10; margin-top:-28px; }
        .pf-avatar-ring { width: 108px; height: 108px; border-radius: 50%; border: 3px solid #06050f; overflow: hidden; background: hsl(var(--av-hue, 260), 55%, 32%); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; font-family: 'Outfit', sans-serif; box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.6); flex-shrink: 0; position: relative; cursor: default; }
        .pf-avatar-edit { position:absolute; bottom:2px; right:2px; width:28px; height:28px; border-radius:50%; background:rgba(108,56,255,0.92); border:2px solid #06050f; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background 0.18s; }
        .pf-avatar-edit:hover { background: rgba(140,90,255,1); }
        .pf-name { font-family: 'Playfair Display', serif; font-size: 2.1rem; font-weight: 800; background: linear-gradient(120deg, #fff 0%, #f0e4c8 20%, #d4a853 42%, #b8892a 52%, #ddb96a 68%, #fff 88%); background-size: 250% 250%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: nameGlow 6s ease infinite; letter-spacing: -0.02em; line-height: 1.1; }
        .pf-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.45); white-space: nowrap; }
        .pf-stats { display:flex; gap:10px; flex-wrap:wrap; padding: 20px 0 0; }
        .pf-stat { flex: 1; min-width: 100px; background: rgba(255,255,255,0.026); border: 1px solid rgba(255,255,255,0.055); border-radius: 14px; padding: 16px 20px; text-align: center; transition: border-color 0.2s, transform 0.2s; }
        .pf-stat:hover { border-color: rgba(108,56,255,0.3); transform: translateY(-2px); }
        .pf-stat-val { font-family:'Outfit',sans-serif; font-size:1.5rem; font-weight:800; color:#fff; line-height:1; margin-bottom:5px; letter-spacing:-0.02em; }
        .pf-stat-lbl { font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.22); }
        .pf-divider { height:1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent); margin: 0 0 0; }
        .pf-tabs { display:flex; align-items:center; border-bottom:1px solid rgba(255,255,255,0.055); padding: 0 64px; }
        .pf-tab { padding: 14px 20px; font-size:13px; font-weight:600; font-family:'Outfit',sans-serif; letter-spacing:0.01em; color:rgba(255,255,255,0.32); border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; transition:all 0.18s; white-space:nowrap; display:flex; align-items:center; gap:7px; }
        .pf-tab.on { color:rgba(255,255,255,0.92); border-bottom-color:rgba(140,90,255,0.85); }
        .pf-tab:hover:not(.on) { color:rgba(255,255,255,0.58); }
        .pf-tab-count { padding: 1px 7px; border-radius:999px; font-size:10px; font-weight:700; background: rgba(255,255,255,0.055); color:rgba(255,255,255,0.28); transition: all 0.18s; }
        .pf-tab.on .pf-tab-count { background:rgba(108,56,255,0.22); color:rgba(180,150,255,0.9); }
        .pf-content { padding: 32px 64px 80px; }
        .pf-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px; }
        .pf-card { background: rgba(255,255,255,0.028); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow:hidden; cursor:pointer; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); }
        .pf-card:hover { border-color: rgba(108,56,255,0.45); transform: translateY(-5px); box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(108,56,255,0.12), 0 0 35px rgba(108,56,255,0.06); }
        .pf-card-img { position:relative; aspect-ratio:1; overflow:hidden; background:rgba(255,255,255,0.025); }
        .pf-card-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s cubic-bezier(0.4,0,0.2,1); }
        .pf-card:hover .pf-card-img img { transform:scale(1.07); }
        .pf-card-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(6,5,15,0.82), transparent 55%); opacity:0; transition:opacity 0.22s; display:flex; align-items:flex-end; justify-content:center; padding-bottom:12px; }
        .pf-card:hover .pf-card-overlay { opacity:1; }
        .pf-view-pill { padding:5px 18px; border-radius:999px; background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:11px; font-weight:600; letter-spacing:0.04em; font-family:'Outfit',sans-serif; }
        .pf-status-pill { position:absolute; top:10px; left:10px; padding:3px 10px; border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.04em; backdrop-filter:blur(8px); }
        .pf-card-body { padding:12px 14px; }
        .pf-card-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.82); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:5px; letter-spacing:0.01em; }
        .pf-card-meta { display:flex; justify-content:space-between; align-items:center; }
        .pf-card-price { font-family:'Outfit',sans-serif; font-size:12px; font-weight:700; color:rgba(160,130,255,0.9); }
        .pf-card-likes { font-size:10px; color:rgba(255,255,255,0.2); }
        .pf-card-action { width:100%; padding:7px; border-radius:9px; font-size:10px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; margin-top:8px; transition:all 0.15s; border:1px solid; }
        .pf-arow { display:flex; align-items:center; gap:14px; padding:14px 18px; border-radius:14px; background:rgba(255,255,255,0.022); border:1px solid rgba(255,255,255,0.055); transition:border-color 0.18s; }
        .pf-arow:hover { border-color:rgba(108,56,255,0.22); }
        .pf-btn-primary { background:linear-gradient(135deg,#6c38ff,#a855f7,#ec4899); color:#fff; font-weight:700; font-family:'Outfit',sans-serif; border:none; cursor:pointer; border-radius:10px; transition:opacity 0.15s,transform 0.15s; }
        .pf-btn-primary:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        .pf-btn-primary:disabled { opacity:0.3; cursor:not-allowed; transform:none; }
        .pf-btn-ghost { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); font-weight:500; font-family:'Outfit',sans-serif; cursor:pointer; border-radius:10px; transition:all 0.15s; }
        .pf-btn-ghost:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.75); }
        .pf-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:10px; padding:11px 14px; color:rgba(255,255,255,0.9); font-size:13px; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.2s; }
        .pf-input:focus { border-color:rgba(108,56,255,0.55); background:rgba(108,56,255,0.04); }
        .pf-input::placeholder { color:rgba(255,255,255,0.18); }
        .pf-chip { padding:5px 14px; border-radius:999px; font-size:11px; font-weight:600; font-family:'Outfit',sans-serif; border:1px solid rgba(255,255,255,0.09); background:transparent; color:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.15s; }
        .pf-chip.on { background:rgba(108,56,255,0.15); border-color:rgba(108,56,255,0.42); color:rgba(180,150,255,0.95); }
        .pf-chip:hover:not(.on) { color:rgba(255,255,255,0.6); }
        .pf-snav { display:flex; align-items:center; gap:10px; padding:9px 13px; border-radius:9px; font-size:13px; font-weight:500; color:rgba(255,255,255,0.38); cursor:pointer; border:1px solid transparent; transition:all 0.15s; font-family:'Outfit',sans-serif; }
        .pf-snav.on { background:rgba(108,56,255,0.12); border-color:rgba(108,56,255,0.25); color:rgba(180,150,255,0.92); }
        .pf-snav:hover:not(.on) { background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.62); }
        .pf-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.82); z-index:500; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(16px); animation:fadeIn 0.18s ease; }
        .pf-modal { background:#0e0c1f; border:1px solid rgba(255,255,255,0.07); border-radius:22px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,56,255,0.06); }
        .pf-search-wrap { position:relative; }
        .pf-search-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .pf-search { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:10px; padding:8px 12px 8px 36px; color:rgba(255,255,255,0.85); font-size:12px; font-family:'Outfit',sans-serif; outline:none; width:190px; transition:all 0.2s; }
        .pf-search:focus { border-color:rgba(108,56,255,0.45); background:rgba(108,56,255,0.04); }
        .pf-search::placeholder { color:rgba(255,255,255,0.2); }

        /* ── USER SEARCH BOX styles ── */
        .us-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-right: none;
          border-radius: 10px 0 0 10px;
          padding: 9px 12px 9px 34px;
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          font-family: 'Outfit', sans-serif;
          outline: none;
          width: 210px;
          transition: all 0.2s;
        }
        .us-input:focus {
          border-color: rgba(108,56,255,0.5);
          background: rgba(108,56,255,0.04);
        }
        .us-input::placeholder { color: rgba(255,255,255,0.2); }
        .us-input.err {
          border-color: rgba(239,68,68,0.35) !important;
          background: rgba(239,68,68,0.07) !important;
        }
        .us-btn {
          padding: 9px 13px;
          border-radius: 0 10px 10px 0;
          background: rgba(108,56,255,0.18);
          border: 1px solid rgba(108,56,255,0.35);
          color: rgba(180,150,255,0.9);
          font-size: 11px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
        }
        .us-btn:hover:not(:disabled) { background: rgba(108,56,255,0.3); }
        .us-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .spin { animation:spin 0.8s linear infinite; }
        .card-anim { animation:cardIn 0.4s ease both; }
        .lbl { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.2); display:block; margin-bottom:6px; }
      `}</style>

      <main className="pf-root">
        <Navbar/>

        {loading ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"70vh"}}>
            <div className="spin" style={{width:"32px",height:"32px",border:"2px solid rgba(108,56,255,0.2)",borderTopColor:"#6c38ff",borderRadius:"50%"}}/>
          </div>
        ) : !profile ? (
          <div style={{textAlign:"center",padding:"120px 20px",color:"rgba(255,255,255,0.2)",fontSize:"15px",fontFamily:"'Outfit',sans-serif"}}>Profile not found</div>
        ) : (
          <>
            <div className="pf-banner">
              <div className="pf-banner-orb1"/><div className="pf-banner-orb2"/><div className="pf-banner-orb3"/>
              <div className="pf-banner-grid"/><div className="pf-banner-streak1"/><div className="pf-banner-streak2"/>
              <div className="pf-banner-fade"/>
            </div>

            <div className="pf-area">
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"20px",flexWrap:"wrap",paddingBottom:"26px"}}>
                {/* ── PROFILE CARD ── */}
                <div style={{position:"relative",padding:"2px",borderRadius:"20px",background:"linear-gradient(135deg,#d4a853,#ffe88a,#b8892a,#ffe08c,#d4a853)",backgroundSize:"300% 300%",animation:"goldBorder 3s linear infinite",boxShadow:"0 0 32px rgba(212,168,83,0.25),0 8px 40px rgba(0,0,0,0.6)",maxWidth:"420px",flexShrink:0}}>
                <div style={{position:"relative",background:"linear-gradient(145deg,#0e0b1e,#120d24,#0a0817)",borderRadius:"18px",padding:"16px 20px",display:"flex",alignItems:"center",gap:"16px",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:"-100%",width:"55%",height:"100%",background:"linear-gradient(105deg,transparent 20%,rgba(255,215,120,0.06) 40%,rgba(255,230,160,0.13) 50%,rgba(255,215,120,0.06) 60%,transparent 80%)",animation:"shineSwipe 4s ease-in-out infinite",pointerEvents:"none"}}/>
                  <div style={{position:"relative",flexShrink:0}}>
                    <div className="pf-avatar-ring" style={{width:"72px",height:"72px",fontSize:"26px","--av-hue":`${avatarHue}`} as any}>
                      {currentAvatar ? <img src={currentAvatar} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : avatarLetter}
                    </div>
                    {isMe && (
                      <div className="pf-avatar-edit" style={{width:"22px",height:"22px"}} onClick={()=>avatarRef.current?.click()}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </div>
                    )}
                    <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImgUpload}/>
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
                      <span className="pf-name" style={{fontSize:"1.35rem"}}>{displayName}</span>
                      {profile.name && (<span className="pf-badge"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>)}
                    </div>
                    {profile.bio && (<p style={{fontSize:"11px",color:"rgba(255,255,255,0.32)",lineHeight:1.5,marginBottom:"7px",fontWeight:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"240px"}}>{profile.bio}</p>)}
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <span style={{padding:"2px 8px",borderRadius:"5px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",fontSize:"10px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:"0.03em"}}>{short(address)}</span>
                      {profile.joinedAt && (<span style={{fontSize:"10px",color:"rgba(255,255,255,0.18)",fontWeight:400}}>Joined {fmtDate(profile.joinedAt)}</span>)}
                    </div>
                  </div>
                </div>
                </div>

                {/* ── RIGHT SIDE: USER SEARCH + SHARE + SETTINGS ── */}
                <div style={{display:"flex",gap:"9px",paddingTop:"8px",alignItems:"center",flexWrap:"wrap"}}>

                  {/* ── USER SEARCH BOX ── */}
                  <form onSubmit={handleUserSearch} style={{display:"flex",alignItems:"center"}}>
                    <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                      {/* Search icon */}
                      <svg style={{position:"absolute",left:"10px",pointerEvents:"none",zIndex:1,flexShrink:0}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={searchErr?"rgba(248,113,113,0.7)":"rgba(255,255,255,0.25)"} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input
                        className={`us-input${searchErr?" err":""}`}
                        value={userSearch}
                        onChange={e=>{ setUserSearch(e.target.value); setSearchErr(false); }}
                        placeholder="Search user or 0x address..."
                      />
                      <button
                        type="submit"
                        className="us-btn"
                        disabled={searching || !userSearch.trim()}
                      >
                        {searching
                          ? <span className="spin" style={{width:"11px",height:"11px",border:"1.5px solid rgba(180,150,255,0.3)",borderTopColor:"rgba(180,150,255,0.9)",borderRadius:"50%",display:"inline-block"}}/>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        }
                      </button>
                    </div>
                    {searchErr && (
                      <span style={{fontSize:"10px",color:"rgba(248,113,113,0.8)",fontFamily:"'Outfit',sans-serif",marginLeft:"8px",fontWeight:600,whiteSpace:"nowrap"}}>
                        User not found
                      </span>
                    )}
                  </form>

                  {/* ── SHARE PROFILE ── */}
                  <button className="pf-btn-ghost" onClick={()=>{navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"9px 18px",fontSize:"12px",display:"flex",alignItems:"center",gap:"6px",borderRadius:"10px"}}>
                    {copied ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style={{color:"rgba(52,211,153,0.8)"}}>Copied!</span></> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Share Profile</>}
                  </button>

                  {/* ── SETTINGS (only for own profile) ── */}
                  {isMe && (
                    <button onClick={()=>setShowSettings(true)} style={{padding:"9px 18px",borderRadius:"10px",background:"rgba(108,56,255,0.12)",border:"1px solid rgba(108,56,255,0.3)",color:"rgba(180,150,255,0.9)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:"6px",transition:"background 0.15s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(108,56,255,0.22)"} onMouseOut={e=>e.currentTarget.style.background="rgba(108,56,255,0.12)"}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      Settings
                    </button>
                  )}
                </div>
              </div>

              <div className="pf-stats">
                {[
                  {label:"Items Owned",value:profile.stats.totalOwned},
                  {label:"Listed",value:profile.stats.totalListed},
                  {label:"Purchased",value:profile.stats.totalBought},
                  {label:"Created",value:profile.stats.totalCreated},
                  {label:"Total Likes",value:profile.stats.totalLikes},
                  {label:"Vol. Spent",value:`${totalVolume.toFixed(2)} APT`},
                ].map((s,i)=>(
                  <div key={i} className="pf-stat"><div className="pf-stat-val">{s.value}</div><div className="pf-stat-lbl">{s.label}</div></div>
                ))}
              </div>
            </div>

            <div style={{marginTop:"28px"}}>
              <div className="pf-divider" style={{margin:"0 64px"}}/>
              <div className="pf-tabs" style={{justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
                <div style={{display:"flex"}}>
                  {tabDefs.map(t=>(
                    <button key={t.key} className={`pf-tab${tab===t.key?" on":""}`} onClick={()=>setTab(t.key)}>
                      {t.label}
                      {t.count>0 && <span className="pf-tab-count">{t.count}</span>}
                    </button>
                  ))}
                </div>

                {tab==="owned" && (
                  <div style={{display:"flex",gap:"8px",alignItems:"center",padding:"8px 0",flexWrap:"wrap"}}>
                    <div className="pf-search-wrap">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input className="pf-search" placeholder="Search items..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
                    </div>
                    {(["all","listed","unlisted"] as const).map(f=>(
                      <button key={f} className={`pf-chip${statusFilter===f?" on":""}`} onClick={()=>setStatusFilter(f)}>
                        {f.charAt(0).toUpperCase()+f.slice(1)}
                      </button>
                    ))}
                    <div style={{width:"1px",height:"18px",background:"rgba(255,255,255,0.08)",margin:"0 2px"}}/>
                    <button className={"pf-type-btn all-t"+(typeFilter==="all"?" on":"")} onClick={()=>setTypeFilter("all")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>All</button>
                    <button className={"pf-type-btn vid-t"+(typeFilter==="video"?" on":"")} onClick={()=>setTypeFilter("video")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>Videos</button>
                    <button className={"pf-type-btn mus-t"+(typeFilter==="audio"?" on":"")} onClick={()=>setTypeFilter("audio")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Music</button>
                    <button className={"pf-type-btn img-t"+(typeFilter==="image"?" on":"")} onClick={()=>setTypeFilter("image")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Photos</button>
                  </div>
                )}
              </div>
            </div>

            <div className="pf-content">
              {tab==="owned" && (
                filteredOwned.length===0
                  ? <PfEmpty msg={searchQ||statusFilter!=="all"||typeFilter!=="all"?"No items match your filter":"No items owned yet"}/>
                  : <div className="pf-grid">{filteredOwned.map((a,i)=><PfCard key={a.id} asset={a} i={i} currency={currency} isMe={!!isMe} onClick={()=>{ if(a.fileType?.startsWith("video/")||a.fileType?.startsWith("audio/")) setMediaAsset(a); else setPreviewAsset(a); }} onList={()=>{setListModal(a);setListPrice("");setListSupply("");}} onDelist={()=>handleDelist(a)} isArchived={archived.includes(a.id)} onArchive={()=>toggleArchive(a.id)}/>)}</div>
              )}
              {tab==="listed" && (
                profile.listed.length===0
                  ? <PfEmpty msg="No active listings"/>
                  : <div className="pf-grid">{profile.listed.map((a,i)=><PfCard key={a.id} asset={a} i={i} currency={currency} isMe={!!isMe} onClick={()=>{ if(a.fileType?.startsWith("video/")||a.fileType?.startsWith("audio/")) setMediaAsset(a); else setPreviewAsset(a); }} onList={()=>{}} onDelist={()=>handleDelist(a)} forceListed/>)}</div>
              )}
              {tab==="bought" && (
                profile.bought.length===0
                  ? <PfEmpty msg="No purchases yet — explore the Marketplace!"/>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:"10px"}}>
                      {profile.bought.map((b,i)=>(
                        <div key={i} className="pf-arow card-anim" style={{animationDelay:`${i*0.035}s`}}>
                          <div style={{width:"52px",height:"52px",borderRadius:"12px",overflow:"hidden",flexShrink:0,background:"rgba(108,56,255,0.1)",border:"1px solid rgba(255,255,255,0.07)"}}>
                            {b.assetFileType?.startsWith("image/") ? <img src={b.assetImage} alt={b.assetName} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>🎵</div>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.82)",margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Outfit',sans-serif"}}>{b.assetName}</p>
                            <p style={{fontSize:"11px",color:"rgba(255,255,255,0.26)",margin:0,fontFamily:"'Outfit',sans-serif"}}>{fmtTime(b.boughtAt)}</p>
                            {b.txHash && <p style={{fontSize:"10px",color:"rgba(255,255,255,0.14)",margin:"3px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Tx: {b.txHash.slice(0,24)}...</p>}
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <p style={{fontSize:"15px",fontWeight:800,color:"rgba(160,130,255,0.9)",margin:"0 0 5px",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.01em"}}>{b.price} {b.currency}</p>
                            <span style={{fontSize:"9px",fontWeight:700,color:"rgba(52,211,153,0.82)",letterSpacing:"0.08em",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:"999px",padding:"2px 9px"}}>PURCHASED</span>
                          </div>
                        </div>
                      ))}
                    </div>
              )}
              {tab==="created" && (
                profile.created.length===0
                  ? <PfEmpty msg="No assets created yet"/>
                  : <div className="pf-grid">{profile.created.map((a,i)=><PfCard key={a.id} asset={a} i={i} currency={currency} isMe={!!isMe} onClick={()=>{ if(a.fileType?.startsWith("video/")||a.fileType?.startsWith("audio/")) setMediaAsset(a); else setPreviewAsset(a); }} onList={()=>{setListModal(a);setListPrice("");setListSupply("");}} onDelist={()=>handleDelist(a)}/>)}</div>
              )}
              {tab==="activity" && (
                <div style={{maxWidth:"660px"}}>
                  <p className="lbl" style={{marginBottom:"16px"}}>Recent Activity</p>
                  {profile.bought.length===0 && profile.listed.length===0
                    ? <PfEmpty msg="No activity yet"/>
                    : <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                        {[
                          ...profile.bought.map(b=>({type:"buy",name:b.assetName,price:b.price,currency:b.currency,time:b.boughtAt,img:b.assetImage,ft:b.assetFileType})),
                          ...profile.listed.map(a=>({type:"list",name:a.name,price:a.price,currency,time:a.listedAt??a.uploadedAt,img:a.shelbyUrl,ft:a.fileType})),
                        ].sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime()).map((ev,i)=>(
                          <div key={i} className="pf-arow card-anim" style={{animationDelay:`${i*0.035}s`}}>
                            <div style={{width:"40px",height:"40px",borderRadius:"10px",overflow:"hidden",flexShrink:0,background:"rgba(108,56,255,0.09)",border:"1px solid rgba(255,255,255,0.06)"}}>
                              {ev.ft?.startsWith("image/") ? <img src={ev.img} alt={ev.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>🎵</div>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:"12px",fontWeight:600,color:"rgba(255,255,255,0.72)",margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Outfit',sans-serif"}}>{ev.name}</p>
                              <p style={{fontSize:"10px",color:"rgba(255,255,255,0.22)",margin:0,fontFamily:"'Outfit',sans-serif"}}>{fmtTime(ev.time)}</p>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:"9px",flexShrink:0}}>
                              <span style={{fontSize:"10px",fontWeight:700,padding:"3px 10px",borderRadius:"999px",color:ev.type==="buy"?"rgba(52,211,153,0.85)":"rgba(244,114,182,0.85)",background:ev.type==="buy"?"rgba(52,211,153,0.08)":"rgba(244,114,182,0.08)",border:`1px solid ${ev.type==="buy"?"rgba(52,211,153,0.2)":"rgba(244,114,182,0.2)"}`}}>{ev.type==="buy"?"Bought":"Listed"}</span>
                              <span style={{fontSize:"13px",fontWeight:700,color:"rgba(160,130,255,0.9)",fontFamily:"'Outfit',sans-serif"}}>{ev.price} {ev.currency}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
              {tab==="archived" && (
                archivedItems.length===0
                  ? <div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>📦</div><p style={{color:"rgba(255,255,255,0.2)",fontSize:"14px",fontFamily:"'Outfit',sans-serif"}}>No archived items</p><p style={{color:"rgba(255,255,255,0.12)",fontSize:"12px",fontFamily:"'Outfit',sans-serif",marginTop:"4px"}}>Archive items from the Items tab to hide them here</p></div>
                  : <div className="pf-grid">{archivedItems.map((a,i)=><PfCard key={a.id} asset={a} i={i} currency={currency} isMe={!!isMe} onClick={()=>{ if(a.fileType?.startsWith("video/")||a.fileType?.startsWith("audio/")) setMediaAsset(a); else setPreviewAsset(a); }} onList={()=>{setListModal(a);setListPrice("");setListSupply("");}} onDelist={()=>handleDelist(a)} isArchived={true} onArchive={()=>toggleArchive(a.id)}/>)}</div>
              )}
            </div>

            {previewAsset && (
              <div className="pf-overlay" onClick={()=>setPreviewAsset(null)}>
                <div className="pf-modal" style={{maxWidth:"480px"}} onClick={e=>e.stopPropagation()}>
                  {previewAsset.fileType?.startsWith("image/") && <img src={previewAsset.shelbyUrl} alt={previewAsset.name} style={{width:"100%",maxHeight:"300px",objectFit:"cover",borderRadius:"22px 22px 0 0"}}/>}
                  <div style={{padding:"24px"}}>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",fontWeight:700,marginBottom:"5px",color:"rgba(255,255,255,0.92)"}}>{previewAsset.name}</h2>
                    {previewAsset.description && <p style={{fontSize:"12px",color:"rgba(255,255,255,0.32)",lineHeight:1.65,marginBottom:"14px",fontFamily:"'Outfit',sans-serif"}}>{previewAsset.description}</p>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                      {[{l:"Price",v:`${previewAsset.price} ${currency}`},{l:"Supply",v:`${previewAsset.supply??1}`},{l:"Sold",v:`${previewAsset.sold??0}`},{l:"Likes",v:`${previewAsset.likes?.length??0}`}].map((r,i)=>(
                        <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"10px 13px"}}>
                          <p style={{fontSize:"9px",color:"rgba(255,255,255,0.24)",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.09em",fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>{r.l}</p>
                          <p style={{fontSize:"14px",fontWeight:700,color:"rgba(255,255,255,0.88)",margin:0,fontFamily:"'Outfit',sans-serif"}}>{r.v}</p>
                        </div>
                      ))}
                    </div>
                    {previewAsset.buyHistory && previewAsset.buyHistory.length>0 && (
                      <div style={{marginBottom:"14px"}}>
                        <p className="lbl" style={{marginBottom:"8px"}}>Purchase History</p>
                        {previewAsset.buyHistory.map((bh,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",borderRadius:"9px",background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.055)",marginBottom:"5px"}}>
                            <div><a href={`/profile/${bh.buyer}`} style={{fontSize:"11px",color:"rgba(160,130,255,0.8)",fontFamily:"monospace",textDecoration:"none"}}>{short(bh.buyer)}</a><p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",margin:"2px 0 0",fontFamily:"'Outfit',sans-serif"}}>{fmtTime(bh.boughtAt)}</p></div>
                            <span style={{fontSize:"12px",fontWeight:700,color:"rgba(160,130,255,0.9)",fontFamily:"'Outfit',sans-serif"}}>{bh.price} {bh.currency}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex",gap:"8px"}}>
                      <button className="pf-btn-primary" onClick={()=>router.push("/marketplace")} style={{flex:1,padding:"11px",fontSize:"12px",borderRadius:"10px"}}>View in Marketplace</button>
                      <button className="pf-btn-ghost" onClick={()=>setPreviewAsset(null)} style={{padding:"11px 15px",fontSize:"12px",borderRadius:"10px"}}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {listModal && (
              <div className="pf-overlay" onClick={()=>setListModal(null)}>
                <div className="pf-modal" style={{maxWidth:"400px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{padding:"28px"}}>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:700,marginBottom:"14px",color:"rgba(255,255,255,0.9)"}}>List on Marketplace</h2>
                    {listModal.fileType?.startsWith("image/") && <img src={listModal.shelbyUrl} alt={listModal.name} style={{width:"100%",height:"130px",objectFit:"cover",borderRadius:"11px",marginBottom:"13px"}}/>}
                    <p style={{fontSize:"13px",fontWeight:500,color:"rgba(255,255,255,0.5)",marginBottom:"15px",fontFamily:"'Outfit',sans-serif"}}>{listModal.name}</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"15px"}}>
                      <div><label className="lbl">Price ({currency})</label><input className="pf-input" type="number" min="0" step="0.01" value={listPrice} onChange={e=>setListPrice(e.target.value)} placeholder="1.0"/></div>
                      <div><label className="lbl">Supply</label><input className="pf-input" type="number" min="1" step="1" value={listSupply} onChange={e=>setListSupply(e.target.value)} placeholder="1"/></div>
                    </div>
                    <div style={{display:"flex",gap:"8px"}}>
                      <button className="pf-btn-primary" onClick={()=>handleList(listModal)} disabled={listing||!listPrice||!listSupply} style={{flex:1,padding:"12px",fontSize:"13px",borderRadius:"10px"}}>
                        {listing ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}><span className="spin" style={{width:"12px",height:"12px",border:"1.5px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",display:"inline-block"}}/>Confirming...</span> : "List Now"}
                      </button>
                      <button className="pf-btn-ghost" onClick={()=>setListModal(null)} style={{padding:"12px 15px",fontSize:"12px",borderRadius:"10px"}}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showSettings && isMe && (
              <div className="pf-overlay" onClick={()=>setShowSettings(false)}>
                <div className="pf-modal" style={{maxWidth:"640px",display:"flex",flexDirection:"row",minHeight:"440px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{width:"185px",flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.055)",padding:"22px 14px",display:"flex",flexDirection:"column",gap:"4px"}}>
                    <p className="lbl" style={{marginBottom:"12px",paddingLeft:"13px"}}>Settings</p>
                    {([
                      {key:"profile",label:"Profile",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
                      {key:"social",label:"Social Links",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>},
                      {key:"wallets",label:"Wallets",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>},
                    ] as {key:SettingsTab;label:string;icon:any}[]).map(s=>(
                      <div key={s.key} className={`pf-snav${settingsTab===s.key?" on":""}`} onClick={()=>setSettingsTab(s.key)}>{s.icon}{s.label}</div>
                    ))}
                    <div style={{marginTop:"auto"}}>
                      <div className="pf-snav" style={{color:"rgba(248,113,113,0.55)"}} onClick={()=>setShowSettings(false)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Close
                      </div>
                    </div>
                  </div>
                  <div style={{flex:1,padding:"26px",overflowY:"auto"}}>
                    {settingsTab==="profile" && (
                      <>
                        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",fontWeight:700,marginBottom:"20px",color:"rgba(255,255,255,0.85)"}}>Edit Profile</h3>
                        <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px",padding:"16px",borderRadius:"13px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)"}}>
                          <div style={{width:"68px",height:"68px",borderRadius:"50%",overflow:"hidden",background:`hsl(${avatarHue},55%,32%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",fontWeight:800,flexShrink:0,cursor:"pointer",position:"relative"}} onClick={()=>avatarRef.current?.click()}>
                            {avatarImg ? <img src={avatarImg} alt="av" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : avatarLetter}
                            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity 0.15s"}} onMouseOver={e=>e.currentTarget.style.opacity="1"} onMouseOut={e=>e.currentTarget.style.opacity="0"}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                          </div>
                          <div>
                            <p style={{fontSize:"12px",fontWeight:600,color:"rgba(255,255,255,0.72)",marginBottom:"3px",fontFamily:"'Outfit',sans-serif"}}>Profile Picture</p>
                            <p style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",fontFamily:"'Outfit',sans-serif",marginBottom:"8px"}}>Click avatar to change</p>
                            {avatarImg && <button onClick={()=>setAvatarImg("")} style={{fontSize:"10px",color:"rgba(248,113,113,0.6)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>Remove photo</button>}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                          <div><label className="lbl">Display Name</label><input className="pf-input" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Your display name"/><p style={{fontSize:"10px",color:"rgba(255,255,255,0.18)",marginTop:"5px",fontFamily:"'Outfit',sans-serif"}}>This is your public username — shown across ShelbyVault</p></div>
                          <div><label className="lbl">Bio</label><textarea className="pf-input" value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Tell the world about yourself..." style={{minHeight:"76px",resize:"vertical"}}/></div>
                        </div>
                        <div style={{marginTop:"20px",display:"flex",gap:"8px"}}>
                          <button className="pf-btn-primary" onClick={saveProfile} disabled={saving} style={{padding:"11px 24px",fontSize:"13px",borderRadius:"10px"}}>{saving?"Saving...":saved?"✓ Saved":"Save Changes"}</button>
                          <button className="pf-btn-ghost" onClick={()=>setShowSettings(false)} style={{padding:"11px 15px",fontSize:"12px",borderRadius:"10px"}}>Cancel</button>
                        </div>
                      </>
                    )}
                    {settingsTab==="social" && (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"300px",gap:"18px",textAlign:"center"}}>
                        <div style={{width:"60px",height:"60px",borderRadius:"18px",background:"rgba(108,56,255,0.1)",border:"1px solid rgba(108,56,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(160,130,255,0.65)" strokeWidth="1.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
                        <div><p style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",fontWeight:700,color:"rgba(255,255,255,0.8)",marginBottom:"8px"}}>Social Verification</p><p style={{fontSize:"12px",color:"rgba(255,255,255,0.28)",lineHeight:1.7,maxWidth:"230px",fontFamily:"'Outfit',sans-serif"}}>Twitter OAuth, Discord & Email verification coming soon.</p></div>
                        <span style={{padding:"5px 18px",borderRadius:"999px",background:"rgba(108,56,255,0.1)",border:"1px solid rgba(108,56,255,0.28)",fontSize:"11px",fontWeight:700,color:"rgba(160,130,255,0.72)",letterSpacing:"0.07em",textTransform:"uppercase"}}>Coming Soon</span>
                      </div>
                    )}
                    {settingsTab==="wallets" && (
                      <>
                        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",fontWeight:700,marginBottom:"20px",color:"rgba(255,255,255,0.85)"}}>Linked Wallets</h3>
                        <div style={{padding:"16px 18px",borderRadius:"13px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.065)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                          <div><p style={{fontSize:"12px",fontWeight:600,color:"rgba(255,255,255,0.72)",margin:"0 0 3px",fontFamily:"'Outfit',sans-serif"}}>Primary Wallet</p><p style={{fontSize:"11px",color:"rgba(255,255,255,0.24)",margin:0,fontFamily:"monospace",letterSpacing:"0.03em"}}>{address.slice(0,18)}...{address.slice(-8)}</p></div>
                          <span style={{fontSize:"10px",fontWeight:700,color:"rgba(52,211,153,0.82)",letterSpacing:"0.07em",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:"999px",padding:"3px 11px"}}>● Active</span>
                        </div>
                        <p style={{fontSize:"11px",color:"rgba(255,255,255,0.18)",lineHeight:1.6,fontFamily:"'Outfit',sans-serif"}}>Multi-wallet linking coming soon.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {mediaAsset&&mediaAsset.fileType?.startsWith("video/")&&<VideoPlayerOverlay asset={mediaAsset} onClose={()=>setMediaAsset(null)}/>}
            {mediaAsset&&mediaAsset.fileType?.startsWith("audio/")&&<AudioPlayerOverlay asset={mediaAsset} onClose={()=>setMediaAsset(null)}/>}
          </>
        )}
      </main>
    </>
  );
}

function PfCard({asset,i,currency,isMe,onClick,onList,onDelist,forceListed,isArchived,onArchive}:{asset:any;i:number;currency:string;isMe:boolean;onClick:()=>void;onList:()=>void;onDelist:()=>void;forceListed?:boolean;isArchived?:boolean;onArchive?:()=>void}) {
  const [hov,setHov]=useState(false);
  const listed=asset.listed||forceListed;
  return (
    <div className="pf-card card-anim" style={{animationDelay:`${i*0.04}s`,opacity:isArchived?0.75:1}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}>
      <div className="pf-card-img">
        {asset.fileType?.startsWith("image/")
          ? <img src={asset.shelbyUrl} alt={asset.name}/>
          : asset.fileType?.startsWith("video/")
            ? <VideoThumbnail src={asset.shelbyUrl} thumbnailUrl={asset.thumbnailUrl}/>
            : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0d0820,#1a0d38)",position:"relative"}}><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(108,56,255,0.1),transparent 70%)"}} /><div style={{width:"44px",height:"44px",borderRadius:"50%",background:"rgba(108,56,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(108,56,255,0.5)",zIndex:1}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div></div>}
        <div className="pf-card-overlay"><div className="pf-view-pill">View</div></div>
        <div className="pf-status-pill" style={{background:listed?"rgba(52,211,153,0.12)":"rgba(0,0,0,0.52)",border:listed?"1px solid rgba(52,211,153,0.28)":"1px solid rgba(255,255,255,0.09)",color:listed?"rgba(52,211,153,0.88)":"rgba(255,255,255,0.3)"}}>{listed?"● Listed":"Unlisted"}</div>
        {isArchived&&<div style={{position:"absolute",top:"8px",right:"8px",padding:"3px 8px",borderRadius:"5px",background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.12)",fontSize:"9px",fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.05em",backdropFilter:"blur(6px)"}}>ARCHIVED</div>}
      </div>
      <div className="pf-card-body">
        <div className="pf-card-name">{asset.name}</div>
        <div className="pf-card-meta" style={{marginBottom:isMe?"9px":"0"}}>
          {asset.listed ? <span className="pf-card-price">{asset.price} {currency}</span> : <span style={{fontSize:"11px",color:"rgba(255,255,255,0.18)"}}>Not listed</span>}
          <span className="pf-card-likes">♥ {asset.likes?.length??0}</span>
        </div>
        {isMe && (
          <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:"5px"}}>
            {!isArchived&&(
              asset.listed
                ? <button className="pf-card-action" onClick={onDelist} style={{flex:1,color:"rgba(248,113,113,0.78)",background:"rgba(239,68,68,0.07)",borderColor:"rgba(239,68,68,0.18)"}} onMouseOver={e=>e.currentTarget.style.background="rgba(239,68,68,0.14)"} onMouseOut={e=>e.currentTarget.style.background="rgba(239,68,68,0.07)"}>Delist</button>
                : <button className="pf-card-action" onClick={onList} style={{flex:1,color:"rgba(160,130,255,0.82)",background:"rgba(108,56,255,0.08)",borderColor:"rgba(108,56,255,0.22)"}} onMouseOver={e=>e.currentTarget.style.background="rgba(108,56,255,0.18)"} onMouseOut={e=>e.currentTarget.style.background="rgba(108,56,255,0.08)"}>+ List</button>
            )}
            {onArchive&&(
              <button className="pf-card-action" onClick={onArchive}
                style={{width:isArchived?"100%":"36px",flexShrink:0,color:"rgba(255,255,255,0.32)",background:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.09)",padding:"7px 6px",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",fontSize:"10px"}}
                onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.6)";}}
                onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="rgba(255,255,255,0.32)";}}>
                {isArchived ? "↩ Unarchive" : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PfEmpty({msg}:{msg:string}) {
  return (
    <div style={{textAlign:"center",padding:"80px 20px",color:"rgba(255,255,255,0.2)",fontSize:"14px",fontWeight:400,fontFamily:"'Outfit',sans-serif",letterSpacing:"0.01em"}}>{msg}</div>
  );
}