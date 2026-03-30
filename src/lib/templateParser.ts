/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template, UserData } from '../types';

/**
 * Extrai todos os campos dinâmicos ({{campo}}) de um template.
 */
export function extractFieldsFromTemplate(template: Template): string[] {
  const fields = new Set<string>();
  const regex = /\{\{(.*?)\}\}/g;

  template.elementos.forEach(el => {
    if (el.texto) {
      let match;
      while ((match = regex.exec(el.texto)) !== null) {
        fields.add(match[1].trim());
      }
    }
  });

  return Array.from(fields);
}

/**
 * Substitui os placeholders {{campo}} pelos valores reais fornecidos pelo usuário.
 */
export function replacePlaceholders(text: string, data: UserData): string {
  const regex = /\{\{(.*?)\}\}/g;
  return text.replace(regex, (match, field) => {
    const fieldName = field.trim();
    // Se o campo estiver em branco ou não existir, retorna vazio em vez de mostrar o placeholder
    return data[fieldName] || '';
  });
}
