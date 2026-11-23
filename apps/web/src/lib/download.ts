export function sanitizeFilename(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'api-response'
  );
}

export function downloadCode(name: string, extension: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], {
      type: extension.endsWith('json')
        ? 'application/json'
        : 'text/plain;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(name)}${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
