import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Printer, Image as ImageIcon, Loader2, Palette, AlertCircle, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

export default function App() {
  const [sourceImage, setSourceImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [copies, setCopies] = useState(30);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (sourceImage) URL.revokeObjectURL(sourceImage);
      if (processedImage) URL.revokeObjectURL(processedImage);
    };
  }, [sourceImage, processedImage]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG).');
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setProcessedImage(null); // Reset on new upload
  };

  const onFileChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  // Drag and Drop Handlers
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

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
      setProcessStatus('Loading AI Model...');

      const response = await fetch(sourceImage);
      const blob = await response.blob();

      setProcessStatus('Removing background...');
      const processedBlob = await removeBackground(blob);

      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
      setProcessStatus('Complete!');
    } catch (err) {
      console.error(err);
      setError('Processing failed. The image might be too complex or the browser blocked the AI model.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessStatus(''), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans text-gray-800 selection:bg-blue-100 selection:text-blue-900">

      {/* --- CSS for Print Layout (Strictly preserved for standard sizing) --- */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          
          #print-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, 35mm);
            gap: 5mm;
            width: 190mm;
            align-content: start;
          }
          
          .passport-box {
            width: 35mm;
            height: 45mm;
            border: 1px solid #e5e7eb;
            overflow: hidden;
            position: relative;
            background-color: ${bgColor};
          }
          
          .passport-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 15%;
          }
        }
        .print-only { display: none; }
      `}} />

      {/* --- Main Application UI --- */}
      <div className="no-print max-w-6xl mx-auto px-4 py-8 md:py-12 lg:px-8">

        {/* Header */}
        <header className="mb-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-2 shadow-sm border border-blue-100">
            <ImageIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Smart Passport Photo Maker
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base">
            Create standard 3.5x4.5cm passport photos instantly. <br className="hidden md:block" />
            <span className="font-medium text-gray-700">100% Private • Processes in your browser</span>
          </p>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

          {/* Left Column: Tools & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Card 1: Upload & AI Processing */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100/50 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

              <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-gray-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">1</span>
                Image Setup
              </h2>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group border-2 border-dashed rounded-2xl p-8 md:p-10 text-center cursor-pointer transition-all duration-200 ease-in-out
                  ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' :
                    sourceImage ? 'border-green-300 bg-green-50/50 hover:bg-green-50' :
                      'border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-gray-50'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                {sourceImage ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600 shadow-sm group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="font-semibold text-gray-800 text-lg">Image Ready</span>
                    <span className="text-sm mt-1 text-gray-500">Click or drag a new image to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-gray-100 text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                      <Upload className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-gray-700 text-lg">Click to upload or drag & drop</span>
                    <span className="text-sm mt-2 text-gray-500">Supports JPEG, PNG (Max 10MB)</span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50/80 text-red-700 rounded-xl flex items-start gap-3 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={processImage}
                disabled={!sourceImage || isProcessing}
                className={`mt-6 w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-200
                  ${!sourceImage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                    isProcessing ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg hover:-translate-y-0.5'}
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{processStatus}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Remove Background with AI
                  </>
                )}
              </button>
            </div>

            {/* Card 2: Print Settings */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100/50 backdrop-blur-sm relative overflow-hidden">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">2</span>
                Print Settings
              </h2>

              <div className="space-y-8">
                {/* Color Picker */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Palette className="w-4 h-4 text-gray-400" /> Background Color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {['#ffffff', '#eff6ff', '#e0f2fe', '#dbeafe', '#f1f5f9', '#fee2e2'].map(color => (
                      <button
                        key={color}
                        onClick={() => setBgColor(color)}
                        className={`w-10 h-10 rounded-xl border shadow-sm transition-all duration-200 flex items-center justify-center
                          ${bgColor === color ? 'border-gray-900 scale-110 ring-2 ring-gray-900/20 ring-offset-2' : 'border-gray-200 hover:scale-105 hover:border-gray-300'}
                        `}
                        style={{ backgroundColor: color }}
                        aria-label={`Select background color ${color}`}
                      >
                        {bgColor === color && color === '#ffffff' && <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>}
                      </button>
                    ))}
                    <div className="relative group">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0 opacity-0 absolute inset-0 z-10"
                        title="Custom Color"
                      />
                      <div className="w-10 h-10 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                        <span className="text-xl leading-none text-gray-400">+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copies Slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <SlidersHorizontal className="w-4 h-4 text-gray-400" /> Number of Copies
                    </label>
                    <span className="bg-gray-100 text-gray-800 py-1 px-3 rounded-lg text-sm font-bold">
                      {copies} photos
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                    <span>1</span>
                    <span>Standard A4 Sheet Capacity</span>
                    <span>35</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Preview & Print Action */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Live Preview Card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100/50 flex-1 flex flex-col">
              <h2 className="text-xl font-bold mb-2 text-gray-800">Live Preview</h2>
              <p className="text-sm text-gray-500 mb-6">Standard 3.5cm x 4.5cm ratio</p>

              <div className="flex-1 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center p-4 md:p-8 min-h-[300px]">
                {sourceImage ? (
                  <div className="flex flex-col items-center gap-6">
                    <div
                      className="relative shadow-2xl rounded-sm transition-all duration-300 ring-1 ring-black/5"
                      style={{
                        width: '140px', // Exact 3.5 aspect ratio scaled up for viewability
                        height: '180px', // Exact 4.5 aspect ratio scaled up
                        backgroundColor: bgColor,
                      }}
                    >
                      <img
                        src={processedImage || sourceImage}
                        alt="Passport Preview"
                        className="w-full h-full object-cover transition-opacity duration-300"
                        style={{
                          objectPosition: 'center 15%',
                          opacity: isProcessing ? 0.5 : 1
                        }}
                      />
                      {isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                      Actual Print Size: 35mm × 45mm
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center mb-3">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                    <p>Upload an image to preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Print Button (Sticky on mobile, static on desktop) */}
            <div className="sticky bottom-4 z-10 lg:static">
              <button
                onClick={handlePrint}
                disabled={!sourceImage}
                className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg transition-all duration-200 shadow-xl
                  ${!sourceImage ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' :
                    'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 hover:shadow-blue-500/25'}
                `}
              >
                <Printer className="w-6 h-6" />
                Print A4 Sheet
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* --- Actual Print Layout Area (Visible only when printing) --- */}
      <div className="print-only">
        <div id="print-grid">
          {Array.from({ length: copies }).map((_, index) => (
            <div key={index} className="passport-box">
              <img
                src={processedImage || sourceImage}
                alt="Passport"
                className="passport-img"
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
