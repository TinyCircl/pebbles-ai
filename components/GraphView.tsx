import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PebbleData } from '../types';

interface GraphViewProps {
  pebbles: PebbleData[];
  onNodeClick: (pebble: PebbleData) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ pebbles, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || pebbles.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // Prepare nodes and links
    // For simplicity, we create links if topics share keywords (naive implementation)
    const nodes = pebbles.map(p => ({ ...p, radius: 20 + Math.random() * 20 })); // size varies
    const links: any[] = [];

    // Simple linkage logic: link all nodes to a central hub if few, or random linkage for visual effect
    // Real implementation would calculate semantic similarity
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
             // Create a weak link to keep them together visually
             if (Math.random() > 0.7) {
                 links.push({ source: nodes[i].id, target: nodes[j].id });
             }
        }
    }

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 10));

    const link = svg.append("g")
      .attr("stroke", "#57534e")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Glow effect
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", "#fafaf9")
      .attr("stroke", "#1c1917")
      .attr("stroke-width", 1.5)
      .style("filter", "url(#glow)")
      .style("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d as unknown as PebbleData));

    node.append("text")
      .text((d: any) => d.topic)
      .attr("x", (d: any) => d.radius + 5)
      .attr("y", 5)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "12px")
      .attr("fill", "#d6d3d1");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [pebbles]);

  return (
    <svg 
      ref={svgRef} 
      className="w-full h-full bg-stone-900"
      style={{ minHeight: '600px' }}
    />
  );
};
