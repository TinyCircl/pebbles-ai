import React, { useState } from 'react';
import { ArrowRight, Library } from 'lucide-react';

interface TheDropProps {
  onConstruct: (topic: string) => void;
  onGoToArchive: () => void;
}

export const TheDrop: React.FC<TheDropProps> = ({ onConstruct, onGoToArchive }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onConstruct(topic);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 relative overflow-hidden fade-in">
      {/* Texture overlay could go here */}
      
      <form onSubmit={handleSubmit} className="w-full max-w-2xl px-8 z-10">
        <div className="relative group">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Cast a pebble..."
            className="w-full bg-transparent border-b-2 border-stone-200 text-3xl md:text-5xl font-display font-light py-4 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-800 transition-all duration-500 text-center"
            autoFocus
          />
          <button 
            type="submit"
            className={`absolute right-0 top-1/2 -translate-y-1/2 text-stone-800 opacity-0 transition-opacity duration-300 ${topic ? 'opacity-100' : ''}`}
          >
            <ArrowRight size={32} strokeWidth={1.5} />
          </button>
        </div>
      </form>

      <div className="absolute bottom-8 right-8">
        <button 
          onClick={onGoToArchive}
          className="p-3 text-stone-400 hover:text-stone-800 transition-colors duration-300 flex items-center gap-2"
        >
          <span className="text-sm font-medium">Archive</span>
          <Library size={20} />
        </button>
      </div>
    </div>
  );
};
