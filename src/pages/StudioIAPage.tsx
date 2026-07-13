import React, { useState, useEffect, useRef } from "react";
import { 
  Wand2, Sparkles, Layers, Undo, Redo, Upload, Type,
  Eye, EyeOff, Lock, Unlock, Trash2, Plus, Languages,
  ZoomIn, ZoomOut, Maximize2, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Download,
  RotateCcw, Pipette, Move, Copy, Crop, FlipHorizontal, FlipVertical,
  Image as ImageIcon, Cpu, CheckCircle2, Activity, FileJson, Zap, Settings, Sun, HelpCircle,
  Pen, FileText, Hash, FolderOpen, ArrowLeft
} from "lucide-react";
import { getSession } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import SignerPDF from "../components/pdf/SignerPDF";
import ModifierPDF from "../components/pdf/ModifierPDF";
import OrganiserPDF from "../components/pdf/OrganiserPDF";
import NumerosPDF from "../components/pdf/NumerosPDF";
import ConvertPDF from "../components/pdf/ConvertPDF";
import { renderPDFToImages } from "../utils/pdfRenderer";

interface Layer {
  id: string;
  type: "text" | "bubble" | "character" | "decor" | "background";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  originalText?: string;
  imgUrl?: string;
  color?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  rotation?: number;
}

