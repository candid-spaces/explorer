import type { InteractionFact } from '../model/interactions';

export type InteractionTransitionKind = 'enter' | 'stay' | 'leave';
export interface InteractionTransition {
  kind: InteractionTransitionKind;
  fact: InteractionFact;
}

function key(fact: InteractionFact): string {
  return [fact.state, fact.targetId, fact.streamId, fact.cursorNamespace].join('|');
}

export function interactionTransitions(
  previous: readonly InteractionFact[],
  current: readonly InteractionFact[],
): InteractionTransition[] {
  const before = new Map(previous.map((fact) => [key(fact), fact]));
  const after = new Map(current.map((fact) => [key(fact), fact]));
  return [
    ...[...after].map(([id, fact]) => ({ kind: before.has(id) ? 'stay' as const : 'enter' as const, fact })),
    ...[...before].filter(([id]) => !after.has(id)).map(([, fact]) => ({ kind: 'leave' as const, fact })),
  ];
}
