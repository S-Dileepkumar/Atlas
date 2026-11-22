export type StackStratumId =
  | 'silicon-physics'
  | 'gates-rtl'
  | 'cpu-memory'
  | 'software-os'
  | 'protocols-classical'
  | 'pqc-agility';

export interface StackStratum {
  id: StackStratumId;
  order: number;
  label: string;
  subtitle: string;
  chapterIds: string[];
  hardwareBoundary: string;
}

export interface CryptoAtlasLink {
  label: string;
  kind: 'protocol' | 'ip' | 'view';
  targetId: string;
}

export interface CryptoSubtopic {
  id: string;
  title: string;
  summary: string;
  mechanics: string;
  siliconAndRtlLink: string;
  attackAndDefense: string;
  codeSnippet?: {
    title: string;
    language: string;
    code: string;
  };
  atlasLinks?: CryptoAtlasLink[];
}

export interface CryptoChapter {
  id: string;
  number: number;
  title: string;
  stratumId: StackStratumId;
  stackLayerLabel: string;
  vlsiPerspective: string;
  keyTakeaway: string;
  subtopics: CryptoSubtopic[];
}

export interface MasteryStage {
  id: string;
  stageNumber: number;
  title: string;
  focus: string;
  chapterIds: string[];
  deliverables: string[];
  recommendedLab: string;
}
