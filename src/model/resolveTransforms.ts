import type { DslBoxSpec } from '../dsl/types';

export function resolveNodeWorldBox(parentWorldBox: DslBoxSpec | undefined, localBox: DslBoxSpec): DslBoxSpec {
  if (!parentWorldBox) {
    return { ...localBox };
  }

  return {
    ...localBox,
    source: localBox.source,
    x: parentWorldBox.x + localBox.x,
    y: parentWorldBox.y + localBox.y,
    z: parentWorldBox.z + localBox.z,
  };
}
