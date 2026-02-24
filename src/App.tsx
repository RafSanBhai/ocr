/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Copy,
  Download,
  Loader2,
  Check,
  AlertCircle,
  X,
  FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OCRResult {
  text: string;
  fileName: string;
  timestamp: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Unsupported file type. Please upload a PDF or an image (JPG, PNG, WEBP).");
      return;
    }

    // Vercel Function payload limit is small (~4.5MB). Base64 inflates size.
    // Keep upload size low to avoid 413 errors.
    const MAX_MB = 3;
    if (selectedFile.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB}MB for Vercel deployment.`);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = String(reader.result).split(',')[1] || '';
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(f);
    });

  const processOCR = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = await fileToBase64(file);

      // ✅ Call Vercel Serverless API (keeps Gemini key secret)
      const resp = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type,
          fileName: file.name
        })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data?.error || 'OCR failed. Please try again.');
      }

      const text = data?.text || "No text could be extracted.";

      setResult({
        text,
        fileName: file.name,
        timestamp: new Date().toLocaleString()
      });
    } catch (err: any) {
      console.error("OCR Error:", err);
      setError(err?.message || "An error occurred during text extraction. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!result) return;
    const element = document.createElement("a");
    const fileBlob = new Blob([result.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${result.fileName.split('.')[0]}_extracted.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto relative">
      {/* Header */}
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center gap-3">
            <span className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-bold italic">L</span>
            Lumina OCR
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Professional document intelligence powered by Gemini AI</p>
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">System Status</span>
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Section */}
        <section className="lg:col-span-5 space-y-6">
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`
              relative border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[320px]
              ${file ? 'border-black bg-white shadow-xl' : 'border-slate-200 hover:border-slate-400 bg-white/50'}
            `}
          >
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileUp className="text-slate-400 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">Drop your document here</h3>
                  <p className="text-slate-500 text-sm mt-2 mb-6">PDF, JPG, PNG, WEBP up to 3MB</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-black/10"
                  >
                    Select File
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full text-center"
                >
                  <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                    {file.type === 'application/pdf' ? (
                      <FileText className="text-emerald-600 w-10 h-10" />
                    ) : (
                      <ImageIcon className="text-emerald-600 w-10 h-10" />
                    )}
                    <button
                      onClick={reset}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 shadow-sm"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 truncate max-w-[240px] mx-auto">{file.name}</h3>
                  <p className="text-slate-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                  <div className="mt-8 space-y-3">
                    {!result && (
                      <button
                        onClick={processOCR}
                        disabled={isProcessing}
                        className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Extracting Text...
                          </>
                        ) : (
                          'Start Extraction'
                        )}
                      </button>
                    )}
                    <button
                      onClick={reset}
                      disabled={isProcessing}
                      className="w-full py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors text-sm"
                    >
                      Choose another file
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Capabilities</h4>
            <ul className="space-y-3">
              {[
                "Multi-page PDF support",
                "Handwriting recognition",
                "Table structure preservation",
                "High-res image processing"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Results Section */}
        <section className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-bottom border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Extracted Content</h3>
                  {result && (
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                      Processed at {result.timestamp}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!result}
                  className={`p-2 rounded-lg transition-all ${result ? 'hover:bg-white hover:shadow-sm text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={downloadTxt}
                  disabled={!result}
                  className={`p-2 rounded-lg transition-all ${result ? 'hover:bg-white hover:shadow-sm text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Download as .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10"
                  >
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium text-slate-600">Analyzing document structure...</p>
                  </motion.div>
                ) : !result ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 p-12 text-center"
                  >
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm">Upload and process a file to see results here</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 h-full overflow-y-auto font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap selection:bg-black selection:text-white"
                  >
                    {result.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {result && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {result.text.split(/\s+/).length} Words • {result.text.length} Characters
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Success</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
        <p>© 2026 Lumina Intelligence Systems. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
