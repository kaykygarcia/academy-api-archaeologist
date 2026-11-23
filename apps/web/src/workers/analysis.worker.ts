import {
  InferenceError,
  parseSamples,
  inferContract,
  summarizeContract,
  generateTypeScript,
  generateZod,
  generateJsonSchema,
  compareContracts,
  alignContracts,
} from '@api-archaeologist/core';
import type { InferredContract } from '@api-archaeologist/core';
import type { Request, Response } from '../lib/analysis-protocol';

function locationSuffix(error: { line?: number; column?: number }): string {
  if (error.line === undefined) return '';
  const column =
    error.column === undefined ? '' : `, coluna ${String(error.column)}`;
  return ` (linha ${String(error.line)}${column})`;
}

function send(response: Response) {
  postMessage(response);
}

function generate(id: number, contract: InferredContract) {
  send({ id, phase: 'generating' });
  send({
    id,
    result: {
      contract,
      summary: summarizeContract(contract),
      typescript: generateTypeScript(contract),
      zod: generateZod(contract),
      jsonSchema: generateJsonSchema(contract),
    },
  });
}

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  const { id } = request;
  try {
    if (request.type === 'compare') {
      const changes = compareContracts(request.baseline, request.current);
      send({
        id,
        changes,
        rows: alignContracts(request.baseline, request.current, changes),
      });
    } else if (request.type === 'open') {
      generate(id, request.contract);
    } else {
      send({ id, phase: 'parsing' });
      const parsed = parseSamples(request.samples);
      if (!parsed.ok) {
        send({
          id,
          validation: true,
          errors: parsed.errors.map(
            (error) => error.message + locationSuffix(error),
          ),
        });
        return;
      }
      send({ id, phase: 'inferring' });
      generate(id, inferContract(parsed.values));
    }
  } catch (error) {
    // Engine failures can include sample-derived text; keep unexpected failures private.
    send({
      id,
      errors: [
        error instanceof InferenceError
          ? error.message
          : 'Não foi possível concluir a análise. Verifique os dados de entrada e os limites aceitos e tente novamente.',
      ],
    });
  }
};
