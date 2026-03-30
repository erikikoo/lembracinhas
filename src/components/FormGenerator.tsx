/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Template, UserData } from '../types';
import { extractFieldsFromTemplate } from '../lib/templateParser';

interface FormGeneratorProps {
  template: Template;
  userData: UserData;
  userFonts: { [key: string]: string };
  availableFonts: string[];
  onChange: (field: string, value: string) => void;
  onFontChange: (field: string, font: string) => void;
  onReset: () => void;
}

export const FormGenerator: React.FC<FormGeneratorProps> = ({
  template,
  userData,
  userFonts,
  availableFonts,
  onChange,
  onFontChange,
  onReset,
}) => {
  const fields = extractFieldsFromTemplate(template);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Personalize sua Arte
        </h3>
        <button
          onClick={onReset}
          className="text-[10px] font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700 transition-colors"
        >
          Resetar Campos
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {fields.map((field) => (
          <div key={field} className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor={field}
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                {field.replace(/_/g, ' ')}
              </label>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Fonte:</span>
                <select
                  value={userFonts[field] || ''}
                  onChange={(e) => onFontChange(field, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
                >
                  <option value="">Padrão</option>
                  {availableFonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                  ))}
                </select>
              </div>
            </div>

            {field === 'mensagem' || field === 'agradecimento' ? (
              <textarea
                id={field}
                value={userData[field] || ''}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={`Digite o ${field}...`}
                style={{ fontFamily: userFonts[field] || 'inherit' }}
                className="input-field min-h-[120px] resize-none"
                maxLength={200}
              />
            ) : (
              <input
                id={field}
                type="text"
                value={userData[field] || ''}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={`Digite o ${field}...`}
                style={{ fontFamily: userFonts[field] || 'inherit' }}
                className="input-field"
                maxLength={40}
              />
            )}
            <div className="flex justify-end">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                {(userData[field] || '').length} / {field === 'mensagem' || field === 'agradecimento' ? 200 : 40}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
