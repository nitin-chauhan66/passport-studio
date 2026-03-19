import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Printer, Image as ImageIcon, Loader2, Palette,
  AlertCircle, CheckCircle2, SlidersHorizontal, Sparkles,
  Camera, Download, Crop, X, ZoomIn, ZoomOut,
  RotateCcw, FileDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const PRESET_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#dbeafe', label: 'Sky Blue' },
  { value: '#e0f2fe', label: 'Light Blue' },
  { value: '#f0fdf4', label: 'Mint' },
  { value: '#fef9c3', label: 'Cream' },
  { value: '#fee2e2', label: 'Blush' },
];

const SIZE_PRESETS = [
  { label: 'Original PNG', quality: 1.0, maxKB: null, desc: 'Lossless · Best quality' },
  { label: '< 500 KB',     quality: 0.88, maxKB: 500,  desc: 'Most govt. portals' },
  { label: '< 200 KB',     quality: 0.72, maxKB: 200,  desc: 'Strict portals' },
  { label: '< 100 KB',     quality: 0.52, maxKB: 100,  desc: 'Very strict' },
  { label: '< 50 KB',      quality: 0.32, maxKB: 50,   desc: 'Ultra compressed' },
];

/* ─────────────────────────────────────────────
   Step Indicator
───────────────────────────────────────────── */
const Step = ({ number, label, active, done }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:8,
    opacity: active ? 1 : done ? 0.75 : 0.28,
    transition:'opacity 0.3s'
  }}>
    <div style={{
      width:27, height:27, borderRadius:'50%',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:11, fontWeight:800,
      background: done ? 'var(--emerald)' : active ? 'white' : 'transparent',
      border: done ? '2px solid var(--emerald)' : active ? '2px solid white' : '2px solid #3a4a68',
      color: done ? 'white' : active ? '#0c0f1a' : '#3a4a68',
      transition:'all 0.3s', flexShrink:0
    }}>
      {done ? <CheckCircle2 style={{width:13,height:13}} /> : number}
    </div>
    <span style={{
      fontSize:12.5, fontWeight:600, letterSpacing:'0.02em',
      color: done ? 'var(--emerald)' : active ? 'white' : '#3a4a68'
    }}>{label}</span>
  </div>
);

