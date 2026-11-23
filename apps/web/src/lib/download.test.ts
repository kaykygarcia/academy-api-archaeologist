import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from './download';

describe('download filename prefix', () => {
  it.each([
    ['Orders example', 'orders-example'],
    ['Requisições de pedidos', 'requisicoes-de-pedidos'],
    ['Requisições de pedidos'.normalize('NFD'), 'requisicoes-de-pedidos'],
    ['../../GET /orders/:id', 'get-orders-id'],
    ['<script>hello</script>', 'script-hello-script'],
    ['', 'api-response'],
    ['日本語', 'api-response'],
    ['---', 'api-response'],
    ['A__B  C', 'a-b-c'],
  ])('sanitizes %s', (input, output) => {
    expect(sanitizeFilename(input)).toBe(output);
  });
  it('limits the prefix to 60 safe characters without trailing separators', () => {
    const result = sanitizeFilename('A'.repeat(59) + ' / file');
    expect(result).toHaveLength(59);
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(sanitizeFilename('a'.repeat(100))).toHaveLength(60);
  });
});
