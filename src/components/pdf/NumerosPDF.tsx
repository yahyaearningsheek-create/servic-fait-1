import React, { useState } from "react";
import { ArrowLeft, Hash, ChevronLeft, ChevronRight, Bold, Italic, RotateCcw, Check, Download, FileText } from "lucide-react";
import { compositePageNumberToImage } from "../../utils/canvasComposite";
import { imagesToPDF } from "../../utils/pdfExport";

interface NumerosPDFProps {
  pdfPages: string[];
  onBack: () => void;
}

type Position = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

const FORMATS = [
  { key: "pageX", label: "Page X", example: "Page 1" },
  { key: "xOfY", label: "X / Y", example: "1 / 5" },
  { key: "pageXsurY", label: "Page X sur Y", example: "Page 1 sur 5" },
  { key: "x", label: "X", example: "1" },
  { key: "dashX", label: "- X -", example: "- 1 -" },
];

const PRESET_COLORS = [
  { label: "Noir", value: "#000000" },
  { label: "Gris", value: "#6b7280" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Blanc", value: "#ffffff" },
];

const FONTS = ["Arial", "Times New Roman", "Courier New", "Helvetica"];

const POSITION_MAP: Record<Position, React.CSSProperties> = {
  tl: { top: 0, left: 0 },
  tc: { top: 0, left: "50%", transform: "translateX(-50%)" },
  tr: { top: 0, right: 0 },
  ml: { top: "50%", left: 0, transform: "translateY(-50%)" },
  mc: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  mr: { top: "50%", right: 0, transform: "translateY(-50%)" },
  bl: { bottom: 0, left: 0 },
  bc: { bottom: 0, left: "50%", transform: "translateX(-50%)" },
  br: { bottom: 0, right: 0 },
};

export default function NumerosPDF({ pdfPages, onBack }: NumerosPDFProps) {
  const [format, setFormat] = useState("pageX");
  const [position, setPosition] = useState<Position>("bc");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [allPages, setAllPages] = useState(true);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(pdfPages.length);
  const [startNumber, setStartNumber] = useState(1);
  const [skipFirst, setSkipFirst] = useState(false);
  const [margin, setMargin] = useState(30);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const total = pdfPages.length;

  const getPageNumber = (pageIndex: number): string | null => {
    const pageNum = pageIndex + 1;
    if (skipFirst && pageNum === 1) return null;
    if (!allPages && (pageNum < startPage || pageNum > endPage)) return null;

    const displayNum = skipFirst ? startNumber + pageIndex - 1 : startNumber + pageIndex;
    const displayTotal = skipFirst ? total - 1 : total;

    switch (format) {
      case "pageX": return `Page ${displayNum}`;
      case "xOfY": return `${displayNum} / ${displayTotal}`;
      case "pageXsurY": return `Page ${displayNum} sur ${displayTotal}`;
      case "x": return `${displayNum}`;
      case "dashX": return `- ${displayNum} -`;
      default: return `${displayNum}`;
    }
  };

  const positionGrid: Position[][] = [
    ["tl", "tc", "tr"],
    ["ml", "mc", "mr"],
    ["bl", "bc", "br"],
  ];

  const numberText = getPageNumber(currentPage);

  const handleReset = () => {
    setFormat("pageX");
    setPosition("bc");
    setFontFamily("Arial");
    setFontSize(12);
    setColor("#000000");
    setBold(false);
    setItalic(false);
    setAllPages(true);
    setStartPage(1);
    setEndPage(pdfPages.length);
    setStartNumber(1);
    setSkipFirst(false);
    setMargin(30);
  };

  const handleApply = async () => {
    setIsSaving(true);
    try {
      const composited: string[] = [];
      for (let i = 0; i < pdfPages.length; i++) {
        const pageNumText = getPageNumber(i);
        if (pageNumText) {
          const img = new Image();
          img.src = pdfPages[i];
          await new Promise<void>(res => { img.onload = () => res(); });
          const result = await compositePageNumberToImage(
            pdfPages[i], pageNumText, position,
            { fontFamily, fontSize, bold, italic, color, margin },
            img.naturalWidth, img.naturalHeight
          );
          composited.push(result);
        } else {
          composited.push(pdfPages[i]);
        }
      }
      await imagesToPDF(composited, "document_numerote.pdf");
    } catch (err) {
      console.error("Apply numbering error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 font-sans">
      <div className="h-16 flex items-center gap-3 px-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
          <Hash className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Numérotation avancée</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-slate-200 bg-white overflow-auto p-6 space-y-8 shrink-0 shadow-sm z-10">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Format de numérotation</h3>
            <div className="space-y-2">
              {FORMATS.map(f => (
                <label key={f.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${format === f.key ? "bg-orange-50 border-orange-500 shadow-sm" : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}>
                  <input type="radio" name="format" checked={format === f.key} onChange={() => setFormat(f.key)} className="accent-orange-600 w-4 h-4" />
                  <div className="flex-1 flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{f.label}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{f.example}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Position sur la page</h3>
            <div className="grid grid-cols-3 gap-2 w-40 mx-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {positionGrid.map((row, ri) =>
                row.map(pos => (
                  <button
                    key={pos}
                    disabled={pos === "mc"}
                    onClick={() => setPosition(pos)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                      pos === "mc" ? "bg-slate-200/50 text-slate-400 cursor-not-allowed" :
                      position === pos ? "bg-orange-600 text-white shadow-md scale-110" : "bg-white border border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500"
                    }`}
                  >
                    {pos === "mc" ? "—" : "●"}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Style typographique</h3>
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Police d'écriture</label>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500">
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between mb-1.5">
                  <span>Taille du texte</span>
                  <span className="font-bold">{fontSize}px</span>
                </label>
                <input type="range" min={8} max={36} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full accent-orange-600" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Couleur du texte</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c.value} onClick={() => setColor(c.value)} className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer shadow-sm ${color === c.value ? "border-orange-500 scale-110 ring-2 ring-orange-200" : "border-slate-300 hover:scale-105"}`} style={{ background: c.value }} title={c.label} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setBold(!bold)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border ${bold ? "bg-orange-100 border-orange-200 text-orange-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Bold className="w-4 h-4" /><span>Gras</span>
                </button>
                <button onClick={() => setItalic(!italic)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border ${italic ? "bg-orange-100 border-orange-200 text-orange-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Italic className="w-4 h-4" /><span>Italique</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pages et numéros</h3>
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allPages} onChange={e => setAllPages(e.target.checked)} className="accent-orange-600 w-4 h-4 rounded" />
                <span className="text-sm font-bold text-slate-700">Appliquer sur toutes les pages</span>
              </label>
              
              {!allPages && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">De la page</label>
                    <input type="number" min={1} max={total} value={startPage} onChange={e => setStartPage(+e.target.value)} className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">À la page</label>
                    <input type="number" min={1} max={total} value={endPage} onChange={e => setEndPage(+e.target.value)} className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Numéro de départ</label>
                <input type="number" min={1} value={startNumber} onChange={e => setStartNumber(+e.target.value)} className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input type="checkbox" checked={skipFirst} onChange={e => setSkipFirst(e.target.checked)} className="accent-orange-600 w-4 h-4 rounded mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-slate-700 block">Ignorer la couverture</span>
                  <span className="text-xs text-slate-500 block mt-0.5">La numérotation commencera à la page 2</span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between">
              <span>Marge</span>
              <span className="text-orange-600">{margin}px</span>
            </h3>
            <input type="range" min={10} max={100} value={margin} onChange={e => setMargin(+e.target.value)} className="w-full accent-orange-600" />
          </div>
        </div>

        <div className="flex-1 flex flex-col p-8 overflow-auto relative">
          <div className="absolute inset-0 pattern-dots bg-[length:20px_20px] opacity-30 pointer-events-none"></div>
          <div className="flex items-center justify-center min-h-full">
            <div className="relative bg-white shadow-2xl rounded-sm border border-slate-200 transition-all">
              {pdfPages[currentPage] ? (
                <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-[75vh] w-auto block opacity-95" draggable={false} />
              ) : (
                <div className="w-[500px] h-[700px] bg-white flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 m-8 rounded-2xl">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p>Aperçu du document non disponible</p>
                </div>
              )}
              {numberText && pdfPages[currentPage] && (
                <div
                  className="absolute pointer-events-none select-none"
                  style={{
                    ...POSITION_MAP[position],
                    padding: `${margin}px`,
                    zIndex: 10,
                  }}
                >
                  <span
                    className="shadow-sm border border-slate-200/50 backdrop-blur-sm"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}px`,
                      fontWeight: bold ? "bold" : "normal",
                      fontStyle: italic ? "italic" : "normal",
                      color,
                      background: color === "#ffffff" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.9)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {numberText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-20 flex items-center justify-between px-8 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-20">
        <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 cursor-pointer transition-all text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-bold text-slate-700">Page {currentPage + 1} sur {total}</span>
          <button onClick={() => setCurrentPage(Math.min(total - 1, currentPage + 1))} disabled={currentPage >= total - 1} className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 cursor-pointer transition-all text-slate-600"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-all">
            <RotateCcw className="w-4 h-4" /><span>Réinitialiser</span>
          </button>
          <button onClick={handleApply} disabled={isSaving} className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-70 disabled:scale-100 rounded-xl text-white font-bold cursor-pointer transition-all shadow-lg shadow-red-600/20">
            {isSaving ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            <span className="text-base">{isSaving ? "Enregistrement..." : "Appliquer la numérotation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
