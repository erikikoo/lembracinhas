/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fabric from 'fabric';
import { Template, TemplateElement, UserData } from '../types';
import { replacePlaceholders } from './templateParser';

/**
 * Renderiza um elemento do template no canvas do Fabric.js.
 */
export async function renderElement(
  canvas: fabric.Canvas,
  element: TemplateElement,
  userData: UserData,
  userFonts?: { [key: string]: string }
): Promise<fabric.FabricObject | null> {
  let obj: fabric.FabricObject | null = null;

  switch (element.tipo) {
    case 'retangulo':
      obj = new fabric.Rect({
        left: element.left,
        top: element.top,
        width: element.width,
        height: element.height,
        fill: element.fill || '#fff',
        opacity: element.opacity ?? 1,
        selectable: false,
        evented: false,
      });
      break;

    case 'texto':
      const content = element.texto ? replacePlaceholders(element.texto, userData) : '';
      
      // A largura (width) define a "área determinada" para o texto
      const textWidth = element.width || 300;

      // Se o elemento tiver um campo associado e houver uma fonte customizada para ele
      const fieldName = element.campo;
      const customFont = fieldName && userFonts ? userFonts[fieldName] : null;

      const text = new fabric.Textbox(content, {
        left: element.left,
        top: element.top,
        fontSize: element.fontSize || 20,
        fontFamily: customFont || element.fontFamily || 'Inter',
        textAlign: element.textAlign || 'left',
        fill: element.fill || '#000',
        width: textWidth,
        originX: element.originX || 'left',
        originY: element.originY || 'top',
        fontWeight: String(element.fontWeight || 'normal'),
        fontStyle: String(element.fontStyle || 'normal') as any,
        opacity: element.opacity ?? 1,
        angle: element.angle || 0,
        selectable: false,
        evented: false,
        // splitByGrapheme: false garante que as palavras sejam movidas inteiras para a próxima linha
        splitByGrapheme: false,
      });

      // Lógica de auto-ajuste removida a pedido do usuário: 
      // "se o nome for composto não deve reduzir o tamanho e sim colocar um abaixo do outro"
      
      obj = text;
      break;

    case 'imagem':
      if (element.src) {
        try {
          const img = await fabric.FabricImage.fromURL(element.src, {
            crossOrigin: 'anonymous',
          });

          // Calcula a escala necessária para atingir a largura/altura salva no template
          // Fabric v6: getOriginalSize() retorna as dimensões reais da imagem
          const originalSize = img.getOriginalSize();
          const scaleX = element.width ? element.width / originalSize.width : 1;
          const scaleY = element.height ? element.height / originalSize.height : 1;

          img.set({
            left: element.left,
            top: element.top,
            scaleX: scaleX,
            scaleY: scaleY,
            originX: element.originX || 'left',
            originY: element.originY || 'top',
            selectable: false,
            evented: false,
          });
          obj = img;
        } catch (err) {
          console.error('Erro ao carregar imagem:', err);
        }
      }
      break;
  }

  if (obj) {
    canvas.add(obj);
  }

  return obj;
}

/**
 * Limpa e renderiza todo o template no canvas.
 */
export async function renderTemplate(
  canvas: fabric.Canvas,
  template: Template,
  userData: UserData,
  userFonts?: { [key: string]: string }
) {
  // Garantir que as fontes estejam prontas antes de renderizar
  if (document.fonts) {
    await document.fonts.ready;
  }

  canvas.clear();
  
  // Resetar dimensões e cor de fundo
  canvas.setDimensions({
    width: template.largura,
    height: template.altura,
  });
  
  // Fabric v6 clear() remove o background, então precisamos setar novamente se necessário
  // Mas aqui os templates já têm um 'retangulo' de fundo, o que é mais seguro.

  // Renderiza elementos em ordem
  for (const el of template.elementos) {
    await renderElement(canvas, el, userData, userFonts);
  }

  canvas.requestRenderAll();
}
