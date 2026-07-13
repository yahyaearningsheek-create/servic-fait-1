import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Highlighter, Underline, Strikethrough, Pencil, Eraser, StickyNote, Square, Circle, Minus, ArrowUpRight, Type, Stamp, Plus, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Bold, Italic, AlignLeft, AlignCenter, AlignRight, X, Palette, Move } from "lucide-react";

interface ModifierPDFProps {
  pdfPages: string[];
  onBack: () => void;
}

type ToolGroup = "annoter" | "formes" | "texte" | "timbres";
type AnnotTool = "highlight" | "underline" | "strikethrough" | "pencil" | "eraser" | "note";
type ShapeTool = "rect" | "oval" | "line" | "arrow" | "freehand";
type Annotation = {
  id: string; type: string; x: number; y: number; w: number; h: number;
  color: string; strokeWidth: number; opacity: number; text?: string;
  points?: { x: number; y: number }[]; fontSize?: number; fontFamily?: string;
  bold?: boolean; italic?: boolean; align?: string; page: number;
};

const STAMPS = [
  { text: "APPROUVÉ", color: "#16a34a", bg: "#dcfce7" },
  { text: "REJETÉ", color: "#dc2626", bg: "#fef2f2" },
  { text: "CONFIDENTIEL", color: "#2563eb", bg: "#dbeafe" },
  { text: "BROUILLON", color: "#6b7280", bg: "#f3f4f6" },
  { text: "URGENT", color: "#dc2626", bg: "#fef2f2" },
  { text: "COPIE", color: "#2563eb", bg: "#dbeafe" },
  { text: "ORIGINAL", color: "#7c3aed", bg: "#ede9fe" },
  { text: "ANNULÉ", color: "#dc2626", bg: "#fef2f2" },
];

