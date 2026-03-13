/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Download, 
  FileText, 
  Code, 
  Sun, 
  Moon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  AudioLines,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "AIzaSyAABjBNjVjSa2so97zgFZyuXODZ6pEtwhs" });

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile);
      setError(null);
      setTranscript("");
    } else if (selectedFile) {
      setError("Please select a valid audio file.");
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const generateCaptions = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = await convertFileToBase64(file);
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
              { 
                text: "Transcribe this audio into a professional transcript. If possible, include timestamps in [MM:SS] format at the beginning of logical segments. Provide only the transcript text." 
              },
            ],
          },
        ],
      });

      const text = response.text;
      if (text) {
        setTranscript(text);
      } else {
        throw new Error("No transcript generated.");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message || "Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup with a small delay to ensure the browser handles the click
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback for small files if Blob fails
      const link = document.createElement('a');
      link.href = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content);
      link.download = filename;
      link.click();
    }
  };

  const exportAsTxt = () => {
    downloadFile(transcript, `${file?.name.split('.')[0] || 'captions'}.txt`, 'text/plain');
  };

  const exportAsXml = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<transcript>
  <filename>${file?.name || 'unknown'}</filename>
  <content>
    ${transcript.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </content>
</transcript>`;
    downloadFile(xmlContent, `${file?.name.split('.')[0] || 'captions'}.xml`, 'application/xml');
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 flex flex-col ${theme === 'dark' ? 'bg-purple-fade-dark text-purple-100' : 'bg-purple-fade-light text-purple-950'}`}>
      
      {/* Header */}
      <header className="border-b border-purple-100 dark:border-purple-800/30 px-6 py-4 flex justify-between items-center bg-white/30 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <AudioLines className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight dark:text-white">CaptionGen <span className="text-purple-600">.</span></h1>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[10px] font-bold text-purple-400 dark:text-purple-400 uppercase tracking-[0.2em] hidden sm:inline">Dev: Mayank</span>
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 p-1 flex items-center cursor-pointer transition-all border border-purple-200 dark:border-purple-800/50"
            aria-label="Toggle theme"
          >
            <motion.div 
              className="w-5 h-5 rounded-full bg-white dark:bg-purple-400 shadow-md flex items-center justify-center"
              animate={{ x: theme === 'light' ? 0 : 28 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {theme === 'light' ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} className="text-purple-950" />}
            </motion.div>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-12">
        <div className="space-y-10">
          
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-violet-600 dark:bg-none dark:text-white">
                Audio to Captions
              </h2>
              <p className="text-purple-600/60 dark:text-purple-300/50 max-w-md mx-auto mt-4 font-medium">
                Transform your audio into professional transcripts with AI-powered precision and elegant formatting.
              </p>
            </motion.div>
          </section>

          {/* Upload Area */}
          <section>
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative overflow-hidden border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all
                ${file ? 'border-purple-500 bg-purple-500/5' : 'border-purple-200 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-500 bg-white/40 dark:bg-white/5'}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="audio/*" 
                className="hidden" 
              />
              
              <div className="flex flex-col items-center gap-5">
                <div className={`p-5 rounded-2xl shadow-inner ${file ? 'bg-purple-100 text-purple-600' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-300 dark:text-purple-700'}`}>
                  {file ? <CheckCircle2 size={36} /> : <Upload size={36} />}
                </div>
                <div>
                  <p className="font-bold text-xl tracking-tight dark:text-white">
                    {file ? file.name : "Drop your audio here"}
                  </p>
                  <p className="text-sm text-purple-400 dark:text-purple-500 mt-1">
                    Professional grade transcription for MP3, WAV, M4A
                  </p>
                </div>
                {file && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTranscript("");
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={12} /> Remove File
                  </button>
                )}
              </div>
            </motion.div>
          </section>

          {/* Action Button */}
          <section className="flex justify-center">
            <button
              onClick={generateCaptions}
              disabled={!file || isProcessing}
              className={`
                relative group px-10 py-4 rounded-2xl font-bold text-white transition-all flex items-center gap-3 overflow-hidden
                ${!file || isProcessing 
                  ? 'bg-purple-200 dark:bg-purple-900/20 text-purple-400 dark:text-purple-800 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:shadow-2xl hover:shadow-purple-500/40 active:scale-95'}
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  Generate Transcript
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </>
              )}
            </button>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-4 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result Section */}
          <AnimatePresence>
            {transcript && (
              <motion.section 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2.5 dark:text-white">
                    <div className="w-2 h-6 bg-purple-500 rounded-full" />
                    Transcript Output
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={exportAsTxt}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-800/40 text-xs font-bold transition-all shadow-sm dark:text-white"
                    >
                      <FileText size={14} className="text-purple-500" /> TXT
                    </button>
                    <button 
                      onClick={exportAsXml}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-800/40 text-xs font-bold transition-all shadow-sm dark:text-white"
                    >
                      <Code size={14} className="text-purple-500" /> XML
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-violet-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative bg-white/70 dark:bg-black/40 border border-purple-100 dark:border-purple-800/30 rounded-3xl p-8 backdrop-blur-sm">
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-purple-900/80 dark:text-purple-100/80 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                      {transcript}
                    </pre>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-10 text-center border-t border-purple-50 dark:border-purple-900/20">
        <p className="text-[10px] font-bold text-purple-300 dark:text-purple-800 uppercase tracking-[0.4em]">
          Professional Transcription Suite • Mayank
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
        }
      `}</style>
    </div>
  );
}
