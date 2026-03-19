import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Printer, Image as ImageIcon, Loader2, Palette, AlertCircle, CheckCircle2, SlidersHorizontal, Sparkles, Camera, ChevronRight } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

const PRESET_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#dbeafe', label: 'Sky Blue' },
  { value: '#e0f2fe', label: 'Light Blue' },
  { value: '#f0fdf4', label: 'Mint' },
  { value: '#fef9c3', label: 'Cream' },
  { value: '#fee2e2', label: 'Blush' },
];

const Step = ({ number, label, active, done }) => (
  <div className={`flex items-center gap-2 transition-all duration-300 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-30'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
      ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-white border-white text-slate-900' : 'border-slate-600 text-slate-400'}`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : number}
    </div>
    <span className={`text-sm font-semibold tracking-wide ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</span>
  </div>
);

export default function App() {
  const [sourceImage, setSourceImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [processProgress, setProcessProgress] = useState(0);
  const [bgColor, setBgColor] = useState('#dbeafe');
  const [copies, setCopies] = useState(8);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (sourceImage) setActiveStep(2);
    if (processedImage) setActiveStep(3);
  }, [sourceImage, processedImage]);

  useEffect(() => {
    return () => {
      if (sourceImage) URL.revokeObjectURL(sourceImage);
      if (processedImage) URL.revokeObjectURL(processedImage);
    };
  }, [sourceImage, processedImage]);

  useEffect(() => {
    let interval;
    if (isProcessing) {
      setProcessProgress(5);
      interval = setInterval(() => {
        setProcessProgress(p => Math.min(p + Math.random() * 8, 85));
      }, 400);
    } else {
      setProcessProgress(processedImage ? 100 : 0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, processedImage]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setProcessedImage(null);
  };

  const onFileChange = (e) => handleFile(e.target.files?.[0]);

  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);

  const processImage = async () => {
    if (!sourceImage) return;
    try {
      setIsProcessing(true);
      setError(null);
      setProcessStatus('Loading AI model…');
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      setProcessStatus('Removing background…');
      const processedBlob = await removeBackground(blob);
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
      setProcessStatus('Done!');
    } catch (err) {
      console.error(err);
      setError('Processing failed. The image may be too large or your browser blocked the AI model.');
      setProcessProgress(0);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessStatus(''), 3000);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0c0f1a;
          --surface: #131929;
          --surface2: #1a2236;
          --border: rgba(255,255,255,0.07);
          --border-accent: rgba(99,179,237,0.3);
          --text: #e8ecf4;
          --muted: #6b7a99;
          --accent: #4f9cf9;
          --accent2: #7c3aed;
          --emerald: #10b981;
          --danger: #f87171;
          --font-body: 'DM Sans', sans-serif;
          --font-display: 'DM Serif Display', serif;
          --radius: 16px;
          --radius-sm: 10px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }

        .app-wrapper {
          min-height: 100vh;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(79,156,249,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(124,58,237,0.10) 0%, transparent 60%);
        }

        /* ─── Topbar ─── */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid var(--border);
          background: rgba(13,16,27,0.8);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        .logo-text { font-family: var(--font-display); font-size: 1.15rem; color: var(--text); }
        .topbar-steps { display: flex; align-items: center; gap: 20px; }
        .step-divider { width: 32px; height: 1px; background: rgba(255,255,255,0.12); }

        /* ─── Main Layout ─── */
        .main { max-width: 1180px; margin: 0 auto; padding: 40px 24px 60px; }

        .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

        /* ─── Cards ─── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,156,249,0.4), transparent);
        }
        .card-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 20px;
        }

        /* ─── Upload Zone ─── */
        .upload-zone {
          border: 1.5px dashed var(--border-accent);
          border-radius: var(--radius);
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease;
          background: rgba(79,156,249,0.03);
          position: relative;
        }
        .upload-zone:hover { border-color: var(--accent); background: rgba(79,156,249,0.07); }
        .upload-zone.dragging { border-color: var(--accent); background: rgba(79,156,249,0.12); transform: scale(1.01); }
        .upload-zone.has-image { border-color: var(--emerald); background: rgba(16,185,129,0.05); }

        .upload-icon-wrap {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: rgba(79,156,249,0.1);
          border: 1px solid rgba(79,156,249,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          transition: all 0.25s;
        }
        .upload-zone:hover .upload-icon-wrap { background: rgba(79,156,249,0.18); transform: scale(1.08); }
        .upload-zone.has-image .upload-icon-wrap { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }

        .upload-label { font-size: 0.95rem; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .upload-sublabel { font-size: 0.8rem; color: var(--muted); }

        /* ─── Buttons ─── */
        .btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: var(--radius-sm);
          border: none;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }
        .btn-ai {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: white;
          box-shadow: 0 4px 20px rgba(79,156,249,0.25);
        }
        .btn-ai:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(79,156,249,0.35); }
        .btn-ai:disabled { background: var(--surface2); color: var(--muted); box-shadow: none; cursor: not-allowed; }
        .btn-print {
          background: var(--emerald);
          color: white;
          box-shadow: 0 4px 20px rgba(16,185,129,0.2);
        }
        .btn-print:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(16,185,129,0.3); }
        .btn-print:disabled { background: var(--surface2); color: var(--muted); box-shadow: none; cursor: not-allowed; }

        /* ─── Progress Bar ─── */
        .progress-track { height: 4px; background: var(--surface2); border-radius: 99px; overflow: hidden; margin-top: 16px; }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          border-radius: 99px;
          transition: width 0.4s ease;
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute; right: 0; top: 0; bottom: 0;
          width: 40px;
          background: rgba(255,255,255,0.3);
          filter: blur(4px);
          animation: shimmer 1s ease-in-out infinite;
        }
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }

        /* ─── Status ─── */
        .status-text { font-size: 0.8rem; color: var(--accent); font-weight: 600; text-align: center; margin-top: 10px; letter-spacing: 0.04em; }
        .error-box { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: var(--danger); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 0.83rem; display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; line-height: 1.5; }

        /* ─── Color Picker ─── */
        .setting-label { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
        .color-grid { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .color-swatch {
          width: 36px; height: 36px;
          border-radius: 9px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          position: relative;
        }
        .color-swatch:hover { transform: scale(1.12); }
        .color-swatch.active { border-color: white; box-shadow: 0 0 0 3px rgba(255,255,255,0.15); transform: scale(1.12); }
        .color-custom-wrap { position: relative; }
        .color-custom-input { opacity: 0; position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; border: none; }
        .color-custom-btn {
          width: 36px; height: 36px;
          border-radius: 9px;
          border: 1.5px dashed var(--muted);
          background: var(--surface2);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .color-custom-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* ─── Slider ─── */
        .slider-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .slider-badge { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
        input[type=range] { width: 100%; height: 5px; appearance: none; background: var(--surface2); border-radius: 99px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 3px solid var(--accent); box-shadow: 0 2px 8px rgba(79,156,249,0.4); cursor: pointer; }
        .slider-hints { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); margin-top: 8px; }

        /* ─── Preview Panel ─── */
        .preview-outer {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 90px;
        }
        .preview-inner {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          min-height: 300px;
          display: flex; align-items: center; justify-content: center;
          padding: 32px;
          position: relative;
          overflow: hidden;
        }
        .preview-inner::before {
          content: '';
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 10px);
        }
        .passport-preview {
          width: 133px; height: 171px;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
          position: relative;
          transition: all 0.4s ease;
          flex-shrink: 0;
        }
        .passport-preview img { width: 100%; height: 100%; object-fit: cover; object-position: center 10%; display: block; }
        .preview-meta { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .preview-badge {
          background: rgba(79,156,249,0.1);
          border: 1px solid rgba(79,156,249,0.2);
          color: var(--accent);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 99px;
        }
        .preview-empty { text-align: center; color: var(--muted); }
        .preview-empty-icon { width: 56px; height: 56px; background: var(--surface); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; border: 1px solid var(--border); }

        /* ─── Sheet Visualizer ─── */
        .sheet-vis {
          display: flex; flex-wrap: wrap;
          gap: 4px;
          padding: 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          max-height: 100px;
          overflow: hidden;
        }
        .sheet-dot {
          width: 10px; height: 13px;
          border-radius: 2px;
          transition: background 0.3s;
        }

        /* ─── Print ─── */
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: fixed; inset: 0;
            display: grid !important;
            grid-template-columns: repeat(auto-fill, 35mm);
            gap: 5mm;
            width: 190mm;
            align-content: start;
            padding: 0;
          }
          .passport-box {
            width: 35mm; height: 45mm;
            border: 0.5px solid #ccc;
            overflow: hidden;
          }
          .passport-box img { width: 100%; height: 100%; object-fit: cover; object-position: center 10%; display: block; }
        }
      `}</style>

      <div className="app-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-icon">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="logo-text">Passport Studio</span>
          </div>
          <div className="topbar-steps">
            <Step number="1" label="Upload" active={activeStep === 1} done={activeStep > 1} />
            <div className="step-divider" />
            <Step number="2" label="Process" active={activeStep === 2} done={activeStep > 2} />
            <div className="step-divider" />
            <Step number="3" label="Print" active={activeStep === 3} done={false} />
          </div>
          <div style={{ width: 120 }} />
        </header>

        <main className="main">
          <div className="layout">

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Upload Card */}
              <div className="card">
                <p className="card-title">Step 1 — Choose Photo</p>

                <div
                  className={`upload-zone ${isDragging ? 'dragging' : ''} ${sourceImage ? 'has-image' : ''}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file" ref={fileInputRef} onChange={onFileChange}
                    accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                  />
                  <div className="upload-icon-wrap">
                    {sourceImage
                      ? <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--emerald)' }} />
                      : <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                    }
                  </div>
                  {sourceImage ? (
                    <>
                      <div className="upload-label">Image loaded ✓</div>
                      <div className="upload-sublabel">Click or drop to replace</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-label">Drop your photo here</div>
                      <div className="upload-sublabel">JPEG · PNG · WEBP &nbsp;·&nbsp; Max 10 MB</div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="error-box">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button className="btn btn-ai" onClick={processImage} disabled={!sourceImage || isProcessing} style={{ marginTop: 18 }}>
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{processStatus}</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />Remove Background with AI</>
                  )}
                </button>

                {(isProcessing || processedImage) && (
                  <>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${processProgress}%` }} />
                    </div>
                    {processStatus && <div className="status-text">{processStatus}</div>}
                  </>
                )}
              </div>

              {/* Settings Card */}
              <div className="card">
                <p className="card-title">Step 2 — Print Settings</p>

                {/* Background Color */}
                <div style={{ marginBottom: 28 }}>
                  <div className="setting-label"><Palette className="w-3.5 h-3.5" />Background Color</div>
                  <div className="color-grid">
                    {PRESET_COLORS.map(({ value, label }) => (
                      <button
                        key={value}
                        className={`color-swatch ${bgColor === value ? 'active' : ''}`}
                        style={{ backgroundColor: value }}
                        onClick={() => setBgColor(value)}
                        title={label}
                      />
                    ))}
                    <div className="color-custom-wrap">
                      <div className="color-custom-btn">+</div>
                      <input type="color" className="color-custom-input" value={bgColor} onChange={(e) => setBgColor(e.target.value)} title="Custom color" />
                    </div>
                  </div>
                </div>

                {/* Copies */}
                <div>
                  <div className="slider-row">
                    <div className="setting-label" style={{ margin: 0 }}><SlidersHorizontal className="w-3.5 h-3.5" />Number of Copies</div>
                    <div className="slider-badge">{copies} photos</div>
                  </div>
                  <input
                    type="range" min="1" max="35" value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value))}
                  />
                  <div className="slider-hints"><span>1</span><span>A4 capacity: up to 35</span><span>35</span></div>

                  {/* Sheet Visualizer */}
                  <div className="sheet-vis" style={{ marginTop: 14 }}>
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className="sheet-dot"
                        style={{ background: i < copies ? 'var(--accent)' : 'rgba(255,255,255,0.06)' }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                    Blue dots = photos on your A4 sheet
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Preview */}
            <div className="preview-outer">
              <div>
                <p className="card-title">Live Preview</p>
                <div className="preview-inner">
                  {sourceImage ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
                      <div className="passport-preview" style={{ backgroundColor: bgColor }}>
                        <img
                          src={processedImage || sourceImage}
                          alt="Passport preview"
                          style={{ opacity: isProcessing ? 0.5 : 1, transition: 'opacity 0.3s' }}
                        />
                        {isProcessing && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'white' }} />
                          </div>
                        )}
                      </div>
                      <div className="preview-meta">
                        <div className="preview-badge">3.5 cm × 4.5 cm</div>
                        {processedImage && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Background removed
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="preview-empty" style={{ position: 'relative', zIndex: 1 }}>
                      <div className="preview-empty-icon"><ImageIcon className="w-6 h-6" style={{ color: 'var(--muted)' }} /></div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}>No image yet</div>
                      <div style={{ fontSize: '0.78rem' }}>Upload a photo to preview</div>
                    </div>
                  )}
                </div>
              </div>

              <button className="btn btn-print" onClick={handlePrint} disabled={!sourceImage}>
                <Printer className="w-5 h-5" />
                Print A4 Sheet ({copies} photos)
              </button>

              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text)' }}>Print tip:</strong> In your browser's print dialog, set <em>Scale → Actual size</em> and disable <em>headers/footers</em> for accurate 35×45mm sizing.
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Print-only area */}
      <div id="print-area" style={{ display: 'none' }}>
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="passport-box">
            <img
              src={processedImage || sourceImage || ''}
              alt="Passport"
              style={{ backgroundColor: bgColor }}
            />
          </div>
        ))}
      </div>
    </>
  );
}