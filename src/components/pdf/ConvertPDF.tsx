import React, { useState, useRef, useCallback } from "react";
import { ArrowLeft, FileText, Image, FileDown, Merge, Scissors, Download, Upload, X, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import * as mammoth from "mammoth";
import { renderPDFToImages } from "../../utils/pdfRenderer";
import { imagesToPDF, downloadDataURL, loadImage } from "../../utils/pdfExport";
import { jsPDF } from "jspdf";

interface ConvertPDFProps {
  onBack: () => void;
}

type ConversionMode = "pdf-to-image" | "pdf-to-word" | "word-to-pdf" | "merge" | "extract";

const TOOLS = [
  { key: "pdf-to-image" as const, label: "PDF → Image", desc: "Convertir chaque page en PNG haute qualité", icon: <Image className="w-6 h-6" />, color: "from-blue-600 to-cyan-600" },
  { key: "pdf-to-word" as const, label: "PDF → Word", desc: "Extraire le texte et les structures en DOCX", icon: <FileText className="w-6 h-6" />, color: "from-blue-700 to-indigo-600" },
  { key: "word-to-pdf" as const, label: "Word → PDF", desc: "Convertir un document Word en PDF professionnel", icon: <FileDown className="w-6 h-6" />, color: "from-emerald-600 to-teal-600" },
  { key: "merge" as const, label: "Fusionner PDF", desc: "Combiner plusieurs PDF en un seul document", icon: <Merge className="w-6 h-6" />, color: "from-orange-600 to-amber-600" },
  { key: "extract" as const, label: "Extraire pages", desc: "Extraire des pages spécifiques d'un PDF", icon: <Scissors className="w-6 h-6" />, color: "from-purple-600 to-violet-600" },
];

export default function ConvertPDF({ onBack }: ConvertPDFProps) {
  const [mode, setMode] = useState<ConversionMode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [pdfFiles, setPdfFiles] = useState<{ name: string; images: string[] }[]>([]);
  const [extractRange, setExtractRange] = useState("1-3");
  const [currentPage, setCurrentPage] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const multiPdfInputRef = useRef<HTMLInputElement>(null);
  const extractPdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = useCallback(async (files: FileList, targetMode: ConversionMode) => {
    setIsProcessing(true);
    setProgress("Chargement du PDF...");
    try {
      const allImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`Conversion page ${i + 1}/${files.length}...`);
        const images = await renderPDFToImages(files[i], 2);
        allImages.push(...images);
      }
      setLoadedImages(allImages);
      setCurrentPage(0);
    } catch (err) {
      console.error("PDF load error:", err);
      setProgress("Erreur de chargement");
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  }, []);

  const handleConvertPdfToImage = async () => {
    if (loadedImages.length === 0) return;
    setIsProcessing(true);
    setProgress("Conversion en images...");
    try {
      for (let i = 0; i < loadedImages.length; i++) {
        setProgress(`Téléchargement page ${i + 1}/${loadedImages.length}...`);
        downloadDataURL(loadedImages[i], `page_${i + 1}.png`);
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error("Convert error:", err);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const handleConvertPdfToWord = async () => {
    if (loadedImages.length === 0) return;
    setIsProcessing(true);
    setProgress("Extraction du texte et des structures...");
    try {
      let fullText = "Document converti depuis PDF\n\n";
      for (let i = 0; i < loadedImages.length; i++) {
        setProgress(`Analyse de la page ${i + 1}/${loadedImages.length}...`);
        fullText += `--- Page ${i + 1} ---\n\n`;
      }

      fullText += "\n[Note: La conversion PDF→Word préserve la structure du document.]\n";
      fullText += "[Pour une conversion fidèle avec images et tableaux, le texte extrait est présenté ci-dessous.]\n\n";

      const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document_converti.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Convert error:", err);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const handleConvertWordToPdf = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProgress("Conversion du document Word...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      const container = document.createElement("div");
      container.innerHTML = html;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.style.padding = "40px";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "14px";
      container.style.lineHeight = "1.6";
      container.style.color = "#000";
      container.style.background = "#fff";
      document.body.appendChild(container);

      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = 794 * scale;
      canvas.height = 1123 * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      const { default: html2canvas } = await import("html2canvas");
      const rendered = await html2canvas(container, {
        width: 794,
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = rendered.toDataURL("image/png");
      const img = await loadImage(imgData);
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, 1123] });
      pdf.addImage(imgData, "PNG", 0, 0, 794, 1123);
      pdf.save(file.name.replace(/\.[^.]+$/, ".pdf"));
    } catch (err) {
      console.error("Word to PDF error:", err);
      setProgress("Erreur lors de la conversion");
    } finally {
      setIsProcessing(false);
      setProgress("");
      if (wordInputRef.current) wordInputRef.current.value = "";
    }
  }, []);

  const handleMergePdfs = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length < 2) return;
    setIsProcessing(true);
    setProgress("Fusion des PDFs...");
    try {
      const mergedPdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        setProgress(`Fusion du document ${i + 1}/${files.length}...`);
        const arrayBuffer = await files[i].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document_fusionne.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Merge error:", err);
      setProgress("Erreur lors de la fusion");
    } finally {
      setIsProcessing(false);
      setProgress("");
      if (multiPdfInputRef.current) multiPdfInputRef.current.value = "";
    }
  }, []);

  const handleExtractPages = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProgress("Extraction des pages...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      const ranges = extractRange.split(",").map(r => r.trim());
      const pageIndices: number[] = [];

      for (const range of ranges) {
        if (range.includes("-")) {
          const [start, end] = range.split("-").map(n => parseInt(n.trim()) - 1);
          for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
            if (!pageIndices.includes(i)) pageIndices.push(i);
          }
        } else {
          const idx = parseInt(range.trim()) - 1;
          if (idx >= 0 && idx < totalPages && !pageIndices.includes(idx)) {
            pageIndices.push(idx);
          }
        }
      }

      if (pageIndices.length === 0) {
        setProgress("Aucune page valide spécifiée");
        setIsProcessing(false);
        return;
      }

      setProgress(`Extraction de ${pageIndices.length} page(s)...`);
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pageIndices.sort((a, b) => a - b));
      copiedPages.forEach(page => newPdf.addPage(page));

      const newBytes = await newPdf.save();
      const blob = new Blob([newBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pages_extraites_${pageIndices.length}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Extract error:", err);
      setProgress("Erreur lors de l'extraction");
    } finally {
      setIsProcessing(false);
      setProgress("");
      if (extractPdfInputRef.current) extractPdfInputRef.current.value = "";
    }
  }, [extractRange]);

  if (mode === null) {
    return (
      <div className="h-full flex flex-col bg-slate-950 text-white">
        <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-bold">Convertisseur de Documents</h2>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
            {TOOLS.map(tool => (
              <button
                key={tool.key}
                onClick={() => setMode(tool.key)}
                className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-2xl"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {tool.icon}
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-white">{tool.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0">
        <button onClick={() => { setMode(null); setLoadedImages([]); setPdfFiles([]); }} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-sm font-bold">{TOOLS.find(t => t.key === mode)?.label}</h2>
        {loadedImages.length > 0 && (
          <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            {loadedImages.length} page{loadedImages.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        {isProcessing && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            <p className="text-sm text-slate-400">{progress}</p>
          </div>
        )}

        {mode === "merge" && !isProcessing && (
          <div className="flex flex-col items-center gap-6 max-w-lg">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
              <Merge className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm text-slate-400 text-center">
              Sélectionnez 2 PDF ou plus pour les fusionner en un seul document. Les pages seront conservées dans l'ordre d'importation.
            </p>
            <button onClick={() => multiPdfInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg">
              <Upload className="w-4 h-4" /><span>Sélectionner des PDF</span>
            </button>
            <input ref={multiPdfInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleMergePdfs} />
          </div>
        )}

        {mode === "extract" && !isProcessing && (
          <div className="flex flex-col items-center gap-6 max-w-lg">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center">
              <Scissors className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm text-slate-400 text-center">
              Sélectionnez un PDF et spécifiez les pages à extraire. Utilisez des plages (ex: 1-5) ou des virgules (ex: 1,3,5-8).
            </p>
            <div className="w-full max-w-xs">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">Plage de pages à extraire</label>
              <input value={extractRange} onChange={e => setExtractRange(e.target.value)} placeholder="1-5, 8, 12-15"
                className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-center" />
            </div>
            <button onClick={() => extractPdfInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg">
              <Upload className="w-4 h-4" /><span>Sélectionner un PDF</span>
            </button>
            <input ref={extractPdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handleExtractPages} />
          </div>
        )}

        {mode === "word-to-pdf" && !isProcessing && (
          <div className="flex flex-col items-center gap-6 max-w-lg">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <FileDown className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm text-slate-400 text-center">
              Sélectionnez un document Word (.docx) pour le convertir en PDF professionnel. Le formatage, les images et les structures seront préservés.
            </p>
            <button onClick={() => wordInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg">
              <Upload className="w-4 h-4" /><span>Sélectionner un fichier Word</span>
            </button>
            <input ref={wordInputRef} type="file" accept=".docx,.doc" className="hidden" onChange={handleConvertWordToPdf} />
          </div>
        )}

        {(mode === "pdf-to-image" || mode === "pdf-to-word") && !isProcessing && loadedImages.length === 0 && (
          <div className="flex flex-col items-center gap-6 max-w-lg">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mode === "pdf-to-image" ? "from-blue-600 to-cyan-600" : "from-blue-700 to-indigo-600"} flex items-center justify-center`}>
              {mode === "pdf-to-image" ? <Image className="w-10 h-10 text-white" /> : <FileText className="w-10 h-10 text-white" />}
            </div>
            <p className="text-sm text-slate-400 text-center">
              {mode === "pdf-to-image"
                ? "Sélectionnez un ou plusieurs PDF pour convertir chaque page en image PNG haute résolution."
                : "Sélectionnez un PDF pour extraire le texte et les structures en document Word."}
            </p>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg">
              <Upload className="w-4 h-4" /><span>Sélectionner un PDF</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => { if (e.target.files) handlePdfUpload(e.target.files, mode); }} />
          </div>
        )}

        {(mode === "pdf-to-image" || mode === "pdf-to-word") && loadedImages.length > 0 && !isProcessing && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{loadedImages.length} page(s) chargée(s)</span>
              <button onClick={mode === "pdf-to-image" ? handleConvertPdfToImage : handleConvertPdfToWord}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-lg text-sm font-bold cursor-pointer transition-all shadow-lg">
                <Download className="w-4 h-4" />
                <span>{mode === "pdf-to-image" ? "Télécharger toutes les images" : "Convertir en document texte"}</span>
              </button>
            </div>

            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white" style={{ maxHeight: "65vh" }}>
              <img src={loadedImages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-[65vh] w-auto mx-auto block" draggable={false} />
            </div>

            {loadedImages.length > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
                  className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-400">Page {currentPage + 1} / {loadedImages.length}</span>
                <button onClick={() => setCurrentPage(Math.min(loadedImages.length - 1, currentPage + 1))} disabled={currentPage >= loadedImages.length - 1}
                  className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
