import React, { useState } from "react";
import { ArrowLeft, Hash, ChevronLeft, ChevronRight, Bold, Italic, RotateCcw, Check } from "lucide-react";

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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <Hash className="w-5 h-5 text-teal-500" />
        <h2 className="text-sm font-bold">Numéros de Page</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Configuration Panel */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 overflow-auto p-5 space-y-6 shrink-0">
          {/* Format */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Format de numérotation</p>
            <div className="space-y-1.5">
              {FORMATS.map(f => (
                <label key={f.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${format === f.key ? "bg-teal-500/15 border border-teal-500/30" : "border border-transparent hover:bg-slate-800"}`}>
                  <input type="radio" name="format" checked={format === f.key} onChange={() => setFormat(f.key)} className="accent-teal-500" />
                  <div className="flex-1">
                    <span className="text-xs font-bold">{f.label}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({f.example})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Position sur la page</p>
            <div className="grid grid-cols-3 gap-1.5 w-32 mx-auto">
              {positionGrid.map((row, ri) =>
                row.map(pos => (
                  <button
                    key={pos}
                    disabled={pos === "mc"}
                    onClick={() => setPosition(pos)}
                    className={`w-10 h-10 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                      pos === "mc" ? "bg-slate-800/30 text-slate-700 cursor-not-allowed" :
                      position === pos ? "bg-teal-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {pos === "mc" ? "—" : "●"}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Style</p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Police</label>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Taille : {fontSize}px</label>
                <input type="range" min={8} max={24} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full accent-teal-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Couleur</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c.value} onClick={() => setColor(c.value)} className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${color === c.value ? "border-teal-400 scale-110" : "border-slate-600"}`} style={{ background: c.value }} title={c.label} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBold(!bold)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${bold ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  <Bold className="w-3.5 h-3.5" /><span>Gras</span>
                </button>
                <button onClick={() => setItalic(!italic)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${italic ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  <Italic className="w-3.5 h-3.5" /><span>Italique</span>
                </button>
              </div>
            </div>
          </div>

          {/* Page Range */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Plage de pages</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={allPages} onChange={e => setAllPages(e.target.checked)} className="accent-teal-500 w-4 h-4 rounded" />
              <span className="text-xs font-bold">Toutes les pages</span>
            </label>
            {!allPages && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">De la page</label>
                  <input type="number" min={1} max={total} value={startPage} onChange={e => setStartPage(+e.target.value)} className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">À la page</label>
                  <input type="number" min={1} max={total} value={endPage} onChange={e => setEndPage(+e.target.value)} className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-white" />
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Commencer la numérotation à</label>
              <input type="number" min={1} value={startNumber} onChange={e => setStartNumber(+e.target.value)} className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-white" />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={skipFirst} onChange={e => setSkipFirst(e.target.checked)} className="accent-teal-500 w-4 h-4 rounded" />
              <span className="text-xs">Ignorer la première page (couverture)</span>
            </label>
          </div>

          {/* Margin */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Marge : {margin}px</p>
            <input type="range" min={10} max={80} value={margin} onChange={e => setMargin(+e.target.value)} className="w-full accent-teal-500" />
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto bg-slate-900/30">
          <div className="relative shadow-2xl rounded-lg overflow-hidden" style={{ maxHeight: "75vh" }}>
            {pdfPages[currentPage] && (
              <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-[70vh] w-auto block" draggable={false} />
            )}
            {/* Page number overlay */}
            {numberText && (
              <div
                className="absolute pointer-events-none select-none"
                style={{
                  ...POSITION_MAP[position],
                  padding: `${margin}px`,
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: `${fontSize}px`,
                    fontWeight: bold ? "bold" : "normal",
                    fontStyle: italic ? "italic" : "normal",
                    color,
                    background: color === "#ffffff" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
                    padding: "4px 10px",
                    borderRadius: 4,
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

      {/* Bottom bar */}
      <div className="h-14 flex items-center justify-between px-6 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs text-slate-400">Page {currentPage + 1} / {total}</span>
          <button onClick={() => setCurrentPage(Math.min(total - 1, currentPage + 1))} disabled={currentPage >= total - 1} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /><span>Réinitialiser</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-lg text-sm font-bold cursor-pointer transition-all shadow-lg">
            <Check className="w-4 h-4" /><span>Appliquer la numérotation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
