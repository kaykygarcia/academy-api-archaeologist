import type { ChangeCode, ChangeSeverity } from './types';

const changeLabels: Record<ChangeCode, string> = {
  'property-added': 'Adicionado',
  'property-not-observed': 'Não observado',
  'type-changed': 'Tipo alterado',
  'type-expanded': 'Tipo ampliado',
  'type-narrowed': 'Tipo restringido',
  'became-nullable': 'Passou a aceitar null',
  'null-not-observed': 'Null não observado',
  'presence-reduced': 'Presença reduzida',
  'presence-increased': 'Presença aumentada',
  'elements-not-observed': 'Elementos não observados',
  'elements-observed': 'Elementos observados',
};

export function changeLabel(code: ChangeCode): string {
  return changeLabels[code];
}

export function severityLabel(severity: ChangeSeverity): string {
  switch (severity) {
    case 'potentially-breaking':
      return 'Potencialmente incompatível';
    case 'review':
      return 'Revisar';
    case 'informational':
      return 'Informativo';
  }
}
