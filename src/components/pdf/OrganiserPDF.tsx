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
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Toolbar */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-sm font-bold">Organiser les Pages</h2>
        <div className="flex-1" />

        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" /><span>Insérer une page</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) insertPages(e.target.files); e.target.value = ""; }} />

        <button onClick={selectAll} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${selected.size === pages.length ? "bg-teal-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}>
          <Check className="w-3.5 h-3.5" /><span>{selected.size === pages.length ? "Tout désélectionner" : "Tout sélectionner"}</span>
        </button>

        {selected.size > 0 && (
          <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold cursor-pointer transition-colors">
            <Trash2 className="w-3.5 h-3.5" /><span>Supprimer ({selected.size})</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-slate-500 text-sm">Aucune page. Insérez des pages depuis votre ordinateur.</p>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
              <Plus className="w-4 h-4" /><span>Ajouter des pages</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {pages.map((page, index) => (
              <React.Fragment key={page.id}>
                {/* Drop indicator */}
                {dropIndex === index && dragId && (
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="w-1 h-full bg-teal-500 rounded-full animate-pulse" />
                  </div>
                )}
                <div
                  draggable
                  onDragStart={e => handleDragStart(e, page.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, index)}
                  onDrop={e => handleDrop(e, index)}
                  onClick={() => toggleSelect(page.id)}
                  className={`relative group rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer ${
                    selected.has(page.id) 
                      ? "border-teal-500 shadow-lg shadow-teal-500/20 ring-2 ring-teal-500/30" 
                      : dragId === page.id 
                        ? "border-slate-600 opacity-50" 
                        : "border-slate-800 hover:border-slate-600 hover:shadow-lg"
                  }`}
                  style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
                >
                  {/* Selection check */}
                  {selected.has(page.id) && (
                    <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Page image */}
                  <div className="aspect-[3/4] overflow-hidden flex items-center justify-center p-2 bg-white/5">
                    <img
                      src={page.src}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-contain"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      draggable={false}
                    />
                  </div>

                  {/* Page number badge */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent px-3 py-2 flex items-end justify-between">
                    <span className="text-[11px] font-bold text-white">Page {index + 1}</span>
                  </div>

                  {/* Hover action buttons */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <button onClick={e => { e.stopPropagation(); rotatePage(page.id); }} className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white cursor-pointer transition-colors" title="Pivoter">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); duplicatePage(page.id); }} className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white cursor-pointer transition-colors" title="Dupliquer">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deletePage(page.id); }} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 cursor-pointer transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="h-14 flex items-center justify-between px-6 border-t border-slate-800 shrink-0 bg-slate-950">
        <span className="text-xs text-slate-500">{pages.length} page{pages.length > 1 ? "s" : ""} au total</span>
        <button onClick={handleApply} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-lg text-sm font-bold cursor-pointer transition-all shadow-lg">
          <Check className="w-4 h-4" /><span>Appliquer les modifications</span>
        </button>
      </div>
    </div>
  );
}
