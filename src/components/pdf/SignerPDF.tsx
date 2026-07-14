import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Edit3, Type, Image as ImageIcon, Check, Move } from 'lucide-react';

type TabType = 'signature' | 'initials' | 'stamp';
type InputMode = 'text' | 'draw' | 'image';
type PageMode = 'current' | 'all' | 'custom';
type ColorType = '#000000' | '#ef4444' | '#3b82f6' | '#22c55e';

interface SignatureConfig {
  type: TabType;
  mode: InputMode;
  content: string | null;
  color: string;
  font?: string;
  pageMode: PageMode;
  customPages?: string;
}

export default function SignerPDF() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [appliedSignature, setAppliedSignature] = useState<SignatureConfig | null>(null);
  const [position, setPosition] = useState({ x: 300, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleApply = (config: SignatureConfig) => {
    setAppliedSignature(config);
    setIsModalOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initX + dx,
      y: dragRef.current.initY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="w-full h-screen bg-gray-50 flex flex-col relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Éditeur de PDF</h1>
          <p className="text-sm text-gray-500">Document_1.pdf</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium shadow transition-colors flex items-center space-x-2"
        >
          <Edit3 className="w-4 h-4" />
          <span>Configurer la signature</span>
        </button>
      </div>

      {/* Main Workspace (PDF View) */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-gray-100 relative">
        <div className="bg-white w-[800px] min-h-[1131px] shadow-xl relative border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-8 text-center text-gray-300 font-semibold text-2xl flex-1 flex items-center justify-center select-none border-b border-dashed border-gray-200">
            [Page 1] Contenu du document PDF
          </div>
          <div className="p-8 text-center text-gray-300 font-semibold text-2xl flex-1 flex items-center justify-center select-none">
            [Page 2] Contenu du document PDF
          </div>
          
          {/* Draggable Signature Overlay */}
          {appliedSignature && (
            <div
              style={{ left: position.x, top: position.y }}
              className={`absolute cursor-move border-2 ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:border-gray-300'} p-2 rounded flex flex-col items-center justify-center group z-50`}
              onMouseDown={handleMouseDown}
            >
              {/* Drag Handle Indicator */}
              <div className="absolute -top-3 -right-3 bg-white p-1 rounded-full shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <Move className="w-4 h-4 text-gray-500" />
              </div>
              
              {appliedSignature.mode === 'text' && (
                <span 
                  style={{ color: appliedSignature.color, fontFamily: appliedSignature.font }} 
                  className="text-4xl whitespace-nowrap px-4 py-2 select-none"
                >
                  {appliedSignature.content || 'Signature'}
                </span>
              )}
              {appliedSignature.mode === 'draw' && appliedSignature.content && (
                <img src={appliedSignature.content} alt="Signature tracée" className="max-h-24 pointer-events-none select-none" />
              )}
              {appliedSignature.mode === 'image' && appliedSignature.content && (
                <img src={appliedSignature.content} alt="Signature importée" className="max-h-32 pointer-events-none select-none" />
              )}
              {appliedSignature.type === 'stamp' && appliedSignature.content && (
                <img src={appliedSignature.content} alt="Tampon d'entreprise" className="max-h-40 opacity-90 pointer-events-none mix-blend-multiply select-none" />
              )}
              <div className="absolute -bottom-8 text-xs text-gray-500 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Pages: {appliedSignature.pageMode === 'custom' ? appliedSignature.customPages : (appliedSignature.pageMode === 'current' ? 'Actuelle' : 'Toutes')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <SignatureModal 
          onClose={() => setIsModalOpen(false)} 
          onApply={handleApply} 
        />
      )}
    </div>
  );
}

interface SignatureModalProps {
  onClose: () => void;
  onApply: (config: SignatureConfig) => void;
}

function SignatureModal({ onClose, onApply }: SignatureModalProps) {
  const [fullName, setFullName] = useState('Jean Dupont');
  const [initialsText, setInitialsText] = useState('JD');
  
  const [activeTab, setActiveTab] = useState<TabType>('signature');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  
  const [color, setColor] = useState<ColorType>('#000000');
  const [font, setFont] = useState<string>('"Brush Script MT", "Segoe Print", cursive');
  
  const [pageMode, setPageMode] = useState<PageMode>('current');
  const [customPages, setCustomPages] = useState<string>('');

  const [stampImage, setStampImage] = useState<string | null>(null);
  const [drawnImage, setDrawnImage] = useState<string | null>(null);

  const colors: ColorType[] = ['#000000', '#ef4444', '#3b82f6', '#22c55e'];
  const fonts = [
    { name: 'Manuscrite', value: '"Brush Script MT", "Segoe Print", cursive' },
    { name: 'Classique', value: 'Georgia, serif' },
    { name: 'Moderne', value: 'Arial, sans-serif' },
    { name: 'Élégante', value: '"Courier New", monospace' }
  ];

  // Canvas Drawing logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (inputMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [inputMode, color, activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnImage(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawnImage(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setter(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropStamp = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/svg+xml')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setStampImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    let content: string | null = null;
    if (activeTab === 'stamp') {
      content = stampImage;
    } else {
      if (inputMode === 'text') {
        content = activeTab === 'signature' ? fullName : initialsText;
      } else if (inputMode === 'draw') {
        content = drawnImage;
      } else if (inputMode === 'image') {
        content = stampImage; 
      }
    }

    onApply({
      type: activeTab,
      mode: activeTab === 'stamp' ? 'image' : inputMode,
      content,
      color,
      font,
      pageMode,
      customPages
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Configurer les paramètres de votre signature</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Identity Header */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Ex: Jean Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Initiales</label>
              <input 
                type="text" 
                value={initialsText}
                onChange={(e) => setInitialsText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Ex: JD"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-200 mb-6">
            {(['signature', 'initials', 'stamp'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === tab 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'signature' && 'Signature'}
                {tab === 'initials' && 'Initiales'}
                {tab === 'stamp' && 'Tampon d\'entreprise'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab !== 'stamp' && (
              <div className="space-y-6">
                {/* Input Mode Toggles */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  {(['text', 'draw', 'image'] as InputMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInputMode(mode)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        inputMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {mode === 'text' && <Type className="w-4 h-4" />}
                      {mode === 'draw' && <Edit3 className="w-4 h-4" />}
                      {mode === 'image' && <ImageIcon className="w-4 h-4" />}
                      <span>
                        {mode === 'text' && 'Texte'}
                        {mode === 'draw' && 'Tracé libre'}
                        {mode === 'image' && 'Image'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Sub-content based on Input Mode */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
                  {inputMode === 'text' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-center h-32 bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <span style={{ color, fontFamily: font }} className="text-5xl px-4 py-2 break-all select-none">
                          {activeTab === 'signature' ? (fullName || 'Signature') : (initialsText || 'JD')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Style de police</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {fonts.map(f => (
                            <button
                              key={f.name}
                              onClick={() => setFont(f.value)}
                              className={`py-3 px-4 rounded-lg border text-center transition-all ${font === f.value ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'}`}
                            >
                              <span style={{ fontFamily: f.value }} className="text-xl">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {inputMode === 'draw' && (
                    <div className="space-y-4">
                      <div className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden h-48 flex items-center justify-center">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={192}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          className="absolute inset-0 cursor-crosshair w-full h-full"
                        />
                        {!drawnImage && !isDrawing && (
                          <span className="text-gray-400 pointer-events-none select-none">
                            Dessinez votre {activeTab === 'signature' ? 'signature' : 'initiale'} ici
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button onClick={clearCanvas} className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">
                          Effacer le tracé
                        </button>
                      </div>
                    </div>
                  )}

                  {inputMode === 'image' && (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                      <input 
                        type="file" 
                        id="sig-upload" 
                        className="hidden" 
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={(e) => handleImageUpload(e, setStampImage)}
                      />
                      {stampImage ? (
                        <div className="relative group">
                          <img src={stampImage} alt="Uploaded" className="max-h-32 object-contain" />
                          <button 
                            onClick={() => setStampImage(null)}
                            className="absolute -top-3 -right-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="sig-upload" className="cursor-pointer flex flex-col items-center group">
                          <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4 group-hover:bg-blue-100 transition-colors">
                            <Upload className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Cliquez pour importer une image</p>
                          <p className="text-xs text-gray-500">PNG, JPG, SVG supportés</p>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Color Palette */}
                {inputMode !== 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Couleur de l'encre</label>
                    <div className="flex space-x-4">
                      {colors.map(c => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105 shadow-sm border border-gray-200'}`}
                          style={{ backgroundColor: c, ringColor: c }}
                        >
                          {color === c && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stamp' && (
              <div 
                className="border-2 border-dashed border-gray-300 bg-gray-50/50 rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors hover:bg-gray-50"
                onDragOver={onDragOver}
                onDrop={onDropStamp}
              >
                <input 
                  type="file" 
                  id="stamp-upload" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={(e) => handleImageUpload(e, setStampImage)}
                />
                {stampImage ? (
                  <div className="relative group">
                    <img src={stampImage} alt="Tampon" className="max-h-48 object-contain mix-blend-multiply" />
                    <button 
                      onClick={() => setStampImage(null)}
                      className="absolute -top-3 -right-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="stamp-upload" className="cursor-pointer flex flex-col items-center w-full group">
                    <div className="bg-white p-6 rounded-full shadow-sm border border-gray-100 text-gray-400 mb-6 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                      <Upload className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Glissez-déposez votre tampon ici</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Formats supportés : PNG, JPG, SVG. Un fond transparent est recommandé pour un rendu optimal sur le document.
                    </p>
                    <span className="mt-6 px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm group-hover:bg-gray-50 transition-colors">
                      Parcourir les fichiers
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Placement Logic (CRITICAL) */}
          <div className="mt-10 border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Emplacement sur le document</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['current', 'all', 'custom'] as PageMode[]).map((mode) => (
                <div key={mode} className="flex flex-col space-y-3">
                  <label 
                    className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                      pageMode === mode 
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="pageMode"
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={pageMode === mode}
                        onChange={() => setPageMode(mode)}
                      />
                    </div>
                    <div className="ml-3 flex flex-col w-full">
                      <span className={`block text-sm font-medium ${pageMode === mode ? 'text-blue-900' : 'text-gray-900'}`}>
                        {mode === 'current' && 'Page actuelle uniquement'}
                        {mode === 'all' && 'Toutes les pages'}
                        {mode === 'custom' && 'Plage personnalisée'}
                      </span>
                      {mode === 'custom' && pageMode === 'custom' && (
                        <input 
                          type="text"
                          placeholder="ex: 1-3, 5"
                          value={customPages}
                          onChange={(e) => setCustomPages(e.target.value)}
                          className="mt-2 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-3 border outline-none bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500 italic flex items-center">
              <Move className="w-4 h-4 mr-2" />
              Une fois appliquée, vous pourrez glisser-déposer la signature sur le document pour ajuster sa position.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors shadow-sm"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-md flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Appliquer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
