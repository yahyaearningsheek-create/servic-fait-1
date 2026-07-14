import React, { useState, useRef } from "react";
import { ArrowLeft, Trash2, RotateCw, Upload, Plus, Check, GripVertical, Copy, X } from "lucide-react";

interface OrganiserPDFProps {
  pdfPages: string[];
  onBack: () => void;
  onPagesUpdate: (newPages: string[]) => void;
}

interface PageItem {
  id: string;
  src: string;
  rotation: number;
}

export default function OrganiserPDF({ pdfPages, onBack, onPagesUpdate }: OrganiserPDFProps) {
  const [pages, setPages] = useState<PageItem[]>(() =>
    pdfPages.map((src, i) => ({ id: `page-${i}-${Date.now()}`, src, rotation: 0 }))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === pages.length) setSelected(new Set());
    else setSelected(new Set(pages.map(p => p.id)));
  };

  const deletePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} page(s) ?`)) return;
    setPages(prev => prev.filter(p => !selected.has(p.id)));
    setSelected(new Set());
  };

  const rotatePage = (id: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const duplicatePage = (id: string) => {
    const idx = pages.findIndex(p => p.id === id);
    if (idx === -1) return;
    const orig = pages[idx];
    const dup: PageItem = { id: `page-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, src: orig.src, rotation: orig.rotation };
    const next = [...pages];
    next.splice(idx + 1, 0, dup);
    setPages(next);
  };

  const insertPages = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const newPage: PageItem = { id: `page-new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, src, rotation: 0 };
        setPages(prev => [...prev, newPage]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Native HTML5 drag and drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragId(null);
    setDropIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!dragId) return;
    const fromIndex = pages.findIndex(p => p.id === dragId);
    if (fromIndex === -1 || fromIndex === targetIndex) { setDropIndex(null); return; }
    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex > fromIndex ? targetIndex - 1 : targetIndex, 0, moved);
    setPages(next);
    setDragId(null);
    setDropIndex(null);
  };

  const handleApply = () => {
    onPagesUpdate(pages.map(p => p.src));
    onBack();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* Toolbar */}
      <div className="h-16 flex items-center gap-3 px-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
          <Copy className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Organiser les Pages</h2>
        <div className="flex-1" />

        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-sm font-bold cursor-pointer transition-all shadow-sm">
          <Upload className="w-4 h-4" /><span>Insérer une page</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { if (e.target.files) insertPages(e.target.files); e.target.value = ""; }} />

        <button onClick={selectAll} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border ${selected.size === pages.length ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 shadow-sm"}`}>
          <Check className="w-4 h-4" /><span>{selected.size === pages.length ? "Tout désélectionner" : "Tout sélectionner"}</span>
        </button>

        {selected.size > 0 && (
          <button onClick={deleteSelected} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-bold cursor-pointer transition-all shadow-sm">
            <Trash2 className="w-4 h-4" /><span>Supprimer ({selected.size})</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="absolute inset-0 pattern-dots bg-[length:20px_20px] opacity-30 pointer-events-none"></div>
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 relative z-10">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-300">
              <Copy className="w-10 h-10" />
            </div>
            <p className="text-slate-500 font-medium">Aucune page. Insérez des pages depuis votre ordinateur.</p>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 rounded-xl text-white font-bold cursor-pointer transition-all">
              <Plus className="w-5 h-5" /><span>Ajouter des pages</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative z-10 max-w-7xl mx-auto">
            {pages.map((page, index) => (
              <React.Fragment key={page.id}>
                {/* Drop indicator */}
                {dropIndex === index && dragId && (
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="w-2 h-full bg-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50" />
                  </div>
                )}
                <div
                  draggable
                  onDragStart={e => handleDragStart(e, page.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, index)}
                  onDrop={e => handleDrop(e, index)}
                  onClick={() => toggleSelect(page.id)}
                  className={`relative group rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer bg-white ${
                    selected.has(page.id) 
                      ? "border-purple-500 shadow-xl shadow-purple-500/20 ring-4 ring-purple-500/10 scale-[1.02]" 
                      : dragId === page.id 
                        ? "border-slate-300 opacity-50 scale-95" 
                        : "border-slate-200 hover:border-purple-300 hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  {/* Selection check */}
                  {selected.has(page.id) && (
                    <div className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white">
                      <Check className="w-4 h-4 text-white font-bold" />
                    </div>
                  )}

                  {/* Drag handle */}
                  <div className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Page image */}
                  <div className="aspect-[1/1.4] overflow-hidden flex items-center justify-center p-4 bg-slate-50/50 pattern-grid">
                    <img
                      src={page.src}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-contain drop-shadow-md"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      draggable={false}
                    />
                  </div>

                  {/* Page number badge */}
                  <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-4 py-3 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-700">Page {index + 1}</span>
                  </div>

                  {/* Hover action buttons */}
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                    <button onClick={e => { e.stopPropagation(); rotatePage(page.id); }} className="w-12 h-12 rounded-full bg-white text-slate-700 hover:text-purple-600 hover:scale-110 flex items-center justify-center shadow-xl cursor-pointer transition-all" title="Pivoter">
                      <RotateCw className="w-5 h-5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); duplicatePage(page.id); }} className="w-12 h-12 rounded-full bg-white text-slate-700 hover:text-purple-600 hover:scale-110 flex items-center justify-center shadow-xl cursor-pointer transition-all" title="Dupliquer">
                      <Copy className="w-5 h-5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deletePage(page.id); }} className="w-12 h-12 rounded-full bg-white text-slate-700 hover:text-red-600 hover:scale-110 flex items-center justify-center shadow-xl cursor-pointer transition-all" title="Supprimer">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="h-20 flex items-center justify-between px-8 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-20">
        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-sm font-bold text-slate-700">{pages.length} page{pages.length > 1 ? "s" : ""} au total</span>
        </div>
        <button onClick={handleApply} className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl text-white font-bold cursor-pointer transition-all shadow-lg shadow-red-600/20">
          <Check className="w-5 h-5" />
          <span className="text-base">Appliquer les modifications</span>
        </button>
      </div>
    </div>
  );
}
