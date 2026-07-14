import React, { useState } from 'react';
import {
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Hand,
  PenTool,
  Highlighter,
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Stamp,
  MessageSquare,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Cloud,
  Hexagon,
  Palette,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  FileSignature,
  Download,
  Printer
} from 'lucide-react';

type TabMode = 'annotate' | 'shapes' | 'text' | 'stamps';
type Tool = string;

export const ModifierPDF: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('annotate');
  const [activeTool, setActiveTool] = useState<Tool>('hand');
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Styling States
  const [strokeColor, setStrokeColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [opacity, setOpacity] = useState<number>(100);

  // Text States
  const [fontFamily, setFontFamily] = useState<string>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(12);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab);
    // Set default tool for tab
    if (tab === 'annotate') setActiveTool('highlight');
    if (tab === 'shapes') setActiveTool('rectangle');
    if (tab === 'text') setActiveTool('text-edit');
    if (tab === 'stamps') setActiveTool('stamp-standard');
    setIsSidebarOpen(true);
  };

  const colors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
    '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
  ];

  const renderTopBar = () => (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
      <div className="flex items-center space-x-6">
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Éditeur PDF</h1>
        
        {/* Main Tabs */}
        <nav className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange('annotate')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'annotate' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <PenTool className="w-4 h-4 inline-block mr-2" />
            Annoter
          </button>
          <button
            onClick={() => handleTabChange('shapes')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'shapes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Square className="w-4 h-4 inline-block mr-2" />
            Formes
          </button>
          <button
            onClick={() => handleTabChange('text')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Type className="w-4 h-4 inline-block mr-2" />
            Texte
          </button>
          <button
            onClick={() => handleTabChange('stamps')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'stamps' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Stamp className="w-4 h-4 inline-block mr-2" />
            Timbres
          </button>
        </nav>
      </div>

      <div className="flex items-center space-x-3">
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Annuler">
          <Undo className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Rétablir">
          <Redo className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <Printer className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <Download className="w-5 h-5" />
        </button>
        <button className="flex items-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les modifications
        </button>
      </div>
    </header>
  );

  const renderSecondaryToolbar = () => {
    return (
      <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200 z-10 space-x-1">
        {/* Common Navigation Tools */}
        <div className="flex items-center mr-4 space-x-1">
          <button 
            onClick={() => setActiveTool('hand')}
            className={`p-1.5 rounded-md ${activeTool === 'hand' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="Outil Main"
          >
            <Hand className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded-md ${activeTool === 'select' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            title="Outil Sélection"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
        </div>
        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* Tab Specific Tools */}
        {activeTab === 'annotate' && (
          <div className="flex items-center space-x-1">
            <button onClick={() => setActiveTool('highlight')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'highlight' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Highlighter className="w-4 h-4 mr-1.5" /> Surligner
            </button>
            <button onClick={() => setActiveTool('underline')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'underline' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <UnderlineIcon className="w-4 h-4 mr-1.5" /> Souligner
            </button>
            <button onClick={() => setActiveTool('strike')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'strike' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Strikethrough className="w-4 h-4 mr-1.5" /> Barrer
            </button>
            <button onClick={() => setActiveTool('draw')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'draw' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <PenTool className="w-4 h-4 mr-1.5" /> Dessin libre
            </button>
            <button onClick={() => setActiveTool('note')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'note' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <MessageSquare className="w-4 h-4 mr-1.5" /> Notes
            </button>
            <button onClick={() => setActiveTool('eraser')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'eraser' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Eraser className="w-4 h-4 mr-1.5" /> Gomme
            </button>
          </div>
        )}

        {activeTab === 'shapes' && (
          <div className="flex items-center space-x-1">
            <button onClick={() => setActiveTool('rectangle')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'rectangle' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Square className="w-4 h-4 mr-1.5" /> Rectangle
            </button>
            <button onClick={() => setActiveTool('oval')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'oval' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Circle className="w-4 h-4 mr-1.5" /> Ovale
            </button>
            <button onClick={() => setActiveTool('line')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'line' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Minus className="w-4 h-4 mr-1.5" /> Ligne
            </button>
            <button onClick={() => setActiveTool('arrow')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'arrow' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <ArrowRight className="w-4 h-4 mr-1.5" /> Flèche
            </button>
            <button onClick={() => setActiveTool('polygon')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'polygon' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Hexagon className="w-4 h-4 mr-1.5" /> Polygone
            </button>
            <button onClick={() => setActiveTool('cloud')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'cloud' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Cloud className="w-4 h-4 mr-1.5" /> Nuage
            </button>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex items-center space-x-1">
            <button onClick={() => setActiveTool('text-edit')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'text-edit' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Type className="w-4 h-4 mr-1.5" /> Ajouter du texte
            </button>
            <button onClick={() => setActiveTool('callout')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'callout' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <MessageSquare className="w-4 h-4 mr-1.5" /> Légende
            </button>
          </div>
        )}

        {activeTab === 'stamps' && (
          <div className="flex items-center space-x-1">
            <button onClick={() => setActiveTool('stamp-standard')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'stamp-standard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Stamp className="w-4 h-4 mr-1.5" /> Timbres standards
            </button>
            <button onClick={() => setActiveTool('stamp-dynamic')} className={`flex items-center px-3 py-1.5 rounded-md text-sm ${activeTool === 'stamp-dynamic' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}>
              <FileSignature className="w-4 h-4 mr-1.5" /> Timbres dynamiques
            </button>
          </div>
        )}

        <div className="flex-1"></div>
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-md transition-colors ${isSidebarOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
          title="Propriétés"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderSidebar = () => {
    return (
      <aside className={`w-80 bg-white border-l border-gray-200 flex flex-col z-20 transition-all duration-300 shadow-xl ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full fixed right-0 h-full opacity-0 pointer-events-none'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Propriétés</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Colors (Visible for Annotate and Shapes) */}
          {(activeTab === 'annotate' || activeTab === 'shapes') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de trait</label>
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <button 
                    key={`stroke-${c}`} 
                    onClick={() => setStrokeColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${strokeColor === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fill Color (Visible for Shapes) */}
          {activeTab === 'shapes' && (
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de remplissage</label>
               <div className="flex flex-wrap gap-2">
                 <button 
                    onClick={() => setFillColor('transparent')}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${fillColor === 'transparent' ? 'border-blue-500 scale-110' : 'border-gray-300'} bg-white relative`}
                    title="Transparent"
                  >
                    <div className="absolute w-full h-[2px] bg-red-500 rotate-45"></div>
                  </button>
                 {colors.map(c => (
                   <button 
                     key={`fill-${c}`} 
                     onClick={() => setFillColor(c)}
                     className={`w-6 h-6 rounded-full border-2 ${fillColor === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                     style={{ backgroundColor: c }}
                   />
                 ))}
               </div>
             </div>
          )}

          {/* Thickness */}
          {(activeTab === 'annotate' || activeTab === 'shapes') && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Épaisseur</label>
                <span className="text-xs text-gray-500">{strokeWidth} pt</span>
              </div>
              <input 
                type="range" 
                min="1" max="20" 
                value={strokeWidth} 
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}

          {/* Opacity */}
          {activeTab !== 'stamps' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Opacité</label>
                <span className="text-xs text-gray-500">{opacity}%</span>
              </div>
              <input 
                type="range" 
                min="10" max="100" 
                value={opacity} 
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}

          {/* Text Formatting */}
          {activeTab === 'text' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Police</label>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taille</label>
                  <input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                  <div className="h-8 border border-gray-300 rounded-md shadow-sm overflow-hidden flex items-center px-1">
                    <input 
                      type="color" 
                      value={strokeColor} 
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-full h-10 -m-2 cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                <div className="flex rounded-md shadow-sm">
                  <button onClick={() => setIsBold(!isBold)} className={`flex-1 flex justify-center py-2 border border-gray-300 rounded-l-md ${isBold ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <Bold className="w-4 h-4 text-gray-700" />
                  </button>
                  <button onClick={() => setIsItalic(!isItalic)} className={`flex-1 flex justify-center py-2 border-t border-b border-gray-300 ${isItalic ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <Italic className="w-4 h-4 text-gray-700" />
                  </button>
                  <button onClick={() => setIsUnderline(!isUnderline)} className={`flex-1 flex justify-center py-2 border border-gray-300 rounded-r-md ${isUnderline ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <UnderlineIcon className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alignement</label>
                <div className="flex rounded-md shadow-sm">
                  <button onClick={() => setTextAlign('left')} className={`flex-1 flex justify-center py-2 border border-gray-300 rounded-l-md ${textAlign === 'left' ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <AlignLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button onClick={() => setTextAlign('center')} className={`flex-1 flex justify-center py-2 border-t border-b border-gray-300 ${textAlign === 'center' ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <AlignCenter className="w-4 h-4 text-gray-700" />
                  </button>
                  <button onClick={() => setTextAlign('right')} className={`flex-1 flex justify-center py-2 border-t border-b border-gray-300 ${textAlign === 'right' ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <AlignRight className="w-4 h-4 text-gray-700" />
                  </button>
                  <button onClick={() => setTextAlign('justify')} className={`flex-1 flex justify-center py-2 border border-gray-300 rounded-r-md ${textAlign === 'justify' ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}`}>
                    <AlignJustify className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Stamps Listing */}
          {activeTab === 'stamps' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Timbres Standards</h3>
              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center justify-center p-3 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span className="font-bold tracking-widest uppercase">Approuvé</span>
                </button>
                <button className="flex items-center justify-center p-3 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-bold tracking-widest uppercase">Expiré</span>
                </button>
                <button className="flex items-center justify-center p-3 border-2 border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors">
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  <span className="font-bold tracking-widest uppercase">Confidentiel</span>
                </button>
                <button className="flex items-center justify-center p-3 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                  <span className="font-bold tracking-widest uppercase">Tel Quel</span>
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200 mt-6">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  + Créer un timbre personnalisé
                </button>
              </div>
            </div>
          )}

        </div>
      </aside>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-200 font-sans absolute inset-0">
      {renderTopBar()}
      {renderSecondaryToolbar()}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 relative overflow-auto flex flex-col items-center bg-gray-100 p-6">
          
          {/* Mock PDF Container */}
          <div 
            className="bg-white shadow-2xl relative"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out'
            }}
          >
            {/* Mock Content */}
            <div className="absolute inset-0 p-12 pointer-events-none opacity-20">
              <h1 className="text-4xl font-bold mb-4">Document PDF (Aperçu)</h1>
              <p className="mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <div className="w-full h-px bg-gray-400 my-8"></div>
              <p className="mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>

            {/* This layer would be the actual interactive canvas for PDF manipulation */}
            <div className={`absolute inset-0 z-10 ${activeTool === 'hand' ? 'cursor-grab' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}>
              {/* Overlays, drawings, shapes go here */}
            </div>
          </div>

          {/* Bottom Pagination & Zoom Bar */}
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-90 backdrop-blur-sm text-white px-6 py-3 rounded-full flex items-center space-x-6 shadow-xl z-20">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(300, zoom + 25))}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            
            <div className="w-px h-6 bg-gray-600"></div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`p-1 rounded-full transition-colors ${currentPage === 1 ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-700'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium">Page {currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`p-1 rounded-full transition-colors ${currentPage === totalPages ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-700'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>

        {renderSidebar()}
      </div>
    </div>
  );
};

export default ModifierPDF;
