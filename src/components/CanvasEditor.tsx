/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Template, UserData } from '../types';
import { renderTemplate } from '../lib/canvasRenderer';
import { jsPDF } from 'jspdf';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';

interface CanvasEditorProps {
  template: Template;
  userData: UserData;
  userFonts: { [key: string]: string };
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  template,
  userData,
  userFonts,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Inicializa o canvas do Fabric.js
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: template.largura,
        height: template.altura,
        backgroundColor: '#f0f0f0',
        selection: false,
      });

      setFabricCanvas(canvas);

      return () => {
        canvas.dispose();
      };
    } catch (err) {
      console.error('Erro ao inicializar canvas do editor:', err);
    }
  }, [template.id]); // Re-inicializa se o template mudar

  // Atualiza o canvas quando o template ou dados mudam
  useEffect(() => {
    if (!fabricCanvas) return;

    let isMounted = true;
    const renderId = Math.random();
    (fabricCanvas as any).lastRenderId = renderId;

    const updateCanvas = async () => {
      setIsRendering(true);
      try {
        // Aguarda um pequeno frame para debugar renderizações rápidas (digitação)
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Se uma nova renderização começou, cancela esta
        if (!isMounted || (fabricCanvas as any).lastRenderId !== renderId) return;

        await renderTemplate(fabricCanvas, template, userData, userFonts);
      } catch (err) {
        console.error('Erro ao renderizar template:', err);
      } finally {
        if (isMounted && (fabricCanvas as any).lastRenderId === renderId) {
          setIsRendering(false);
        }
      }
    };

    updateCanvas();

    return () => {
      isMounted = false;
    };
  }, [fabricCanvas, template, userData, userFonts]);

  // Exporta como PNG
  const exportAsPNG = () => {
    try {
      if (!fabricCanvas) return;
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `arte-personalizada-${template.id}.png`;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  // Exporta como PDF
  const exportAsPDF = () => {
    try {
      if (!fabricCanvas) return;
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      const pdf = new jsPDF({
        orientation: template.largura > template.altura ? 'landscape' : 'portrait',
        unit: 'px',
        format: [template.largura, template.altura],
      });
      pdf.addImage(dataURL, 'PNG', 0, 0, template.largura, template.altura);
      pdf.save(`arte-personalizada-${template.id}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="glass-card overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Visualização em Tempo Real</span>
          </div>
          {isRendering && (
            <div className="flex items-center gap-2 text-brand-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Renderizando...</span>
            </div>
          )}
        </div>
        
        <div 
          key={template.id}
          className="relative max-h-[70vh] max-w-full overflow-auto p-8 bg-slate-100/30 custom-scrollbar"
        >
          <div className="relative shadow-2xl shadow-slate-300/50 rounded-lg overflow-hidden bg-white">
            <canvas ref={canvasRef} className="mx-auto" />
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-md items-center justify-center gap-4">
        <button
          onClick={exportAsPNG}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-600 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <FileImage className="h-4 w-4 text-brand-500" />
          PNG
        </button>
        <button
          onClick={exportAsPDF}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-brand-200 transition-all hover:bg-brand-700 active:scale-[0.98]"
        >
          <FileText className="h-4 w-4" />
          PDF
        </button>
      </div>
    </div>
  );
};
