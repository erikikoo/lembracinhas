/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { Template, TemplateElement } from '../types';
import { 
  Upload, 
  Plus, 
  Save, 
  Trash2, 
  Type, 
  Move, 
  Palette, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Layers,
  RotateCw,
  Copy,
  Layout,
  Loader2,
  Settings2,
  ArrowLeft
} from 'lucide-react';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { cn } from '../lib/utils';


interface AdminPanelProps {
  onSave: (template: Template) => void;
  onCancel: () => void;
  onNew: () => void;
  templateToEdit?: Template | null;
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  availableFonts: string[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onSave, 
  onCancel, 
  onNew, 
  templateToEdit, 
  templates, 
  onEdit, 
  onDelete,
  availableFonts 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [templateName, setTemplateName] = useState(templateToEdit?.nome || 'Novo Layout');
  const [templateCategories, setTemplateCategories] = useState<string[]>(
    templateToEdit?.categorias || ((templateToEdit as any)?.categoria ? [(templateToEdit as any).categoria] : ['Geral'])
  );
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Textbox | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setTick] = useState(0); // Forçar re-renderização do UI quando o objeto no canvas muda
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [categories, setCategories] = useState<{id: string, nome: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Load categories from Firestore
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('nome'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCats = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome
      }));
      setCategories(fetchedCats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (templateToEdit) {
      const templateFonts = templateToEdit.elementos
        .filter(el => el.tipo === 'texto' && el.fontFamily)
        .map(el => el.fontFamily as string);
      
    }
  }, [templateToEdit]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFont(true);
    try {
      const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) return;

        try {
          // Save to Firestore
          const base64Data = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          if (base64Data.length > 1000000) {
            alert("O arquivo da fonte é muito grande (máximo 1MB para Firestore).");
            setIsUploadingFont(false);
            return;
          }

          await setDoc(doc(db, 'fonts', fontName), {
            name: fontName,
            data: base64Data,
            createdAt: new Date().toISOString()
          });

          const fontFace = new FontFace(fontName, arrayBuffer);
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);
          
          if (fabricCanvas) {
            fabricCanvas.renderAll();
          }
          
          console.log(`Fonte "${fontName}" salva e carregada com sucesso!`);
        } catch (err) {
          console.error('Erro ao carregar fonte:', err);
          if (err instanceof Error && err.message.includes('permission')) {
            handleFirestoreError(err, OperationType.WRITE, `fonts/${fontName}`);
          } else {
            alert('Erro ao processar o arquivo de fonte.');
          }
        } finally {
          setIsUploadingFont(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Erro ao ler arquivo de fonte:', err);
      alert('Erro ao carregar fonte customizada.');
      setIsUploadingFont(false);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 800,
        backgroundColor: '#f3f4f6',
      });

      setFabricCanvas(canvas);

      const updateSelection = () => {
        try {
          const activeObject = canvas.getActiveObject();
          if (activeObject instanceof fabric.Textbox) {
            setSelectedObject(activeObject);
            setTick(t => t + 1);
          } else {
            setSelectedObject(null);
          }
        } catch (err) {
          console.error('Erro ao atualizar seleção:', err);
        }
      };

      canvas.on('selection:created', updateSelection);
      canvas.on('selection:updated', updateSelection);
      canvas.on('selection:cleared', updateSelection);
      canvas.on('object:modified', updateSelection);

      const handleKeyDown = (e: KeyboardEvent) => {
        try {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
              canvas.remove(...activeObjects);
              canvas.discardActiveObject();
              canvas.renderAll();
              setIsDirty(true);
            }
          }
        } catch (err) {
          console.error('Erro ao processar tecla:', err);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        canvas.dispose();
      };
    } catch (err) {
      console.error('Erro ao inicializar canvas:', err);
    }
  }, []);

  // Carregar template quando templateToEdit mudar ou quando o canvas for inicializado
  useEffect(() => {
    if (!fabricCanvas) return;

    let isMounted = true;

    if (!templateToEdit) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#f3f4f6';
      setBgImage(null);
      setTemplateName('Novo Layout');
      setTemplateCategories(['Geral']);
      setIsDirty(false);
      fabricCanvas.renderAll();
      return;
    }

    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        if (!isMounted) return;
        fabricCanvas.clear();
        
        // Set canvas dimensions from template
        if (templateToEdit.largura && templateToEdit.altura) {
          fabricCanvas.setDimensions({
            width: templateToEdit.largura,
            height: templateToEdit.altura
          });
        }

        fabricCanvas.backgroundColor = '#f3f4f6';
        setBgImage(null);
        setTemplateName(templateToEdit.nome);
        setTemplateCategories(templateToEdit.categorias || ((templateToEdit as any).categoria ? [(templateToEdit as any).categoria] : ['Geral']));
        setIsDirty(false);

        // Encontrar imagem de fundo
        const bgEl = templateToEdit.elementos.find(el => el.tipo === 'imagem');
        if (bgEl && bgEl.src) {
          setBgImage(bgEl.src);
          try {
            const img = await fabric.FabricImage.fromURL(bgEl.src);
            if (!isMounted) return;
            if (img && img.width && img.height) {
              // Calculate scale based on saved dimensions
              const scaleX = bgEl.width / img.width;
              const scaleY = bgEl.height / img.height;
              
              img.set({
                scaleX: scaleX,
                scaleY: scaleY,
                left: bgEl.left,
                top: bgEl.top,
                originX: bgEl.originX || 'center',
                originY: bgEl.originY || 'center',
                selectable: true,
                evented: true,
              });
              fabricCanvas.add(img);
              fabricCanvas.sendObjectToBack(img);
            }
          } catch (imgErr) {
            console.error('Erro ao carregar imagem de fundo do template:', imgErr);
          }
        }

        if (!isMounted) return;

        // Adicionar textos
        for (const el of templateToEdit.elementos) {
          if (el.tipo === 'texto') {
            const text = new fabric.Textbox(el.texto || '', {
              left: el.left,
              top: el.top,
              width: el.width || 200,
              fontSize: el.fontSize || 24,
              fontFamily: el.fontFamily || 'Inter',
              fill: el.fill || '#000000',
              textAlign: el.textAlign || 'center',
              originX: el.originX || 'center',
              originY: el.originY || 'center',
              fontWeight: String(el.fontWeight || 'normal') as any,
              fontStyle: String(el.fontStyle || 'normal') as any,
              opacity: el.opacity !== undefined ? el.opacity : 1,
              angle: el.angle || 0,
              cornerColor: '#6366f1',
              transparentCorners: false,
              splitByGrapheme: false,
              // Guia visual para a "área determinada"
              stroke: '#6366f1',
              strokeWidth: 1,
              strokeDashArray: [5, 5],
              padding: 5,
            });
            fabricCanvas.add(text);
          }
        }
        fabricCanvas.renderAll();
      } catch (err) {
        console.error('Erro ao carregar template:', err);
        if (err instanceof Error && err.message.includes('permission')) {
          handleFirestoreError(err, OperationType.GET, `templates/${templateToEdit.id}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [fabricCanvas, templateToEdit]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      try {
        const data = f.target?.result as string;
        if (!data) return;
        setBgImage(data);
        setIsDirty(true);

        const img = await fabric.FabricImage.fromURL(data);
        
        if (!img || !img.width) {
          console.error('Falha ao carregar imagem ou largura inválida');
          return;
        }

        const maxWidth = 800;
        const scale = maxWidth / img.width;
        const scaledHeight = img.height * scale;
        
        if (!fabricCanvas) return;

        fabricCanvas.setDimensions({
          width: maxWidth,
          height: scaledHeight
        });

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: maxWidth / 2,
          top: scaledHeight / 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          hoverCursor: 'move',
        });

        // Adiciona como objeto normal em vez de backgroundImage para permitir arraste
        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
      } catch (err) {
        console.error('Erro ao processar imagem de fundo:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTextField = (fieldName: string) => {
    try {
      if (!fabricCanvas) return;

      const text = new fabric.Textbox(`{{${fieldName}}}`, {
        left: 400,
        top: 400,
        width: 300, // Largura padrão menor para incentivar o ajuste da área
        fontSize: 40,
        fontFamily: 'Inter',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        cornerColor: '#6366f1',
        transparentCorners: false,
        splitByGrapheme: false,
        // Guia visual para a "área determinada"
        stroke: '#6366f1',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        padding: 5,
      });

      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      setIsDirty(true);
    } catch (err) {
      console.error('Erro ao adicionar campo de texto:', err);
    }
  };

  // Monitorar mudanças no canvas para dirty checking
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleChange = () => setIsDirty(true);

    fabricCanvas.on('object:modified', handleChange);
    fabricCanvas.on('object:added', handleChange);
    fabricCanvas.on('object:removed', handleChange);

    return () => {
      fabricCanvas.off('object:modified', handleChange);
      fabricCanvas.off('object:added', handleChange);
      fabricCanvas.off('object:removed', handleChange);
    };
  }, [fabricCanvas]);

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    try {
      console.log('Iniciando salvamento do template:', { templateName, templateCategories });
      if (!fabricCanvas || !bgImage) {
        console.warn('Canvas ou imagem de fundo ausente ao salvar.');
        return;
      }

      const canvasObjects = fabricCanvas.getObjects();
      const templateElements: TemplateElement[] = [];

      // Encontrar a imagem de fundo entre os objetos
      const bgImgObj = canvasObjects.find(obj => obj instanceof fabric.FabricImage) as fabric.FabricImage;

      if (bgImgObj) {
        templateElements.push({
          tipo: 'imagem',
          src: bgImage,
          left: bgImgObj.left!,
          top: bgImgObj.top!,
          width: bgImgObj.width! * bgImgObj.scaleX!,
          height: bgImgObj.height! * bgImgObj.scaleY!,
          originX: bgImgObj.originX as any,
          originY: bgImgObj.originY as any,
        });
      }

      canvasObjects.forEach((obj) => {
        if (obj instanceof fabric.Textbox) {
          const text = obj.text || '';
          const campoMatch = text.match(/\{\{(.*?)\}\}/);
          const campo = campoMatch ? campoMatch[1] : 'texto';

          templateElements.push({
            tipo: 'texto',
            campo: campo,
            texto: text,
            left: obj.left!,
            top: obj.top!,
            width: obj.width! * obj.scaleX!,
            fontSize: obj.fontSize! * obj.scaleY!, // Aplica a escala ao tamanho da fonte
            fontFamily: obj.fontFamily,
            textAlign: obj.textAlign as any,
            fill: obj.fill as string,
            originX: obj.originX as any,
            originY: obj.originY as any,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle as any,
            opacity: obj.opacity,
            angle: obj.angle,
          });
        }
      });

      const newTemplate: Template = {
        id: templateToEdit?.id || `custom_${Date.now()}`,
        nome: templateName,
        categorias: templateCategories,
        largura: fabricCanvas.width!,
        altura: fabricCanvas.height!,
        elementos: templateElements,
      };

      await onSave(newTemplate);
      setIsDirty(false);
      setShowSaveConfirm(false);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      if (err instanceof Error && err.message.startsWith('{')) {
        // Relançar erro do Firestore para o ErrorBoundary
        throw err;
      }
      alert('Erro ao salvar template. Verifique o console.');
    }
  };

  const updateSelectedProperty = (prop: string, value: any) => {
    try {
      if (!selectedObject || !fabricCanvas) return;
      selectedObject.set(prop as any, value);
      fabricCanvas.renderAll();
      setIsDirty(true);
      // Forçar atualização do estado para refletir no UI se necessário
      setTick(t => t + 1);
    } catch (err) {
      console.error(`Erro ao atualizar propriedade ${prop}:`, err);
    }
  };

  const duplicateSelectedObject = async () => {
    try {
      if (!selectedObject || !fabricCanvas) return;
      
      const cloned = await selectedObject.clone();
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      });
      
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      setIsDirty(true);
    } catch (err) {
      console.error('Erro ao duplicar objeto:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="group flex items-center gap-2 text-slate-400 hover:text-brand-600 transition-all duration-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-brand-50 group-hover:ring-brand-200 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold">Voltar para Galeria</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4 xl:col-span-3 space-y-6">
        {/* Lista de Layouts para Edição Rápida */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Layout className="h-3.5 w-3.5 text-brand-500" />
              Meus Layouts
            </h3>
            <button 
              onClick={onNew}
              className="text-[10px] font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700 transition-colors"
            >
              + Novo
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {templates.map(t => (
              <div key={t.id} className="group flex items-center gap-2">
                <button
                  onClick={() => onEdit(t)}
                  className={cn(
                    "flex-1 text-left px-4 py-3 rounded-xl text-xs transition-all duration-300 border flex items-center justify-between",
                    templateToEdit?.id === t.id 
                      ? "bg-brand-50/50 border-brand-200 text-brand-700 font-bold shadow-sm" 
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-brand-200 hover:shadow-md"
                  )}
                >
                  <span className="truncate pr-4">{t.nome}</span>
                  {templateToEdit?.id === t.id && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-brand-200 text-brand-800">
                      Editando
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => onDelete(t.id)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="py-8 text-center rounded-xl border border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum layout salvo</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-brand-500" />
            Configurar Template
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Nome do Layout</label>
              <input 
                type="text" 
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  setIsDirty(true);
                }}
                className="input-field"
                placeholder="Ex: Convite de Aniversário"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Categorias</label>
                <button 
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  title="Gerenciar Categorias"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50 custom-scrollbar">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200 group">
                  <input 
                    type="checkbox"
                    checked={templateCategories.includes('Geral')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTemplateCategories(prev => [...prev, 'Geral']);
                      } else {
                        setTemplateCategories(prev => prev.filter(c => c !== 'Geral'));
                      }
                      setIsDirty(true);
                    }}
                    className="rounded-md border-slate-300 text-brand-600 focus:ring-brand-500 transition-all"
                  />
                  <span className="text-xs font-medium text-slate-600 group-hover:text-brand-700">Geral</span>
                </label>
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200 group">
                    <input 
                      type="checkbox"
                      checked={templateCategories.includes(cat.nome)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTemplateCategories(prev => [...prev, cat.nome]);
                        } else {
                          setTemplateCategories(prev => prev.filter(c => c !== cat.nome));
                        }
                        setIsDirty(true);
                      }}
                      className="rounded-md border-slate-300 text-brand-600 focus:ring-brand-500 transition-all"
                    />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-brand-700">{cat.nome}</span>
                  </label>
                ))}
              </div>

              {isAddingCategory && (
                <div className="mt-4 p-5 rounded-2xl bg-brand-50/30 border border-brand-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Nova Categoria</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    <button 
                      onClick={async () => {
                        if (!newCategoryName.trim()) return;
                        const id = `cat_${Date.now()}`;
                        const name = newCategoryName.trim();
                        try {
                          await setDoc(doc(db, 'categories', id), {
                            id,
                            nome: name,
                            createdAt: new Date().toISOString()
                          });
                          setTemplateCategories(prev => {
                            if (!prev.includes(name)) return [...prev, name];
                            return prev;
                          });
                          setIsDirty(true);
                          setNewCategoryName('');
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
                        }
                      }}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-brand-100/50 shadow-sm">
                        <span className="text-xs font-medium text-slate-600">{cat.nome}</span>
                        <button 
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'categories', cat.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, `categories/${cat.id}`);
                            }
                          }}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Imagem de Fundo</label>
              <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-6 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/30 group">
                <div className="p-3 rounded-xl bg-slate-50 group-hover:bg-white transition-colors shadow-sm">
                  <Upload className="h-5 w-5 text-slate-400 group-hover:text-brand-500" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-600 block">Upload JPG/PNG</span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Arraste ou clique</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Fontes Customizadas</label>
              <label className={cn(
                "mt-1 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-4 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/30",
                isUploadingFont && "opacity-50 cursor-not-allowed"
              )}>
                {isUploadingFont ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                ) : (
                  <Type className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-600">
                  {isUploadingFont ? 'Enviando...' : 'Upload Fonte (TTF/OTF)'}
                </span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".ttf,.otf" 
                  onChange={handleFontUpload} 
                  disabled={isUploadingFont}
                />
              </label>
              <p className="mt-2 text-[10px] font-medium text-slate-400 leading-relaxed italic">
                Fontes salvas no Firebase e disponíveis para todos os templates.
              </p>
            </div>
          </div>
        </div>

        {selectedObject && (
          <div className="glass-card p-6 border-l-4 border-brand-500 animate-in fade-in slide-in-from-left-4 duration-300">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand-500" />
              Propriedades
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Fonte</label>
                <select 
                  value={selectedObject.fontFamily}
                  onChange={(e) => updateSelectedProperty('fontFamily', e.target.value)}
                  className="input-field py-2 text-xs"
                >
                  {availableFonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Posição X</label>
                  <input 
                    type="number" 
                    value={Math.round(selectedObject.left || 0)}
                    onChange={(e) => updateSelectedProperty('left', parseInt(e.target.value))}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Posição Y</label>
                  <input 
                    type="number" 
                    value={Math.round(selectedObject.top || 0)}
                    onChange={(e) => updateSelectedProperty('top', parseInt(e.target.value))}
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Tamanho</label>
                  <input 
                    type="number" 
                    value={Math.round(selectedObject.fontSize || 0)}
                    onChange={(e) => updateSelectedProperty('fontSize', parseInt(e.target.value))}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Ângulo</label>
                  <input 
                    type="number" 
                    value={Math.round(selectedObject.angle || 0)}
                    onChange={(e) => updateSelectedProperty('angle', parseInt(e.target.value))}
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Cor</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={selectedObject.fill as string}
                    onChange={(e) => updateSelectedProperty('fill', e.target.value)}
                    className="h-10 w-12 rounded-xl border border-slate-200 p-1 cursor-pointer bg-white"
                  />
                  <input 
                    type="text" 
                    value={selectedObject.fill as string}
                    onChange={(e) => updateSelectedProperty('fill', e.target.value)}
                    className="flex-1 input-field py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Estilo</label>
                <div className="flex gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200">
                  <button 
                    onClick={() => updateSelectedProperty('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                    className={cn(
                      "flex-1 flex justify-center py-2 rounded-lg transition-all",
                      selectedObject.fontWeight === 'bold' ? "bg-white shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => updateSelectedProperty('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                    className={cn(
                      "flex-1 flex justify-center py-2 rounded-lg transition-all",
                      selectedObject.fontStyle === 'italic' ? "bg-white shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">Alinhamento</label>
                <div className="flex gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200">
                  <button 
                    onClick={() => updateSelectedProperty('textAlign', 'left')}
                    className={cn(
                      "flex-1 flex justify-center py-2 rounded-lg transition-all",
                      selectedObject.textAlign === 'left' ? "bg-white shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => updateSelectedProperty('textAlign', 'center')}
                    className={cn(
                      "flex-1 flex justify-center py-2 rounded-lg transition-all",
                      selectedObject.textAlign === 'center' ? "bg-white shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => updateSelectedProperty('textAlign', 'right')}
                    className={cn(
                      "flex-1 flex justify-center py-2 rounded-lg transition-all",
                      selectedObject.textAlign === 'right' ? "bg-white shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={duplicateSelectedObject}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-all border border-slate-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </button>
                <button 
                  onClick={() => {
                    if (fabricCanvas) {
                      fabricCanvas.remove(selectedObject);
                      fabricCanvas.discardActiveObject();
                      fabricCanvas.renderAll();
                      setIsDirty(true);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-brand-500" />
            Adicionar Campos
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {['nome', 'idade', 'data', 'mensagem', 'remetente'].map(field => (
              <button
                key={field}
                onClick={() => addTextField(field)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-all border border-slate-100 hover:border-brand-100"
              >
                <Type className="h-3 w-3" />
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {templateToEdit && (
            <button
              onClick={onNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 py-3 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200 transition-all hover:bg-amber-100"
            >
              <Plus className="h-4 w-4" />
              Criar Novo Layout
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={!bgImage || !isDirty}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all",
              isDirty ? "bg-brand-600 shadow-brand-200 hover:bg-brand-700 active:scale-[0.98]" : "bg-slate-300 cursor-not-allowed"
            )}
          >
            <Save className="h-4 w-4" />
            Salvar Layout
          </button>
          
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-xs font-bold uppercase tracking-widest text-slate-600 border border-slate-200 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Cancelar e Sair
          </button>
        </div>
      </div>

      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        <div className="glass-card overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/20 border border-red-400/50" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/20 border border-yellow-400/50" />
                <div className="h-3 w-3 rounded-full bg-green-400/20 border border-green-400/50" />
              </div>
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Editor de Layout</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => addTextField('nome')}
                className="btn-secondary py-2 px-4 flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Campo</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={!isDirty}
                className={cn(
                  "btn-primary py-2 px-6 flex items-center gap-2",
                  !isDirty && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar Layout</span>
              </button>
            </div>
          </div>
          
          <div className="p-8 bg-slate-100/30 flex justify-center overflow-auto custom-scrollbar min-h-[600px]">
            <div className="relative shadow-2xl shadow-slate-200/50 rounded-lg overflow-hidden bg-white">
              <canvas ref={canvasRef} />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
                    <p className="text-xs font-bold text-brand-900 uppercase tracking-widest animate-pulse">Carregando Editor...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Salvamento */}
        {showSaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center">
                  <Save className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Salvar Alterações?</h3>
                  <p className="text-sm text-slate-500">Deseja salvar as modificações neste layout?</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSaveConfirm(false)}
                  className="flex-1 btn-secondary py-3"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmSave}
                  className="flex-1 btn-primary py-3"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
