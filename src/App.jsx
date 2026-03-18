import React, { useState, useRef, useEffect } from 'react';
import { Upload, Printer, Image as ImageIcon, Loader2, Palette, AlertCircle, CheckCircle2 } from 'lucide-react';
import removeBackground from '@imgly/background-removal';

export default function App() {
  const [sourceImage, setSourceImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [copies, setCopies] = useState(30);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (sourceImage) URL.revokeObjectURL(sourceImage);
      if (processedImage) URL.revokeObjectURL(processedImage);
    };
  }, [sourceImage, processedImage]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setProcessedImage(null); // Reset processed image on new upload
  };

  const processImage = async () => {
    if (!sourceImage) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProcessStatus('Loading AI Model (this takes a moment on first run)...');

      // Fetch the image blob from the object URL
      const response = await fetch(sourceImage);
      const blob = await response.blob();

      setProcessStatus('Removing background...');
      
      // Run local WASM background removal
      const processedBlob = await removeBackground(blob);
      
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
      setProcessStatus('Complete!');
    } catch (err) {
      console.error(err);
      setError('Failed to process image. It might be too large or the browser blocked the AI model.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessStatus(''), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* --- CSS for Print Layout --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          
          #print-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, 35mm);
            gap: 5mm;
            width: 190mm; /* A4 width minus margins */
            align-content: start;
          }
          
          .passport-box {
            width: 35mm;
            height: 45mm;
            border: 1px solid #ccc;
            overflow: hidden;
            position: relative;
            background-color: ${bgColor};
          }
          
          .passport-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 15%; /* Favor face area */
          }
        }
        .print-only { display: none; }
      `}} />

      {/* --- UI Section (Hidden during print) --- */}
      <div className="no-print max-w-5xl mx-auto p-6">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <ImageIcon className="text-blue-600" />
            Smart Passport Photo Maker
          </h1>
          <p className="text-gray-500 mt-2">100% Private • Processes in your browser • No server uploads</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Controls */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">1. Upload & Process</h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${sourceImage ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/png, image/jpeg, image/webp" 
                className="hidden" 
              />
              {sourceImage ? (
                <div className="flex flex-col items-center text-green-700">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <span className="font-medium">Image Loaded</span>
                  <span className="text-sm mt-1 text-green-600">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <Upload className="w-10 h-10 mb-2 text-gray-400" />
                  <span className="font-medium text-gray-700">Click or drag image here</span>
                  <span className="text-sm mt-1">JPEG, PNG up to 10MB</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={processImage}
              disabled={!sourceImage || isProcessing}
              className={`mt-6 w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${!sourceImage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {processStatus}</>
              ) : (
                <><ImageIcon className="w-5 h-5" /> Remove Background</>
              )}
            </button>

            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">2. Setup Output</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4" /> Background Color
                  </label>
                  <div className="flex gap-3">
                    {['#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(color => (
                      <button
                        key={color}
                        onClick={() => setBgColor(color)}
                        className={`w-8 h-8 rounded-full border-2 shadow-sm ${bgColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'} transition-transform`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Copies (A4 Sheet): {copies}
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="35" 
                    value={copies} 
                    onChange={(e) => setCopies(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <button
                onClick={handlePrint}
                disabled={!sourceImage}
                className={`mt-8 w-full py-4 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg transition-all ${!sourceImage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'}`}
              >
                <Printer className="w-6 h-6" /> Print A4 Sheet
              </button>
            </div>
          </div>

          {/* Right Column: Live Preview */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Live Preview (35mm x 45mm)</h2>
            <div className="flex-1 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center p-8 overflow-hidden">
              {sourceImage ? (
                <div 
                  className="relative shadow-2xl transition-all duration-300"
                  style={{ 
                    width: '35mm', 
                    height: '45mm', 
                    backgroundColor: bgColor,
                    transform: 'scale(1.5)', // Scaled up just for visual preview on screen
                    transformOrigin: 'center'
                  }}
                >
                  <img 
                    src={processedImage || sourceImage} 
                    alt="Passport Preview" 
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 15%' }} // Keeps face centered
                  />
                </div>
              ) : (
                <p className="text-gray-400 text-center">Upload an image to see<br/>the standard 3.5x4.5cm preview</p>
              )}
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

