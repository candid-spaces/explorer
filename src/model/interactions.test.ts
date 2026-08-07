import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from './createSpatialDocument';
import { interactionTransitions } from '../transactions/interactionTimeline';
import type { XyzDslDeclarationOrigin } from '../xyzdsl/types';

function origins(secondaryLine: number): Map<number, XyzDslDeclarationOrigin> {
  return new Map([
    [1, { sourceKind: 'baseline' }],
    [2, { sourceKind: 'baseline' }],
    [secondaryLine, { sourceKind: 'secondary', streamId: 'controller-a', transactionTime: 10 }],
  ]);
}

describe('secondary projection interactions', () => {
  it('detects probe before packing and applies inferred-direction translation without resizing', () => {
    const document = createSpatialDocument(`"Rod/+0+1/+0+5/+0+1" : "geometry: cylinder"
"Rod/+probe/+4/+0/+0" : "rotation: 90,90,0"
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const rod = document.renderNodes.find((node) => node.namespacePath === 'Rod/');
    const cursor = document.renderNodes.find((node) => node.namespacePath === 'Cursor/');

    expect(document.interactions).toMatchObject([{ state: 'probe', streamId: 'controller-a', normal: [-1, 0, 0] }]);
    expect(rod?.box).toMatchObject({ x: -4, width: 1, height: 5, depth: 1 });
    expect(rod?.transform.rotation).toEqual([Math.PI / 2, Math.PI / 2, 0]);
    expect(cursor?.box.x).toBe(1);
  });

  it('detects breach and applies a complete absolute box override', () => {
    const document = createSpatialDocument(`"Rod/+0+2/+0+2/+0+2" : "color: blue"
"Rod/+breach/+9+1/+3+4/+5+2" : "color: red"
"Cursor/+1+2/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const rod = document.renderNodes.find((node) => node.namespacePath === 'Rod/');

    expect(document.interactions?.[0].state).toBe('breach');
    expect(rod?.box).toMatchObject({ x: 9, y: 3, z: 5, width: 1, height: 4, depth: 2 });
    expect(rod?.material.color).toBe('red');
  });

  it('merges conditional texture attributes without dropping base channels or presets', () => {
    const document = createSpatialDocument(`"Rod/+0+1/+0+1/+0+1" : "texture: wood.oak; normal-texture: bump.noise"
"Rod/+probe" : "texture-repeat: 3 4"
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const material = document.renderNodes.find((node) => node.namespacePath === 'Rod/')?.material;

    expect(material?.textures?.map).toMatchObject({ preset: 'wood.oak', repeat: [3, 4] });
    expect(material?.textures?.normalMap).toMatchObject({ preset: 'bump.noise' });
  });

  it('merges a conditional channel attribute into its inherited texture specification', () => {
    const document = createSpatialDocument(`"Rod/+0+1/+0+1/+0+1" : "texture: wood.oak; normal-texture: bump.noise"
"Rod/+probe" : "normal-texture-repeat: 5 6"
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const material = document.renderNodes.find((node) => node.namespacePath === 'Rod/')?.material;

    expect(material?.textures?.map).toEqual({ preset: 'wood.oak' });
    expect(material?.textures?.normalMap).toEqual({ preset: 'bump.noise', repeat: [5, 6] });
  });

  it('retains the base geometry kind for a partial conditional geometry override', () => {
    const document = createSpatialDocument(`"Rod/+0+1/+0+5/+0+1" : "geometry: cylinder"
"Rod/+probe" : "operation: subtraction"
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const rod = document.nodes.find((node) => node.namespacePath === 'Rod/');

    expect(rod?.geometry.kind).toBe('cylinder');
    expect(rod?.geometry.operation).toBe('subtraction');
  });

  it('applies conditional content overrides to the effective node', () => {
    const document = createSpatialDocument(`"Card/+0+1/+0+1/+0+1" : "content-kind: text; content-text: Waiting"
"Card/+probe" : "content-kind: text; content-text: Active"
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: origins(3) });
    const card = document.renderNodes.find((node) => node.namespacePath === 'Card/');

    expect(card?.content).toMatchObject({ kind: 'text', text: 'Active' });
  });

  it('attributes identical cursor namespaces to independent streams without replacement', () => {
    const source = `"Rod/+0+1/+0+1/+0+1" : ""
"Cursor/+1+1/+0+1/+0+1" : ""
"Cursor/+0+1/+1+1/+0+1" : ""`;
    const map = new Map<number, XyzDslDeclarationOrigin>([
      [1, { sourceKind: 'baseline' }],
      [2, { sourceKind: 'secondary', streamId: 'alice' }],
      [3, { sourceKind: 'secondary', streamId: 'bob' }],
    ]);
    const facts = createSpatialDocument(source, { originsByLine: map }).interactions ?? [];
    expect(new Set(facts.map((fact) => fact.streamId))).toEqual(new Set(['alice', 'bob']));
  });

  it('derives enter, stay, and leave independently', () => {
    const fact = createSpatialDocument(`"Rod/+0+1/+0+1/+0+1" : ""
"Cursor/+1+1/+0+1/+0+1" : ""`, { originsByLine: new Map([
      [1, { sourceKind: 'baseline' }],
      [2, { sourceKind: 'secondary', streamId: 'controller' }],
    ]) }).interactions![0];
    expect(interactionTransitions([], [fact])[0].kind).toBe('enter');
    expect(interactionTransitions([fact], [fact])[0].kind).toBe('stay');
    expect(interactionTransitions([fact], [])[0].kind).toBe('leave');
  });

  it('does not treat edge-only contact as a probe', () => {
    const source = `"Rod/+0+1/+0+1/+0+1" : ""
"Cursor/+1+1/+1+1/+0+1" : ""`;
    const facts = createSpatialDocument(source, { originsByLine: new Map([
      [1, { sourceKind: 'baseline' }],
      [2, { sourceKind: 'secondary', streamId: 'controller' }],
    ]) }).interactions;
    expect(facts).toEqual([]);
  });
});
