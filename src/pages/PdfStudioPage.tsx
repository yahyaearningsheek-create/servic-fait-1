import React, { useState } from 'react';
import { 
  ArrowLeft, Upload, FileText, Image, FileOutput, Shield, Scissors, 
  Copy, Type, Zap, CheckSquare, Layers, Lock, Unlock, Hash, PenTool,
  RotateCw, Columns, PenBox, Download, Play, FileJson, Stamp
} from 'lucide-react';
import ModifierPDF from '../components/pdf/ModifierPDF';
import SignerPDF from '../components/pdf/SignerPDF';
import OrganiserPDF from '../components/pdf/OrganiserPDF';
import NumerosPDF from '../components/pdf/NumerosPDF';
import ConvertPDF from '../components/pdf/ConvertPDF';

// Dummy components for advanced/other tools not yet fully implemented
const DummyTool = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">{title}</h2>
      <p className="text-slate-500 mb-8">Cet outil est en cours de développement.</p>
      <button 
        onClick={onBack}
        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Retour au PDF Studio
      </button>
    </div>
  </div>
);

type PdfTool = 
  | 'dashboard' 
  | 'modifier' | 'signer' | 'organiser' | 'numeros' 
  | 'convert-pdf-to-word' | 'convert-pdf-to-excel' | 'convert-pdf-to-ppt' | 'convert-pdf-to-jpg' | 'convert-pdf-to-pdfa'
  | 'convert-word-to-pdf' | 'convert-excel-to-pdf' | 'convert-ppt-to-pdf' | 'convert-jpg-to-pdf' | 'convert-html-to-pdf'
  | 'fusionner' | 'diviser' | 'compresser' | 'reparer'
  | 'filigrane' | 'pivoter'
  | 'deverrouiller' | 'proteger'
  | 'ocr' | 'comparer' | 'scanner' | 'calques' | 'correcteur';

