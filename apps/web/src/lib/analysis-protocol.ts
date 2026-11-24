import type {
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

export type Job = { type: 'analyze'; samples: SampleInput[] };

export type Request = Job & { id: number };

export type Response = { id: number } & (
  | { phase: 'parsing' | 'inferring' | 'generating' }
  | { result: AnalysisResult }
  | { errors: string[]; validation?: boolean }
);
