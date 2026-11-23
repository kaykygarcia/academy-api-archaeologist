import type { AnalysisResult } from './analysis-protocol';

export type Metadata = {
  dataset: string;
  method: string;
  endpoint: string;
  opened: boolean;
  snapshotId?: string;
};

export type Result = AnalysisResult & { metadata: Metadata; revision: number };
