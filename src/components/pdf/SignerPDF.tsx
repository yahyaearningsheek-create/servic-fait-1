import React, { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Check, Type, Pen, Upload, X, Move, Download, Stamp } from "lucide-react";

interface SignerPDFProps {
  pdfPages: string[];
  onBack: () => void;
}

type SignatureMode = "type" | "draw" | "import";
type TabType = "signature" | "initiales" | "tampon";

const FONTS = [
  { name: "Dancing Script", css: "'Dancing Script', cursive" },
  { name: "Great Vibes", css: "'Great Vibes', cursive" },
  { name: "Pacifico", css: "'Pacifico', cursive" },
  { name: "Caveat", css: "'Caveat', cursive" },
];

const COLORS = [
  { name: "Noir", value: "#000000" },
  { name: "Bleu", value: "#1e40af" },
  { name: "Rouge", value: "#dc2626" },
  { name: "Vert", value: "#16a34a" },
];

export default function SignerPDF({ pdfPages, onBack }: SignerPDFProps) {
  // Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Caveat:wght@400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const [step, setStep] = useState<"config" | "place">("config");
  const [activeTab, setActiveTab] = useState<TabType>("signature");
  const [sigMode, setSigMode] = useState<SignatureMode>("type");
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#000000");

  // Drawing canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawData, setDrawData] = useState<string | null>(null);

  // Import
  const [importedImage, setImportedImage] = useState<string | null>(null);

  // Stamp
  const [stampImage, setStampImage] = useState<string | null>(null);

  // Placement
  const [currentPage, setCurrentPage] = useState(0);
  const [sigPos, setSigPos] = useState({ x: 60, y: 75, w: 25, h: 8 });
  const [applyMode, setApplyMode] = useState<"current" | "all" | "range">("current");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const pageRef = useRef<HTMLDivElement>(null);

  // Initials drawing
  const initCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitDrawing, setIsInitDrawing] = useState(false);
  const [initDrawData, setInitDrawData] = useState<string | null>(null);
  const [initSigMode, setInitSigMode] = useState<SignatureMode>("type");
  const [initImported, setInitImported] = useState<string | null>(null);

  const getSignaturePreview = (): string | null => {
    if (activeTab === "tampon") return stampImage;
    if (activeTab === "initiales") {
      if (initSigMode === "draw") return initDrawData;
      if (initSigMode === "import") return initImported;
      return null; // type mode renders text directly
    }
    if (sigMode === "draw") return drawData;
    if (sigMode === "import") return importedImage;
    return null;
  };

  const isTextMode = () => {
    if (activeTab === "signature") return sigMode === "type";
    if (activeTab === "initiales") return initSigMode === "type";
    return false;
  };

  const getTextContent = () => {
    if (activeTab === "signature") return fullName;
    if (activeTab === "initiales") return initials;
    return "";
  };

  // Canvas drawing
  const startDraw = (e: React.MouseEvent, ref: React.RefObject<HTMLCanvasElement | null>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    if (ref === canvasRef) setIsDrawing(true);
    else setIsInitDrawing(true);
  };

  const draw = (e: React.MouseEvent, ref: React.RefObject<HTMLCanvasElement | null>, drawing: boolean) => {
    if (!drawing) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = (ref: React.RefObject<HTMLCanvasElement | null>, setDrawingFn: (v: boolean) => void, setDataFn: (v: string | null) => void) => {
    setDrawingFn(false);
    const canvas = ref.current;
    if (canvas) setDataFn(canvas.toDataURL());
  };

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement | null>, setDataFn: (v: string | null) => void) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDataFn(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Placement drag
  const handlePlaceDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePlaceResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, w: sigPos.w, h: sigPos.h });
  };

  const handlePlaceMouseMove = useCallback((e: MouseEvent) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    if (isDragging) {
      const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
      setSigPos(p => ({ ...p, x: Math.max(0, Math.min(100 - p.w, p.x + dx)), y: Math.max(0, Math.min(100 - p.h, p.y + dy)) }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    if (isResizing) {
      const dx = ((e.clientX - resizeStart.x) / rect.width) * 100;
      const dy = ((e.clientY - resizeStart.y) / rect.height) * 100;
      setSigPos(p => ({ ...p, w: Math.max(8, resizeStart.w + dx), h: Math.max(4, resizeStart.h + dy) }));
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handlePlaceMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handlePlaceMouseMove);
      window.addEventListener("mouseup", handlePlaceMouseUp);
      return () => {
        window.removeEventListener("mousemove", handlePlaceMouseMove);
        window.removeEventListener("mouseup", handlePlaceMouseUp);
      };
    }
  }, [isDragging, isResizing, handlePlaceMouseMove, handlePlaceMouseUp]);

  const canProceed = () => {
    if (activeTab === "signature") {
      if (sigMode === "type") return fullName.trim().length > 0;
      if (sigMode === "draw") return !!drawData;
      if (sigMode === "import") return !!importedImage;
    }
    if (activeTab === "initiales") {
      if (initSigMode === "type") return initials.trim().length > 0;
      if (initSigMode === "draw") return !!initDrawData;
      if (initSigMode === "import") return !!initImported;
    }
    if (activeTab === "tampon") return !!stampImage;
    return false;
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "signature", label: "Signature", icon: <Pen className="w-4 h-4" /> },
    { key: "initiales", label: "Initiales", icon: <Type className="w-4 h-4" /> },
    { key: "tampon", label: "Tampon d'entreprise", icon: <Stamp className="w-4 h-4" /> },
  ];

  // CONFIG STEP
  if (step === "config") {
    return (
      <div className="h-full flex flex-col bg-slate-950 text-white">
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-bold">Configurer votre signature</h2>
        </div>

        <div className="flex-1 overflow-auto p-6 flex justify-center">
          <div className="w-full max-w-2xl space-y-6">
            {/* Name & Initials */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Nom Complet</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ex: Ahmed Mohamed" className="w-full text-sm px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Initiales</label>
                <input value={initials} onChange={e => setInitials(e.target.value)} placeholder="ex: A.M." className="w-full text-sm px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder:text-slate-600" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === t.key ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  {t.icon}<span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Signature Tab */}
            {activeTab === "signature" && (
              <div className="space-y-4">
                <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                  {([["type", "Typographique", <Type key="t" className="w-3.5 h-3.5" />], ["draw", "Tracé libre", <Pen key="d" className="w-3.5 h-3.5" />], ["import", "Importer", <Upload key="i" className="w-3.5 h-3.5" />]] as [SignatureMode, string, React.ReactNode][]).map(([mode, label, icon]) => (
                    <button key={mode} onClick={() => setSigMode(mode)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${sigMode === mode ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                      {icon}<span>{label}</span>
                    </button>
                  ))}
                </div>

                {sigMode === "type" && (
                  <div className="grid grid-cols-2 gap-3">
                    {FONTS.map((f, i) => (
                      <button key={f.name} onClick={() => setSelectedFont(i)} className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center ${selectedFont === i ? "border-teal-500 bg-teal-500/10" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
                        <span style={{ fontFamily: f.css, fontSize: "24px", color: selectedColor }}>{fullName || "Votre Nom"}</span>
                        <p className="text-[9px] text-slate-500 mt-2 font-mono">{f.name}</p>
                      </button>
                    ))}
                  </div>
                )}

                {sigMode === "draw" && (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-white overflow-hidden">
                      <canvas ref={canvasRef} width={560} height={180} className="w-full cursor-crosshair"
                        onMouseDown={e => startDraw(e, canvasRef)}
                        onMouseMove={e => draw(e, canvasRef, isDrawing)}
                        onMouseUp={() => endDraw(canvasRef, setIsDrawing, setDrawData)}
                        onMouseLeave={() => endDraw(canvasRef, setIsDrawing, setDrawData)}
                      />
                      <p className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none select-none">Dessinez votre signature ici</p>
                    </div>
                    <button onClick={() => clearCanvas(canvasRef, setDrawData)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Effacer le tracé</button>
                  </div>
                )}

                {sigMode === "import" && (
                  <div className="space-y-3">
                    {importedImage ? (
                      <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-center">
                        <img src={importedImage} alt="Signature importée" className="max-h-32 object-contain" />
                        <button onClick={() => setImportedImage(null)} className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 cursor-pointer hover:border-teal-500/50 transition-colors">
                        <Upload className="w-8 h-8 text-slate-500" />
                        <span className="text-xs text-slate-400">Glissez ou cliquez pour importer (PNG, JPG)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImportFile(e, setImportedImage)} />
                      </label>
                    )}
                  </div>
                )}

                {/* Color Palette */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Couleur :</span>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${selectedColor === c.value ? "border-teal-400 scale-110" : "border-slate-700 hover:border-slate-500"}`} style={{ background: c.value }} title={c.name} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Initiales Tab */}
            {activeTab === "initiales" && (
              <div className="space-y-4">
                <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                  {([["type", "Typographique", <Type key="t" className="w-3.5 h-3.5" />], ["draw", "Tracé libre", <Pen key="d" className="w-3.5 h-3.5" />], ["import", "Importer", <Upload key="i" className="w-3.5 h-3.5" />]] as [SignatureMode, string, React.ReactNode][]).map(([mode, label, icon]) => (
                    <button key={mode} onClick={() => setInitSigMode(mode)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${initSigMode === mode ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                      {icon}<span>{label}</span>
                    </button>
                  ))}
                </div>

                {initSigMode === "type" && (
                  <div className="grid grid-cols-2 gap-3">
                    {FONTS.map((f, i) => (
                      <button key={f.name} onClick={() => setSelectedFont(i)} className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center ${selectedFont === i ? "border-teal-500 bg-teal-500/10" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
                        <span style={{ fontFamily: f.css, fontSize: "28px", color: selectedColor }}>{initials || "A.M."}</span>
                        <p className="text-[9px] text-slate-500 mt-2 font-mono">{f.name}</p>
                      </button>
                    ))}
                  </div>
                )}

                {initSigMode === "draw" && (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-white overflow-hidden">
                      <canvas ref={initCanvasRef} width={560} height={180} className="w-full cursor-crosshair"
                        onMouseDown={e => startDraw(e, initCanvasRef)}
                        onMouseMove={e => draw(e, initCanvasRef, isInitDrawing)}
                        onMouseUp={() => endDraw(initCanvasRef, setIsInitDrawing, setInitDrawData)}
                        onMouseLeave={() => endDraw(initCanvasRef, setIsInitDrawing, setInitDrawData)}
                      />
                    </div>
                    <button onClick={() => clearCanvas(initCanvasRef, setInitDrawData)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Effacer</button>
                  </div>
                )}

                {initSigMode === "import" && (
                  <label className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 cursor-pointer hover:border-teal-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-500" />
                    <span className="text-xs text-slate-400">Importer vos initiales (PNG, JPG)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImportFile(e, setInitImported)} />
                  </label>
                )}

                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Couleur :</span>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${selectedColor === c.value ? "border-teal-400 scale-110" : "border-slate-700 hover:border-slate-500"}`} style={{ background: c.value }} title={c.name} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tampon Tab */}
            {activeTab === "tampon" && (
              <div className="space-y-4">
                {stampImage ? (
                  <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-6 flex items-center justify-center">
                    <img src={stampImage} alt="Tampon" className="max-h-40 object-contain" />
                    <button onClick={() => setStampImage(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-4 py-16 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 cursor-pointer hover:border-teal-500/50 transition-colors"
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-teal-500"); }}
                    onDragLeave={e => { e.currentTarget.classList.remove("border-teal-500"); }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("border-teal-500"); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setStampImage(ev.target?.result as string); r.readAsDataURL(f); } }}
                  >
                    <Stamp className="w-12 h-12 text-slate-600" />
                    <div className="text-center">
                      <p className="text-sm text-slate-300 font-bold">Glissez-déposez votre tampon ici</p>
                      <p className="text-[10px] text-slate-500 mt-1">Formats : PNG, JPG, SVG</p>
                    </div>
                    <input type="file" accept="image/*,.svg" className="hidden" onChange={e => handleImportFile(e, setStampImage)} />
                  </label>
                )}
              </div>
            )}

            {/* Apply Button */}
            <button onClick={() => { if (canProceed()) { setRangeTo(pdfPages.length); setStep("place"); } }}
              disabled={!canProceed()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /><span>Appliquer la signature</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PLACEMENT STEP
  const preview = getSignaturePreview();
  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("config")} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-bold">Positionner la signature — Page {currentPage + 1}/{pdfPages.length}</h2>
        </div>
        <div className="flex items-center gap-2">
          <select value={applyMode} onChange={e => setApplyMode(e.target.value as any)} className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="current">Page actuelle uniquement</option>
            <option value="all">Toutes les pages</option>
            <option value="range">Plage personnalisée</option>
          </select>
          {applyMode === "range" && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500">De</span>
              <input type="number" min={1} max={pdfPages.length} value={rangeFrom} onChange={e => setRangeFrom(+e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-white" />
              <span className="text-slate-500">à</span>
              <input type="number" min={1} max={pdfPages.length} value={rangeTo} onChange={e => setRangeTo(+e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-white" />
            </div>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-lg">
            <Download className="w-3.5 h-3.5" /><span>Enregistrer</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-900/50">
        <div ref={pageRef} className="relative shadow-2xl rounded-lg overflow-hidden" style={{ maxHeight: "80vh" }}>
          {pdfPages[currentPage] && <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-[75vh] w-auto" draggable={false} />}
          {/* Signature overlay */}
          <div className="absolute cursor-move select-none" style={{ left: `${sigPos.x}%`, top: `${sigPos.y}%`, width: `${sigPos.w}%`, height: `${sigPos.h}%`, border: "2px dashed rgba(20,184,166,0.7)", background: "rgba(20,184,166,0.05)" }}
            onMouseDown={handlePlaceDragStart}>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              {isTextMode() ? (
                <span style={{ fontFamily: FONTS[selectedFont].css, color: selectedColor, fontSize: "clamp(10px, 2vw, 22px)", whiteSpace: "nowrap" }}>{getTextContent()}</span>
              ) : preview ? (
                <img src={preview} alt="sig" className="w-full h-full object-contain" draggable={false} />
              ) : null}
            </div>
            <Move className="absolute top-0.5 left-0.5 w-3 h-3 text-teal-400 opacity-70" />
            {/* Resize handle */}
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-teal-500 rounded-full cursor-nwse-resize border-2 border-white shadow" onMouseDown={handlePlaceResizeStart} />
          </div>
        </div>
      </div>

      {/* Page navigation */}
      {pdfPages.length > 1 && (
        <div className="h-12 flex items-center justify-center gap-4 border-t border-slate-800 shrink-0">
          <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors">← Précédente</button>
          <span className="text-xs text-slate-400">Page {currentPage + 1} / {pdfPages.length}</span>
          <button onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))} disabled={currentPage === pdfPages.length - 1} className="px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors">Suivante →</button>
        </div>
      )}
    </div>
  );
}