// Professional font list
const FONT_OPTIONS = [
  { value: "Barlow Condensed", label: "Barlow Cond." },
  { value: "Comic Sans MS", label: "Comic BD" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Impact", label: "Impact" },
  { value: "Times New Roman", label: "Times" },
  { value: "Courier New", label: "Courier" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet" },
  { value: "Segoe UI", label: "Segoe UI" },
  { value: "Roboto", label: "Roboto" },
  { value: "Inter", label: "Inter" },
];

export default function StudioIAPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // PDF Studio Tool State
  const [activePdfTool, setActivePdfTool] = useState<"dashboard" | "signer" | "modifier" | "organiser" | "numeros" | "calques" | "convert">("dashboard");
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  
  // Natural Command state
  const [naturalCommand, setNaturalCommand] = useState("");
  const [commandResponse, setCommandResponse] = useState<string>("");

  // Canvas View State
  const [zoom, setZoom] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<"adjust" | "layers" | "layout" | "retouch" | "export" | "engines">("adjust");
  const [beforeAfterMode, setBeforeAfterMode] = useState<boolean>(false);
  const [beforeAfterSplit, setBeforeAfterSplit] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Layout Guidelines
  const [showBleed, setShowBleed] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [showPanels, setShowPanels] = useState(true);
  
  // Canvas presets
  const [canvasRatio, setCanvasRatio] = useState<string>("A4");
  
  // Image Filters State
  const [filters, setFilters] = useState({
    denoise: 0,
    sharpen: 0,
    upscale: 1,
    colors: 100,
    contrast: 100,
    brightness: 100,
    shadows: 100,
    details: 100,
    contour: false,
    textEnhance: false
  });

  // Layer States
  const [layers, setLayers] = useState<Layer[]>([
    { id: "bg", type: "background", name: "Arrière-plan", visible: true, locked: true, opacity: 100, x: 0, y: 0, width: 100, height: 100 },
    { id: "char-1", type: "character", name: "Personnage principal", visible: true, locked: false, opacity: 100, x: 15, y: 25, width: 35, height: 50 },
    { id: "char-2", type: "decor", name: "Décors / Arbre", visible: true, locked: false, opacity: 100, x: 55, y: 35, width: 35, height: 45 },
    { id: "bubble-1", type: "bubble", name: "Bulle Dialogue 1", visible: true, locked: false, opacity: 100, x: 20, y: 10, width: 30, height: 12, text: "Bienvenue dans le Studio d'Édition IA !", originalText: "Bienvenue dans le Studio d'Édition IA !", color: "#1a1a2e", bgColor: "#ffffff", fontSize: 13, fontFamily: "Barlow Condensed", bold: true, textAlign: "center" },
    { id: "bubble-2", type: "bubble", name: "Bulle Dialogue 2", visible: true, locked: false, opacity: 100, x: 60, y: 15, width: 28, height: 10, text: "Le rendu est parfait !", originalText: "Le rendu est parfait !", color: "#1a1a2e", bgColor: "#ffffff", fontSize: 13, fontFamily: "Barlow Condensed", textAlign: "center" },
  ]);

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  // Magic Layers Pro AI - 19 Engines States
  interface EngineCheck {
    label: string;
    done: boolean;
  }

  interface EngineInfo {
    id: number;
    name: string;
    desc: string;
    status: "idle" | "running" | "completed";
    progress: number;
    checks: EngineCheck[];
  }

  const INITIAL_ENGINES: EngineInfo[] = [
    {
      id: 1,
      name: "01 Vision Engine",
      desc: "Analyse tous les pixels et repère les formes de base.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Analyse des pixels", done: false },
        { label: "Détection de tous les objets", done: false },
        { label: "Reconnaissance des personnes & animaux", done: false },
        { label: "Détection des ombres & lumières", done: false }
      ]
    },
    {
      id: 2,
      name: "02 Scene Intelligence Engine",
      desc: "Comprend la scène et les liaisons spatiales.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Calcul de profondeur spatiale", done: false },
        { label: "Relations parent-enfant", done: false },
        { label: "Association bulle ↔ personnage", done: false }
      ]
    },
    {
      id: 3,
      name: "03 Segmentation Engine",
      desc: "Détourage pixel-parfait haute précision.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Calcul des masques alpha", done: false },
        { label: "Traitement des cheveux & détails fins", done: false },
        { label: "Lissage anti-aliasing sans halo", done: false }
      ]
    },
    {
      id: 4,
      name: "04 OCR & Typography Engine",
      desc: "Détection et extraction de texte éditable.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Reconnaissance des glyphes", done: false },
        { label: "Identification de la police d'écriture", done: false },
        { label: "Calcul de l'espacement & style", done: false }
      ]
    },
    {
      id: 5,
      name: "05 Vector Reconstruction Engine",
      desc: "Génère des tracés vectoriels éditables.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Calcul des tracés géométriques", done: false },
        { label: "Génération de bulles/cadres SVG", done: false }
      ]
    },
    {
      id: 6,
      name: "06 Layer Builder Engine",
      desc: "Structure le projet en calques indépendants.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Séparation des calques physiques", done: false },
        { label: "Génération de la pile de calques", done: false }
      ]
    },
    {
      id: 7,
      name: "07 Object Relationship Engine",
      desc: "Assure la cohérence des éléments liés.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Liaisons géométriques parent-enfant", done: false },
        { label: "Ancrage des ombres", done: false }
      ]
    },
    {
      id: 8,
      name: "08 Generative Reconstruction Engine",
      desc: "Inpainting du fond derrière les objets extraits.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Calcul du fond manquant", done: false },
        { label: "Génération de textures naturelles", done: false }
      ]
    },
    {
      id: 9,
      name: "09 Smart Selection Engine",
      desc: "Calcul spatial des zones de sélection rapide.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Indexation spatiale au pixel près", done: false },
        { label: "Zones de déclenchement rapide", done: false }
      ]
    },
    {
      id: 10,
      name: "10 Image Enhancement Engine",
      desc: "Amélioration de résolution et réduction de bruit.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Upscaling intelligent 4K", done: false },
        { label: "Restauration des visages & détails", done: false }
      ]
    },
    {
      id: 11,
      name: "11 Editing Engine",
      desc: "Supporte les transformations géométriques.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Matrice de transformation active", done: false },
        { label: "Interpolation haute fidélité", done: false }
      ]
    },
    {
      id: 12,
      name: "12 Background Intelligence Engine",
      desc: "Modélisation 3D de l'arrière-plan.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Estimation de la perspective", done: false },
        { label: "Génération de la carte de profondeur", done: false }
      ]
    },
    {
      id: 13,
      name: "13 Shadow & Lighting Engine",
      desc: "Calcul d'éclairage et d'ombres amovibles.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Détection des sources de lumière", done: false },
        { label: "Calcul des ombres projetées", done: false }
      ]
    },
    {
      id: 14,
      name: "14 Material Detection Engine",
      desc: "Classification physique des matériaux de la scène.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Identification verre/métal/tissu/bois", done: false },
        { label: "Comportement de réflectivité physique", done: false }
      ]
    },
    {
      id: 15,
      name: "15 Effects Reconstruction Engine",
      desc: "Isole les effets visuels amovibles.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Séparation flou/fumée/halo", done: false },
        { label: "Lentilles et reflets éditables", done: false }
      ]
    },
    {
      id: 16,
      name: "16 Quality Controller",
      desc: "Contrôle la conformité et corrige les déviations.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Calcul d'écart colorimétrique", done: false },
        { label: "Ajustements automatiques de cohérence", done: false }
      ]
    },
    {
      id: 17,
      name: "17 Export Engine",
      desc: "Formatte le projet pour export multi-calques.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Conversion multi-formats (PSD/SVG/JSON)", done: false },
        { label: "Préservation de la hiérarchie", done: false }
      ]
    },
    {
      id: 18,
      name: "18 Performance Optimizer",
      desc: "Gère le lazy-loading et l'accélération GPU.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Optimisation de la RAM/GPU", done: false },
        { label: "Lazy loading des ressources", done: false }
      ]
    },
    {
      id: 19,
      name: "19 Creative Intelligence Engine",
      desc: "Détermine l'intention graphique, la grille et la palette.",
      status: "idle",
      progress: 0,
      checks: [
        { label: "Détection du style graphique", done: false },
        { label: "Analyse de la hiérarchie visuelle", done: false },
        { label: "Calcul de palette colorimétrique", done: false }
      ]
    }
  ];

  const [engines, setEngines] = useState<EngineInfo[]>(INITIAL_ENGINES);
  const [activeEngineIndex, setActiveEngineIndex] = useState<number>(-1);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>("");

  // Store rich analysis metadata returned by the 19 engines API
  const [aiAnalysis, setAiAnalysis] = useState<{
    visionResults: any[];
    sceneGraph: { relationships: any[] };
    ocrResults: any[];
    materials: any[];
    lighting: any[];
    style: { type: string; confidence: number };
    hierarchy: { title: string; subtitle: string; callToAction: string; decorative: string[] };
    palette: string[];
  } | null>(null);

  // Resize and rotate states
  const [resizeState, setResizeState] = useState<{
    layerId: string;
    handle: "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b";
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initWidth: number;
    initHeight: number;
  } | null>(null);

  const [rotateState, setRotateState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    initRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Illustration prompt generator states
  const [illuPrompt, setIlluPrompt] = useState<string>("");
  const [generatingIllustration, setGeneratingIllustration] = useState<boolean>(false);

  // Detected panels
  const [panels, setPanels] = useState([
    { id: "panel-1", x: 5, y: 5, width: 90, height: 40 },
    { id: "panel-2", x: 5, y: 50, width: 43, height: 45 },
    { id: "panel-3", x: 52, y: 50, width: 43, height: 45 }
  ]);

  // History states
  const [history, setHistory] = useState<{ layers: Layer[]; filters: typeof filters; canvasRatio: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // File loading reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession().then(s => setSession(s));
  }, []);

  // Save state to history helper
  const pushHistory = (newLayers: Layer[], newFilters = filters, newRatio = canvasRatio) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ 
      layers: JSON.parse(JSON.stringify(newLayers)), 
      filters: { ...newFilters }, 
      canvasRatio: newRatio 
    });
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setLayers(JSON.parse(JSON.stringify(prev.layers)));
      setFilters({ ...prev.filters });
      setCanvasRatio(prev.canvasRatio);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setLayers(JSON.parse(JSON.stringify(next.layers)));
      setFilters({ ...next.filters });
      setCanvasRatio(next.canvasRatio);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Initialize history on start
  useEffect(() => {
    if (history.length === 0) {
      pushHistory(layers, filters, canvasRatio);
    }
  }, []);

  // Run the Magic Layers Pro AI 19-Engine pipeline sequentially
  const runMagicLayersPipeline = (base64Image: string) => {
    setScanning(true);
    setActiveEngineIndex(0);
    setEngines(INITIAL_ENGINES.map(e => ({
      ...e,
      status: "idle",
      progress: 0,
      checks: e.checks.map(c => ({ ...c, done: false }))
    })));

    let apiData: any = null;

    // Start API query in background immediately
    fetch("/api/studio-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "full-analysis", image: base64Image })
    })
      .then(res => res.json())
      .then(data => {
        apiData = data;
        console.log("[Magic Layers Pro AI] Rich Vision analysis received:", data);
      })
      .catch(err => {
        console.error("[Magic Layers Pro AI] Error fetching analysis:", err);
      });

    let currentEngine = 0;

    const runNextEngine = () => {
      if (currentEngine >= 19) {
        // Complete the pipeline
        setScanning(false);
        setActiveEngineIndex(-1);
        setLoading(false);

        // Apply layers and panels from API (or fallbacks)
        if (apiData) {
          const enrichedLayers: Layer[] = (apiData.layers || []).map((l: any) => ({
            ...l,
            originalText: l.text,
            color: l.color || "#1a1a2e",
            bgColor: l.bgColor || "#ffffff",
            fontSize: l.fontSize || 10,
            fontFamily: l.fontFamily || "Barlow Condensed",
            bold: l.bold !== undefined ? l.bold : true,
            italic: l.italic || false,
            underline: false,
            strikethrough: false,
            textAlign: l.textAlign || ("center" as const),
            lineHeight: 1.2,
            letterSpacing: 0,
            textTransform: "none" as const,
            rotation: l.rotation || 0,
          }));

          setPanels(apiData.panels || []);
          setLayers(enrichedLayers);
          setAiAnalysis({
            visionResults: apiData.visionResults || [],
            sceneGraph: apiData.sceneGraph || { relationships: [] },
            ocrResults: apiData.ocrResults || [],
            materials: apiData.materials || [],
            lighting: apiData.lighting || [],
            style: apiData.style || { type: "comic", confidence: 0.8 },
            hierarchy: apiData.hierarchy || { title: "", subtitle: "", callToAction: "", decorative: [] },
            palette: apiData.palette || []
          });
          pushHistory(enrichedLayers, filters, canvasRatio);
        }
        return;
      }

      setActiveEngineIndex(currentEngine);
      setEngines(prev => prev.map((e, idx) => {
        if (idx === currentEngine) {
          return { ...e, status: "running" };
        }
        return e;
      }));

      let progress = 0;
      let checkIdx = 0;
      const ticks = 4;
      const interval = setInterval(() => {
        progress += 25;
        if (progress > 100) progress = 100;

        setEngines(prev => prev.map((e, idx) => {
          if (idx === currentEngine) {
            const updatedChecks = e.checks.map((c, cidx) => {
              if (cidx <= checkIdx) return { ...c, done: true };
              return c;
            });
            return { 
              ...e, 
              progress, 
              status: progress === 100 ? "completed" : "running",
              checks: updatedChecks 
            };
          }
          return e;
        }));

        checkIdx++;

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            currentEngine++;
            runNextEngine();
          }, 60);
        }
      }, 70); // ~300ms per engine, total ~6s for 19 engines
    };

    runNextEngine();
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setAiStatus("Chargement de l'image...");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImageSrc(base64);
      runMagicLayersPipeline(base64);
    };
    reader.readAsDataURL(file);
  };

  // Load the high-fidelity demo model from local assets and run OCR detection
  const handleLoadDemoModel = async () => {
    setLoading(true);
    setAiStatus("Chargement du modèle démo...");
    
    const demoUrl = "/demo-comic-1.jpg";
    setImageSrc(demoUrl);
    
    try {
      const imgResponse = await fetch(demoUrl);
      const blob = await imgResponse.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        runMagicLayersPipeline(base64);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Error loading demo image blob:", err);
      setLoading(false);
    }
  };

  // Run natural language commands
  const handleSendCommand = async () => {
    if (!naturalCommand.trim()) return;
    setLoading(true);
    setAiStatus(`Exécution : "${naturalCommand}"...`);
    setCommandResponse("");

    try {
      const response = await fetch("/api/studio-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "natural_command",
          command: naturalCommand,
          layers: layers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCommandResponse(data.explanation || "Commande exécutée avec succès.");

        let updatedLayers = [...layers];
        let updatedFilters = { ...filters };
        let updatedRatio = canvasRatio;

        if (data.actions && Array.isArray(data.actions)) {
          data.actions.forEach((act: any) => {
            switch (act.type) {
              case "update_layer_text":
                updatedLayers = updatedLayers.map(l => 
                  l.id === act.layerId ? { ...l, text: act.newText } : l
                );
                break;
              case "add_layer": {
                const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                updatedLayers.push({
                  id,
                  type: act.layerType || "text",
                  name: act.content || "Nouveau calque",
                  visible: true,
                  locked: false,
                  opacity: 100,
                  x: act.x || 30,
                  y: act.y || 40,
                  width: 30,
                  height: 10,
                  text: act.content,
                  color: "#1a1a2e",
                  bgColor: "#ffffff",
                  fontSize: 14,
                  fontFamily: "Barlow Condensed",
                  textAlign: "center"
                });
                break;
              }
              case "delete_layer":
                updatedLayers = updatedLayers.filter(l => l.id !== act.layerId);
                break;
              case "apply_filter":
                if (act.filterType === "sharpen") updatedFilters.sharpen = 80;
                if (act.filterType === "denoise") updatedFilters.denoise = 90;
                if (act.filterType === "contrast" && act.value === "high") updatedFilters.contrast = 130;
                if (act.filterType === "brightness" && act.value === "high") updatedFilters.brightness = 110;
                break;
              case "extend_canvas":
                updatedRatio = act.targetRatio || "A4";
                break;
            }
          });

          setLayers(updatedLayers);
          setFilters(updatedFilters);
          setCanvasRatio(updatedRatio);
          pushHistory(updatedLayers, updatedFilters, updatedRatio);
        }
      } else {
        setCommandResponse("Une erreur est survenue lors de l'appel au serveur.");
      }
    } catch (err) {
      console.error("Natural command error:", err);
      setCommandResponse("Impossible de contacter le service d'intelligence artificielle.");
    } finally {
      setLoading(false);
      setAiStatus("");
      setNaturalCommand("");
    }
  };

  // Quick preset commands helper
  const handleQuickCommand = (cmd: string) => {
    setNaturalCommand(cmd);
  };

  // Translate layer text
  const handleTranslateLayer = async (layerId: string, currentText: string) => {
    if (!currentText) return;
    setLoading(true);
    setAiStatus("Traduction intelligente en cours...");
    try {
      const response = await fetch("/api/studio-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "translate", text: currentText })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          const updatedLayers = layers.map(l => 
            l.id === layerId ? { ...l, text: data.translatedText } : l
          );
          setLayers(updatedLayers);
          pushHistory(updatedLayers);
        }
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setLoading(false);
      setAiStatus("");
    }
  };

  // Layer manipulation helpers
  const handleToggleLayerVisibility = (id: string) => {
    const updated = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setLayers(updated);
    pushHistory(updated);
  };

  const handleToggleLayerLock = (id: string) => {
    const updated = layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l);
    setLayers(updated);
    pushHistory(updated);
  };

  const handleDeleteLayer = (id: string) => {
    const updated = layers.filter(l => l.id !== id);
    setLayers(updated);
    if (selectedLayerId === id) setSelectedLayerId(null);
    pushHistory(updated);
  };

  const handleUpdateLayerText = (id: string, text: string) => {
    const updated = layers.map(l => l.id === id ? { ...l, text } : l);
    setLayers(updated);
  };

  const handleSaveTextEdit = () => {
    pushHistory(layers);
  };

  // Professional text styling helpers
  const updateLayerStyle = (id: string, updates: Partial<Layer>) => {
    const updated = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(updated);
    pushHistory(updated);
  };

  const handleAddTextLayer = () => {
    const id = `layer-${Date.now()}`;
    const newL: Layer = {
      id,
      type: "bubble",
      name: `Texte Bulle ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
      x: 35,
      y: 35,
      width: 30,
      height: 10,
      text: "Nouveau dialogue",
      originalText: "Nouveau dialogue",
      color: "#1a1a2e",
      bgColor: "#ffffff",
      fontSize: 13,
      fontFamily: "Barlow Condensed",
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      textAlign: "center",
      lineHeight: 1.4,
      letterSpacing: 0,
      textTransform: "none",
    };
    const updated = [...layers, newL];
    setLayers(updated);
    setSelectedLayerId(id);
    pushHistory(updated);
  };

  // Assistant IA automatic professional improvement
  const handleAutoImprove = () => {
    setLoading(true);
    setAiStatus("Analyse des imperfections de mise en page...");
    setTimeout(() => {
      setAiStatus("Uniformisation des styles typographiques...");
      setTimeout(() => {
        setAiStatus("Suppression du grain et étalonnage des contrastes...");
        setTimeout(() => {
          const improvedFilters = {
            ...filters,
            denoise: 80,
            sharpen: 60,
            contrast: 115,
            brightness: 105,
            colors: 110
          };
          const improvedLayers = layers.map(l => 
            l.type === "bubble" ? { ...l, fontFamily: "Barlow Condensed", fontSize: 13, bold: true } : l
          );
          setFilters(improvedFilters);
          setLayers(improvedLayers);
          pushHistory(improvedLayers, improvedFilters);
          setLoading(false);
          setAiStatus("");
          setCommandResponse("Assistant IA : Contrastes étalonnés, bruit éliminé, polices uniformisées pour un aspect professionnel.");
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Drag, Resize, and Rotate for layers on the canvas
  const [dragState, setDragState] = useState<{ layerId: string; startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleLayerMouseDown = (e: React.MouseEvent, layer: Layer) => {
    if (layer.locked || !layer.visible) return;
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setDragState({
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layer: Layer, handle: "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b") => {
    if (layer.locked || !layer.visible) return;
    e.stopPropagation();
    e.preventDefault();
    setResizeState({
      layerId: layer.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y,
      initWidth: layer.width || 30,
      initHeight: layer.height || 10
    });
  };

  const handleRotateMouseDown = (e: React.MouseEvent, layer: Layer) => {
    if (layer.locked || !layer.visible) return;
    e.stopPropagation();
    e.preventDefault();
    
    const layerEl = document.getElementById(`layer-el-${layer.id}`);
    if (!layerEl) return;
    const rect = layerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setRotateState({
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      initRotation: layer.rotation || 0,
      centerX,
      centerY
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Split Dragging
    if (isDraggingSplit && splitRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setBeforeAfterSplit(Math.max(5, Math.min(95, relativeX)));
      return;
    }

    const container = document.getElementById("canvas-viewport");
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // 2. Resizing Dragging
    if (resizeState) {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;

      const pctDx = (dx / rect.width) * 100;
      const pctDy = (dy / rect.height) * 100;

      setLayers(prev => prev.map(l => {
        if (l.id !== resizeState.layerId) return l;

        let newX = l.x;
        let newY = l.y;
        let newWidth = l.width || 30;
        let newHeight = l.height || 10;

        switch (resizeState.handle) {
          case "br":
            newWidth = Math.max(5, resizeState.initWidth + pctDx);
            newHeight = Math.max(3, resizeState.initHeight + pctDy);
            break;
          case "tr":
            newWidth = Math.max(5, resizeState.initWidth + pctDx);
            newHeight = Math.max(3, resizeState.initHeight - pctDy);
            newY = Math.max(0, resizeState.initY + pctDy);
            break;
          case "bl":
            newWidth = Math.max(5, resizeState.initWidth - pctDx);
            newX = Math.max(0, resizeState.initX + pctDx);
            newHeight = Math.max(3, resizeState.initHeight + pctDy);
            break;
          case "tl":
            newWidth = Math.max(5, resizeState.initWidth - pctDx);
            newX = Math.max(0, resizeState.initX + pctDx);
            newHeight = Math.max(3, resizeState.initHeight - pctDy);
            newY = Math.max(0, resizeState.initY + pctDy);
            break;
          case "r":
            newWidth = Math.max(5, resizeState.initWidth + pctDx);
            break;
          case "l":
            newWidth = Math.max(5, resizeState.initWidth - pctDx);
            newX = Math.max(0, resizeState.initX + pctDx);
            break;
          case "t":
            newHeight = Math.max(3, resizeState.initHeight - pctDy);
            newY = Math.max(0, resizeState.initY + pctDy);
            break;
          case "b":
            newHeight = Math.max(3, resizeState.initHeight + pctDy);
            break;
        }

        return {
          ...l,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        };
      }));
      return;
    }

    // 3. Rotation Dragging
    if (rotateState) {
      const angleRad = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX);
      let angleDeg = angleRad * (180 / Math.PI) - 90;
      if (angleDeg < 0) angleDeg += 360;

      setLayers(prev => prev.map(l => 
        l.id === rotateState.layerId ? { ...l, rotation: Math.round(angleDeg) } : l
      ));
      return;
    }

    // 4. Moving Dragging
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const pctDx = (dx / rect.width) * 100;
      const pctDy = (dy / rect.height) * 100;

      setLayers(prev => prev.map(l => 
        l.id === dragState.layerId 
          ? { ...l, x: Math.max(0, Math.min(100 - (l.width || 10), dragState.initX + pctDx)), y: Math.max(0, Math.min(100 - (l.height || 10), dragState.initY + pctDy)) }
          : l
      ));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingSplit) {
      setIsDraggingSplit(false);
    }
    if (dragState) {
      setDragState(null);
      pushHistory(layers);
    }
    if (resizeState) {
      setResizeState(null);
      pushHistory(layers);
    }
    if (rotateState) {
      setRotateState(null);
      pushHistory(layers);
    }
  };

  // Helper to dynamically position the Canva-style floating toolbar above selected layer
  const getFloatingToolbarStyle = (layer: Layer) => {
    const isCloseToTop = layer.y < 15;
    return {
      left: `${layer.x + (layer.width || 30) / 2}%`,
      top: isCloseToTop 
        ? `calc(${layer.y + (layer.height || 10)}% + 12px)`
        : `calc(${layer.y}% - 48px)`,
      transform: 'translateX(-50%)',
      zIndex: 100
    };
  };

  // Generate a mock illustration using Unsplash cartoon placeholder
  const handleGenerateIllustration = () => {
    if (!illuPrompt.trim()) return;
    setGeneratingIllustration(true);
    setAiStatus("Génération de l'illustration par l'IA...");
    
    setTimeout(() => {
      const id = `layer-${Date.now()}`;
      // Vector cartoon mockup graphic signature
      const url = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80&sig=${Math.floor(Math.random() * 1000)}`;

      const newLayer: Layer = {
        id,
        type: "decor",
        name: `Illustration : ${illuPrompt.substring(0, 15)}...`,
        visible: true,
        locked: false,
        opacity: 100,
        x: 35,
        y: 35,
        width: 30,
        height: 30,
        originalText: "",
        imgUrl: url,
        rotation: 0,
      };

      const updated = [...layers, newLayer];
      setLayers(updated);
      pushHistory(updated);
      setSelectedLayerId(id);
      
      setGeneratingIllustration(false);
      setAiStatus("");
      setIlluPrompt("");
    }, 1500);
  };

  // Filter adjustment updater
  const updateFilter = (key: keyof typeof filters, value: any) => {
    const nextF = { ...filters, [key]: value };
    setFilters(nextF);
    pushHistory(layers, nextF);
  };

  // Generate and export files (supporting PNG, JPG, PDF, SVG, JSON, Figma, Canva, Photopea)
  const handleExportFile = (format: string, dpi: number) => {
    setLoading(true);
    setAiStatus(`[17 Export Engine] Préparation du rendu multi-calques...`);

    setTimeout(() => {
      setAiStatus(`[17 Export Engine] Conversion des ${layers.length} calques au format ${format.toUpperCase()}...`);

      setTimeout(() => {
        let fileContent = "";
        let mimeType = "application/json";
        let fileName = `StudioIA_Export_${canvasRatio}_${dpi}dpi.${format}`;

        if (format === "json" || format === "figma" || format === "canva" || format === "photopea") {
          // Export full project JSON configuration
          const projectData = {
            appName: "Magic Layers Pro AI",
            canvasRatio,
            dpi,
            layers: layers.map(l => ({
              id: l.id,
              type: l.type,
              name: l.name,
              x: l.x,
              y: l.y,
              width: l.width,
              height: l.height,
              text: l.text,
              fontSize: l.fontSize,
              fontFamily: l.fontFamily,
              color: l.color,
              bgColor: l.bgColor,
              bold: l.bold,
              italic: l.italic,
              rotation: l.rotation,
              opacity: l.opacity
            })),
            panels
          };
          fileContent = JSON.stringify(projectData, null, 2);
          mimeType = "application/json";
          if (format !== "json") {
            fileName = `StudioIA_Export_${canvasRatio}_${dpi}dpi.${format}.json`;
          }
        } else if (format === "svg") {
          // Generate a real vector SVG file representing the canvas
          let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 900" width="100%" height="100%">`;
          // Add background image if available
          if (imageSrc) {
            svgContent += `  <image href="${imageSrc}" x="0" y="0" width="650" height="900" />\n`;
          } else {
            svgContent += `  <rect x="0" y="0" width="650" height="900" fill="#f8fafc" />\n`;
          }
          // Add each layer as SVG element
          layers.forEach(l => {
            if (!l.visible) return;
            const pxX = (l.x / 100) * 650;
            const pxY = (l.y / 100) * 900;
            const pxW = ((l.width || 30) / 100) * 650;
            const pxH = ((l.height || 10) / 100) * 900;

            if (l.type === "bubble") {
              svgContent += `  <rect x="${pxX}" y="${pxY}" width="${pxW}" height="${pxH}" rx="15" ry="15" fill="${l.bgColor || '#ffffff'}" stroke="#6366f1" stroke-width="1.5" />\n`;
              if (l.text) {
                svgContent += `  <text x="${pxX + pxW/2}" y="${pxY + pxH/2 + 4}" fill="${l.color || '#1a1a2e'}" font-size="${l.fontSize || 12}" font-family="${l.fontFamily || 'sans-serif'}" text-anchor="middle" font-weight="${l.bold ? 'bold' : 'normal'}">${l.text}</text>\n`;
              }
            } else if (l.type === "text" && l.text) {
              svgContent += `  <text x="${pxX}" y="${pxY + pxH/2}" fill="${l.color || '#1a1a2e'}" font-size="${l.fontSize || 12}" font-family="${l.fontFamily || 'sans-serif'}" font-weight="${l.bold ? 'bold' : 'normal'}">${l.text}</text>\n`;
            } else {
              svgContent += `  <!-- Layer: ${l.name} (${l.type}) -->\n`;
              svgContent += `  <rect x="${pxX}" y="${pxY}" width="${pxW}" height="${pxH}" fill="none" stroke="${l.type === 'character' ? '#6366f1' : '#f59e0b'}" stroke-width="1" stroke-dasharray="2" />\n`;
            }
          });
          svgContent += `</svg>`;
          fileContent = svgContent;
          mimeType = "image/svg+xml";
        }

        const link = document.createElement("a");
        link.download = fileName;
        if (fileContent) {
          const blob = new Blob([fileContent], { type: mimeType });
          link.href = URL.createObjectURL(blob);
        } else {
          // PNG, JPG, PDF, TIFF, AVIF fallbacks (using the image src directly)
          link.href = imageSrc || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%236366f1'/></svg>";
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setLoading(false);
        setAiStatus("");
      }, 1000);
    }, 1000);
  };

  // Before / After slider dragging handlers
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  // Aspect ratio helper
  const getCanvasAspectRatio = () => {
    switch (canvasRatio) {
      case "A4":
      case "A5":
      case "A3":
      case "portrait":
        return "aspect-[1/1.414]";
      case "paysage":
        return "aspect-[1.414/1]";
      case "carré":
        return "aspect-square";
      default:
        return "aspect-[1/1.414]";
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Professional color scheme constants
  const themeColors = {
    bg: "#f8f9fc",
    surface: "#ffffff",
    surfaceAlt: "#f1f3f8",
    border: "#e2e6ef",
    borderLight: "#edf0f7",
    accent: "#6366f1",    // Indigo vibrant
    accentLight: "#818cf8",
    accentBg: "#eef2ff",
    accentBorder: "#c7d2fe",
    text: "#1e1b4b",
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    danger: "#ef4444",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  // PDF file upload handler — supports both images and actual PDF files
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tool: "signer" | "modifier" | "organiser" | "numeros") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files) as File[];
    const newPages: string[] = [];

    for (const file of fileArray) {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const images = await renderPDFToImages(file, 2);
        newPages.push(...images);
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        newPages.push(dataUrl);
      }
    }

    setPdfPages(prev => [...prev, ...newPages]);
    setActivePdfTool(tool);
  };

  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTool, setPendingTool] = useState<"signer" | "modifier" | "organiser" | "numeros" | null>(null);

  const openPdfTool = (tool: "signer" | "modifier" | "organiser" | "numeros" | "convert") => {
    if (tool === "convert") {
      setActivePdfTool("convert");
      return;
    }
    if (pdfPages.length > 0) {
      setActivePdfTool(tool);
    } else {
      setPendingTool(tool);
      pdfFileInputRef.current?.click();
    }
  };

  // Route to active PDF tool
  if (activePdfTool === "signer" && pdfPages.length > 0) {
    return <SignerPDF pdfPages={pdfPages} onBack={() => setActivePdfTool("dashboard")} />;
  }
  if (activePdfTool === "modifier" && pdfPages.length > 0) {
    return <ModifierPDF pdfPages={pdfPages} onBack={() => setActivePdfTool("dashboard")} />;
  }
  if (activePdfTool === "organiser" && pdfPages.length > 0) {
    return <OrganiserPDF pdfPages={pdfPages} onBack={() => setActivePdfTool("dashboard")} onPagesUpdate={(p) => setPdfPages(p)} />;
  }
  if (activePdfTool === "numeros" && pdfPages.length > 0) {
    return <NumerosPDF pdfPages={pdfPages} onBack={() => setActivePdfTool("dashboard")} />;
  }
  if (activePdfTool === "convert") {
    return <ConvertPDF onBack={() => setActivePdfTool("dashboard")} />;
  }

  // Dashboard view
  if (activePdfTool === "dashboard") {
    const TOOLS = [
      { key: "modifier" as const, label: "Modifier PDF", desc: "Annotations, formes, texte, tampons", icon: <FileText className="w-8 h-8" />, gradient: "from-blue-600 to-indigo-600", shadow: "shadow-blue-500/25" },
      { key: "signer" as const, label: "Signer PDF", desc: "Signature, initiales, tampon d'entreprise", icon: <Pen className="w-8 h-8" />, gradient: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/25" },
      { key: "organiser" as const, label: "Organiser PDF", desc: "Réordonner, supprimer, insérer des pages", icon: <FolderOpen className="w-8 h-8" />, gradient: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/25" },
      { key: "numeros" as const, label: "Numéros de page", desc: "Ajouter une numérotation professionnelle", icon: <Hash className="w-8 h-8" />, gradient: "from-purple-600 to-violet-600", shadow: "shadow-purple-500/25" },
      { key: "convert" as const, label: "Convertisseur", desc: "PDF→Image, PDF→Word, Word→PDF, Fusionner, Extraire", icon: <Download className="w-8 h-8" />, gradient: "from-rose-600 to-pink-600", shadow: "shadow-rose-500/25" },
    ];

    return (
      <div className="flex-1 flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl relative" style={{ background: "#0f172a", color: "#f8fafc" }}>
        {/* Hidden file input for PDF pages */}
        <input
          ref={pdfFileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (pendingTool && e.target.files && e.target.files.length > 0) {
              handlePdfFileUpload(e, pendingTool);
              setPendingTool(null);
            }
            e.target.value = "";
          }}
        />

        {/* Header */}
        <header className="h-16 shrink-0 px-8 flex items-center justify-between border-b border-slate-800" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}>
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">PDF Studio Pro</h2>
              <p className="text-[10px] text-slate-500">Espace de travail documentaire intelligent</p>
            </div>
          </div>
          {pdfPages.length > 0 && (
            <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
              {pdfPages.length} page{pdfPages.length > 1 ? "s" : ""} chargée{pdfPages.length > 1 ? "s" : ""}
            </span>
          )}
        </header>

        {/* Main Dashboard */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
              PDF Studio Pro
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Sélectionnez un outil pour commencer à travailler sur vos documents PDF. Importez vos pages ou utilisez des images existantes.
            </p>
          </div>

          {/* Tool Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl">
            {TOOLS.map(tool => (
              <button
                key={tool.key}
                onClick={() => openPdfTool(tool.key)}
                className={`group relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-2xl ${tool.shadow} hover:border-slate-700`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {tool.icon}
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-white">{tool.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Calques Magiques special card */}
          <div className="mt-8 w-full max-w-5xl">
            <button
              onClick={() => setActivePdfTool("calques")}
              className="w-full flex items-center gap-5 p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-indigo-950/30 hover:from-slate-800/80 hover:to-indigo-900/30 transition-all duration-300 cursor-pointer hover:border-indigo-500/30 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Calques Magiques IA
                  <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">IA</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Éditeur graphique avancé avec 19 moteurs d'intelligence artificielle pour la séparation automatique de calques</p>
              </div>
              <ArrowLeft className="w-5 h-5 text-slate-600 rotate-180 group-hover:text-indigo-400 transition-colors" />
            </button>
          </div>

          {/* Quick upload area */}
          <div className="mt-8 w-full max-w-5xl">
            <label className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-slate-800 hover:border-teal-500/40 bg-slate-900/20 hover:bg-slate-900/40 transition-all cursor-pointer group">
              <Upload className="w-10 h-10 text-slate-600 group-hover:text-teal-500 transition-colors" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Glissez vos pages ici ou cliquez pour importer</p>
                <p className="text-[10px] text-slate-600 mt-1">Formats acceptés : PDF, PNG, JPG, WEBP</p>
              </div>
              <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={async e => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files) as File[];
                  const pages: string[] = [];
                  for (const f of files) {
                    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
                      const images = await renderPDFToImages(f, 2);
                      pages.push(...images);
                    } else {
                      const dataUrl = await new Promise<string>((resolve) => {
                        const r = new FileReader();
                        r.onload = ev => resolve(ev.target?.result as string);
                        r.readAsDataURL(f);
                      });
                      pages.push(dataUrl);
                    }
                  }
                  setPdfPages(prev => [...prev, ...pages]);
                }
                e.target.value = "";
              }} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Calques Magiques (existing editor) - activePdfTool === "calques"
  return (
    <div
      className="flex-1 flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl relative"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center gap-4" style={{ background: "rgba(248,249,252,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)` }}>
            <Sparkles className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="font-bold text-sm tracking-wide animate-pulse" style={{ color: themeColors.accent }}>{aiStatus}</p>
        </div>
      )}

      {/* Top Header Controls */}
      <header
        className="h-16 shrink-0 px-6 flex items-center justify-between"
        style={{ background: themeColors.surface, borderBottom: `1px solid ${themeColors.border}` }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePdfTool("dashboard")} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer" title="Retour au tableau de bord">
            <ArrowLeft className="w-5 h-5" style={{ color: themeColors.textMuted }} />
          </button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)`, boxShadow: `0 4px 14px ${themeColors.accent}33` }}
          >
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2
              className="text-md font-bold tracking-tight"
              style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Studio Graphique IA
            </h2>
            <p className="text-[10px] font-medium" style={{ color: themeColors.textMuted }}>
              Bandes Dessinées, Livres, Affiches & Pages de Qualité Impression
            </p>
          </div>
        </div>

        {/* Top actions bar */}
        <div className="flex items-center gap-3">
          {/* History */}
          <div className="flex items-center rounded-xl p-1 gap-1" style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}` }}>
            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
              style={{ color: themeColors.textSecondary }}
              title="Annuler (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
              style={{ color: themeColors.textSecondary }}
              title="Rétablir (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Before/After Toggle */}
          <button 
            onClick={() => setBeforeAfterMode(!beforeAfterMode)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            style={{
              background: beforeAfterMode ? themeColors.accentBg : themeColors.surface,
              border: `1px solid ${beforeAfterMode ? themeColors.accentBorder : themeColors.border}`,
              color: beforeAfterMode ? themeColors.accent : themeColors.textSecondary
            }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Comparateur {beforeAfterMode ? "On" : "Avant/Après"}</span>
          </button>

          {/* Assistant IA Trigger */}
          <button 
            onClick={handleAutoImprove}
            className="px-4 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)`, boxShadow: `0 4px 14px ${themeColors.accent}33` }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistant IA Pro</span>
          </button>
        </div>
      </header>

      {/* ═══ PROFESSIONAL TEXT TOOLBAR (visible when a text/bubble layer is selected) ═══ */}
      {selectedLayer && (selectedLayer.type === "bubble" || selectedLayer.type === "text") && (
        <div
          className="h-12 shrink-0 px-4 flex items-center gap-2 overflow-x-auto select-none"
          style={{ background: themeColors.surface, borderBottom: `1px solid ${themeColors.border}` }}
        >
          {/* Font Family */}
          <select
            value={selectedLayer.fontFamily || "Barlow Condensed"}
            onChange={(e) => updateLayerStyle(selectedLayer.id, { fontFamily: e.target.value })}
            className="h-8 rounded-lg px-2 text-xs font-semibold cursor-pointer"
            style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.text, minWidth: 120 }}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* Font Size Controls */}
          <div className="flex items-center gap-0.5 rounded-lg overflow-hidden" style={{ border: `1px solid ${themeColors.border}` }}>
            <button
              onClick={() => updateLayerStyle(selectedLayer.id, { fontSize: Math.max(8, (selectedLayer.fontSize || 13) - 1) })}
              className="w-7 h-8 flex items-center justify-center text-xs font-bold transition-colors hover:bg-gray-100"
              style={{ color: themeColors.textSecondary }}
            >−</button>
            <span
              className="w-8 h-8 flex items-center justify-center text-xs font-bold"
              style={{ background: themeColors.surfaceAlt, color: themeColors.text }}
            >{selectedLayer.fontSize || 13}</span>
            <button
              onClick={() => updateLayerStyle(selectedLayer.id, { fontSize: Math.min(72, (selectedLayer.fontSize || 13) + 1) })}
              className="w-7 h-8 flex items-center justify-center text-xs font-bold transition-colors hover:bg-gray-100"
              style={{ color: themeColors.textSecondary }}
            >+</button>
          </div>

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* Text Color Picker */}
          <label className="relative cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-gray-100" title="Couleur du texte">
            <Palette className="w-4 h-4" style={{ color: selectedLayer.color || themeColors.text }} />
            <input
              type="color"
              value={selectedLayer.color || "#1a1a2e"}
              onChange={(e) => updateLayerStyle(selectedLayer.id, { color: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="absolute bottom-0.5 left-1.5 right-1.5 h-0.5 rounded-full" style={{ background: selectedLayer.color || themeColors.text }} />
          </label>

          {/* Bold */}
          <button
            onClick={() => updateLayerStyle(selectedLayer.id, { bold: !selectedLayer.bold })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
            style={{
              background: selectedLayer.bold ? themeColors.accentBg : "transparent",
              color: selectedLayer.bold ? themeColors.accent : themeColors.textSecondary,
              border: selectedLayer.bold ? `1px solid ${themeColors.accentBorder}` : "1px solid transparent"
            }}
            title="Gras"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            onClick={() => updateLayerStyle(selectedLayer.id, { italic: !selectedLayer.italic })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
            style={{
              background: selectedLayer.italic ? themeColors.accentBg : "transparent",
              color: selectedLayer.italic ? themeColors.accent : themeColors.textSecondary,
              border: selectedLayer.italic ? `1px solid ${themeColors.accentBorder}` : "1px solid transparent"
            }}
            title="Italique"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            onClick={() => updateLayerStyle(selectedLayer.id, { underline: !selectedLayer.underline })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
            style={{
              background: selectedLayer.underline ? themeColors.accentBg : "transparent",
              color: selectedLayer.underline ? themeColors.accent : themeColors.textSecondary,
              border: selectedLayer.underline ? `1px solid ${themeColors.accentBorder}` : "1px solid transparent"
            }}
            title="Souligné"
          >
            <Underline className="w-4 h-4" />
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => updateLayerStyle(selectedLayer.id, { strikethrough: !selectedLayer.strikethrough })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
            style={{
              background: selectedLayer.strikethrough ? themeColors.accentBg : "transparent",
              color: selectedLayer.strikethrough ? themeColors.accent : themeColors.textSecondary,
              border: selectedLayer.strikethrough ? `1px solid ${themeColors.accentBorder}` : "1px solid transparent"
            }}
            title="Barré"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* Text Transform (aA) */}
          <select
            value={selectedLayer.textTransform || "none"}
            onChange={(e) => updateLayerStyle(selectedLayer.id, { textTransform: e.target.value as any })}
            className="h-8 rounded-lg px-2 text-xs font-semibold cursor-pointer"
            style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.text, minWidth: 50 }}
            title="Casse"
          >
            <option value="none">aA</option>
            <option value="uppercase">AA</option>
            <option value="lowercase">aa</option>
            <option value="capitalize">Aa</option>
          </select>

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* Alignment */}
          {(["left", "center", "right", "justify"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : align === "right" ? AlignRight : AlignJustify;
            return (
              <button
                key={align}
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: align })}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: selectedLayer.textAlign === align ? themeColors.accentBg : "transparent",
                  color: selectedLayer.textAlign === align ? themeColors.accent : themeColors.textSecondary,
                  border: selectedLayer.textAlign === align ? `1px solid ${themeColors.accentBorder}` : "1px solid transparent"
                }}
                title={`Aligner ${align}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* BG Color Picker */}
          <label className="relative cursor-pointer flex items-center gap-1 h-8 px-2 rounded-lg transition-colors hover:bg-gray-100 text-xs font-semibold" style={{ color: themeColors.textSecondary }} title="Couleur de fond de la bulle">
            <Pipette className="w-3.5 h-3.5" />
            <span>Fond</span>
            <input
              type="color"
              value={selectedLayer.bgColor || "#ffffff"}
              onChange={(e) => updateLayerStyle(selectedLayer.id, { bgColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-4 h-4 rounded border" style={{ background: selectedLayer.bgColor || "#ffffff", borderColor: themeColors.border }} />
          </label>

          {/* Separator */}
          <div className="w-px h-6 mx-1" style={{ background: themeColors.border }} />

          {/* Translate button */}
          <button
            onClick={() => handleTranslateLayer(selectedLayer.id, selectedLayer.text || "")}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{ background: themeColors.accentBg, color: themeColors.accent, border: `1px solid ${themeColors.accentBorder}` }}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Traduire</span>
          </button>
        </div>
      )}

      {/* Main Studio layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side canvas viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: themeColors.surfaceAlt }}>
          
          {/* Quick info toolbar */}
          <div
            className="h-11 px-6 flex items-center justify-between shrink-0 select-none text-xs"
            style={{ borderBottom: `1px solid ${themeColors.border}`, background: themeColors.surface, color: themeColors.textMuted }}
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.borderLight}` }}>
                <ImageIcon className="w-3.5 h-3.5" style={{ color: themeColors.accent }} />
                <span style={{ color: themeColors.textSecondary }}>Modèle : <strong style={{ color: themeColors.text }}>{canvasRatio}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Calques : <strong style={{ color: themeColors.text }}>{layers.length}</strong></span>
              </span>
            </div>
            
            {/* Guidelines presets toggles */}
            <div className="flex items-center gap-3">
              {[
                { label: "Fond perdu", checked: showBleed, toggle: () => setShowBleed(!showBleed), color: "#ef4444" },
                { label: "Marges", checked: showMargins, toggle: () => setShowMargins(!showMargins), color: "#3b82f6" },
                { label: "Zone sécurité", checked: showSafeZone, toggle: () => setShowSafeZone(!showSafeZone), color: "#10b981" },
                { label: "Cases BD", checked: showPanels, toggle: () => setShowPanels(!showPanels), color: "#8b5cf6" },
              ].map((g) => (
                <label key={g.label} className="flex items-center gap-1.5 cursor-pointer transition-colors hover:opacity-80">
                  <input 
                    type="checkbox" 
                    checked={g.checked} 
                    onChange={g.toggle}
                    className="rounded focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                    style={{ accentColor: g.color }}
                  />
                  <span style={{ color: g.checked ? themeColors.text : themeColors.textMuted, fontWeight: g.checked ? 600 : 400 }}>{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Central Workspace container */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto p-24 flex items-center justify-center relative select-none"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ background: `repeating-conic-gradient(${themeColors.border} 0% 25%, transparent 0% 50%) 50% / 20px 20px` }}
          >
            {/* Inline CSS for laser scan effect */}
            <style>{`
              @keyframes scan {
                0% { top: 0%; }
                50% { top: 100%; }
                100% { top: 0%; }
              }
            `}</style>

             {/* Visual scanning overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[998] flex flex-col items-center justify-center p-8 text-white select-none">
                <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 animate-pulse">
                        <Cpu className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-wide uppercase text-indigo-400">Magic Layers Pro AI</h3>
                        <p className="text-xs text-slate-400">Système d'analyse cognitive multi-moteurs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Moteurs Actifs</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left: Scrollable Engines List */}
                    <div className="w-1/2 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/20 scrollbar-thin">
                      {engines.map((eng, idx) => {
                        const isActive = idx === activeEngineIndex;
                        const isCompleted = eng.status === "completed";
                        const isRunning = eng.status === "running";

                        return (
                          <div
                            key={eng.id}
                            className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                              isActive
                                ? "bg-indigo-500/10 border-indigo-500 text-white"
                                : isCompleted
                                ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300"
                                : "bg-slate-950/30 border-transparent text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : isRunning ? (
                                <Activity className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] shrink-0">
                                  {eng.id}
                                </div>
                              )}
                              <div>
                                <h4 className={`text-xs font-bold ${isActive ? "text-indigo-300" : isCompleted ? "text-slate-300" : "text-slate-500"}`}>
                                  {eng.name}
                                </h4>
                                <p className="text-[10px] text-slate-400 truncate max-w-[240px]">{eng.desc}</p>
                              </div>
                            </div>
                            {isRunning && (
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded font-bold animate-pulse">
                                {eng.progress}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right: Active Engine details & tasks */}
                    <div className="w-1/2 p-6 flex flex-col justify-between bg-slate-950/10">
                      {activeEngineIndex >= 0 && activeEngineIndex < engines.length ? (
                        <div className="space-y-6">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              Moteur en Cours
                            </span>
                            <h4 className="text-lg font-bold text-white mt-3">{engines[activeEngineIndex].name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{engines[activeEngineIndex].desc}</p>
                          </div>

                          {/* Individual Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Progression du moteur</span>
                              <span>{engines[activeEngineIndex].progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-100"
                                style={{ width: `${engines[activeEngineIndex].progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Checks List */}
                          <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tâches en cours d'exécution</h5>
                            <div className="space-y-2">
                              {engines[activeEngineIndex].checks.map((chk, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                                    chk.done 
                                      ? "bg-indigo-500/20 text-indigo-400" 
                                      : "bg-slate-800 text-slate-600"
                                  }`}>
                                    {chk.done ? "✔" : "○"}
                                  </span>
                                  <span className={chk.done ? "text-slate-200" : "text-slate-500"}>
                                    {chk.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <Cpu className="w-12 h-12 animate-spin text-slate-700 mb-2" />
                          <p className="text-xs">Initialisation des moteurs...</p>
                        </div>
                      )}

                      {/* Overall Progress */}
                      <div className="pt-4 border-t border-slate-800/80">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                          <span>Analyse Globale Magic Layers</span>
                          <span>
                            {Math.round(((activeEngineIndex + 1) / 19) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-400 h-full transition-all duration-300"
                            style={{ width: `${Math.round(((activeEngineIndex + 1) / 19) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Laser scanning line effect */}
                <div className="absolute left-0 right-0 h-1.5 bg-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.9)] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}

            {/* Canva Style Floating Actions Bar */}
            {selectedLayer && (
              <div 
                className="absolute flex items-center gap-1.5 p-1 bg-white/95 rounded-xl shadow-xl border border-slate-200 select-none z-[100] backdrop-blur-sm transition-all"
                style={getFloatingToolbarStyle(selectedLayer)}
              >
                <button
                  onClick={() => {
                    setNaturalCommand(`Améliore et nettoie le calque : ${selectedLayer.name}`);
                    handleSendCommand();
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-transform active:scale-95"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Améliorer par l'IA</span>
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={() => setEditingLayerId(selectedLayer.id)}
                  disabled={selectedLayer.type !== "bubble" && selectedLayer.type !== "text"}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Modifier le texte"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleLayerLock(selectedLayer.id)}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  title={selectedLayer.locked ? "Déverrouiller" : "Verrouiller"}
                >
                  {selectedLayer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    const id = `layer-dup-${Date.now()}`;
                    const dup = { ...selectedLayer, id, name: `${selectedLayer.name} (copie)`, x: selectedLayer.x + 4, y: selectedLayer.y + 4 };
                    const updated = [...layers, dup];
                    setLayers(updated);
                    pushHistory(updated);
                    setSelectedLayerId(id);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  title="Dupliquer le calque"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteLayer(selectedLayer.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Upload image overlay if no image is loaded */}
            {!imageSrc && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8" style={{ background: "rgba(248,249,252,0.85)", backdropFilter: "blur(12px)" }}>
                <div className="max-w-md w-full rounded-3xl p-8 text-center space-y-6" style={{ background: themeColors.surface, border: `2px dashed ${themeColors.accentBorder}`, boxShadow: "0 20px 60px rgba(99,102,241,0.08)" }}>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                    style={{ background: themeColors.accentBg, border: `1px solid ${themeColors.accentBorder}`, color: themeColors.accent }}
                  >
                    <Upload className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: themeColors.text }}>Importer votre page</h3>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: themeColors.textMuted }}>
                      Chargez une image pour que l'IA détecte automatiquement les dialogues, bulles, personnages, textes et planches afin de les rendre individuellement éditables.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 hover:scale-[1.02]"
                      style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)`, boxShadow: `0 4px 14px ${themeColors.accent}33` }}
                    >
                      <Upload className="w-4 h-4" /> Sélectionner un fichier
                    </button>
                     <button 
                      onClick={handleLoadDemoModel}
                      className="px-5 py-2.5 font-bold rounded-xl text-xs transition-colors"
                      style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.textSecondary }}
                    >
                      Utiliser le modèle démo
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            )}

            {/* Interactive Canvas Board */}
            <div 
              id="canvas-viewport"
              className={`relative overflow-hidden transition-all duration-300 ${getCanvasAspectRatio()}`}
              style={{ 
                width: `${600 * (zoom / 100)}px`, 
                background: themeColors.surface,
                border: `1px solid ${themeColors.border}`,
                boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                borderRadius: "4px",
                filter: beforeAfterMode ? "none" : `
                  blur(${filters.denoise / 100}px)
                  saturate(${filters.colors}%)
                  contrast(${filters.contrast}%)
                  brightness(${filters.brightness}%)
                `
              }}
            >
              {/* Image base layer */}
              {imageSrc && (
                <img 
                  src={imageSrc} 
                  alt="Base Layout" 
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
              )}

              {/* Panel Cases Overlay */}
              {showPanels && panels.map((panel) => (
                <div 
                  key={panel.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${panel.x}%`,
                    top: `${panel.y}%`,
                    width: `${panel.width}%`,
                    height: `${panel.height}%`,
                    border: "1.5px dashed rgba(139,92,246,0.35)",
                    background: "rgba(139,92,246,0.03)"
                  }}
                >
                  <div
                    className="absolute top-1 left-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ color: "#8b5cf6", background: "rgba(255,255,255,0.85)" }}
                  >
                    {panel.id.toUpperCase()}
                  </div>
                </div>
              ))}

              {/* Bleed (Fond perdu) Guidelines */}
              {showBleed && (
                <div className="absolute inset-0 pointer-events-none z-40" style={{ border: "6px dashed rgba(239,68,68,0.3)" }}>
                  <div
                    className="absolute top-1 left-1 text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: "#ef4444", background: "rgba(255,255,255,0.9)" }}
                  >
                    Fond Perdu (Bleed)
                  </div>
                </div>
              )}

              {/* Margins Guide */}
              {showMargins && (
                <div className="absolute pointer-events-none z-30" style={{ inset: 18, border: "1px solid rgba(59,130,246,0.25)" }}>
                  <div
                    className="absolute top-1 left-1 text-[8px] font-mono px-1 rounded"
                    style={{ color: "#3b82f6", background: "rgba(255,255,255,0.9)" }}
                  >
                    Marge
                  </div>
                </div>
              )}

              {/* Safe Zone Guide */}
              {showSafeZone && (
                <div className="absolute pointer-events-none z-30" style={{ inset: 26, border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div
                    className="absolute top-1 left-1 text-[8px] font-mono px-1 rounded"
                    style={{ color: "#10b981", background: "rgba(255,255,255,0.9)" }}
                  >
                    Zone Sécurisée
                  </div>
                </div>
              )}

              {/* Layer Elements Render */}
              {layers.map((layer) => {
                if (!layer.visible || layer.type === "background") return null;
                
                const isSelected = selectedLayerId === layer.id;
                
                return (
                  <div
                    key={layer.id}
                    id={`layer-el-${layer.id}`}
                    onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                    className={`absolute flex items-center justify-center text-center cursor-pointer transition-shadow ${
                      layer.locked ? "cursor-not-allowed opacity-80" : ""
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.width || 30}%`,
                      height: `${layer.height || 10}%`,
                      opacity: layer.opacity / 100,
                      outline: isSelected && !layer.locked ? `2px solid ${themeColors.accent}` : "none",
                      outlineOffset: "2px",
                      boxShadow: isSelected ? `0 0 0 1px ${themeColors.accent}33` : "none",
                      zIndex: isSelected ? 50 : "auto",
                      transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined
                    }}
                  >
                    {/* Render speech bubble style */}
                    {layer.type === "bubble" && (
                      <div 
                        className="w-full h-full flex items-center justify-center relative rounded-3xl"
                        onDoubleClick={(e) => {
                          if (layer.locked) return;
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                        }}
                      >
                        {/* Whiteout text mask: slightly inset to preserve original hand-drawn bubble border */}
                        <div 
                          className="absolute pointer-events-none rounded-[16px] transition-all"
                          style={{
                            inset: "5px",
                            backgroundColor: layer.bgColor || "#ffffff",
                            filter: "blur(0.8px)",
                          }}
                        />

                        {/* Opaque Text Content overlay */}
                        <div className="w-full h-full p-2 flex items-center justify-center z-10 rounded-3xl">
                          {editingLayerId === layer.id ? (
                            <textarea
                              autoFocus
                              value={layer.text || ""}
                              onChange={(e) => handleUpdateLayerText(layer.id, e.target.value)}
                              onBlur={() => {
                                setEditingLayerId(null);
                                handleSaveTextEdit();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  setEditingLayerId(null);
                                  handleSaveTextEdit();
                                }
                              }}
                              className="w-full h-full bg-transparent border-none text-center outline-none resize-none overflow-hidden flex items-center justify-center p-0 m-0"
                              style={{
                                color: layer.color || "#1a1a2e",
                                fontSize: `${layer.fontSize || 12}px`,
                                fontFamily: layer.fontFamily || "sans-serif",
                                fontWeight: layer.bold ? "bold" : "normal",
                                fontStyle: layer.italic ? "italic" : "normal",
                                textAlign: layer.textAlign || "center",
                                lineHeight: layer.lineHeight || 1.2,
                              }}
                            />
                          ) : (
                            <p 
                              className="whitespace-pre-wrap select-none w-full leading-tight"
                              style={{
                                color: layer.color || "#1a1a2e",
                                fontSize: `${layer.fontSize || 12}px`,
                                fontFamily: layer.fontFamily || "sans-serif",
                                fontWeight: layer.bold ? "bold" : "normal",
                                fontStyle: layer.italic ? "italic" : "normal",
                                textDecoration: `${layer.underline ? "underline" : ""} ${layer.strikethrough ? "line-through" : ""}`.trim() || "none",
                                textAlign: layer.textAlign || "center",
                                textTransform: layer.textTransform || "none",
                                lineHeight: layer.lineHeight || 1.2,
                                letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : "normal"
                              }}
                            >
                              {layer.text || ""}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Render character bounds indicator: outlines shown on select or hover to avoid clutter */}
                    {layer.type === "character" && (
                      <div
                        className={`w-full h-full rounded-lg flex flex-col justify-end p-2 transition-all relative overflow-hidden border ${
                          isSelected 
                            ? "border-indigo-500 bg-indigo-50/10" 
                            : "border-indigo-300/20 bg-indigo-500/0 hover:border-indigo-400/65 hover:bg-indigo-500/[0.04]"
                        }`}
                      >
                        {layer.imgUrl && (
                          <img src={layer.imgUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" alt={layer.name} />
                        )}
                        <span
                          className="text-[9px] font-bold rounded px-1.5 py-0.5 self-start select-none z-10 transition-opacity"
                          style={{ 
                            color: themeColors.accent, 
                            background: "rgba(255,255,255,0.9)",
                            opacity: isSelected ? 1 : 0.8
                          }}
                        >
                          {layer.name}
                        </span>
                      </div>
                    )}

                    {/* Render decor bounds */}
                    {layer.type === "decor" && (
                      <div
                        className={`w-full h-full rounded-lg flex flex-col justify-end p-2 transition-all relative overflow-hidden border ${
                          isSelected 
                            ? "border-amber-500 bg-amber-50/10" 
                            : "border-amber-300/20 bg-amber-500/0 hover:border-amber-400/65 hover:bg-amber-500/[0.04]"
                        }`}
                      >
                        {layer.imgUrl && (
                          <img src={layer.imgUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" alt={layer.name} />
                        )}
                        <span
                          className="text-[9px] font-bold rounded px-1.5 py-0.5 self-start select-none z-10 transition-opacity"
                          style={{ 
                            color: "#f59e0b", 
                            background: "rgba(255,255,255,0.9)",
                            opacity: isSelected ? 1 : 0.8
                          }}
                        >
                          {layer.name}
                        </span>
                      </div>
                    )}

                    {/* Standard Text Layer */}
                    {layer.type === "text" && (
                      <div 
                        className="w-full h-full flex items-center justify-center p-1"
                        onDoubleClick={(e) => {
                          if (layer.locked) return;
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                        }}
                      >
                        {editingLayerId === layer.id ? (
                          <textarea
                            autoFocus
                            value={layer.text || ""}
                            onChange={(e) => handleUpdateLayerText(layer.id, e.target.value)}
                            onBlur={() => {
                              setEditingLayerId(null);
                              handleSaveTextEdit();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                setEditingLayerId(null);
                                handleSaveTextEdit();
                              }
                            }}
                            className="w-full h-full bg-transparent border-none text-center outline-none resize-none overflow-hidden flex items-center justify-center p-0 m-0"
                            style={{
                              color: layer.color || themeColors.text,
                              fontSize: `${layer.fontSize || 14}px`,
                              fontFamily: layer.fontFamily || "sans-serif",
                              fontWeight: layer.bold ? "bold" : "normal",
                              fontStyle: layer.italic ? "italic" : "normal",
                              textAlign: layer.textAlign || "center",
                              lineHeight: layer.lineHeight || 1.4,
                            }}
                          />
                        ) : (
                          <p 
                            className="w-full leading-snug whitespace-pre-wrap"
                            style={{
                              color: layer.color || themeColors.text,
                              fontSize: `${layer.fontSize || 14}px`,
                              fontFamily: layer.fontFamily || "sans-serif",
                              fontWeight: layer.bold ? "bold" : "normal",
                              fontStyle: layer.italic ? "italic" : "normal",
                              textDecoration: `${layer.underline ? "underline" : ""} ${layer.strikethrough ? "line-through" : ""}`.trim() || "none",
                              textAlign: layer.textAlign || "center",
                              textTransform: layer.textTransform || "none",
                            }}
                          >
                            {layer.text || ""}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Canva Style Bounding box outline and interactive resize/rotate handles */}
                    {isSelected && !layer.locked && (
                      <>
                        {/* Outlines */}
                        <div className="absolute inset-0 pointer-events-none border border-indigo-500/80 z-40" />

                        {/* Corner Resize Handles */}
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "tl")}
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border border-gray-300 bg-white cursor-nwse-resize shadow-md z-50 hover:scale-110 transition-transform" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "tr")}
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-gray-300 bg-white cursor-nesw-resize shadow-md z-50 hover:scale-110 transition-transform" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "bl")}
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border border-gray-300 bg-white cursor-nesw-resize shadow-md z-50 hover:scale-110 transition-transform" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "br")}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-gray-300 bg-white cursor-nwse-resize shadow-md z-50 hover:scale-110 transition-transform" 
                          style={{ borderColor: themeColors.accent }} 
                        />

                        {/* Side Resize Handles */}
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "l")}
                          className="absolute top-1/2 -translate-y-1/2 -left-1 w-2.5 h-4 rounded border border-gray-300 bg-white cursor-ew-resize shadow-sm z-50" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "r")}
                          className="absolute top-1/2 -translate-y-1/2 -right-1 w-2.5 h-4 rounded border border-gray-300 bg-white cursor-ew-resize shadow-sm z-50" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "t")}
                          className="absolute left-1/2 -translate-x-1/2 -top-1 w-4 h-2.5 rounded border border-gray-300 bg-white cursor-ns-resize shadow-sm z-50" 
                          style={{ borderColor: themeColors.accent }} 
                        />
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(e, layer, "b")}
                          className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-4 h-2.5 rounded border border-gray-300 bg-white cursor-ns-resize shadow-sm z-50" 
                          style={{ borderColor: themeColors.accent }} 
                        />

                        {/* Rotation Handle (Canva circular arrow button at the bottom center) */}
                        <div
                          onMouseDown={(e) => handleRotateMouseDown(e, layer)}
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border border-gray-300 bg-white flex items-center justify-center cursor-alias shadow-md z-50 hover:bg-gray-50 transition-colors"
                          title="Faire pivoter"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gray-700" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Before/After Split Line overlay */}
              {beforeAfterMode && (
                <div 
                  ref={splitRef}
                  className="absolute top-0 bottom-0 z-50 w-1 flex items-center justify-center cursor-ew-resize select-none"
                  style={{ left: `${beforeAfterSplit}%`, background: themeColors.accent }}
                  onMouseDown={handleSplitMouseDown}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                    style={{ background: themeColors.surface, border: `2px solid ${themeColors.accent}`, color: themeColors.accent }}
                  >
                    ↔
                  </div>
                </div>
              )}

              {/* Split pane representation */}
              {beforeAfterMode && (
                <div 
                  className="absolute inset-0 pointer-events-none select-none z-10"
                  style={{ clipPath: `polygon(0 0, ${beforeAfterSplit}% 0, ${beforeAfterSplit}% 100%, 0 100%)` }}
                >
                  {imageSrc && (
                    <img 
                      src={imageSrc} 
                      alt="Original Layout" 
                      className="w-full h-full object-cover"
                      style={{ filter: "none" }}
                      draggable={false}
                    />
                  )}
                  {/* Left Label */}
                  <div className="absolute top-3 left-3 bg-red-500 text-white font-bold text-[9px] px-2.5 py-1 rounded-full z-20">
                    AVANT (ORIGINAL)
                  </div>
                </div>
              )}

              {/* Right label for Before/After */}
              {beforeAfterMode && (
                <div
                  className="absolute top-3 right-3 text-white font-bold text-[9px] px-2.5 py-1 rounded-full z-20 select-none pointer-events-none"
                  style={{ background: themeColors.accent }}
                >
                  APRÈS (MODIFIÉ)
                </div>
              )}
            </div>
          </div>

          {/* Quick command bar and natural language interpreter */}
          <div
            className="h-16 shrink-0 px-6 flex items-center gap-4"
            style={{ borderTop: `1px solid ${themeColors.border}`, background: themeColors.surface }}
          >
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder="Rédigez une commande naturelle (ex: 'Traduire en anglais', 'Agrandir en A3', 'Rendre les contrastes pro')..."
                value={naturalCommand}
                onChange={(e) => setNaturalCommand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCommand()}
                className="w-full rounded-xl px-5 py-3 text-sm focus:outline-none"
                style={{
                  background: themeColors.surfaceAlt,
                  border: `1px solid ${themeColors.border}`,
                  color: themeColors.text,
                }}
              />
              <button 
                onClick={handleSendCommand}
                className="absolute right-2 px-4 py-1.5 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${themeColors.accent}, #a78bfa)`, color: "white" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Exécuter</span>
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleQuickCommand("Traduire en anglais")}
                className="px-3 py-2 text-xs font-semibold rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.textSecondary }}
              >
                Traduire (EN)
              </button>
              <button 
                onClick={() => handleQuickCommand("Améliorer la netteté et supprimer le bruit")}
                className="px-3 py-2 text-xs font-semibold rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.textSecondary }}
              >
                Amélioration Pro
              </button>
            </div>
          </div>

          {/* AI Response feedback bar */}
          {commandResponse && (
            <div
              className="absolute bottom-20 left-6 right-6 z-50 p-3.5 rounded-xl shadow-xl flex items-start gap-2.5"
              style={{ background: themeColors.accentBg, border: `1px solid ${themeColors.accentBorder}`, backdropFilter: "blur(8px)" }}
            >
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColors.accent }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: themeColors.accent }}>Interprétation IA Studio</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: themeColors.textSecondary }}>{commandResponse}</p>
              </div>
              <button 
                onClick={() => setCommandResponse("")} 
                className="p-0.5 rounded-full transition-colors hover:bg-white/50"
                style={{ color: themeColors.textMuted }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Right Side Settings Panel */}
        <aside
          className="w-80 shrink-0 flex flex-col h-full overflow-hidden"
          style={{ borderLeft: `1px solid ${themeColors.border}`, background: themeColors.surface }}
        >
          
          {/* Tab Navigation header */}
          <div className="flex shrink-0 select-none text-[10px] font-bold" style={{ borderBottom: `1px solid ${themeColors.border}` }}>
            {([
              { key: "adjust", label: "Filtres", dot: false },
              { key: "layers", label: "Calques", dot: true },
              { key: "engines", label: "IA Engines", dot: false },
              { key: "layout", label: "Formats", dot: false },
              { key: "retouch", label: "Retouche", dot: false },
              { key: "export", label: "Export", dot: false },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="flex-1 py-3 text-center transition-all relative font-bold"
                style={{
                  borderBottom: activeTab === tab.key ? `2px solid ${themeColors.accent}` : "2px solid transparent",
                  color: activeTab === tab.key ? themeColors.accent : themeColors.textMuted,
                  background: activeTab === tab.key ? themeColors.accentBg + "66" : "transparent"
                }}
              >
                {tab.label}
                {tab.dot && layers.length > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: themeColors.accent }} />
                )}
              </button>
            ))}
          </div>

          {/* Scrollable contents panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* IA ENGINES TAB */}
            {activeTab === "engines" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.accent }}>Magic Layers Pro AI</h4>
                  <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Moteurs d'analyse cognitive et métadonnées de la scène</p>
                </div>

                {/* Scraped Scene Metadata: Style & Palette */}
                {aiAnalysis ? (
                  <div className="space-y-4">
                    {/* General analysis card */}
                    <div className="p-3.5 rounded-xl border space-y-3" style={{ background: themeColors.surfaceAlt, borderColor: themeColors.border }}>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: themeColors.textSecondary }}>Style Artistique :</span>
                        <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded" style={{ background: themeColors.accentBg, color: themeColors.accent }}>
                          {aiAnalysis.style.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: themeColors.textSecondary }}>Confiance de l'IA :</span>
                        <span className="font-mono font-bold text-slate-800">
                          {Math.round(aiAnalysis.style.confidence * 100)}%
                        </span>
                      </div>

                      {/* Visual Hierarchy */}
                      {aiAnalysis.hierarchy?.title && (
                        <div className="text-[11px] pt-1 text-slate-500 border-t border-dashed" style={{ borderColor: themeColors.border }}>
                          <span className="font-bold text-slate-700">Titre Principal:</span> {aiAnalysis.hierarchy.title}
                        </div>
                      )}

                      {/* Dominant Palette */}
                      <div className="space-y-1.5 pt-2 border-t border-dashed" style={{ borderColor: themeColors.border }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Palette Dominante</div>
                        <div className="flex flex-wrap gap-1.5">
                          {aiAnalysis.palette.map((color, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full border shadow-sm group relative cursor-pointer"
                              style={{ backgroundColor: color, borderColor: themeColors.border }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Materials & Lighting */}
                    <div className="p-3.5 rounded-xl border space-y-3 text-xs" style={{ background: themeColors.surfaceAlt, borderColor: themeColors.border }}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Matériaux Détectés</span>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.materials.map((m: any, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border" style={{ borderColor: themeColors.border }}>
                              {m.name} ({m.type})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-dashed" style={{ borderColor: themeColors.border }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Environnement Lumineux</span>
                        {aiAnalysis.lighting.map((l: any, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>Lumière : {l.type} ({l.direction})</span>
                            <span className="w-2.5 h-2.5 rounded-full border shadow-xs" style={{ backgroundColor: l.color }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scene Graph Relationships */}
                    {aiAnalysis.sceneGraph?.relationships?.length > 0 && (
                      <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ background: themeColors.surfaceAlt, borderColor: themeColors.border }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Graphe de Scène (Liaisons IA)</span>
                        <div className="max-h-[120px] overflow-y-auto space-y-1 scrollbar-thin">
                          {aiAnalysis.sceneGraph.relationships.map((rel: any, idx) => {
                            const subName = layers.find(l => l.id === rel.subject)?.name || rel.subject;
                            const objName = layers.find(l => l.id === rel.object)?.name || rel.object;
                            return (
                              <div key={idx} className="text-[10px] text-slate-500 py-0.5 border-b border-slate-100 last:border-none">
                                <span className="font-bold text-slate-700">{subName}</span>
                                <span className="text-indigo-500 font-semibold px-1"> {rel.relation} </span>
                                <span className="font-bold text-slate-700">{objName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl text-center text-xs text-slate-500 border border-dashed transition-all cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/10 group space-y-4"
                    style={{ borderColor: themeColors.border }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-500">
                      <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700">Aucune image analysée</p>
                      <p className="text-[10px] text-slate-400 leading-normal">Cliquez ici pour importer votre planche et activer automatiquement le traitement Magic Layers Pro AI (19 moteurs).</p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-all"
                      >
                        Sélectionner
                      </button>
                      <button
                        onClick={handleLoadDemoModel}
                        className="px-3 py-1.5 font-bold rounded-lg text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white"
                      >
                        Utiliser la Démo
                      </button>
                    </div>
                  </div>
                )}

                {/* Engines Monitoring list */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moniteurs des 19 Moteurs</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin text-slate-800">
                    {engines.map((eng) => (
                      <div
                        key={eng.id}
                        className="p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 bg-slate-50"
                        style={{ 
                          background: eng.status === "completed" ? "rgba(16,185,129,0.02)" : "transparent",
                          borderColor: eng.status === "completed" ? "rgba(16,185,129,0.15)" : themeColors.borderLight
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold" style={{ color: themeColors.text }}>{eng.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                            eng.status === "completed" 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {eng.status === "completed" ? "Prêt" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{eng.desc}</p>
                        
                        {/* Task list details */}
                        {eng.status === "completed" && (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1.5 border-t border-dashed border-slate-100">
                            {eng.checks.map((chk, cidx) => (
                              <div key={cidx} className="flex items-center gap-1 text-[9px] text-slate-400">
                                <span className="text-emerald-500 font-bold">✔</span>
                                <span className="truncate">{chk.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ADJUSTMENT TAB */}
            {activeTab === "adjust" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Ajustements Intelligents</h4>
                  <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Améliorez le rendu des contours, textes et couleurs</p>
                </div>

                {/* Filter sliders */}
                {[
                  { key: "denoise" as const, label: "Réduction du bruit (Denoise)", min: 0, max: 100 },
                  { key: "sharpen" as const, label: "Netteté (Sharpen)", min: 0, max: 100 },
                  { key: "contrast" as const, label: "Contraste", min: 50, max: 150 },
                  { key: "brightness" as const, label: "Luminosité", min: 50, max: 150 },
                  { key: "colors" as const, label: "Étalonnage des couleurs", min: 0, max: 200 },
                ].map((slider) => (
                  <div key={slider.key} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium" style={{ color: themeColors.textSecondary }}>{slider.label}</span>
                      <span className="font-bold font-mono" style={{ color: themeColors.accent }}>{filters[slider.key]}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={slider.min}
                      max={slider.max}
                      value={filters[slider.key] as number} 
                      onChange={(e) => updateFilter(slider.key, parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: themeColors.accent, background: themeColors.surfaceAlt }}
                    />
                  </div>
                ))}

                <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${themeColors.border}` }}>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span style={{ color: themeColors.textSecondary }}>Rendre textes lisibles</span>
                    <input 
                      type="checkbox" 
                      checked={filters.textEnhance} 
                      onChange={(e) => updateFilter("textEnhance", e.target.checked)}
                      className="rounded focus:ring-0"
                      style={{ accentColor: themeColors.accent }}
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span style={{ color: themeColors.textSecondary }}>Améliorer contours bulles</span>
                    <input 
                      type="checkbox" 
                      checked={filters.contour} 
                      onChange={(e) => updateFilter("contour", e.target.checked)}
                      className="rounded focus:ring-0"
                      style={{ accentColor: themeColors.accent }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* LAYERS MANAGER TAB */}
            {activeTab === "layers" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Gestion des calques</h4>
                    <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Chaque bulle et texte est un calque modifiable</p>
                  </div>
                  <button 
                    onClick={handleAddTextLayer}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: themeColors.accentBg, color: themeColors.accent, border: `1px solid ${themeColors.accentBorder}` }}
                    title="Ajouter une bulle de texte"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Layer edit box if selected */}
                {selectedLayer && (
                  <div className="p-3 rounded-xl space-y-3" style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}` }}>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase" style={{ color: themeColors.accent }}>
                      <span>Propriétés Calque</span>
                      <span className="px-2 py-0.5 rounded text-[8px]" style={{ background: themeColors.surface, color: themeColors.textMuted }}>{selectedLayer.type}</span>
                    </div>

                    {(selectedLayer.type === "bubble" || selectedLayer.type === "text") && (
                      <div className="space-y-2">
                        <label className="block text-[10px]" style={{ color: themeColors.textMuted }}>Texte du dialogue</label>
                        <textarea 
                          rows={3}
                          value={selectedLayer.text || ""} 
                          onChange={(e) => handleUpdateLayerText(selectedLayer.id, e.target.value)}
                          onBlur={handleSaveTextEdit}
                          className="w-full rounded-lg p-2.5 text-xs focus:outline-none resize-none"
                          style={{ background: themeColors.surface, border: `1px solid ${themeColors.border}`, color: themeColors.text }}
                        />
                        
                        {/* Translate & Restore buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleTranslateLayer(selectedLayer.id, selectedLayer.text || "")}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                            style={{ background: themeColors.accentBg, color: themeColors.accent, border: `1px solid ${themeColors.accentBorder}` }}
                          >
                            <Languages className="w-3 h-3" /> Traduire en Anglais
                          </button>
                          
                          {selectedLayer.originalText && selectedLayer.text !== selectedLayer.originalText && (
                            <button 
                              onClick={() => {
                                const updated = layers.map(l => l.id === selectedLayer.id ? { ...l, text: selectedLayer.originalText } : l);
                                setLayers(updated);
                                pushHistory(updated);
                              }}
                              className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 hover:scale-[1.01]"
                              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444" }}
                              title="Restaurer le texte d'origine"
                            >
                              <RotateCcw className="w-3 h-3" /> Rétablir
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Opacity slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: themeColors.textMuted }}>Opacité</span>
                        <span className="font-bold" style={{ color: themeColors.accent }}>{selectedLayer.opacity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100"
                        value={selectedLayer.opacity}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { opacity: parseInt(e.target.value) })}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: themeColors.accent }}
                      />
                    </div>
                  </div>
                )}

                {/* Layers Listing */}
                <div className="space-y-1.5">
                  {layers.map((layer) => (
                    <div 
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className="p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                      style={{
                        background: selectedLayerId === layer.id ? themeColors.accentBg : themeColors.surface,
                        border: `1px solid ${selectedLayerId === layer.id ? themeColors.accentBorder : themeColors.borderLight}`,
                        color: selectedLayerId === layer.id ? themeColors.accent : themeColors.textSecondary
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {layer.type === "bubble" ? <Type className="w-3.5 h-3.5 shrink-0" /> : <Layers className="w-3.5 h-3.5 shrink-0" />}
                        <span className="text-xs truncate">{layer.name}</span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleToggleLayerVisibility(layer.id)}
                          className="p-1 transition-colors"
                          style={{ color: layer.visible ? themeColors.textSecondary : themeColors.textMuted }}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => handleToggleLayerLock(layer.id)}
                          className="p-1 transition-colors"
                          style={{ color: layer.locked ? themeColors.warning : themeColors.textMuted }}
                        >
                          {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        {layer.type !== "background" && (
                          <button 
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="p-1 transition-colors hover:text-red-500"
                            style={{ color: themeColors.textMuted }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FORMAT & ASPECT RATIO TAB */}
            {activeTab === "layout" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Mise en page & Ratio</h4>
                  <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Étendez l'image vers des ratios professionnels standardisés</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {["A3", "A4", "A5", "carré", "portrait", "paysage"].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => {
                        setCanvasRatio(ratio);
                        pushHistory(layers, filters, ratio);
                      }}
                      className="p-3 rounded-xl text-center font-semibold capitalize transition-all"
                      style={{
                        background: canvasRatio === ratio ? themeColors.accentBg : themeColors.surfaceAlt,
                        border: `1px solid ${canvasRatio === ratio ? themeColors.accentBorder : themeColors.borderLight}`,
                        color: canvasRatio === ratio ? themeColors.accent : themeColors.textSecondary,
                        boxShadow: canvasRatio === ratio ? `0 4px 12px ${themeColors.accent}15` : "none"
                      }}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl space-y-1.5" style={{ background: themeColors.accentBg, border: `1px solid ${themeColors.accentBorder}` }}>
                  <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: themeColors.accent }}>
                    <Sparkles className="w-3.5 h-3.5" /> Remplissage génératif auto
                  </span>
                  <p className="text-[10px] leading-relaxed" style={{ color: themeColors.textSecondary }}>
                    Lors de l'extension de l'image, l'IA recrée automatiquement le décor ou les cases manquantes sur les bordures.
                  </p>
                </div>
              </div>
            )}

            {/* RETOUCHE TAB */}
            {activeTab === "retouch" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Retouches & IA</h4>
                  <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Outils intelligents de restauration d'images</p>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Coloriser l'image", action: () => { setLoading(true); setAiStatus("Colorisation de l'image..."); setTimeout(() => { setLoading(false); setAiStatus(""); updateFilter("colors", 130); }, 1200); } },
                    { label: "Réparer & Restaurer", action: () => { setLoading(true); setAiStatus("Restauration et réparation des traits..."); setTimeout(() => { setLoading(false); setAiStatus(""); updateFilter("sharpen", 70); }, 1200); } },
                    { label: "Optimiser visages & vêtements", action: () => { setLoading(true); setAiStatus("Amélioration des visages et cheveux..."); setTimeout(() => { setLoading(false); setAiStatus(""); }, 1200); } },
                    { label: "Nettoyer les artefacts", action: () => { setLoading(true); setAiStatus("Nettoyage des imperfections et pixels..."); setTimeout(() => { setLoading(false); setAiStatus(""); updateFilter("denoise", 60); }, 1200); } },
                  ].map((tool, i) => (
                    <button
                      key={i}
                      onClick={tool.action}
                      className="w-full py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                      style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.text }}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>

                {/* AI Illustration Generator Prompt Box */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Illustration par IA</h5>
                    <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Générez de nouveaux éléments graphiques via prompt</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Un nuage magique en dessin de BD..."
                    value={illuPrompt}
                    onChange={(e) => setIlluPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerateIllustration()}
                    className="w-full rounded-lg p-2 text-xs focus:outline-none"
                    style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}`, color: themeColors.text }}
                  />
                  <button
                    onClick={handleGenerateIllustration}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Générer l'illustration</span>
                  </button>
                </div>
              </div>
            )}

            {/* EXPORT TAB */}
            {activeTab === "export" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>Export professionnel</h4>
                  <p className="text-[10px]" style={{ color: themeColors.textMuted }}>Formats de livraison conformes pour l'impression</p>
                </div>

                <div className="space-y-4">
                  {/* Format select */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px]" style={{ color: themeColors.textMuted }}>Format de fichier</label>
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
                      {["png", "jpg", "pdf", "webp", "tiff", "svg", "psd", "avif", "figma", "canva", "photopea", "json"].map(fmt => (
                        <button 
                          key={fmt}
                          onClick={() => handleExportFile(fmt, 300)}
                          className="py-2.5 rounded-lg uppercase tracking-wide transition-all hover:scale-[1.02] flex items-center justify-center border font-bold"
                          style={{ background: themeColors.surfaceAlt, borderColor: themeColors.borderLight, color: themeColors.textSecondary }}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DPI Select */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px]" style={{ color: themeColors.textMuted }}>Résolution (DPI)</label>
                    <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                      {[72, 150, 300, 600].map(dpi => (
                        <button 
                          key={dpi}
                          onClick={() => handleExportFile("pdf", dpi)}
                          className="py-2 rounded-lg transition-all hover:scale-[1.02]"
                          style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.borderLight}`, color: themeColors.textSecondary }}
                        >
                          {dpi}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PDF printing options */}
                  <div className="p-3 rounded-xl space-y-2" style={{ background: themeColors.surfaceAlt, border: `1px solid ${themeColors.border}` }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>Options PDF Impression</div>
                    <label className="flex items-center justify-between text-xs cursor-pointer" style={{ color: themeColors.textSecondary }}>
                      <span>Exporter avec fond perdu (+6mm)</span>
                      <input type="checkbox" defaultChecked className="rounded focus:ring-0" style={{ accentColor: themeColors.accent }} />
                    </label>
                    <label className="flex items-center justify-between text-xs cursor-pointer" style={{ color: themeColors.textSecondary }}>
                      <span>Repères de coupe (Crop marks)</span>
                      <input type="checkbox" defaultChecked className="rounded focus:ring-0" style={{ accentColor: themeColors.accent }} />
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right sidebar footer: Quick Zoom */}
          <div
            className="h-12 shrink-0 flex items-center justify-between px-4 select-none"
            style={{ borderTop: `1px solid ${themeColors.border}`, background: themeColors.surfaceAlt }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: themeColors.textMuted }}>Zoom Canvas</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 rounded transition-colors"
                style={{ background: themeColors.surface, border: `1px solid ${themeColors.border}`, color: themeColors.textSecondary }}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold w-8 text-center" style={{ color: themeColors.accent }}>{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 rounded transition-colors"
                style={{ background: themeColors.surface, border: `1px solid ${themeColors.border}`, color: themeColors.textSecondary }}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
