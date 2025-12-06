import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

declare global {
  interface Window {
    mermaid: any;
  }
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({ 
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter',
        securityLevel: 'loose',
      });
    }
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!window.mermaid || !containerRef.current || !chart) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Robust cleaning strategy
        let cleanChart = chart
          // Remove potential markdown code blocks
          .replace(/```mermaid/gi, '')
          .replace(/```/g, '')
          // Decode HTML entities which often break mermaid syntax (e.g. &gt; instead of >)
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Remove "mermaid" word if it appears at the start (common model hallucination)
          .replace(/^mermaid\s*/i, '')
          .trim();

        // Ensure newline after graph/flowchart declaration
        // Matches "graph TD " and replaces with "graph TD\n" if followed by non-whitespace
        const graphDefinitionRegex = /^(graph|flowchart)\s+(TD|TB|BT|RL|LR)\s+(?!$)/i;
        if (graphDefinitionRegex.test(cleanChart)) {
           cleanChart = cleanChart.replace(graphDefinitionRegex, '$1 $2\n');
        }
        
        const { svg } = await window.mermaid.render(id, cleanChart);
        setSvg(svg);
      } catch (error) {
        console.error("Mermaid rendering failed:", error);
        // Fallback or error display
        setSvg(`<div class="text-stone-400 text-xs p-4 text-center italic">Visualization structure could not be rendered.<br/>${(error as any).message?.split('\n')[0]}</div>`);
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div 
      className="w-full flex justify-center items-center overflow-x-auto p-4 bg-white/50 rounded-lg border border-stone-200 min-h-[100px]"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};