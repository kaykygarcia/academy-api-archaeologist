import {
  InferenceError,
  parseSamples,
  inferContract,
  summarizeContract,
  generateTypeScript,
  generateZod,
  generateJsonSchema,
} from '@api-archaeologist/core';
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

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  const { id } = request;
  try {
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
    const contract = inferContract(parsed.values);
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
