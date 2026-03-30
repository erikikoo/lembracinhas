/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ElementType = 'texto' | 'imagem' | 'retangulo';

export interface TemplateElement {
  tipo: ElementType;
  campo?: string; // Se for dinâmico, o nome do campo (ex: 'nome')
  texto?: string; // Conteúdo do texto (pode conter {{campo}})
  left: number;
  top: number;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  fill?: string;
  width?: number;
  height?: number;
  src?: string; // Para imagens
  opacity?: number;
  originX?: 'left' | 'center' | 'right';
  originY?: 'top' | 'center' | 'bottom';
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  angle?: number;
}

export interface Template {
  id: string;
  nome: string;
  categorias?: string[];
  largura: number;
  altura: number;
  elementos: TemplateElement[];
  thumbnail?: string;
}

export interface UserData {
  [key: string]: string;
}
