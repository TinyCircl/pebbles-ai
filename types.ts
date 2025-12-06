export enum ViewState {
  DROP = 'DROP',
  CONSTRUCT = 'CONSTRUCT',
  ARTIFACT = 'ARTIFACT',
  ARCHIVE = 'ARCHIVE',
}

export enum CognitiveLevel {
  ELI5 = 'ELI5', // Simple, metaphorical
  ACADEMIC = 'ACADEMIC', // Deep, technical
}

export interface ContentSection {
  heading: string;
  body: string;
}

export interface CognitiveContent {
  title: string;
  summary: string;
  sections: ContentSection[];
  keywords: string[];
}

export interface PebbleData {
  id: string;
  topic: string;
  timestamp: number;
  content: {
    [CognitiveLevel.ELI5]: CognitiveContent;
    [CognitiveLevel.ACADEMIC]: CognitiveContent;
  };
  mermaidChart: string;
  socraticQuestions: string[];
  isVerified: boolean;
}

export interface LogEntry {
  message: string;
  timestamp: number;
}
