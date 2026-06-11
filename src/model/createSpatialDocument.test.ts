import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from './createSpatialDocument';

describe('createSpatialDocument namespaced DSL', () => {
  it('resolves namespace inheritance and renders composed children in parent-local space', () => {
    const document =
      createSpatialDocument(`"Table/+3+8/+0+5/+0+8" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
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
    const document =
      createSpatialDocument(`"Table/+3+8/+0+5/+4+8" : "rotation: 0,90,0; color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(3);
    expect(document.renderNodes[0].transform.position[0]).toBeCloseTo(7);
    expect(document.renderNodes[0].transform.position[1]).toBeCloseTo(4.5);
    expect(document.renderNodes[0].transform.position[2]).toBeCloseTo(0);
    expect(document.renderNodes[0].transform.rotation[1]).toBeCloseTo(
      Math.PI / 2,
    );
    expect(document.renderNodes[1].transform.position[0]).toBeCloseTo(3.5);
    expect(document.renderNodes[1].transform.position[2]).toBeCloseTo(3.5);
    expect(document.renderNodes[2].transform.position[0]).toBeCloseTo(10.5);
    expect(document.renderNodes[2].transform.position[2]).toBeCloseTo(-3.5);
  });

  it('does not leak local overrides between sibling instances in the same namespace', () => {
    const document =
      createSpatialDocument(`"Table/+0+4/+0+4/+0+4" : "color: grey"
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+1/+0+1" : "color: red"
"Table/Leg/+2+1/+0+1/+0+1" : ""`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes[0].material.color).toBe('red');
    expect(document.renderNodes[1].material.color).toBe('grey');
  });

  it('resolves refs against prior named objects and applies the local instance box', () => {
    const document =
      createSpatialDocument(`"Sofa/+7+4/+0+3/+0+2" : "color: brown; metalness: 0.2; roughness: 0.8"
"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.renderNodes[1].material.color).toBe('brown');
    expect(document.renderNodes[1].material.metalness).toBe(0.2);
    expect(document.renderNodes[1].transform.position).toEqual([5.5, 1.5, 7.5]);
  });

  it('inherits box-radius through namespaces and refs', () => {
    const document =
      createSpatialDocument(`"Cabinet/" : "box-radius: 0.2; color: orange"
"Cabinet/+0+4/+0+2/+0+3" : ""
"Copy/+6+4/+0+2/+0+3" : "ref: Cabinet/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.renderNodes[0].geometry.kind).toBe('box');
    expect(document.renderNodes[0].geometry['box-radius']).toBe(0.2);
    expect(document.renderNodes[1].geometry.kind).toBe('box');
    expect(document.renderNodes[1].geometry['box-radius']).toBe(0.2);
  });

  it('allows child boxes to override inherited box-radius with zero', () => {
    const document =
      createSpatialDocument(`"Cabinet/" : "box-radius: 0.2; color: orange"
"Cabinet/+0+4/+0+2/+0+3" : "box-radius: 0"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(1);
    expect(document.renderNodes[0].geometry['box-radius']).toBe(0);
  });

  it('keeps unanchored nested coordinates definition-only while refs inherit their namespace properties', () => {
    const document =
      createSpatialDocument(`"Sofa/Cushion/" : "color: 0xf5f3ef; fabric: 3; sheen: 4; clearcoat: 1; bump: 2; puff: 5"
"Sofa/Cushion/+0+4/+0+1/+0+3" : "sheen: 2"
"Copy/+6+4/+0+1/+0+3" : "ref: Sofa/Cushion/; bump: 1"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(1);

    const definition = document.nodes.find(
      (node) => node.namespacePath === 'Sofa/Cushion/',
    );
    const copy = document.renderNodes.find(
      (node) => node.namespacePath === 'Copy/',
    );

    expect(definition?.renderable).toBe(false);
    expect(copy?.material.color).toBe(0xf5f3ef);
    expect(copy?.material.fabric).toBe(3);
    expect(copy?.material.sheen).toBe(4);
    expect(copy?.material.clearcoat).toBe(1);
    expect(copy?.material.bump).toBe(1);
    expect(copy?.geometry.puff).toBe(5);
  });

  it('does not render nested local definitions without a concrete namespace anchor', () => {
    const document =
      createSpatialDocument(`"Sofa/" : "color: 0x2d3f4f; roughness: 0.92; box-radius: 0.16"
"Sofa/Base/+0+6/+0+40c/+0+3" : "box-radius: 0.1"
"Sofa/Back/+0+6/+44c+180c/+0+50c" : "box-radius: 0.18; rotation: -3.4,0,0"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(0);
    expect(document.nodes).toHaveLength(2);
    expect(document.nodes.every((node) => node.renderable === false)).toBe(
      true,
    );
  });

  it('renders nested local definitions when their namespace has a concrete world-space anchor', () => {
    const document =
      createSpatialDocument(`"Sofa/" : "color: 0x2d3f4f; roughness: 0.92; box-radius: 0.16"
"Sofa/+10+6/+0+2/+0+3" : ""
"Sofa/Base/+0+6/+0+40c/+0+3" : "box-radius: 0.1"
"Sofa/Back/+0+6/+44c+180c/+0+50c" : "box-radius: 0.18; rotation: -3.4,0,0"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.nodes).toHaveLength(1);
    expect(document.nodes[0].renderable).toBe(false);
    expect(document.renderNodes[0].transform.position).toEqual([13, 0.2, 1.5]);
    expect(document.renderNodes[1].transform.position[0]).toBeCloseTo(13);
    expect(document.renderNodes[1].transform.position[1]).toBeCloseTo(1.34);
    expect(document.renderNodes[1].transform.position[2]).toBeCloseTo(0.25);
  });

  it('materializes referenced template descendants at the referring instance anchor', () => {
    const document =
      createSpatialDocument(`"Sofa/" : "color: 0x2d3f4f; roughness: 0.92; box-radius: 0.16"
"Sofa/Base/+0+6/+0+40c/+0+3" : "box-radius: 0.1"
"Sofa/Back/+0+6/+44c+180c/+0+50c" : "box-radius: 0.18; rotation: -3.4,0,0"
"Seat/+10+6/+0+2/+0+3" : "ref: Sofa/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.nodes).toHaveLength(3);

    const seat = document.nodes.find((node) => node.namespacePath === 'Seat/');
    const base = document.renderNodes.find(
      (node) => node.namespacePath === 'Seat/Base/',
    );
    const back = document.renderNodes.find(
      (node) => node.namespacePath === 'Seat/Back/',
    );

    expect(seat?.renderable).toBe(false);
    expect(base?.material.color).toBe(0x2d3f4f);
    expect(base?.geometry['box-radius']).toBe(0.1);
    expect(base?.transform.position).toEqual([13, 0.2, 1.5]);
    expect(back?.geometry['box-radius']).toBe(0.18);
    expect(back?.transform.position[0]).toBeCloseTo(13);
    expect(back?.transform.position[1]).toBeCloseTo(1.34);
    expect(back?.transform.position[2]).toBeCloseTo(0.25);
  });

  it('scales referenced template descendants when ref-scale is true', () => {
    const document = createSpatialDocument(`"Panel/" : "color: blue"
"Panel/Part/+0+4/+0+2/+0+2" : ""
"Copy/+10+8/+0+4/+0+1" : "ref: Panel/; ref-scale: true"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(1);

    const copy = document.nodes.find((node) => node.namespacePath === 'Copy/');
    const part = document.renderNodes[0];

    expect(copy?.metadata?.anchorScale).toEqual([2, 2, 0.5]);
    expect(part.namespacePath).toBe('Copy/Part/');
    expect(part.transform.position).toEqual([14, 2, 0.5]);
    expect(part.transform.scale).toEqual([8, 4, 1]);
  });

  it('keeps repeated template ref materializations distinct', () => {
    const document = createSpatialDocument(`"Sofa/" : "color: brown"
"Sofa/Base/+0+6/+0+40c/+0+3" : ""
"SeatA/+0+6/+0+2/+0+3" : "ref: Sofa/"
"SeatB/+10+6/+0+2/+0+3" : "ref: Sofa/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(new Set(document.renderNodes.map((node) => node.id)).size).toBe(2);
    expect(document.renderNodes[0].namespacePath).toBe('SeatA/Base/');
    expect(document.renderNodes[1].namespacePath).toBe('SeatB/Base/');
    expect(document.renderNodes[0].transform.position).toEqual([3, 0.2, 1.5]);
    expect(document.renderNodes[1].transform.position).toEqual([13, 0.2, 1.5]);
  });

  it('allows puff-only child geometry declarations without dropping inherited box-radius', () => {
    const document =
      createSpatialDocument(`"Cushion/" : "box-radius: 0.1; puff: 2"
"Cushion/+0+4/+0+1/+0+3" : "puff: 5"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(1);
    expect(document.renderNodes[0].geometry['box-radius']).toBe(0.1);
    expect(document.renderNodes[0].geometry.puff).toBe(5);
  });

  it('reports unresolved references', () => {
    const document = createSpatialDocument(
      '"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"',
    );

    expect(document.diagnostics[0].message).toBe(
      'Reference target "Sofa/" was not found.',
    );
  });
});
