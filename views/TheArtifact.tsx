import React, { useState, useMemo } from 'react';
import { PebbleData, CognitiveLevel } from '../types';
import { CognitiveSlider } from '../components/CognitiveSlider';
import { MermaidDiagram } from '../components/MermaidDiagram';
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react';

interface TheArtifactProps {
  pebble: PebbleData;
  onVerify: (pebbleId: string) => void;
  onBack: () => void;
}

export const TheArtifact: React.FC<TheArtifactProps> = ({ pebble, onVerify, onBack }) => {
  const [level, setLevel] = useState<CognitiveLevel>(CognitiveLevel.ELI5);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [isLocked, setIsLocked] = useState(pebble.isVerified);

  const content = pebble.content[level];

  // Deterministic random image based on topic hash
  const imageSeed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < pebble.topic.length; i++) {
      hash = pebble.topic.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [pebble.topic]);

  const toggleQuestion = (index: number) => {
    const newSet = new Set(completedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setCompletedQuestions(newSet);
    
    // Auto verify if all done
    if (newSet.size === pebble.socraticQuestions.length && !isLocked) {
        onVerify(pebble.id);
        setIsLocked(true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-32 fade-in">
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 z-40 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-stone-100 transition-colors"
      >
        <ArrowLeft size={24} className="text-stone-600" />
      </button>

      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img 
          src={`https://picsum.photos/seed/${imageSeed}/1200/800?grayscale&blur=2`} 
          alt="Abstract Concept" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-stone-50/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-5xl mx-auto">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-stone-500 uppercase bg-stone-100 rounded-full border border-stone-200">
            {level === CognitiveLevel.ELI5 ? 'Concept Overview' : 'Deep Analysis'}
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-stone-900 leading-tight mb-6">
            {content.title}
          </h1>
          <p className="text-lg md:text-xl font-serif text-stone-700 max-w-2xl leading-relaxed">
            {content.summary}
          </p>
        </div>
      </div>

      {/* Main Content Grid (Bento/Masonry) */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 mt-12">
        
        {/* Main Text Column */}
        <div className="md:col-span-7 space-y-12">
          {content.sections.map((section, idx) => (
            <div key={idx} className="group">
              <h2 className="text-2xl font-display font-bold text-stone-800 mb-4 group-hover:text-stone-600 transition-colors">
                {section.heading}
              </h2>
              <div className="prose prose-stone prose-lg font-serif text-stone-600 leading-loose">
                {section.body.split('\n').map((p, i) => (
                    <p key={i} className="mb-4">{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Visual & Context Column */}
        <div className="md:col-span-5 space-y-8 md:sticky md:top-8 h-fit">
          {/* Keywords */}
          <div className="flex flex-wrap gap-2">
            {content.keywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-stone-200 text-stone-700 text-sm rounded-md font-medium">
                #{kw}
              </span>
            ))}
          </div>

          {/* Diagram Card */}
          <div className="bg-white p-1 rounded-xl shadow-lg shadow-stone-200/50 border border-stone-100">
            <div className="p-3 border-b border-stone-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Structural Visualization</h3>
            </div>
            <MermaidDiagram chart={pebble.mermaidChart} />
          </div>

          {/* Socratic Validator */}
          <div className={`transition-all duration-500 rounded-xl p-6 border ${isLocked ? 'bg-green-50 border-green-200' : 'bg-stone-100 border-stone-200'}`}>
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
               {isLocked ? <CheckCircle2 className="text-green-600" /> : <Circle className="text-stone-400" />}
               Socratic Verification
            </h3>
            <p className="text-sm text-stone-500 mb-6 italic">
              "To know is to verify." — Reflect on these to internalize the concept.
            </p>
            <div className="space-y-4">
              {pebble.socraticQuestions.map((q, idx) => (
                <div 
                    key={idx} 
                    onClick={() => toggleQuestion(idx)}
                    className={`cursor-pointer p-4 rounded-lg border transition-all ${
                        completedQuestions.has(idx) || isLocked
                            ? 'bg-white border-stone-300 shadow-sm opacity-60' 
                            : 'bg-white border-stone-200 hover:border-stone-400 shadow-md'
                    }`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 min-w-[1.25rem] h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        completedQuestions.has(idx) || isLocked ? 'border-stone-800 bg-stone-800' : 'border-stone-300'
                    }`}>
                        {(completedQuestions.has(idx) || isLocked) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <p className="text-stone-800 font-medium text-sm">{q}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <CognitiveSlider level={level} onChange={setLevel} />
    </div>
  );
};
