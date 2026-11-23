import type {
  ContractChange,
  AlignedRow,
  ContractSummary,
  InferredContract,
  SampleInput,
} from '@api-archaeologist/core';

export type AnalysisResult = {
  contract: InferredContract;
  summary: ContractSummary;
  typescript: string;
  zod: string;
  jsonSchema: string;
};

export type Job =
  | { type: 'analyze'; samples: SampleInput[] }
  | { type: 'open'; contract: InferredContract }
  | { type: 'compare'; baseline: InferredContract; current: InferredContract };

export type Request = Job & { id: number };

export type Response = { id: number } & (
  | { phase: 'parsing' | 'inferring' | 'generating' }
  | { result: AnalysisResult }
  | { changes: ContractChange[]; rows: AlignedRow[] }
  | { errors: string[]; validation?: boolean }
);
