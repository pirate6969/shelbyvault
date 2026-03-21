"use client";

import { useState, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useUploadBlobs } from "@shelby-protocol/react";

type Step = "idle" | "uploading" | "done" | "error";

const APT_COIN_TYPE       = "0x1::aptos_coin::AptosCoin";
const SHELBY_USD_METADATA = "0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1";

const detectShelby = (networkName: string) =>
  networkName.includes("shelby") ||
  (!!networkName && !["testnet", "mainnet", "devnet", "localnet"].includes(networkName));

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export default function UploadCard() {
  const wallet = useWallet();
  const { account, connected, network, signAndSubmitTransaction } = wallet;
  const router = useRouter();

  const [file, setFile]                       = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile]     = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [step, setStep]                       = useState<Step>("idle");
  const [uploadStatus, setUploadStatus]       = useState("");
  const [error, setError]                     = useState("");
  const [assetId, setAssetId]                 = useState("");
  const [showList, setShowList]               = useState(false);
  const [price, setPrice]                     = useState("");
  const [supply, setSupply]                   = useState("");
  const [listing, setListing]                 = useState(false);
  const [listed, setListed]                   = useState(false);
  const [preview, setPreview]                 = useState<string>("");
  const [listTx, setListTx]                   = useState("");
  const [uploadTx, setUploadTx]               = useState("");
  const [name, setName]                       = useState("");
  const [description, setDescription]         = useState("");
  const fileRef      = useRef<HTMLInputElement>(null);
  const thumbRef     = useRef<HTMLInputElement>(null);

  const networkName = network?.name?.toLowerCase() ?? "";
  const isShelby    = detectShelby(networkName);
  const currency    = isShelby ? "ShelbyUSD" : "APT";

  const isVideoFile = (f: File) => f.type.startsWith("video/");
  const isAudioFile = (f: File) => f.type.startsWith("audio/");
  const needsThumbnail = file && (isVideoFile(file) || isAudioFile(file));

  const uploadBlobs = useUploadBlobs({
    onSuccess: () => setUploadStatus("Upload complete!"),
    onError: (err: any) => {
      setStep("error");
      setUploadStatus("");
      setError(err?.message || "Shelby upload failed");
    },
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStep("idle");
    setError("");
    setUploadStatus("");
    setShowList(false);
    setListed(false);
    setAssetId("");
    setListTx("");
    setUploadTx("");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setName(f?.name ?? "");
    setDescription("");
    if (f) setPreview(URL.createObjectURL(f));
  };

  const onThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !account) return;
    setError("");
    setStep("uploading");

    try {
      let shelbyUrl: string;
      let thumbnailUrl = "";

      if (isShelby) {
        setUploadStatus("Uploading to Shelby Protocol...");
        const blobData = new Uint8Array(await file.arrayBuffer());

        await new Promise<void>((resolve, reject) => {
          uploadBlobs.mutate(
            {
              signer: {
                account,
                signAndSubmitTransaction: async (tx: any) => {
                  const result = await signAndSubmitTransaction(tx);
                  const hash = (result as any)?.hash || "";
                  setUploadTx(hash);
                  return result;
                },
              },
              blobs: [{ blobName: file.name, blobData }],
              expirationMicros: (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000,
            },
            {
              onSuccess: () => resolve(),
              onError: (err: any) => reject(err),
            }
          );
        });

        shelbyUrl = "https://api.shelbynet.shelby.xyz/shelby/v1/blobs/" + account.address.toString() + "/" + file.name;

        if (thumbnailFile) {
          setUploadStatus("Uploading thumbnail...");
          const thumbData = new Uint8Array(await thumbnailFile.arrayBuffer());
          await new Promise<void>((resolve, reject) => {
            uploadBlobs.mutate(
              {
                signer: {
                  account,
                  signAndSubmitTransaction: async (tx: any) => {
                    const result = await signAndSubmitTransaction(tx);
                    return result;
                  },
                },
                blobs: [{ blobName: "thumb_" + file.name + "_" + thumbnailFile.name, blobData: thumbData }],
                expirationMicros: (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000,
              },
              { onSuccess: () => resolve(), onError: (err: any) => reject(err) }
            );
          });
          thumbnailUrl = "https://api.shelbynet.shelby.xyz/shelby/v1/blobs/" + account.address.toString() + "/thumb_" + file.name + "_" + thumbnailFile.name;
        }

      } else {
        setUploadStatus("Saving to vault...");
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        shelbyUrl = base64;

        if (thumbnailFile) {
          thumbnailUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(thumbnailFile);
          });
        }
      }

      setUploadStatus("Saving metadata...");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name || file.name,
          owner:        account.address.toString(),
          uploader:     account.address.toString(),
          fileType:     file.type,
          shelbyUrl,
          thumbnailUrl,
          fileSize:     file.size,
          storage:      isShelby ? "shelby" : "local",
          network:      networkName,
        }),
      });

      const saved = await res.json();
      setAssetId(saved.id);
      setName(saved.name ?? file.name);
      setUploadStatus("");
      setStep("done");
    } catch (err: any) {
      setStep("error");
      setUploadStatus("");
      setError(err?.message || "Something went wrong. Try again.");
    }
  };

  const handleList = async () => {
    if (!price || !assetId || !supply || !account) return;
    setListing(true);
    try {
      const tx = await signAndSubmitTransaction({
        data: isShelby ? {
          function:          "0x1::primary_fungible_store::transfer",
          typeArguments:     ["0x1::fungible_asset::Metadata"],
          functionArguments: [SHELBY_USD_METADATA, account.address.toString(), "10000"],
        } : {
          function:          "0x1::coin::transfer",
          typeArguments:     [APT_COIN_TYPE],
          functionArguments: [account.address.toString(), "10000"],
        },
      });
      setListTx((tx as any).hash);
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assetId, price: parseFloat(price), supply: parseInt(supply),
          txHash: (tx as any).hash, name: name || file?.name, description,
          currency, network: networkName,
        }),
      });
      if (!res.ok) throw new Error("Failed to save listing");
      setListed(true);
      setShowList(false);
    } catch (err: any) {
      alert("Listing failed: " + (err?.message || "User rejected"));
    }
    setListing(false);
  };

  const handleReset = () => {
    setFile(null); setStep("idle"); setError(""); setUploadStatus("");
    setShowList(false); setListed(false); setPrice(""); setSupply("");
    setAssetId(""); setPreview(""); setListTx(""); setUploadTx("");
    setName(""); setDescription(""); setThumbnailFile(null); setThumbnailPreview("");
    if (fileRef.current) fileRef.current.value = "";
    if (thumbRef.current) thumbRef.current.value = "";
  };

  const isWorking = step === "uploading" || uploadBlobs.isPending;
  const explorerUrl = "https://explorer.aptoslabs.com/txn/" + uploadTx + "?network=custom&customNetworkName=shelbynet&customNodeUrl=https://api.shelbynet.shelby.xyz";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 0.8s linear infinite; }
        .shimmer-btn {
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: white;
          background: linear-gradient(135deg, #ec4899, #a855f7, #6366f1);
          border: none; cursor: pointer; letter-spacing: 0.01em;
        }
        .shimmer-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .shimmer-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .glass-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 10px 14px; color: white; font-size: 14px;
          font-family: 'Space Grotesk', sans-serif; outline: none; box-sizing: border-box;
        }
        .glass-input:focus { border-color: rgba(168,85,247,0.5); }
        .glass-input::placeholder { color: rgba(255,255,255,0.2); }
        .upload-drop {
          width: 100%; border-radius: 16px; cursor: pointer;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 28px 20px; gap: 8px;
          border: 1.5px dashed rgba(236,72,153,0.3);
          background: rgba(255,255,255,0.025);
          transition: border-color 0.2s, background 0.2s; box-sizing: border-box;
        }
        .upload-drop:hover { border-color: rgba(236,72,153,0.6); background: rgba(236,72,153,0.04); }
        .thumb-drop {
          width: 100%; border-radius: 12px; cursor: pointer;
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border: 1.5px dashed rgba(168,85,247,0.25);
          background: rgba(168,85,247,0.04);
          transition: border-color 0.2s; box-sizing: border-box;
        }
        .thumb-drop:hover { border-color: rgba(168,85,247,0.5); }
        .network-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
          font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.04em;
        }
        .network-badge.shelby { background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: rgba(196,130,252,0.9); }
        .network-badge.aptos  { background: rgba(52,211,153,0.1);  border: 1px solid rgba(52,211,153,0.25); color: rgba(52,211,153,0.9); }
      `}</style>

      <div style={{width:"100%",padding:"32px 32px 28px",display:"flex",flexDirection:"column",alignItems:"center",gap:"18px"}}>

        <div style={{textAlign:"center"}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"2rem",fontWeight:800,background:"linear-gradient(135deg,rgba(255,255,255,0.9),rgba(196,130,252,0.8))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",margin:0,letterSpacing:"-0.02em"}}>ShelbyVault</h1>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",marginTop:"6px"}}>
            {connected ? (
              <span className={"network-badge " + (isShelby ? "shelby" : "aptos")}>
                <span style={{width:"5px",height:"5px",borderRadius:"50%",background:isShelby?"rgba(196,130,252,0.9)":"rgba(52,211,153,0.9)",display:"inline-block"}}/>
                {isShelby ? "Shelbynet · Shelby Storage" : "Aptos Testnet · APT"}
              </span>
            ) : (
              <p style={{fontSize:"12px",color:"rgba(255,255,255,0.3)",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>Connect wallet to upload</p>
            )}
          </div>
        </div>

        {!connected && (
          <div style={{width:"100%",padding:"28px 20px",textAlign:"center",border:"1.5px dashed rgba(255,255,255,0.08)",borderRadius:"16px",color:"rgba(255,255,255,0.25)",fontSize:"13px",fontFamily:"'Space Grotesk',sans-serif"}}>
            Connect your wallet to upload files
          </div>
        )}

        {connected && step !== "done" && (
          <>
            {isShelby && (
              <div style={{width:"100%",padding:"10px 14px",borderRadius:"12px",background:"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.2)",fontSize:"11px",color:"rgba(196,130,252,0.8)",fontFamily:"'Space Grotesk',sans-serif",display:"flex",alignItems:"center",gap:"8px"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Files stored on Shelby Protocol. Requires ShelbyUSD + APT for gas fees.
              </div>
            )}

            {/* Main file drop */}
            <div className="upload-drop" onClick={() => !isWorking && fileRef.current?.click()}>
              {preview && file?.type.startsWith("image/") ? (
                <img src={preview} alt="preview" style={{width:"72px",height:"72px",objectFit:"cover",borderRadius:"12px",marginBottom:"4px"}}/>
              ) : file?.type.startsWith("video/") ? (
                <div style={{width:"56px",height:"56px",borderRadius:"12px",background:"rgba(108,56,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"4px"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
              ) : file?.type.startsWith("audio/") ? (
                <div style={{width:"56px",height:"56px",borderRadius:"12px",background:"rgba(108,56,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"4px"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(236,72,153,0.45)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              )}
              <p style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.7)",margin:0,fontFamily:"'Space Grotesk',sans-serif",textAlign:"center"}}>
                {file ? file.name : "Drop file here or click to browse"}
              </p>
              {file ? (
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.2)",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>
                  {formatSize(file.size)} · {file.type || "unknown type"}
                </p>
              ) : (
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>Images · Audio · Video · Max 50MB</p>
              )}
              <input ref={fileRef} type="file" accept="image/*,audio/*,video/*" style={{display:"none"}} onChange={onFileChange}/>
            </div>

            {/* Name edit field — shows after file picked */}
            {file && !isWorking && (
              <div style={{width:"100%"}}>
                <label style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Asset Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter asset name..."
                  className="glass-input"
                  style={{fontSize:"13px"}}
                />
              </div>
            )}

            {/* Thumbnail picker for video/audio */}
            {needsThumbnail && !isWorking && (
              <div style={{width:"100%"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                  <label style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>
                    Thumbnail
                  </label>
                  <span style={{fontSize:"10px",color:"rgba(255,255,255,0.18)",fontFamily:"'Space Grotesk',sans-serif"}}>Optional</span>
                </div>
                <div className="thumb-drop" onClick={() => thumbRef.current?.click()}>
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="thumb" style={{width:"48px",height:"48px",objectFit:"cover",borderRadius:"8px",flexShrink:0}}/>
                  ) : (
                    <div style={{width:"48px",height:"48px",borderRadius:"8px",background:"rgba(168,85,247,0.1)",border:"1px dashed rgba(168,85,247,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:"12px",fontWeight:600,color:"rgba(255,255,255,0.55)",margin:"0 0 2px",fontFamily:"'Space Grotesk',sans-serif"}}>
                      {thumbnailFile ? thumbnailFile.name : "Add cover image"}
                    </p>
                    <p style={{fontSize:"11px",color:"rgba(255,255,255,0.2)",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>
                      {thumbnailFile ? formatSize(thumbnailFile.size) : "PNG, JPG recommended"}
                    </p>
                  </div>
                  {thumbnailFile && (
                    <button onClick={e=>{e.stopPropagation();setThumbnailFile(null);setThumbnailPreview("");if(thumbRef.current)thumbRef.current.value="";}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:"14px",padding:"2px",flexShrink:0}}>✕</button>
                  )}
                  <input ref={thumbRef} type="file" accept="image/*" style={{display:"none"}} onChange={onThumbnailChange}/>
                </div>
              </div>
            )}

            {isWorking && (
              <div style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:"rgba(255,255,255,0.5)",fontFamily:"'Space Grotesk',sans-serif"}}>
                <span className="spin-anim" style={{width:"13px",height:"13px",border:"2px solid rgba(236,72,153,0.6)",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",flexShrink:0}}/>
                {uploadStatus || "Uploading..."}
              </div>
            )}

            {step === "error" && (
              <div style={{width:"100%",padding:"10px 14px",borderRadius:"12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",fontSize:"12px",textAlign:"center",fontFamily:"'Space Grotesk',sans-serif"}}>
                {error}
                <button onClick={handleReset} style={{display:"block",marginTop:"4px",color:"rgba(255,255,255,0.35)",fontSize:"11px",background:"none",border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>Try again</button>
              </div>
            )}

            <button onClick={handleUpload} disabled={!file||isWorking} className="shimmer-btn" style={{width:"100%",padding:"14px",borderRadius:"16px",fontSize:"14px"}}>
              {isWorking ? "Uploading..." : isShelby ? "Upload to Shelby Storage" : "Upload to Vault"}
            </button>
            <p style={{fontSize:"10px",color:"rgba(255,255,255,0.15)",margin:0,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Space Grotesk',sans-serif"}}>
              {isShelby ? "Stored on Shelby Protocol · Decentralized" : "Secured by Aptos · Your keys, your assets"}
            </p>
          </>
        )}

        {connected && step === "done" && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"stretch",gap:"10px",width:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",borderRadius:"14px",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)"}}>
              <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.35)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:"12px",fontWeight:700,color:"#34d399",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>
                  {isShelby ? "Stored on Shelby Protocol!" : "Upload Complete!"}
                </p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",margin:"2px 0 0",fontFamily:"'Space Grotesk',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name || file?.name}</p>
                {file && <p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",margin:"1px 0 0",fontFamily:"'Space Grotesk',sans-serif"}}>{formatSize(file.size)}</p>}
                {uploadTx && (
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",color:"rgba(196,130,252,0.7)",textDecoration:"underline",marginTop:"4px",display:"block"}}>
                    View on Explorer
                  </a>
                )}
              </div>
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="thumb" style={{width:"38px",height:"38px",objectFit:"cover",borderRadius:"8px",flexShrink:0}}/>
              ) : preview && file?.type.startsWith("image/") ? (
                <img src={preview} alt="thumb" style={{width:"38px",height:"38px",objectFit:"cover",borderRadius:"8px",flexShrink:0}}/>
              ) : null}
            </div>

            {listed && (
              <div style={{padding:"12px 14px",borderRadius:"14px",background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.2)"}}>
                <p style={{fontSize:"12px",fontWeight:700,color:"#c084fc",margin:"0 0 2px",fontFamily:"'Space Grotesk',sans-serif"}}>Listed on Marketplace</p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>{price} {currency} x {supply === "1" ? "01" : supply.padStart(2,"0")} editions</p>
                {listTx && <p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",margin:"4px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Tx: {listTx.slice(0,28)}...</p>}
              </div>
            )}

            {!listed && showList && (
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <span style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",fontFamily:"'Space Grotesk',sans-serif"}}>Listing currency</span>
                  <span className={"network-badge " + (isShelby ? "shelby" : "aptos")}>{currency}</span>
                </div>
                <div>
                  <label style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Name</label>
                  <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="My Asset" className="glass-input"/>
                </div>
                <div>
                  <label style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Description <span style={{opacity:0.5}}>(optional)</span></label>
                  <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your asset..." rows={2} className="glass-input" style={{resize:"none"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <div>
                    <label style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Price ({currency})</label>
                    <input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="1.5" className="glass-input"/>
                  </div>
                  <div>
                    <label style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Supply</label>
                    <input type="number" min="1" step="1" value={supply} onChange={e=>setSupply(e.target.value)} placeholder="10" className="glass-input"/>
                  </div>
                </div>
                <button onClick={handleList} disabled={listing||!price||!supply} className="shimmer-btn" style={{width:"100%",padding:"12px",borderRadius:"14px",fontSize:"13px"}}>
                  {listing ? (
                    <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}>
                      <span className="spin-anim" style={{width:"12px",height:"12px",border:"2px solid rgba(255,255,255,0.5)",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block"}}/>
                      Confirming...
                    </span>
                  ) : "List on Marketplace (" + currency + ")"}
                </button>
                <p style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",textAlign:"center",margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>A small gas fee confirms listing on-chain</p>
                <button onClick={()=>setShowList(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.28)",fontSize:"11px",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",padding:"2px"}}>Cancel</button>
              </div>
            )}

            {!showList && (
              <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"2px"}}>
                {!listed && (
                  <button onClick={()=>setShowList(true)} className="shimmer-btn" style={{width:"100%",padding:"13px",borderRadius:"14px",fontSize:"13px"}}>
                    {"List on Marketplace (" + currency + ")"}
                  </button>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <button onClick={handleReset}
                    style={{padding:"11px",borderRadius:"12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",transition:"border-color 0.2s"}}
                    onMouseOver={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.22)")}
                    onMouseOut={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.1)")}>
                    + Upload Another
                  </button>
                  <button onClick={()=>router.push("/vault")}
                    style={{padding:"11px",borderRadius:"12px",background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.25)",color:"rgba(196,130,252,0.9)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",transition:"border-color 0.2s"}}
                    onMouseOver={e=>(e.currentTarget.style.borderColor="rgba(168,85,247,0.5)")}
                    onMouseOut={e=>(e.currentTarget.style.borderColor="rgba(168,85,247,0.25)")}>
                    Go to Vault
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}