import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from './createSpatialDocument';

describe('createSpatialDocument', () => {
  it('builds a hierarchy and resolves child boxes in parent-local space', () => {
    const document = createSpatialDocument(`-"Table/+3+8/+0+5/+0+8": "color: 0x333333; metalness: 0.8; roughness: 0.2"
--"Table/Top/+1+6/+0+5/+0+6": ""`);

    const table = document.nodes[0];
    const top = table.children?.[0];

    expect(table.namespacePath).toBe('Table');
    expect(top?.namespacePath).toBe('Table/Top');
    expect(top?.localBox.x).toBe(1);
    expect(top?.worldBox).toMatchObject({ x: 4, y: 0, z: 0, width: 6, height: 5, depth: 6 });
  });

  it('inherits empty child styles from parent materials', () => {
    const document = createSpatialDocument(`-"Table/+3+8/+0+5/+0+8": "color: 0x333333; metalness: 0.8; roughness: 0.2"
--"Table/Top/+1+6/+0+5/+0+6": "roughness: 0.4"`);

    const top = document.nodes[0].children?.[0];

    expect(top?.resolvedMaterial).toMatchObject({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
  });

  it('resolves references by namespace', () => {
    const document = createSpatialDocument(`-"Sofa/+7+4/+0+3/+0+2": "color: blue;"
-"Referential/+3+5/+0+3/+0+15": "ref: Sofa/;"`);

    const sofa = document.namespaceIndex.get('Sofa');
    const ref = document.namespaceIndex.get('Referential');

    expect(ref?.refTargetId).toBe(sofa?.id);
    expect(document.diagnostics).toHaveLength(0);
  });

  it('emits diagnostics for duplicate namespaces and missing refs', () => {
    const document = createSpatialDocument(`-"Sofa/+7+4/+0+3/+0+2": ""
-"Sofa/+1+1/+0+1/+0+1": ""
-"Referential/+3+5/+0+3/+0+15": "ref: Missing/;"`);

    expect(document.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
      expect.arrayContaining([
        'Duplicate namespace path "Sofa". References will resolve to the first declaration.',
        'Reference target "Missing" was not found.',
      ]),
    );
  });
});
