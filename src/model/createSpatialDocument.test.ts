import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from './createSpatialDocument';

describe('createSpatialDocument namespaced DSL', () => {
  it('resolves namespace inheritance and renders composed children in parent-local space', () => {
    const document = createSpatialDocument(`"Table/+3+8/+0+5/+0+8" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
"Table/Top/+1+6/+0+5/+0+6" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+1+2/+0+7/+0+1" : ""`);

    expect(document.diagnostics).toEqual([]);
    expect(document.nodes).toHaveLength(1);
    expect(document.nodes[0].renderable).toBe(false);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.renderNodes[0].material.color).toBe(0x333333);
    expect(document.renderNodes[0].transform.position).toEqual([7, 2.5, 3]);
    expect(document.renderNodes[1].geometry.kind).toBe('cylinder');
    expect(document.renderNodes[1].transform.position).toEqual([5, 3.5, 0.5]);
  });

  it('rotates composed descendants as a single parent group without double-applying parent rotation', () => {
    const document = createSpatialDocument(`"Table/+3+8/+0+5/+4+8" : "rotation: 0,90,0; color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(3);
    expect(document.renderNodes[0].transform.position[0]).toBeCloseTo(7);
    expect(document.renderNodes[0].transform.position[1]).toBeCloseTo(4.5);
    expect(document.renderNodes[0].transform.position[2]).toBeCloseTo(0);
    expect(document.renderNodes[0].transform.rotation[1]).toBeCloseTo(Math.PI / 2);
    expect(document.renderNodes[1].transform.position[0]).toBeCloseTo(3.5);
    expect(document.renderNodes[1].transform.position[2]).toBeCloseTo(3.5);
    expect(document.renderNodes[2].transform.position[0]).toBeCloseTo(10.5);
    expect(document.renderNodes[2].transform.position[2]).toBeCloseTo(-3.5);
  });

  it('does not leak local overrides between sibling instances in the same namespace', () => {
    const document = createSpatialDocument(`"Table/+0+4/+0+4/+0+4" : "color: grey"
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+1/+0+1" : "color: red"
"Table/Leg/+2+1/+0+1/+0+1" : ""`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes[0].material.color).toBe('red');
    expect(document.renderNodes[1].material.color).toBe('grey');
  });

  it('resolves refs against prior named objects and applies the local instance box', () => {
    const document = createSpatialDocument(`"Sofa/+7+4/+0+3/+0+2" : "color: brown; metalness: 0.2; roughness: 0.8"
"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.renderNodes[1].material.color).toBe('brown');
    expect(document.renderNodes[1].material.metalness).toBe(0.2);
    expect(document.renderNodes[1].transform.position).toEqual([5.5, 1.5, 7.5]);
  });

  it('reports unresolved references', () => {
    const document = createSpatialDocument('"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"');

    expect(document.diagnostics[0].message).toBe('Reference target "Sofa/" was not found.');
  });
});
