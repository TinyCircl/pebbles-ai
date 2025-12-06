import React, { useState } from 'react';
import { PebbleData } from '../types';
import { GraphView } from '../components/GraphView';
import { ArrowLeft, Grid, Network } from 'lucide-react';

interface TheArchiveProps {
  pebbles: PebbleData[];
  onSelectPebble: (pebble: PebbleData) => void;
  onBack: () => void;
}

export const TheArchive: React.FC<TheArchiveProps> = ({ pebbles, onSelectPebble, onBack }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('graph');
  const [search, setSearch] = useState('');

  const filteredPebbles = pebbles.filter(p => 
    p.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col relative overflow-hidden fade-in">
      
      {/* Header / Toolbar */}
      <div className="absolute top-0 left-0 w-full z-20 p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Search archive..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-stone-800/50 backdrop-blur border border-stone-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-stone-500 min-w-[200px]"
          />
        </div>

        <div className="pointer-events-auto bg-stone-800 p-1 rounded-lg flex gap-1 border border-stone-700">
           <button 
             onClick={() => setViewMode('grid')}
             className={`p-2 rounded ${viewMode === 'grid' ? 'bg-stone-600' : 'hover:bg-stone-700'}`}
           >
             <Grid size={18} />
           </button>
           <button 
             onClick={() => setViewMode('graph')}
             className={`p-2 rounded ${viewMode === 'graph' ? 'bg-stone-600' : 'hover:bg-stone-700'}`}
           >
             <Network size={18} />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full h-full">
        {viewMode === 'graph' ? (
           <GraphView pebbles={filteredPebbles} onNodeClick={onSelectPebble} />
        ) : (
           <div className="p-8 pt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto h-screen pb-32">
             {filteredPebbles.map(pebble => (
               <div 
                 key={pebble.id} 
                 onClick={() => onSelectPebble(pebble)}
                 className="group relative bg-stone-800 border border-stone-700 rounded-xl overflow-hidden cursor-pointer hover:border-stone-500 transition-all hover:scale-[1.02]"
               >
                 <div className="h-48 bg-stone-700 relative overflow-hidden">
                    {/* Placeholder visual based on seed */}
                    <div className="absolute inset-0 bg-stone-600 animate-pulse opacity-20 group-hover:opacity-0 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center text-4xl font-serif text-stone-600 font-bold opacity-30 select-none">
                        {pebble.topic[0]}
                    </div>
                 </div>
                 <div className="p-5">
                   <h3 className="text-xl font-display font-bold text-stone-100 mb-2">{pebble.topic}</h3>
                   <div className="flex flex-wrap gap-2 mb-3">
                     {pebble.content.ELI5.keywords.slice(0, 2).map((k, i) => (
                       <span key={i} className="text-xs text-stone-400 bg-stone-900/50 px-2 py-1 rounded">#{k}</span>
                     ))}
                   </div>
                   <p className="text-sm text-stone-400 line-clamp-3 font-serif">
                     {pebble.content.ELI5.summary}
                   </p>
                   <div className="mt-4 flex justify-between items-center text-xs text-stone-500">
                      <span>{new Date(pebble.timestamp).toLocaleDateString()}</span>
                      {pebble.isVerified && <span className="text-green-500 font-bold">Verified</span>}
                   </div>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

    </div>
  );
};
