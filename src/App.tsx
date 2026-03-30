/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Template, UserData } from './types';
import { templates as initialTemplates } from './data/templates';
import { TemplateSelector } from './components/TemplateSelector';
import { TemplateGallery } from './components/TemplateGallery';
import { FormGenerator } from './components/FormGenerator';
import { CanvasEditor } from './components/CanvasEditor';
import { AdminPanel } from './components/AdminPanel';
import { Sparkles, Layout, Settings2, Image as ImageIcon, ChevronRight, User, ShieldCheck, LogIn, LogOut, Loader2, ArrowLeft } from 'lucide-react';
import { useFirebase } from './context/FirebaseContext';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';

export default function App() {
  const { user, loading: authLoading, login, logout, isAdmin: isUserAdmin, isLoggingIn } = useFirebase();
  // FOR TESTING: Allow everyone to be admin
  const effectiveIsAdmin = true; 
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [userData, setUserData] = useState<UserData>({
    nome: 'Mirlene',
    idade: '1 ano',
    data: '25 de Março de 2026',
    mensagem: 'Que este novo ciclo seja repleto de luz, saúde e muitas realizações. Parabéns!',
    remetente: 'Com amor, João',
    noivos: 'Ana & Pedro',
    data_casamento: '12 de Outubro de 2026',
    agradecimento: 'Agradecemos imensamente por fazerem parte deste momento tão especial em nossas vidas.'
  });

  const [appliedUserData, setAppliedUserData] = useState<UserData>(userData);
  const [availableFonts, setAvailableFonts] = useState<string[]>([
    'Inter',
    'Arial',
    'Georgia',
    'Courier New',
    'Times New Roman',
    'Verdana',
    'Impact',
    'Comic Sans MS'
  ]);
  const [userFonts, setUserFonts] = useState<{[key: string]: string}>({});

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Load fonts from Firestore for everyone
  useEffect(() => {
    const q = query(collection(db, 'fonts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(async (doc) => {
        const fontData = doc.data();
        if (fontData.name && fontData.data) {
          try {
            const isLoaded = Array.from(document.fonts).some(f => f.family === fontData.name);
            if (!isLoaded) {
              try {
                const binaryString = atob(fontData.data);
                const fontFace = new FontFace(fontData.name, Uint8Array.from(binaryString, c => c.charCodeAt(0)));
                const loadedFace = await fontFace.load();
                document.fonts.add(loadedFace);
              } catch (atobErr) {
                console.error(`Erro ao decodificar base64 da fonte ${fontData.name}:`, atobErr);
              }
            }
            
            setAvailableFonts(prev => {
              if (!prev.includes(fontData.name)) {
                return [...prev, fontData.name];
              }
              return prev;
            });
          } catch (err) {
            console.error(`Erro ao carregar fonte ${fontData.name} do Firestore:`, err);
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fonts');
    });

    return () => unsubscribe();
  }, []);

  // Fetch templates from Firestore
  useEffect(() => {
    const q = query(collection(db, 'templates'), orderBy('nome'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTemplates = snapshot.docs.map(doc => doc.data() as Template);
      
      // Merge initial templates with fetched ones (fetched ones override initial ones with same ID)
      const mergedTemplates = [...initialTemplates];
      fetchedTemplates.forEach(ft => {
        const index = mergedTemplates.findIndex(it => it.id === ft.id);
        if (index !== -1) {
          mergedTemplates[index] = ft;
        } else {
          mergedTemplates.push(ft);
        }
      });
      
      setTemplates(mergedTemplates);
      setIsLoadingTemplates(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'templates');
      setIsLoadingTemplates(false);
    });

    return () => unsubscribe();
  }, []);

  // Update selected template when templates list changes or to sync with Firestore updates
  useEffect(() => {
    if (templates.length > 0) {
      if (selectedTemplate) {
        // Sync selected template if it was updated in the list (e.g., by admin)
        const updated = templates.find(t => t.id === selectedTemplate.id);
        const catsChanged = JSON.stringify(updated?.categorias) !== JSON.stringify(selectedTemplate.categorias);
        if (updated && (updated.nome !== selectedTemplate.nome || catsChanged || JSON.stringify(updated.elementos) !== JSON.stringify(selectedTemplate.elementos))) {
          setSelectedTemplate(updated);
        }
      }
    }
  }, [templates, selectedTemplate]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleApply = useCallback(() => {
    setAppliedUserData({ ...userData });
  }, [userData]);

  const handleReset = useCallback(() => {
    const emptyData = {
      nome: '',
      idade: '',
      data: '',
      mensagem: '',
      remetente: '',
      noivos: '',
      data_casamento: '',
      agradecimento: ''
    };
    setUserData(emptyData);
    setAppliedUserData(emptyData);
  }, []);

  const handleTemplateSelect = (template: Template) => {
    if (!user) {
      login();
      return;
    }
    setSelectedTemplate(template);
    setAppliedUserData({ ...userData });
  };

  const handleSaveNewTemplate = async (newTemplate: Template) => {
    if (!effectiveIsAdmin) return;
    
    try {
      await setDoc(doc(db, 'templates', newTemplate.id), {
        ...newTemplate,
        updatedAt: new Date().toISOString()
      });
      setSelectedTemplate(newTemplate);
      setTemplateToEdit(null);
      setIsAdminMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `templates/${newTemplate.id}`);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateToEdit(template);
    setIsAdminMode(true);
  };

  const handleNewTemplate = () => {
    setTemplateToEdit(null);
    setIsAdminMode(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!effectiveIsAdmin) return;
    
    if (confirm("Tem certeza que deseja excluir este template?")) {
      try {
        await deleteDoc(doc(db, 'templates', templateId));
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(templates.length > 1 ? templates.find(t => t.id !== templateId) || null : null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `templates/${templateId}`);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFE] font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-200">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">BoxCustom</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-600">Personalização de Lembranças</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-6">
            {effectiveIsAdmin && (
              <button 
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  isAdminMode 
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200"
                }`}
              >
                {isAdminMode ? <ShieldCheck className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                {isAdminMode ? "Sair do Painel ADM" : "Painel ADM"}
              </button>
            )}
            
            <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                      <p className="text-[10px] text-slate-400">Usuário Ativo</p>
                    </div>
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || ''} 
                      className="h-10 w-10 rounded-2xl ring-2 ring-brand-100 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button 
                    onClick={logout}
                    className="group p-2 text-slate-400 hover:text-red-500 transition-all duration-200"
                    title="Sair"
                  >
                    <LogOut className="h-5 w-5 group-hover:scale-110" />
                  </button>
                </>
              ) : (
                <button
                  onClick={login}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {isLoggingIn ? "Entrando..." : "Entrar"}
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {isLoadingTemplates ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="text-sm font-medium text-slate-400 animate-pulse">Carregando seus templates...</p>
            </div>
          </div>
        ) : isAdminMode ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AdminPanel 
              onSave={handleSaveNewTemplate} 
              onCancel={() => {
                setIsAdminMode(false);
                setTemplateToEdit(null);
              }}
              templateToEdit={templateToEdit}
              templates={templates}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onNew={handleNewTemplate}
              availableFonts={availableFonts}
            />
          </div>
        ) : !selectedTemplate ? (
          <TemplateGallery 
            templates={templates}
            onSelect={handleTemplateSelect}
            onEdit={handleEditTemplate}
            isAdmin={isUserAdmin}
          />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back Button */}
            <div className="mb-8">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="group flex items-center gap-2 text-slate-400 hover:text-brand-600 transition-all duration-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-brand-50 group-hover:ring-brand-200 transition-all">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold">Voltar para Galeria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            
            {/* Sidebar - Controls */}
            <aside className="space-y-10 lg:col-span-4 xl:col-span-3">
              
              {/* Step 1: Template Selection */}
              <section className="glass-card rounded-[2rem] p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Layout className="h-4 w-4 text-brand-600" />
                    </div>
                    <h2 className="section-title">Layout</h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">01</span>
                </div>
                
                <div className="space-y-4">
                  <div className="border-t border-slate-100 pt-4">
                    <TemplateSelector 
                      templates={templates}
                      selectedTemplateId={selectedTemplate?.id || ''}
                      onSelect={handleTemplateSelect}
                      onEdit={handleEditTemplate}
                      isAdmin={isUserAdmin}
                    />
                  </div>
                </div>
              </section>

              {/* Step 2: Customization */}
              <section className="glass-card rounded-[2rem] p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Settings2 className="h-4 w-4 text-brand-600" />
                    </div>
                    <h2 className="section-title">Personalização</h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">02</span>
                </div>
                <FormGenerator 
                  template={selectedTemplate}
                  userData={userData}
                  userFonts={userFonts}
                  availableFonts={availableFonts}
                  onChange={handleFieldChange}
                  onFontChange={(field, font) => setUserFonts(prev => ({ ...prev, [field]: font }))}
                  onReset={handleReset}
                />
                
                <button
                  onClick={handleApply}
                  className="btn-primary mt-8 w-full"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar Prévia da Arte
                </button>
              </section>

              {/* Info Card */}
              <div className="rounded-[2rem] bg-brand-50 p-8 ring-1 ring-brand-100/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                  <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider">Dica de Design</h4>
                </div>
                <p className="text-xs leading-relaxed text-brand-700/80">
                  Preencha os campos acima e clique em <b>"Gerar Prévia"</b> para visualizar as alterações no canvas em tempo real.
                </p>
              </div>
            </aside>

            {/* Main Content - Preview */}
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="sticky top-28 space-y-8">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                    <span className="hover:text-slate-600 cursor-pointer transition-colors">Editor</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                    <span className="text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{selectedTemplate?.nome || ''}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Otimização Ativa
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[650px] items-center justify-center rounded-[3rem] bg-slate-100/40 p-12 ring-1 ring-inset ring-slate-200/40 shadow-inner">
                  <div className="animate-in fade-in zoom-in-95 duration-700">
                    <CanvasEditor 
                      template={selectedTemplate}
                      userData={appliedUserData}
                      userFonts={userFonts}
                    />
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-wrap items-center justify-center gap-10 pt-4">
                  <div className="flex items-center gap-3 text-slate-400 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:text-brand-600 transition-colors">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Alta Resolução</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:text-brand-600 transition-colors">
                      <Layout className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Templates Premium</span>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </div>
        )}
      </main>

      <footer className="mt-32 border-t border-slate-200/60 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mx-auto mb-6 border border-slate-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            &copy; 2026 BoxCustom. Todos os direitos reservados. 
            <span className="mx-4 text-slate-200">|</span>
            Desenvolvido com Fabric.js & React & Firebase
          </p>
        </div>
      </footer>
    </div>
  );
}
