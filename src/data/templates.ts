/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template } from '../types';

export const templates: Template[] = [
  {
    id: 'aniversario_elegante',
    nome: 'Aniversário Elegante',
    categorias: ['Aniversário'],
    largura: 800,
    altura: 800,
    elementos: [
      {
        tipo: 'retangulo',
        left: 0,
        top: 0,
        width: 800,
        height: 800,
        fill: '#fdfbf7',
        opacity: 1
      },
      {
        tipo: 'texto',
        texto: 'FELIZ ANIVERSÁRIO',
        left: 400,
        top: 100,
        fontSize: 24,
        fontFamily: 'Georgia',
        textAlign: 'center',
        fill: '#8b7e74',
        originX: 'center',
        fontWeight: 'bold'
      },
      {
        tipo: 'texto',
        campo: 'nome',
        texto: '{{nome}}',
        left: 400,
        top: 180,
        fontSize: 64,
        fontFamily: 'Playfair Display',
        textAlign: 'center',
        fill: '#5a5a40',
        originX: 'center',
        fontWeight: 'bold'
      },
      {
        tipo: 'texto',
        campo: 'idade',
        texto: '{{idade}}',
        left: 400,
        top: 240,
        fontSize: 24,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#8b7e74',
        originX: 'center'
      },
      {
        tipo: 'texto',
        campo: 'data',
        texto: '{{data}}',
        left: 400,
        top: 280,
        fontSize: 18,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#8b7e74',
        originX: 'center'
      },
      {
        tipo: 'texto',
        campo: 'mensagem',
        texto: '{{mensagem}}',
        left: 400,
        top: 400,
        fontSize: 24,
        width: 600,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#333',
        originX: 'center',
        fontStyle: 'italic'
      },
      {
        tipo: 'texto',
        texto: 'Com carinho,',
        left: 400,
        top: 650,
        fontSize: 16,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#8b7e74',
        originX: 'center'
      },
      {
        tipo: 'texto',
        campo: 'remetente',
        texto: '{{remetente}}',
        left: 400,
        top: 680,
        fontSize: 20,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#5a5a40',
        originX: 'center',
        fontWeight: 'bold'
      }
    ]
  },
  {
    id: 'lembranca_casamento',
    nome: 'Lembrança de Casamento',
    categorias: ['Casamento'],
    largura: 800,
    altura: 800,
    elementos: [
      {
        tipo: 'retangulo',
        left: 0,
        top: 0,
        width: 800,
        height: 800,
        fill: '#fff',
        opacity: 1
      },
      {
        tipo: 'texto',
        campo: 'noivos',
        texto: '{{noivos}}',
        left: 400,
        top: 250,
        fontSize: 50,
        fontFamily: 'Cormorant Garamond',
        textAlign: 'center',
        fill: '#1a1a1a',
        originX: 'center',
        fontStyle: 'italic'
      },
      {
        tipo: 'texto',
        texto: '&',
        left: 400,
        top: 310,
        fontSize: 30,
        fontFamily: 'Cormorant Garamond',
        textAlign: 'center',
        fill: '#1a1a1a',
        originX: 'center'
      },
      {
        tipo: 'texto',
        campo: 'data_casamento',
        texto: '{{data_casamento}}',
        left: 400,
        top: 450,
        fontSize: 18,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#666',
        originX: 'center'
      },
      {
        tipo: 'texto',
        campo: 'agradecimento',
        texto: '{{agradecimento}}',
        left: 400,
        top: 550,
        fontSize: 20,
        width: 500,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#333',
        originX: 'center'
      }
    ]
  },
  {
    id: 'magali_melancia',
    nome: 'Magali Melancia',
    categorias: ['Infantil'],
    largura: 600,
    altura: 600,
    elementos: [
      {
        tipo: 'imagem',
        src: 'https://picsum.photos/seed/watermelon/600/600', // Placeholder
        left: 0,
        top: 0,
        width: 600,
        height: 600
      },
      {
        tipo: 'texto',
        campo: 'nome',
        texto: '{{nome}}',
        left: 300,
        top: 240,
        fontSize: 40,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#ffffff',
        originX: 'center',
        fontWeight: 'bold'
      },
      {
        tipo: 'texto',
        campo: 'idade',
        texto: '{{idade}}',
        left: 300,
        top: 290,
        fontSize: 30,
        fontFamily: 'Inter',
        textAlign: 'center',
        fill: '#ffffff',
        originX: 'center',
        fontWeight: 'bold'
      }
    ]
  }
];