export default function PdfStudioPage() {
  const [activeTool, setActiveTool] = useState<PdfTool>('dashboard');

  if (activeTool === 'modifier') return <ModifierPDF onBack={() => setActiveTool('dashboard')} />;
  if (activeTool === 'signer') return <SignerPDF onBack={() => setActiveTool('dashboard')} />;
  if (activeTool === 'organiser') return <OrganiserPDF pdfPages={[]} onPagesUpdate={() => {}} onBack={() => setActiveTool('dashboard')} />;
  if (activeTool === 'numeros') return <NumerosPDF pdfPages={[]} onBack={() => setActiveTool('dashboard')} />;
  if (activeTool.startsWith('convert-')) return <ConvertPDF type={activeTool} onBack={() => setActiveTool('dashboard')} />;
  
  if (activeTool !== 'dashboard') return <DummyTool title={activeTool} onBack={() => setActiveTool('dashboard')} />;

  const tools = [
    {
      category: "Organisation",
      description: "Fusionner, diviser, compresser et organiser vos PDF",
      color: "blue",
      items: [
        { id: 'fusionner', icon: Columns, title: "Fusionner PDF", desc: "Combinez plusieurs fichiers PDF en un seul document", color: "text-blue-500" },
        { id: 'diviser', icon: Scissors, title: "Diviser PDF", desc: "Séparez un PDF en plusieurs fichiers distincts", color: "text-blue-500" },
        { id: 'compresser', icon: Download, title: "Compresser PDF", desc: "Réduisez la taille de vos fichiers PDF", color: "text-blue-500" },
        { id: 'organiser', icon: Copy, title: "Organiser PDF", desc: "Réorganisez, ajoutez ou supprimez des pages", color: "text-blue-500" },
        { id: 'reparer', icon: PenTool, title: "Réparer PDF", desc: "Récupérez les données d'un PDF corrompu", color: "text-blue-500" },
      ]
    },
    {
      category: "Convertir depuis PDF",
      description: "Transformez vos PDF en Word, Excel, JPG et plus",
      color: "emerald",
      items: [
        { id: 'convert-pdf-to-word', icon: FileText, title: "PDF en Word", desc: "Transformez vos PDF en documents Word éditables", color: "text-emerald-500" },
        { id: 'convert-pdf-to-excel', icon: FileJson, title: "PDF en Excel", desc: "Extrayez les tableaux de vos PDF vers Excel", color: "text-emerald-500" },
        { id: 'convert-pdf-to-ppt', icon: Play, title: "PDF en PowerPoint", desc: "Convertissez vos PDF en présentations", color: "text-emerald-500" },
        { id: 'convert-pdf-to-jpg', icon: Image, title: "PDF en JPG", desc: "Convertissez chaque page en image JPG", color: "text-emerald-500" },
        { id: 'convert-pdf-to-pdfa', icon: FileOutput, title: "PDF en PDF/A", desc: "Convertissez au format d'archivage PDF/A", color: "text-emerald-500" },
      ]
    },
    {
      category: "Convertir vers PDF",
      description: "Créez des PDF depuis Word, Excel, JPG, HTML",
      color: "orange",
      items: [
        { id: 'convert-word-to-pdf', icon: FileText, title: "Word en PDF", desc: "Transformez vos documents Word en PDF", color: "text-orange-500" },
        { id: 'convert-excel-to-pdf', icon: FileJson, title: "Excel en PDF", desc: "Convertissez vos feuilles de calcul en PDF", color: "text-orange-500" },
        { id: 'convert-ppt-to-pdf', icon: Play, title: "PowerPoint en PDF", desc: "Figez vos présentations au format PDF", color: "text-orange-500" },
        { id: 'convert-jpg-to-pdf', icon: Image, title: "JPG en PDF", desc: "Créez un PDF à partir de vos images", color: "text-orange-500" },
        { id: 'convert-html-to-pdf', icon: FileOutput, title: "HTML en PDF", desc: "Convertissez une page web en PDF", color: "text-orange-500" },
      ]
    },
    {
      category: "Édition",
      description: "Modifiez, annotez et personnalisez vos documents",
      color: "orange-600",
      items: [
        { id: 'modifier', icon: PenBox, title: "Modifier PDF", desc: "Ajoutez du texte, des images et des formes", color: "text-orange-600" },
        { id: 'numeros', icon: Hash, title: "Numéros de page", desc: "Insérez une numérotation personnalisée", color: "text-orange-600" },
        { id: 'filigrane', icon: Stamp, title: "Filigrane", desc: "Apposez un texte ou logo en transparence", color: "text-orange-600" },
        { id: 'pivoter', icon: RotateCw, title: "Pivoter PDF", desc: "Tournez les pages de votre document", color: "text-orange-600" },
      ]
    },
    {
      category: "Sécurité",
      description: "Protégez, déverrouillez et signez vos PDF",
      color: "red",
      items: [
        { id: 'deverrouiller', icon: Unlock, title: "Déverrouiller PDF", desc: "Retirez le mot de passe d'un fichier PDF", color: "text-red-500" },
        { id: 'proteger', icon: Lock, title: "Protéger PDF", desc: "Ajoutez un mot de passe et chiffrez le document", color: "text-red-500" },
        { id: 'signer', icon: PenTool, title: "Signer PDF", desc: "Créez et apposez votre signature électronique", color: "text-red-500" },
      ]
    },
    {
      category: "Avancé",
      description: "OCR, comparaison et numérisation intelligente",
      color: "purple",
      items: [
        { id: 'ocr', icon: Type, title: "OCR", desc: "Reconnaissance de caractères sur PDF numérisés", color: "text-purple-500" },
        { id: 'comparer', icon: Layers, title: "Comparer PDF", desc: "Comparez deux documents côte à côte", color: "text-purple-500" },
        { id: 'scanner', icon: Zap, title: "Scanner vers PDF", desc: "Numérisez un document avec votre caméra", color: "text-purple-500" },
        { id: 'calques', icon: Layers, title: "Calques Magiques", desc: "Détourez un objet par IA et rendez-le déplaçable avec inpainting du fond", color: "text-purple-500" },
        { id: 'correcteur', icon: CheckSquare, title: "Correcteur IA Pro", desc: "Corrigez l'orthographe, la grammaire, la ponctuation et le style", color: "text-purple-500" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#9b66ff] to-[#7f42ff] pt-6 pb-20 px-4 text-center">
        <a href="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au Signalement
        </a>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          PDF Studio
        </h1>
        <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Tous les outils PDF dont vous avez besoin, directement dans votre navigateur.<br/>
          <span className="font-bold">100% gratuit • 100% sécurisé • Aucun fichier envoyé en ligne</span>
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <span className="px-4 py-1.5 rounded-full bg-white/10 text-white text-sm border border-white/20 backdrop-blur-sm">Traitement local</span>
          <span className="px-4 py-1.5 rounded-full bg-white/10 text-white text-sm border border-white/20 backdrop-blur-sm">Ultra rapide</span>
          <span className="px-4 py-1.5 rounded-full bg-white/10 text-white text-sm border border-white/20 backdrop-blur-sm">25 outils</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 -mt-10 pb-16">
        <div className="space-y-8">
          {tools.map((section, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="mb-6 flex items-start">
                <div className={`w-1 h-10 rounded-full bg-${section.color}-500 mr-4`} style={{ backgroundColor: section.category === 'Édition' ? '#ea580c' : undefined }}></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{section.category}</h2>
                  <p className="text-slate-500 text-sm">{section.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {section.items.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as PdfTool)}
                    className="text-left bg-slate-50 hover:bg-slate-100 p-5 rounded-xl border border-slate-200 transition-all hover:shadow-md hover:-translate-y-1 group"
                  >
                    <div className={`w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center mb-4 ${tool.color}`}>
                      <tool.icon className="w-6 h-6 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">{tool.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {tool.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
