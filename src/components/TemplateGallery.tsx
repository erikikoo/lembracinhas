/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Template } from '../types';
import { 
  Search, 
  Layout, 
  Filter, 
  ChevronRight, 
  Sparkles, 
  Edit3, 
  Eye,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TemplateGalleryProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onEdit?: (template: Template) => void;
  isAdmin?: boolean;
}

export function TemplateGallery({ templates, onSelect, onEdit, isAdmin }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = useMemo(() => {
    const cats = new Set<string>(['Todos']);
    templates.forEach(t => {
      t.categorias?.forEach(c => cats.add(c));
    });
    return Array.from(cats);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.nome.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || t.categorias?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero / Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-[10px] font-bold uppercase tracking-widest mb-2">
          <Sparkles className="h-3 w-3" />
          Novos Templates Disponíveis
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-slate-900">
          Escolha o seu <span className="text-brand-600">Template</span>
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed">
          Selecione um dos nossos modelos profissionais e comece a personalizar suas lembranças em segundos.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar w-full md:w-auto px-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300",
                selectedCategory === category
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-200 scale-105"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredTemplates.map((template) => {
            // Find a preview image (background or first image element)
            const bgImage = template.elementos.find(e => e.tipo === 'imagem' && e.src)?.src;
            const previewUrl = template.thumbnail || bgImage || 'https://picsum.photos/seed/template/800/600';

            return (
              <div 
                key={template.id}
                className="group relative flex flex-col bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2"
              >
                {/* Preview Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img 
                    src={previewUrl} 
                    alt={template.nome}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-4">
                    <button
                      onClick={() => onSelect(template)}
                      className="h-12 w-12 rounded-full bg-white text-brand-600 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                      title="Selecionar Template"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                    {isAdmin && onEdit && (
                      <button
                        onClick={() => onEdit(template)}
                        className="h-12 w-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                        title="Editar Template"
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Category Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {template.categorias?.slice(0, 2).map(cat => (
                      <span key={cat} className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {template.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pronto para uso</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all duration-300">
                      <Layout className="h-5 w-5" />
                    </div>
                  </div>

                  <button
                    onClick={() => onSelect(template)}
                    className="w-full py-3.5 rounded-2xl bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-200 transition-all duration-300"
                  >
                    Personalizar Agora
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
            <Search className="h-10 w-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900">Nenhum template encontrado</h3>
          <p className="text-slate-500 mt-2">Tente ajustar sua busca ou categoria.</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Todos');
            }}
            className="mt-6 text-brand-600 font-bold text-sm hover:underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Footer / CTA */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>
        
        <h2 className="text-3xl font-display font-bold text-white relative z-10">
          Não encontrou o que procurava?
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto relative z-10">
          Estamos sempre adicionando novos modelos. Se você é administrador, pode criar seus próprios templates no painel.
        </p>
        {isAdmin && (
          <button 
            onClick={() => onEdit?.({} as Template)} // This will be handled by handleNewTemplate in App.tsx
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-brand-50 transition-all relative z-10"
          >
            <Sparkles className="h-4 w-4 text-brand-600" />
            Criar Novo Template
          </button>
        )}
      </div>
    </div>
  );
}