export default function ModifierPDF({ pdfPages, onBack }: ModifierPDFProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [toolGroup, setToolGroup] = useState<ToolGroup>("annoter");
  const [annotTool, setAnnotTool] = useState<AnnotTool>("highlight");
  const [shapeTool, setShapeTool] = useState<ShapeTool>("rect");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState("#facc15");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [drawOpacity, setDrawOpacity] = useState(0.4);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([]);

  // Text editing
  const [textFontSize, setTextFontSize] = useState(16);
  const [textFontFamily, setTextFontFamily] = useState("Arial");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // Custom stamp
  const [showCustomStamp, setShowCustomStamp] = useState(false);
  const [customStampText, setCustomStampText] = useState("");
  const [customStampColor, setCustomStampColor] = useState("#dc2626");

  // Drag annotation
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const pageAnnotations = annotations.filter(a => a.page === currentPage);

  const addAnnotation = (type: string, x: number, y: number, extra: Partial<Annotation> = {}) => {
    const id = `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ann: Annotation = {
      id, type, x, y, w: extra.w || 120, h: extra.h || 30,
      color: extra.color || drawColor, strokeWidth: extra.strokeWidth || strokeWidth,
      opacity: extra.opacity || (type === "highlight" ? 0.35 : 1),
      text: extra.text, points: extra.points, page: currentPage,
      fontSize: extra.fontSize || textFontSize, fontFamily: extra.fontFamily || textFontFamily,
      bold: extra.bold || textBold, italic: extra.italic || textItalic,
      align: extra.align || textAlign,
    };
    setAnnotations(prev => [...prev, ann]);
    setSelectedId(id);
    return id;
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectedId(null);

    if (toolGroup === "annoter") {
      if (annotTool === "highlight" || annotTool === "underline" || annotTool === "strikethrough") {
        setIsDrawing(true);
        setDrawStart({ x, y });
      } else if (annotTool === "pencil") {
        setIsDrawing(true);
        setPencilPoints([{ x, y }]);
      } else if (annotTool === "note") {
        const id = addAnnotation("note", x - 15, y - 15, { w: 180, h: 100, color: "#facc15", text: "", opacity: 0.95 });
        setEditingNote(id);
      }
    } else if (toolGroup === "formes") {
      if (shapeTool === "freehand") {
        setIsDrawing(true);
        setPencilPoints([{ x, y }]);
      } else {
        setIsDrawing(true);
        setDrawStart({ x, y });
      }
    } else if (toolGroup === "texte") {
      addAnnotation("text", x, y, { w: 200, h: 30, color: drawColor, text: "Texte", opacity: 1 });
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolGroup === "annoter" && annotTool === "pencil") {
      setPencilPoints(prev => [...prev, { x, y }]);
    } else if (toolGroup === "formes" && shapeTool === "freehand") {
      setPencilPoints(prev => [...prev, { x, y }]);
    }
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !overlayRef.current) return;
    setIsDrawing(false);
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolGroup === "annoter") {
      if (annotTool === "highlight") {
        const ax = Math.min(drawStart.x, x), ay = Math.min(drawStart.y, y);
        addAnnotation("highlight", ax, ay, { w: Math.abs(x - drawStart.x) || 100, h: Math.abs(y - drawStart.y) || 24 });
      } else if (annotTool === "underline") {
        addAnnotation("underline", Math.min(drawStart.x, x), Math.max(drawStart.y, y), { w: Math.abs(x - drawStart.x) || 100, h: 3 });
      } else if (annotTool === "strikethrough") {
        addAnnotation("strikethrough", Math.min(drawStart.x, x), (drawStart.y + y) / 2, { w: Math.abs(x - drawStart.x) || 100, h: 2 });
      } else if (annotTool === "pencil" && pencilPoints.length > 2) {
        const minX = Math.min(...pencilPoints.map(p => p.x));
        const minY = Math.min(...pencilPoints.map(p => p.y));
        addAnnotation("pencil", minX, minY, {
          w: Math.max(...pencilPoints.map(p => p.x)) - minX + strokeWidth,
          h: Math.max(...pencilPoints.map(p => p.y)) - minY + strokeWidth,
          points: pencilPoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
          color: drawColor, opacity: 1
        });
        setPencilPoints([]);
      }
    } else if (toolGroup === "formes") {
      if (shapeTool === "freehand" && pencilPoints.length > 2) {
        const minX = Math.min(...pencilPoints.map(p => p.x));
        const minY = Math.min(...pencilPoints.map(p => p.y));
        addAnnotation("freehand", minX, minY, {
          w: Math.max(...pencilPoints.map(p => p.x)) - minX + strokeWidth,
          h: Math.max(...pencilPoints.map(p => p.y)) - minY + strokeWidth,
          points: pencilPoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
          color: drawColor, opacity: 1
        });
        setPencilPoints([]);
      } else {
        const ax = Math.min(drawStart.x, x), ay = Math.min(drawStart.y, y);
        const w = Math.abs(x - drawStart.x) || 80, h = Math.abs(y - drawStart.y) || 60;
        addAnnotation(shapeTool, ax, ay, { w, h, color: drawColor, opacity: 1 });
      }
    }
  };

  // Annotation dragging
  const handleAnnMouseDown = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    if (ann.type === "note" && editingNote !== ann.id) setEditingNote(null);
    setDraggingId(ann.id);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (rect) setDragOffset({ x: e.clientX - rect.left - ann.x, y: e.clientY - rect.top - ann.y });
  };

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      updateAnnotation(draggingId, { x, y });
    };
    const onUp = () => setDraggingId(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingId, dragOffset]);

  const selectedAnn = annotations.find(a => a.id === selectedId);

  const TOOL_GROUPS: { key: ToolGroup; label: string; icon: React.ReactNode }[] = [
    { key: "annoter", label: "Annoter", icon: <Highlighter className="w-4 h-4" /> },
    { key: "formes", label: "Formes", icon: <Square className="w-4 h-4" /> },
    { key: "texte", label: "Texte", icon: <Type className="w-4 h-4" /> },
    { key: "timbres", label: "Timbres", icon: <Stamp className="w-4 h-4" /> },
  ];

  const ANNOT_TOOLS: { key: AnnotTool; label: string; icon: React.ReactNode }[] = [
    { key: "highlight", label: "Surligner", icon: <Highlighter className="w-3.5 h-3.5" /> },
    { key: "underline", label: "Souligner", icon: <Underline className="w-3.5 h-3.5" /> },
    { key: "strikethrough", label: "Barrer", icon: <Strikethrough className="w-3.5 h-3.5" /> },
    { key: "pencil", label: "Crayon", icon: <Pencil className="w-3.5 h-3.5" /> },
    { key: "eraser", label: "Gomme", icon: <Eraser className="w-3.5 h-3.5" /> },
    { key: "note", label: "Note", icon: <StickyNote className="w-3.5 h-3.5" /> },
  ];

  const SHAPE_TOOLS: { key: ShapeTool; label: string; icon: React.ReactNode }[] = [
    { key: "rect", label: "Rectangle", icon: <Square className="w-3.5 h-3.5" /> },
    { key: "oval", label: "Ovale", icon: <Circle className="w-3.5 h-3.5" /> },
    { key: "line", label: "Ligne", icon: <Minus className="w-3.5 h-3.5" /> },
    { key: "arrow", label: "Flèche", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { key: "freehand", label: "Libre", icon: <Pencil className="w-3.5 h-3.5" /> },
  ];

  const renderAnnotation = (ann: Annotation) => {
    const commonStyle: React.CSSProperties = { position: "absolute", left: ann.x, top: ann.y, width: ann.w, height: ann.h, opacity: ann.opacity, pointerEvents: "auto" as const, cursor: "move" };
    const isSelected = selectedId === ann.id;
    const border = isSelected ? "2px solid #14b8a6" : "none";

    switch (ann.type) {
      case "highlight":
        return <div key={ann.id} style={{ ...commonStyle, background: ann.color, borderRadius: 2, border }} onMouseDown={e => handleAnnMouseDown(e, ann)} />;
      case "underline":
        return <div key={ann.id} style={{ ...commonStyle, height: ann.strokeWidth, background: ann.color, border }} onMouseDown={e => handleAnnMouseDown(e, ann)} />;
      case "strikethrough":
        return <div key={ann.id} style={{ ...commonStyle, height: ann.strokeWidth, background: ann.color, border }} onMouseDown={e => handleAnnMouseDown(e, ann)} />;
      case "pencil":
      case "freehand":
        return (
          <svg key={ann.id} style={{ ...commonStyle, overflow: "visible", border }} onMouseDown={e => handleAnnMouseDown(e, ann)}>
            <polyline points={ann.points?.map(p => `${p.x},${p.y}`).join(" ") || ""} fill="none" stroke={ann.color} strokeWidth={ann.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "note":
        return (
          <div key={ann.id} style={{ ...commonStyle, background: "#fef9c3", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: isSelected ? "2px solid #14b8a6" : "1px solid #fde68a", padding: 8, display: "flex", flexDirection: "column" }} onMouseDown={e => handleAnnMouseDown(e, ann)} onDoubleClick={() => setEditingNote(ann.id)}>
            <div className="text-[9px] font-bold text-amber-700 mb-1 select-none">📝 Note</div>
            {editingNote === ann.id ? (
              <textarea autoFocus value={ann.text || ""} onChange={e => updateAnnotation(ann.id, { text: e.target.value })} onBlur={() => setEditingNote(null)} className="flex-1 bg-transparent border-none outline-none text-xs text-gray-800 resize-none" onClick={e => e.stopPropagation()} />
            ) : (
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{ann.text || "Double-cliquez pour éditer..."}</p>
            )}
          </div>
        );
      case "rect":
        return <div key={ann.id} style={{ ...commonStyle, border: `${ann.strokeWidth}px solid ${ann.color}`, borderRadius: 4, background: "transparent", boxSizing: "border-box" }} onMouseDown={e => handleAnnMouseDown(e, ann)} />;
      case "oval":
        return <div key={ann.id} style={{ ...commonStyle, border: `${ann.strokeWidth}px solid ${ann.color}`, borderRadius: "50%", background: "transparent", boxSizing: "border-box" }} onMouseDown={e => handleAnnMouseDown(e, ann)} />;
      case "line":
        return (
          <svg key={ann.id} style={{ ...commonStyle, overflow: "visible" }} onMouseDown={e => handleAnnMouseDown(e, ann)}>
            <line x1="0" y1={ann.h / 2} x2={ann.w} y2={ann.h / 2} stroke={ann.color} strokeWidth={ann.strokeWidth} />
          </svg>
        );
      case "arrow":
        return (
          <svg key={ann.id} style={{ ...commonStyle, overflow: "visible" }} onMouseDown={e => handleAnnMouseDown(e, ann)}>
            <defs><marker id={`ah-${ann.id}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={ann.color} /></marker></defs>
            <line x1="0" y1={ann.h / 2} x2={ann.w} y2={ann.h / 2} stroke={ann.color} strokeWidth={ann.strokeWidth} markerEnd={`url(#ah-${ann.id})`} />
          </svg>
        );
      case "text":
        return (
          <div key={ann.id} style={{ ...commonStyle, border: isSelected ? "2px solid #14b8a6" : "1px dashed transparent", background: "transparent", minWidth: 50 }} onMouseDown={e => handleAnnMouseDown(e, ann)} onDoubleClick={() => setEditingNote(ann.id)}>
            {editingNote === ann.id ? (
              <textarea autoFocus value={ann.text || ""} onChange={e => updateAnnotation(ann.id, { text: e.target.value })} onBlur={() => setEditingNote(null)} style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.9)", border: "none", outline: "none", fontSize: ann.fontSize, fontFamily: ann.fontFamily, fontWeight: ann.bold ? "bold" : "normal", fontStyle: ann.italic ? "italic" : "normal", textAlign: (ann.align || "left") as any, color: ann.color, resize: "both" }} onClick={e => e.stopPropagation()} />
            ) : (
              <span style={{ fontSize: ann.fontSize, fontFamily: ann.fontFamily, fontWeight: ann.bold ? "bold" : "normal", fontStyle: ann.italic ? "italic" : "normal", textAlign: (ann.align || "left") as any, color: ann.color, display: "block", whiteSpace: "pre-wrap" }}>{ann.text || "Texte"}</span>
            )}
          </div>
        );
      case "stamp":
        return (
          <div key={ann.id} style={{ ...commonStyle, border: `3px solid ${ann.color}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)", transform: "rotate(-15deg)" }} onMouseDown={e => handleAnnMouseDown(e, ann)}>
            <span style={{ color: ann.color, fontWeight: 900, fontSize: 18, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial Black, sans-serif" }}>{ann.text}</span>
          </div>
        );
      default: return null;
    }
  };

  const PALETTE = ["#facc15", "#ef4444", "#3b82f6", "#22c55e", "#000000", "#f97316", "#8b5cf6", "#ec4899"];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Top Toolbar */}
      <div className="shrink-0 border-b border-slate-800">
        <div className="h-12 flex items-center gap-3 px-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-bold mr-4">Modifier le PDF</h2>
          <div className="flex gap-1 bg-slate-900 rounded-lg p-0.5">
            {TOOL_GROUPS.map(g => (
              <button key={g.key} onClick={() => setToolGroup(g.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${toolGroup === g.key ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                {g.icon}<span>{g.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded hover:bg-slate-800 cursor-pointer"><ZoomOut className="w-4 h-4 text-slate-400" /></button>
            <span className="text-[10px] text-slate-500 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 rounded hover:bg-slate-800 cursor-pointer"><ZoomIn className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>

        {/* Sub-toolbar */}
        <div className="h-10 flex items-center gap-1 px-4 bg-slate-900/50 border-t border-slate-800/50">
          {toolGroup === "annoter" && ANNOT_TOOLS.map(t => (
            <button key={t.key} onClick={() => setAnnotTool(t.key)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${annotTool === t.key ? "bg-slate-700 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
          {toolGroup === "formes" && SHAPE_TOOLS.map(t => (
            <button key={t.key} onClick={() => setShapeTool(t.key)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${shapeTool === t.key ? "bg-slate-700 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
          {toolGroup === "texte" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Cliquez sur la page pour placer un texte</span>
              <select value={textFontFamily} onChange={e => setTextFontFamily(e.target.value)} className="text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"><option>Arial</option><option>Times New Roman</option><option>Courier New</option><option>Georgia</option></select>
              <input type="number" value={textFontSize} onChange={e => setTextFontSize(+e.target.value)} min={8} max={72} className="w-12 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white" />
              <button onClick={() => setTextBold(!textBold)} className={`p-1 rounded cursor-pointer ${textBold ? "bg-teal-600 text-white" : "text-slate-500 hover:text-white"}`}><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTextItalic(!textItalic)} className={`p-1 rounded cursor-pointer ${textItalic ? "bg-teal-600 text-white" : "text-slate-500 hover:text-white"}`}><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTextAlign("left")} className={`p-1 rounded cursor-pointer ${textAlign === "left" ? "text-teal-400" : "text-slate-500"}`}><AlignLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTextAlign("center")} className={`p-1 rounded cursor-pointer ${textAlign === "center" ? "text-teal-400" : "text-slate-500"}`}><AlignCenter className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTextAlign("right")} className={`p-1 rounded cursor-pointer ${textAlign === "right" ? "text-teal-400" : "text-slate-500"}`}><AlignRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {toolGroup === "timbres" && <span className="text-[10px] text-slate-500">Sélectionnez un timbre dans le panneau latéral →</span>}
          <div className="flex-1" />
          {(toolGroup === "annoter" || toolGroup === "formes") && (
            <div className="flex items-center gap-1.5">
              {PALETTE.map(c => (
                <button key={c} onClick={() => setDrawColor(c)} className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${drawColor === c ? "border-white scale-125" : "border-slate-700"}`} style={{ background: c }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main canvas area */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-slate-900/30">
          <div className="relative shadow-2xl" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
            {pdfPages[currentPage] && <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`} className="block max-w-none" draggable={false} />}
            {/* Annotation overlay */}
            <div ref={overlayRef} className="absolute inset-0" style={{ cursor: toolGroup === "texte" ? "text" : "crosshair" }}
              onMouseDown={handleOverlayMouseDown} onMouseMove={handleOverlayMouseMove} onMouseUp={handleOverlayMouseUp}>
              {/* Live pencil preview */}
              {isDrawing && pencilPoints.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                  <polyline points={pencilPoints.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={drawColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                </svg>
              )}
              {pageAnnotations.map(renderAnnotation)}
            </div>
          </div>
        </div>

        {/* Stamps sidebar */}
        {toolGroup === "timbres" && (
          <div className="w-64 border-l border-slate-800 bg-slate-950 overflow-auto p-4 space-y-3 shrink-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Timbres Standards</p>
            <div className="space-y-2">
              {STAMPS.map(s => (
                <button key={s.text} onClick={() => addAnnotation("stamp", 100, 100, { w: 180, h: 50, color: s.color, text: s.text, opacity: 0.9 })}
                  className="w-full p-3 rounded-xl border border-slate-800 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-center" style={{ background: s.bg }}>
                  <span style={{ color: s.color, fontWeight: 900, fontSize: 13, letterSpacing: 2, fontFamily: "Arial Black, sans-serif" }}>{s.text}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-3">
              <button onClick={() => setShowCustomStamp(!showCustomStamp)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer transition-colors">
                <Plus className="w-3.5 h-3.5" /><span>Timbre personnalisé</span>
              </button>
              {showCustomStamp && (
                <div className="mt-3 space-y-2">
                  <input value={customStampText} onChange={e => setCustomStampText(e.target.value)} placeholder="Texte du timbre..." className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <div className="flex gap-1">
                    {["#dc2626", "#16a34a", "#2563eb", "#7c3aed", "#f59e0b"].map(c => (
                      <button key={c} onClick={() => setCustomStampColor(c)} className={`w-6 h-6 rounded-full border-2 cursor-pointer ${customStampColor === c ? "border-white" : "border-slate-700"}`} style={{ background: c }} />
                    ))}
                  </div>
                  <button onClick={() => { if (customStampText.trim()) { addAnnotation("stamp", 100, 100, { w: 180, h: 50, color: customStampColor, text: customStampText.toUpperCase() }); setCustomStampText(""); setShowCustomStamp(false); } }}
                    className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-bold cursor-pointer transition-colors">Créer</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Properties panel when something is selected */}
        {selectedAnn && toolGroup !== "timbres" && (
          <div className="w-56 border-l border-slate-800 bg-slate-950 p-4 space-y-4 shrink-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Propriétés</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Couleur</label>
                <div className="flex gap-1 flex-wrap">
                  {PALETTE.map(c => (
                    <button key={c} onClick={() => updateAnnotation(selectedAnn.id, { color: c })} className={`w-5 h-5 rounded-full border-2 cursor-pointer ${selectedAnn.color === c ? "border-white" : "border-slate-700"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Épaisseur : {selectedAnn.strokeWidth}px</label>
                <input type="range" min={1} max={10} value={selectedAnn.strokeWidth} onChange={e => updateAnnotation(selectedAnn.id, { strokeWidth: +e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Opacité : {Math.round(selectedAnn.opacity * 100)}%</label>
                <input type="range" min={10} max={100} value={Math.round(selectedAnn.opacity * 100)} onChange={e => updateAnnotation(selectedAnn.id, { opacity: +e.target.value / 100 })} className="w-full" />
              </div>
              <button onClick={() => deleteAnnotation(selectedAnn.id)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold cursor-pointer transition-colors">
                <Trash2 className="w-3.5 h-3.5" /><span>Supprimer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Page navigation */}
      <div className="h-12 flex items-center justify-center gap-4 border-t border-slate-800 shrink-0 bg-slate-950">
        <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-xs text-slate-400">Page {currentPage + 1} / {pdfPages.length}</span>
        <button onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))} disabled={currentPage >= pdfPages.length - 1} className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-[10px] text-slate-600 ml-4">{annotations.filter(a => a.page === currentPage).length} annotations sur cette page</span>
      </div>
    </div>
  );
}
