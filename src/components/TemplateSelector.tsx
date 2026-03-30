/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit, Layout } from 'lucide-react';
import { Template } from '../types';
import { templates } from '../data/templates';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelect: (template: Template) => void;
  onEdit?: (template: Template) => void;
  isAdmin?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
  onEdit,
  isAdmin,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Todas');

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    cats.add('Todas');
    templates.forEach(t => {
      if (t.categorias && Array.isArray(t.categorias)) {
        t.categorias.forEach(cat => cats.add(cat));
      }
    });
    return Array.from(cats);
  }, [templates]);

  const filteredTemplates = React.useMemo(() => {
    if (selectedCategory === 'Todas') return templates;
    return templates.filter(t => t.categorias?.includes(selectedCategory));
  }, [templates, selectedCategory]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
          Categorias
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                selectedCategory === category
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-100"
                  : "bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
          Templates Disponíveis
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              "group relative flex cursor-pointer flex-col items-start rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
              selectedTemplateId === template.id
                ? "border-brand-600 bg-brand-50/30 shadow-lg shadow-brand-100/20"
                : "border-slate-100 bg-white hover:border-brand-200"
            )}
          >
            <div className="flex w-full items-center justify-between mb-2">
              <span className={cn(
                "text-sm font-bold tracking-tight",
                selectedTemplateId === template.id ? "text-brand-900" : "text-slate-700"
              )}>
                {template.nome}
              </span>
              {selectedTemplateId === template.id && (
                <div className="h-2 w-2 rounded-full bg-brand-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dimensões</span>
                <span className="text-[10px] font-bold text-slate-600">{template.largura}x{template.altura}px</span>
              </div>
              {template.categorias?.map(cat => (
                <span key={cat} className="rounded-lg bg-brand-50/50 px-2 py-1 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  {cat}
                </span>
              ))}
            </div>
            
            {isAdmin && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template);
                }}
                className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:ring-brand-600 hover:shadow-lg hover:shadow-brand-200"
                title="Editar Layout"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="py-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <Layout className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Nenhum template encontrado
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