/* ─────────────────────────────────────────────
   Crop Modal — canvas-based, drag + zoom
───────────────────────────────────────────── */
function CropModal({ imageUrl, onCrop, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CROP_W = 280, CROP_H = 360; // 7:9 passport ratio

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c0f1a';
    ctx.fillRect(0, 0, W, H);

    const baseScale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const scale = baseScale * zoom;
    const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
    const ix = (W - iw) / 2 + offset.x, iy = (H - ih) / 2 + offset.y;

    // Dim version
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, ix, iy, iw, ih);

    // Crop box
    const cx = (W - CROP_W) / 2, cy = (H - CROP_H) / 2;

    // Full brightness inside crop
    ctx.save();
    ctx.beginPath(); ctx.rect(cx, cy, CROP_W, CROP_H); ctx.clip();
    ctx.globalAlpha = 1;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Overlay border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#4f9cf9';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, CROP_W, CROP_H);

    // Corner handles
    const hs = 16;
    ctx.fillStyle = '#4f9cf9';
    [[cx,cy],[cx+CROP_W-hs,cy],[cx,cy+CROP_H-hs],[cx+CROP_W-hs,cy+CROP_H-hs]].forEach(([hx,hy]) => {
      ctx.fillRect(hx, hy, hs, 3); ctx.fillRect(hx, hy, 3, hs);
    });
    [[cx+CROP_W,cy],[cx+CROP_W,cy+CROP_H-hs],[cx,cy+CROP_H],[cx+CROP_W,cy+CROP_H]].forEach(([hx,hy],i) => {
      if(i===0){ctx.fillRect(hx-hs,hy,hs,3);ctx.fillRect(hx-3,hy,3,hs);}
      if(i===1){ctx.fillRect(hx-hs,hy+hs,hs,3);ctx.fillRect(hx-3,hy,3,hs);}
      if(i===2){ctx.fillRect(hx,hy-3,hs,3);ctx.fillRect(hx,hy-hs,3,hs);}
      if(i===3){ctx.fillRect(hx-hs,hy-3,hs,3);ctx.fillRect(hx-3,hy-hs,3,hs);}
    });

    // Rule of thirds
    ctx.strokeStyle = 'rgba(79,156,249,0.22)';
    ctx.lineWidth = 1;
    for (let i=1;i<3;i++) {
      ctx.beginPath(); ctx.moveTo(cx+CROP_W*i/3,cy); ctx.lineTo(cx+CROP_W*i/3,cy+CROP_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy+CROP_H*i/3); ctx.lineTo(cx+CROP_W,cy+CROP_H*i/3); ctx.stroke();
    }

    // Label
    ctx.fillStyle = 'rgba(79,156,249,0.9)';
    ctx.font = '600 11px DM Sans, sans-serif';
    ctx.fillText('3.5 × 4.5 cm passport area', cx+6, cy-7);
  }, [imgLoaded, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  const applyZoom = (d) => setZoom(z => Math.min(5, Math.max(0.25, z + d)));
  const resetView = () => { setZoom(1); setOffset({x:0,y:0}); };

  const startDrag = (x,y) => { setDragging(true); setDragStart({x:x-offset.x,y:y-offset.y}); };
  const moveDrag  = (x,y) => { if(dragging) setOffset({x:x-dragStart.x,y:y-dragStart.y}); };
  const endDrag   = () => setDragging(false);

  const applyWheelZoom = (e) => {
    e.preventDefault();
    applyZoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  const handleApply = () => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img) return;
    const W = canvas.width, H = canvas.height;
    const baseScale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const scale = baseScale * zoom;
    const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
    const ix = (W - iw) / 2 + offset.x, iy = (H - ih) / 2 + offset.y;
    const cx = (W - CROP_W) / 2, cy = (H - CROP_H) / 2;
    const srcX = (cx - ix) / scale, srcY = (cy - iy) / scale;
    const srcW = CROP_W / scale, srcH = CROP_H / scale;
    const out = document.createElement('canvas');
    out.width = 700; out.height = 900;
    const ctx = out.getContext('2d');
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 700, 900);
    out.toBlob(blob => { if (blob) onCrop(URL.createObjectURL(blob)); }, 'image/png');
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(5,7,16,0.94)', backdropFilter:'blur(16px)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:16, overflowY:'auto'
    }}>
      <img ref={imgRef} src={imageUrl} alt="" style={{display:'none'}} onLoad={() => setImgLoaded(true)} crossOrigin="anonymous" />

      <div style={{
        width:'100%', maxWidth:600,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:22, overflow:'hidden',
        boxShadow:'0 40px 100px rgba(0,0,0,0.6)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding:'15px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'linear-gradient(180deg, rgba(79,156,249,0.06) 0%, transparent 100%)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:'rgba(79,156,249,0.15)',border:'1px solid rgba(79,156,249,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Crop style={{width:15,height:15,color:'var(--accent)'}} />
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:14}}>Crop Photo</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>Drag to reposition · Scroll or pinch to zoom</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',color:'var(--muted)',padding:'6px 8px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.color='var(--text)'} onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}>
            <X style={{width:17,height:17}} />
          </button>
        </div>

        {/* Canvas */}
        <div style={{position:'relative'}}>
          <canvas
            ref={canvasRef} width={600} height={440}
            style={{display:'block',width:'100%',cursor:dragging?'grabbing':'grab',touchAction:'none',userSelect:'none'}}
            onMouseDown={e=>startDrag(e.clientX,e.clientY)}
            onMouseMove={e=>moveDrag(e.clientX,e.clientY)}
            onMouseUp={endDrag} onMouseLeave={endDrag}
            onTouchStart={e=>{ const t=e.touches[0]; startDrag(t.clientX,t.clientY); }}
            onTouchMove={e=>{ const t=e.touches[0]; moveDrag(t.clientX,t.clientY); }}
            onTouchEnd={endDrag}
            onWheel={applyWheelZoom}
          />
        </div>

        {/* Controls */}
        <div style={{
          padding:'14px 18px', borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
          background:'rgba(0,0,0,0.15)'
        }}>
          {[
            { icon:<ZoomOut style={{width:14,height:14}}/>, label:'Out', action:()=>applyZoom(-0.15) },
            { icon:<ZoomIn style={{width:14,height:14}}/>, label:'In', action:()=>applyZoom(0.15) },
            { icon:<RotateCcw style={{width:13,height:13}}/>, label:'Reset', action:resetView },
          ].map(({icon,label,action}) => (
            <button key={label} onClick={action} style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:8, padding:'7px 13px', color:'var(--text)',
              cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              fontSize:12.5, fontWeight:600, fontFamily:'var(--font-body)',
              transition:'all 0.18s'
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text)';}}>
              {icon}{label}
            </button>
          ))}
          <div style={{fontSize:11.5,color:'var(--muted)',marginLeft:'auto',fontWeight:600}}>
            {Math.round(zoom*100)}% zoom
          </div>
          <button onClick={handleApply} style={{
            background:'linear-gradient(135deg,var(--accent),var(--accent2))',
            border:'none', borderRadius:9, padding:'9px 20px',
            color:'white', fontWeight:800, fontSize:13,
            cursor:'pointer', display:'flex', alignItems:'center', gap:7,
            fontFamily:'var(--font-body)',
            boxShadow:'0 4px 16px rgba(79,156,249,0.3)',
            transition:'all 0.2s'
          }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
            <CheckCircle2 style={{width:15,height:15}}/> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Download Panel
───────────────────────────────────────────── */
function DownloadPanel({ compositeUrl, bgColor }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [lastSize, setLastSize] = useState({});

  const getCanvas = useCallback(() => new Promise((resolve) => {
    if (!compositeUrl) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 700; canvas.height = 900;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 700, 900);
      const r = Math.max(700 / img.width, 900 / img.height);
      const dw = img.width * r, dh = img.height * r;
      ctx.drawImage(img, (700-dw)/2, (900-dh)/2 - 45, dw, dh);
      resolve(canvas);
    };
    img.src = compositeUrl;
  }), [compositeUrl, bgColor]);

  const compressTo = useCallback(async (canvas, maxKB, startQ) => {
    let q = startQ, blob;
    for (let i = 0; i < 12; i++) {
      blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
      if (!maxKB || blob.size/1024 <= maxKB) break;
      q = Math.max(0.08, q - 0.07);
    }
    return blob;
  }, []);

  const handleDownload = useCallback(async (preset, idx) => {
    setDownloading(idx);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      let blob;
      if (!preset.maxKB) {
        blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      } else {
        blob = await compressTo(canvas, preset.maxKB, preset.quality);
      }
      const kb = Math.round(blob.size / 1024);
      setLastSize(prev => ({...prev, [idx]: kb}));
      const ext = preset.maxKB ? 'jpg' : 'png';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `passport-photo-${kb}kb.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { console.error(e); }
    setDownloading(null);
  }, [getCanvas, compressTo]);

  const disabled = !compositeUrl;

  return (
    <div style={{borderRadius:14,border:`1px solid ${open && !disabled ? 'rgba(79,156,249,0.3)' : 'var(--border)'}`,overflow:'hidden',background:'var(--surface)',transition:'border-color 0.2s'}}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width:'100%', padding:'14px 18px',
          background: disabled
            ? 'var(--surface2)'
            : open
              ? 'linear-gradient(135deg,rgba(79,156,249,0.2),rgba(124,58,237,0.15))'
              : 'linear-gradient(135deg,rgba(79,156,249,0.12),rgba(124,58,237,0.08))',
          border:'none', cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? 'var(--muted)' : 'var(--text)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          fontFamily:'var(--font-body)', fontWeight:700, fontSize:14,
          transition:'all 0.2s'
        }}
      >
        <span style={{display:'flex',alignItems:'center',gap:10}}>
          <Download style={{width:17,height:17,color:disabled?'var(--muted)':'var(--accent)'}} />
          Download Passport Photo
        </span>
        {!disabled && (open ? <ChevronUp style={{width:15,height:15,color:'var(--muted)'}} /> : <ChevronDown style={{width:15,height:15,color:'var(--muted)'}} />)}
      </button>

      {open && !disabled && (
        <div style={{padding:'14px 16px 16px',display:'flex',flexDirection:'column',gap:7,borderTop:'1px solid var(--border)'}}>
          <p style={{fontSize:10.5,color:'var(--muted)',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:5}}>
            Select file size target
          </p>
          {SIZE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleDownload(preset, i)}
              disabled={downloading !== null}
              style={{
                background: downloading===i ? 'rgba(79,156,249,0.08)' : 'var(--surface2)',
                border:`1px solid ${downloading===i ? 'rgba(79,156,249,0.35)' : 'var(--border)'}`,
                borderRadius:10, padding:'10px 14px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor: downloading!==null ? 'wait' : 'pointer',
                transition:'all 0.18s', fontFamily:'var(--font-body)',
              }}
              onMouseEnter={e=>{ if(downloading===null){ e.currentTarget.style.borderColor='rgba(79,156,249,0.4)'; e.currentTarget.style.background='rgba(79,156,249,0.06)'; }}}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=downloading===i?'rgba(79,156,249,0.35)':'var(--border)'; e.currentTarget.style.background=downloading===i?'rgba(79,156,249,0.08)':'var(--surface2)'; }}
            >
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:34, height:34, borderRadius:9,
                  background: downloading===i ? 'rgba(79,156,249,0.15)' : 'rgba(255,255,255,0.04)',
                  border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>
                  {downloading===i
                    ? <Loader2 style={{width:15,height:15,color:'var(--accent)',animation:'spin 1s linear infinite'}} />
                    : <FileDown style={{width:15,height:15,color:'var(--muted)'}} />
                  }
                </div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{preset.label}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{preset.desc}
                    {lastSize[i] && <span style={{color:'var(--emerald)',marginLeft:6}}>→ {lastSize[i]} KB</span>}
                  </div>
                </div>
              </div>
              {downloading!==i && <Download style={{width:14,height:14,color:'var(--muted)'}} />}
            </button>
          ))}
          <div style={{marginTop:4,fontSize:10.5,color:'var(--muted)',lineHeight:1.65,padding:'9px 12px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid var(--border)'}}>
            <strong style={{color:'var(--text)'}}>Tip:</strong> PNG is lossless (large). JPEG is used for compressed sizes — perfectly fine for government portal uploads. Actual KB shown after first download.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
export default function App() {
  const [sourceImage, setSourceImage]     = useState(null);
  const [croppedImage, setCroppedImage]   = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [compositeUrl, setCompositeUrl]   = useState(null);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [processProgress, setProcessProgress] = useState(0);
  const [bgColor, setBgColor]             = useState('#dbeafe');
  const [copies, setCopies]               = useState(8);
  const [error, setError]                 = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [activeStep, setActiveStep]       = useState(1);
  const [showCrop, setShowCrop]           = useState(false);

  const fileInputRef = useRef(null);
  const workingImage = croppedImage || sourceImage;

  const handlePrint = useCallback(() => {
    const src = compositeUrl || workingImage;
    if (!src) return;

    // A4 printable area: 210mm - 20mm margins = 190mm wide, 297mm - 20mm = 277mm tall
    // Each photo: 35mm wide, 45mm tall, 5mm gap
    // Columns: floor((190 + 5) / (35 + 5)) = floor(195/40) = 4 columns
    // Rows per page: floor((277 + 5) / (45 + 5)) = floor(282/50) = 5 rows
    // Max per page = 4 * 5 = 20

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  html, body {
    width: 190mm;
    background: white;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 35mm);
    grid-auto-rows: 45mm;
    gap: 5mm;
    width: 190mm;
    align-content: start;
  }
  .photo {
    width: 35mm;
    height: 45mm;
    overflow: hidden;
    border: 0.3mm solid #c0c0c0;
    background: ${bgColor};
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 10%;
    display: block;
  }
</style>
</head>
<body>
<div class="grid">
${Array.from({ length: copies }).map(() => `  <div class="photo"><img src="${src}" /></div>`).join('\n')}
</div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();

    // Wait for images to load before printing
    const img = doc.querySelector('img');
    const doPrint = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 200);
    };
    if (img) { img.onload = doPrint; img.onerror = doPrint; }
    else { doPrint(); }
  }, [compositeUrl, workingImage, copies, bgColor]);

  /* Step progression */
  useEffect(() => {
    if (sourceImage && activeStep < 2) setActiveStep(2);
    if (processedImage && activeStep < 3) setActiveStep(3);
  }, [sourceImage, processedImage]);

  /* Progress animation */
  useEffect(() => {
    let iv;
    if (isProcessing) {
      setProcessProgress(5);
      iv = setInterval(() => setProcessProgress(p => Math.min(p + Math.random()*7, 85)), 380);
    } else {
      setProcessProgress(processedImage ? 100 : 0);
    }
    return () => clearInterval(iv);
  }, [isProcessing, processedImage]);

  /* Build composite (bg color + photo) for preview & download */
  useEffect(() => {
    const src = processedImage || workingImage;
    if (!src) { setCompositeUrl(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      c.toBlob(blob => blob && setCompositeUrl(URL.createObjectURL(blob)), 'image/png');
    };
    img.src = src;
  }, [processedImage, workingImage, bgColor]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload a valid image (JPEG, PNG, WEBP).'); return; }
    setError(null);
    setSourceImage(URL.createObjectURL(file));
    setCroppedImage(null); setProcessedImage(null);
  };

  const onFileChange  = (e) => handleFile(e.target.files?.[0]);
  const onDragOver    = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave   = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop        = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }, []);

  const handleCropDone = (url) => { setCroppedImage(url); setProcessedImage(null); setShowCrop(false); };

  const processImage = async () => {
    if (!workingImage) return;
    try {
      setIsProcessing(true); setError(null); setProcessStatus('Loading AI model…');
      const res  = await fetch(workingImage);
      const blob = await res.blob();
      setProcessStatus('Removing background…');
      const out  = await removeBackground(blob);
      setProcessedImage(URL.createObjectURL(out));
      setProcessStatus('Done!');
    } catch (err) {
      console.error(err);
      setError('Processing failed. Try a smaller image or a different browser.');
      setProcessProgress(0);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessStatus(''), 3000);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#0c0f1a;--surface:#131929;--surface2:#1a2236;
          --border:rgba(255,255,255,0.07);--border-hi:rgba(79,156,249,0.3);
          --text:#e8ecf4;--muted:#6275a0;
          --accent:#4f9cf9;--accent2:#7c3aed;--emerald:#10b981;--danger:#f87171;
          --font-body:'DM Sans',sans-serif;--font-display:'DM Serif Display',serif;
        }
        body{background:var(--bg);color:var(--text);font-family:var(--font-body);}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

        .app{
          min-height:100vh;background:var(--bg);
          background-image:
            radial-gradient(ellipse 90% 55% at 15% -5%,rgba(79,156,249,0.11) 0%,transparent 65%),
            radial-gradient(ellipse 65% 45% at 85% 105%,rgba(124,58,237,0.09) 0%,transparent 65%);
        }
        .topbar{
          display:flex;align-items:center;justify-content:space-between;
          padding:15px 28px;border-bottom:1px solid var(--border);
          background:rgba(12,15,26,0.88);backdrop-filter:blur(24px);
          position:sticky;top:0;z-index:50;
        }
        .logo{display:flex;align-items:center;gap:10px;}
        .logo-icon{
          width:33px;height:33px;border-radius:10px;
          background:linear-gradient(135deg,var(--accent),var(--accent2));
          display:flex;align-items:center;justify-content:center;
        }
        .logo-text{font-family:var(--font-display);font-size:1.1rem;color:var(--text);}
        .steps{display:flex;align-items:center;gap:14px;}
        .step-line{width:26px;height:1px;background:rgba(255,255,255,0.09);}
        @media(max-width:800px){.steps{display:none;}}

        .main{max-width:1160px;margin:0 auto;padding:32px 18px 64px;}
        .layout{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;}
        @media(max-width:840px){.layout{grid-template-columns:1fr;}}

        .left{display:flex;flex-direction:column;gap:18px;}

        /* Cards */
        .card{
          background:var(--surface);border:1px solid var(--border);
          border-radius:20px;padding:24px;position:relative;overflow:hidden;
          animation:fadeSlide 0.35s ease both;
        }
        .card::before{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(79,156,249,0.3),transparent);
        }
        .card-label{
          font-size:10.5px;font-weight:700;letter-spacing:0.13em;
          text-transform:uppercase;color:var(--muted);margin-bottom:16px;
        }

        /* Upload */
        .upload-zone{
          border:1.5px dashed var(--border-hi);border-radius:14px;
          padding:32px 18px;text-align:center;cursor:pointer;
          transition:all 0.22s ease;background:rgba(79,156,249,0.025);
        }
        .upload-zone:hover{border-color:var(--accent);background:rgba(79,156,249,0.06);}
        .upload-zone.drag{border-color:var(--accent);background:rgba(79,156,249,0.1);transform:scale(1.015);}
        .upload-zone.loaded{border-color:var(--emerald);background:rgba(16,185,129,0.04);}
        .upload-icon{
          width:52px;height:52px;border-radius:50%;
          background:rgba(79,156,249,0.09);border:1px solid rgba(79,156,249,0.2);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 13px;transition:all 0.22s;
        }
        .upload-zone:hover .upload-icon{transform:scale(1.1);}
        .upload-zone.loaded .upload-icon{background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);}

        /* Badges */
        .badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;}
        .badge{
          display:inline-flex;align-items:center;gap:5px;
          font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;
        }
        .badge-crop{background:rgba(124,58,237,0.14);color:#a78bfa;border:1px solid rgba(124,58,237,0.25);}
        .badge-bg{background:rgba(16,185,129,0.12);color:var(--emerald);border:1px solid rgba(16,185,129,0.25);}

        /* Error */
        .err{
          background:rgba(248,113,113,0.09);border:1px solid rgba(248,113,113,0.22);
          color:var(--danger);border-radius:10px;padding:10px 13px;
          font-size:12.5px;display:flex;gap:8px;align-items:flex-start;
          margin-top:13px;line-height:1.55;
        }

        /* Buttons */
        .btn-row{display:flex;gap:9px;margin-top:15px;flex-wrap:wrap;}
        .btn{
          flex:1;min-width:110px;padding:12px 14px;border-radius:10px;border:none;
          font-family:var(--font-body);font-size:13px;font-weight:700;
          cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;
          transition:all 0.18s ease;letter-spacing:0.02em;
        }
        .btn-ai{
          background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;
          box-shadow:0 4px 16px rgba(79,156,249,0.22);
        }
        .btn-ai:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 22px rgba(79,156,249,0.32);}
        .btn-ai:disabled{background:var(--surface2);color:var(--muted);box-shadow:none;cursor:not-allowed;}
        .btn-secondary{
          background:var(--surface2);border:1px solid var(--border);color:var(--text);
        }
        .btn-secondary:hover:not(:disabled){border-color:var(--accent);color:var(--accent);transform:translateY(-1px);}
        .btn-secondary:disabled{color:var(--muted);cursor:not-allowed;}

        /* Progress */
        .prog-track{height:3px;background:var(--surface2);border-radius:99px;overflow:hidden;margin-top:13px;}
        .prog-fill{
          height:100%;
          background:linear-gradient(90deg,var(--accent),var(--accent2));
          border-radius:99px;transition:width 0.4s ease;position:relative;
        }
        .prog-fill::after{
          content:'';position:absolute;right:0;top:0;bottom:0;width:32px;
          background:rgba(255,255,255,0.28);filter:blur(3px);
          animation:shimmer 1s ease-in-out infinite;
        }
        .prog-label{font-size:11px;color:var(--accent);font-weight:600;text-align:center;margin-top:7px;letter-spacing:0.04em;}

        /* Setting labels */
        .setting-lbl{
          font-size:10.5px;font-weight:700;letter-spacing:0.09em;
          text-transform:uppercase;color:var(--muted);
          margin-bottom:10px;display:flex;align-items:center;gap:6px;
        }
        .color-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
        .swatch{width:32px;height:32px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all 0.18s;}
        .swatch:hover{transform:scale(1.14);}
        .swatch.active{border-color:white;box-shadow:0 0 0 3px rgba(255,255,255,0.13);transform:scale(1.14);}
        .custom-wrap{position:relative;width:32px;height:32px;}
        .custom-btn{
          width:32px;height:32px;border-radius:8px;
          border:1.5px dashed var(--muted);background:var(--surface2);
          display:flex;align-items:center;justify-content:center;
          color:var(--muted);font-size:17px;cursor:pointer;transition:all 0.18s;
          line-height:1;
        }
        .custom-btn:hover{border-color:var(--accent);color:var(--accent);}
        .custom-input{opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer;border:none;}

        /* Slider */
        .slider-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
        .slider-val{
          background:var(--surface2);border:1px solid var(--border);
          color:var(--text);padding:3px 11px;border-radius:99px;font-size:12px;font-weight:700;
        }
        input[type=range]{width:100%;height:4px;appearance:none;background:var(--surface2);border-radius:99px;outline:none;cursor:pointer;}
        input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:white;border:3px solid var(--accent);box-shadow:0 2px 8px rgba(79,156,249,0.35);cursor:pointer;}
        .slider-hints{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:6px;}

        /* Sheet visualiser */
        .sheet-vis{
          display:flex;flex-wrap:wrap;gap:3.5px;padding:13px;
          background:var(--surface2);border:1px solid var(--border);
          border-radius:10px;margin-top:11px;
        }
        .dot{width:10px;height:13px;border-radius:2px;transition:background 0.22s;}

        /* Right column */
        .right{position:sticky;top:78px;display:flex;flex-direction:column;gap:16px;}
        .preview-card{
          background:var(--surface);border:1px solid var(--border);
          border-radius:20px;padding:22px;position:relative;overflow:hidden;
        }
        .preview-card::before{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(16,185,129,0.3),transparent);
        }
        .preview-stage{
          background:var(--surface2);border:1px solid var(--border);border-radius:14px;
          min-height:270px;display:flex;align-items:center;justify-content:center;
          padding:26px;position:relative;overflow:hidden;
        }
        .preview-stage::before{
          content:'';position:absolute;inset:0;
          background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.01) 0,rgba(255,255,255,0.01) 1px,transparent 1px,transparent 10px);
        }
        .passport-frame{
          width:122px;height:157px;border-radius:4px;overflow:hidden;
          box-shadow:0 16px 48px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.06);
          position:relative;transition:all 0.32s;flex-shrink:0;
        }
        .passport-frame img{width:100%;height:100%;object-fit:cover;object-position:center 10%;display:block;}
        .frame-badge{
          background:rgba(79,156,249,0.1);border:1px solid rgba(79,156,249,0.22);
          color:var(--accent);font-size:10px;font-weight:700;
          letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:99px;
        }
        .empty-icon{
          width:50px;height:50px;background:var(--surface);border-radius:13px;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 10px;border:1px solid var(--border);
        }

        /* Print button */
        .btn-print{
          width:100%;padding:14px;background:var(--emerald);color:white;
          border-radius:10px;border:none;font-family:var(--font-body);
          font-weight:700;font-size:14px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          box-shadow:0 4px 16px rgba(16,185,129,0.22);transition:all 0.2s;
        }
        .btn-print:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 22px rgba(16,185,129,0.3);}
        .btn-print:disabled{background:var(--surface2);color:var(--muted);box-shadow:none;cursor:not-allowed;}

        .tip-box{
          font-size:11px;color:var(--muted);line-height:1.65;
          background:rgba(255,255,255,0.018);border-radius:9px;
          padding:10px 13px;border:1px solid var(--border);
        }

        /* Print — handled via iframe, no @media print needed here */
      `}</style>

      <div className="app">
        {/* Top bar */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-icon"><Camera style={{width:16,height:16,color:'white'}} /></div>
            <span className="logo-text">Passport Studio</span>
          </div>
          <div className="steps">
            <Step number="1" label="Upload"       active={activeStep===1} done={activeStep>1} />
            <div className="step-line" />
            <Step number="2" label="Crop & Process" active={activeStep===2} done={activeStep>2} />
            <div className="step-line" />
            <Step number="3" label="Download & Print" active={activeStep===3} done={false} />
          </div>
          <div style={{width:90}} />
        </header>

        <main className="main">
          <div className="layout">

            {/* ── LEFT ── */}
            <div className="left">

              {/* Upload card */}
              <div className="card">
                <p className="card-label">Step 1 — Upload Photo</p>
                <div
                  className={`upload-zone ${isDragging?'drag':''} ${sourceImage?'loaded':''}`}
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={onFileChange}
                    accept="image/png,image/jpeg,image/webp" style={{display:'none'}} />
                  <div className="upload-icon">
                    {sourceImage
                      ? <CheckCircle2 style={{width:22,height:22,color:'var(--emerald)'}} />
                      : <Upload style={{width:22,height:22,color:'var(--accent)'}} />
                    }
                  </div>
                  {sourceImage ? (
                    <>
                      <div style={{fontWeight:700,fontSize:13.5,marginBottom:3}}>Image loaded ✓</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>Click or drop to replace</div>
                    </>
                  ) : (
                    <>
                      <div style={{fontWeight:700,fontSize:13.5,marginBottom:3}}>Drop your photo here</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>JPEG · PNG · WEBP · Max 10 MB</div>
                    </>
                  )}
                </div>

                {/* Status badges */}
                {(croppedImage || processedImage) && (
                  <div className="badges">
                    {croppedImage   && <span className="badge badge-crop"><Crop style={{width:10,height:10}}/> Cropped</span>}
                    {processedImage && <span className="badge badge-bg"><Sparkles style={{width:10,height:10}}/> BG removed</span>}
                  </div>
                )}

                {error && (
                  <div className="err">
                    <AlertCircle style={{width:14,height:14,flexShrink:0,marginTop:1}} /> {error}
                  </div>
                )}

                {/* Action row */}
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={() => setShowCrop(true)} disabled={!sourceImage}>
                    <Crop style={{width:14,height:14}} /> Crop
                  </button>
                  <button className="btn btn-ai" onClick={processImage} disabled={!workingImage || isProcessing}>
                    {isProcessing
                      ? <><Loader2 style={{width:14,height:14,animation:'spin 1s linear infinite'}}/>{processStatus}</>
                      : <><Sparkles style={{width:14,height:14}}/>Remove BG</>
                    }
                  </button>
                </div>

                {(isProcessing || processedImage) && (
                  <>
                    <div className="prog-track">
                      <div className="prog-fill" style={{width:`${processProgress}%`}} />
                    </div>
                    {processStatus && <div className="prog-label">{processStatus}</div>}
                  </>
                )}
              </div>

              {/* Settings card */}
              <div className="card">
                <p className="card-label">Step 2 — Print Settings</p>

                <div style={{marginBottom:22}}>
                  <div className="setting-lbl"><Palette style={{width:12,height:12}}/>Background Color</div>
                  <div className="color-row">
                    {PRESET_COLORS.map(({value,label}) => (
                      <button key={value} className={`swatch ${bgColor===value?'active':''}`}
                        style={{backgroundColor:value}} onClick={()=>setBgColor(value)} title={label} />
                    ))}
                    <div className="custom-wrap">
                      <div className="custom-btn">+</div>
                      <input type="color" className="custom-input" value={bgColor} onChange={e=>setBgColor(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="slider-hdr">
                    <div className="setting-lbl" style={{margin:0}}><SlidersHorizontal style={{width:12,height:12}}/>Copies on A4</div>
                    <div className="slider-val">{copies} / 20 photos</div>
                  </div>
                  <input type="range" min="1" max="20" value={copies} onChange={e=>setCopies(+e.target.value)} />
                  <div className="slider-hints"><span>1</span><span>Max 20 per A4 page</span><span>20</span></div>
                  <div className="sheet-vis">
                    {Array.from({length:20}).map((_,i) => (
                      <div key={i} className="dot" style={{background:i<copies?'var(--accent)':'rgba(255,255,255,0.055)'}} />
                    ))}
                  </div>
                  <div style={{fontSize:10.5,color:'var(--muted)',textAlign:'center',marginTop:6}}>Blue = photos · Grey = empty space · 4 columns × 5 rows</div>
                </div>
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="right">
              {/* Preview */}
              <div className="preview-card">
                <p className="card-label">Live Preview · 3.5 × 4.5 cm</p>
                <div className="preview-stage">
                  {workingImage ? (
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:13,position:'relative',zIndex:1}}>
                      <div className="passport-frame" style={{backgroundColor:bgColor}}>
                        <img
                          src={processedImage || workingImage}
                          alt="Passport preview"
                          style={{opacity:isProcessing?0.5:1,transition:'opacity 0.3s'}}
                        />
                        {isProcessing && (
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.28)',backdropFilter:'blur(2px)'}}>
                            <Loader2 style={{width:17,height:17,color:'white',animation:'spin 1s linear infinite'}} />
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                        <span className="frame-badge">35 mm × 45 mm</span>
                        {processedImage && (
                          <span style={{fontSize:11,color:'var(--emerald)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                            <CheckCircle2 style={{width:11,height:11}}/>Background removed
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{textAlign:'center',color:'var(--muted)',position:'relative',zIndex:1}}>
                      <div className="empty-icon"><ImageIcon style={{width:21,height:21,color:'var(--muted)'}}/></div>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>No image yet</div>
                      <div style={{fontSize:12}}>Upload a photo to preview</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Download panel */}
              <DownloadPanel compositeUrl={compositeUrl} bgColor={bgColor} />

              {/* Print */}
              <button className="btn-print" onClick={handlePrint} disabled={!workingImage}>
                <Printer style={{width:17,height:17}} />
                Print A4 Sheet ({copies} photos)
              </button>

              <div className="tip-box">
                <strong style={{color:'var(--text)'}}>Print tip:</strong> A dedicated print window opens automatically with a fixed 4-column A4 grid. Just hit <em>Print</em> — no scale adjustments needed. Disable browser headers/footers for the cleanest output.
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Crop modal */}
      {showCrop && sourceImage && (
        <CropModal imageUrl={sourceImage} onCrop={handleCropDone} onClose={() => setShowCrop(false)} />
      )}

    </>
  );
}