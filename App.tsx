import React, { useState } from 'react';
import { ViewState, PebbleData } from './types';
import { TheDrop } from './views/TheDrop';
import { TheConstruct } from './views/TheConstruct';
import { TheArtifact } from './views/TheArtifact';
import { TheArchive } from './views/TheArchive';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DROP);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [activePebble, setActivePebble] = useState<PebbleData | null>(null);
  const [archive, setArchive] = useState<PebbleData[]>([]);

  // Transition: Drop -> Construct
  const handleConstruct = (topic: string) => {
    setCurrentTopic(topic);
    setViewState(ViewState.CONSTRUCT);
  };

  // Transition: Construct -> Artifact (Completion)
  const handleGenerationComplete = (pebble: PebbleData) => {
    setActivePebble(pebble);
    setArchive(prev => {
        // Simple duplicate check based on topic name for this demo
        const exists = prev.find(p => p.topic.toLowerCase() === pebble.topic.toLowerCase());
        return exists ? prev : [pebble, ...prev];
    });
    setViewState(ViewState.ARTIFACT);
  };

  // Error handling in Construct
  const handleGenerationError = (error: string) => {
    alert(error);
    setViewState(ViewState.DROP);
  };

  // Mark as verified in archive
  const handleVerify = (pebbleId: string) => {
    setArchive(prev => prev.map(p => 
        p.id === pebbleId ? { ...p, isVerified: true } : p
    ));
    if (activePebble && activePebble.id === pebbleId) {
        setActivePebble(prev => prev ? { ...prev, isVerified: true } : null);
    }
  };

  // Navigation handlers
  const goToArchive = () => setViewState(ViewState.ARCHIVE);
  const goToDrop = () => {
      setViewState(ViewState.DROP);
      setActivePebble(null);
  };

  const handleSelectFromArchive = (pebble: PebbleData) => {
      setActivePebble(pebble);
      setViewState(ViewState.ARTIFACT);
  };

  return (
    <main className="w-full min-h-screen font-sans">
      {viewState === ViewState.DROP && (
        <TheDrop 
            onConstruct={handleConstruct} 
            onGoToArchive={goToArchive}
        />
      )}

      {viewState === ViewState.CONSTRUCT && (
        <TheConstruct 
            topic={currentTopic}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
        />
      )}

      {viewState === ViewState.ARTIFACT && activePebble && (
        <TheArtifact 
            pebble={activePebble} 
            onVerify={handleVerify}
            onBack={goToDrop}
        />
      )}

      {viewState === ViewState.ARCHIVE && (
        <TheArchive 
            pebbles={archive}
            onSelectPebble={handleSelectFromArchive}
            onBack={goToDrop}
        />
      )}
    </main>
  );
};

export default App;
