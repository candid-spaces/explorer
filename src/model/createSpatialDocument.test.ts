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

  it('inherits content through declaration-only namespaces and refs', () => {
    const document =
      createSpatialDocument(`"Poster/" : "content-kind: text; content-text-uri: Sale"
"Poster/+0+4/+0+2/+0+1" : ""
"Copy/+6+4/+0+2/+0+1" : "ref: Poster/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);
    expect(document.renderNodes[0].content?.kind).toBe('text');
    expect(
      document.renderNodes[0].content?.kind === 'text'
        ? document.renderNodes[0].content.text
        : undefined,
    ).toBe('Sale');
    expect(document.renderNodes[1].content?.kind).toBe('text');
    expect(
      document.renderNodes[1].content?.kind === 'text'
        ? document.renderNodes[1].content.text
        : undefined,
    ).toBe('Sale');
  });

  it('allows local content declarations to override inherited content', () => {
    const document =
      createSpatialDocument(`"Poster/" : "content-kind: text; content-text-uri: Sale"
"Poster/+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: Sold"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(1);
    expect(document.renderNodes[0].content?.kind).toBe('text');
    expect(
      document.renderNodes[0].content?.kind === 'text'
        ? document.renderNodes[0].content.text
        : undefined,
    ).toBe('Sold');
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

  it('keeps unanchored nested coordinates definition-only while refs inherit texture properties', () => {
    const document =
      createSpatialDocument(`"Sofa/Cushion/" : "color: 0xf5f3ef; material-preset: upholstery.fabric; bump-texture-strength: 2; puff: 5"
"Sofa/Cushion/+0+4/+0+1/+0+3" : "roughness: 0.92"
"Copy/+6+4/+0+1/+0+3" : "ref: Sofa/Cushion/; bump-texture-strength: 1"`);

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
    expect(copy?.material.materialPreset).toBe('upholstery.fabric');
    expect(copy?.material.textures?.roughnessMap?.preset).toBe('fabric.weave');
    expect(copy?.material.textures?.bumpMap?.strength).toBe(1);
    expect(copy?.geometry.puff).toBe(5);
  });

  it('inherits generic texture descriptors through namespaces and refs with local overrides', () => {
    const document = createSpatialDocument(`"FabricThing/" : "material-preset: upholstery.fabric; texture: fabric.weave; texture-repeat: 4 5; bump-texture-strength: 4"
"FabricThing/+0+4/+0+1/+0+3" : ""
"Copy/+6+4/+0+1/+0+3" : "ref: FabricThing/; texture-src: /textures/custom.png; texture-repeat: 1 1"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(2);

    const base = document.renderNodes.find((node) => node.namespacePath === 'FabricThing/');
    const copy = document.renderNodes.find((node) => node.namespacePath === 'Copy/');

    expect(base?.material.materialPreset).toBe('upholstery.fabric');
    expect(base?.material.textures?.map).toEqual({
      preset: 'fabric.weave',
      repeat: [4, 5],
    });
    expect(base?.material.textures?.bumpMap?.strength).toBe(4);
    expect(copy?.material.materialPreset).toBe('upholstery.fabric');
    expect(copy?.material.textures?.map).toEqual({
      preset: 'fabric.weave',
      src: '/textures/custom.png',
      repeat: [1, 1],
    });
    expect(copy?.material.textures?.bumpMap?.strength).toBe(4);
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

  it('anchors anonymous compound refs under a synthetic container without rendering the ref box', () => {
    const document =
      createSpatialDocument(`"Table/" : "color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""
"+19+4/+0+6/+7+3" : "ref: Table/"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(5);

    const container = document.nodes.find(
      (node) => node.metadata?.reference === 'Table/',
    );
    const top = document.renderNodes.find((node) =>
      node.namespacePath?.endsWith('/Top/'),
    );
    const firstLeg = document.renderNodes.find(
      (node) =>
        node.namespacePath?.endsWith('/Leg/') &&
        node.box.source === '+0+1/+0+5/+0+1',
    );

    expect(container?.renderable).toBe(false);
    expect(container?.namespacePath).toBe('Ref6/');
    expect(container?.metadata?.anchorScale).toBeUndefined();
    expect(top?.namespacePath).toBe('Ref6/Top/');
    expect(top?.transform.position).toEqual([23, 4.5, 11]);
    expect(firstLeg?.namespacePath).toBe('Ref6/Leg/');
    expect(firstLeg?.geometry.kind).toBe('cylinder');
    expect(firstLeg?.transform.position).toEqual([19.5, 2.5, 7.5]);
    expect(document.renderNodes.some((node) => node.box.source === '+19+4/+0+6/+7+3')).toBe(false);
  });

  it('avoids existing namespaces when naming anonymous compound ref containers', () => {
    const document =
      createSpatialDocument(`"Table/" : "color: white; metalness: 0.8; roughness: 0.2"
"Ref7/+0+1/+0+1/+0+1" : "color: red"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""
"+19+4/+0+6/+7+3" : "ref: Table/"`);

    expect(document.diagnostics).toEqual([]);

    const userNamespace = document.nodes.find(
      (node) => node.namespacePath === 'Ref7/',
    );
    const generatedContainer = document.nodes.find(
      (node) => node.metadata?.reference === 'Table/',
    );
    const top = document.renderNodes.find(
      (node) => node.namespacePath === 'Ref8/Top/',
    );
    const firstLeg = document.renderNodes.find(
      (node) =>
        node.namespacePath === 'Ref8/Leg/' &&
        node.box.source === '+0+1/+0+5/+0+1',
    );

    expect(userNamespace?.metadata?.reference).toBeUndefined();
    expect(userNamespace?.children).toEqual([]);
    expect(generatedContainer?.namespacePath).toBe('Ref8/');
    expect(top?.transform.position).toEqual([23, 4.5, 11]);
    expect(firstLeg?.transform.position).toEqual([19.5, 2.5, 7.5]);
  });

  it('scales anonymous compound refs when ref-scale is true', () => {
    const document =
      createSpatialDocument(`"Table/" : "color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""
"+19+4/+0+6/+7+3" : "ref: Table/; ref-scale: true"`);

    expect(document.diagnostics).toEqual([]);
    expect(document.renderNodes).toHaveLength(5);

    const container = document.nodes.find(
      (node) => node.metadata?.reference === 'Table/',
    );
    const top = document.renderNodes.find((node) =>
      node.namespacePath?.endsWith('/Top/'),
    );
    const firstLeg = document.renderNodes.find(
      (node) =>
        node.namespacePath?.endsWith('/Leg/') &&
        node.box.source === '+0+1/+0+5/+0+1',
    );

    expect(container?.metadata?.anchorScale).toEqual([0.5, 1.2, 0.375]);
    expect(top?.transform.position[0]).toBeCloseTo(21);
    expect(top?.transform.position[1]).toBeCloseTo(5.4);
    expect(top?.transform.position[2]).toBeCloseTo(8.5);
    expect(top?.transform.scale).toEqual([4, 1.2, 3]);
    expect(firstLeg?.transform.position).toEqual([19.25, 3, 7.1875]);
    expect(firstLeg?.transform.scale).toEqual([0.5, 6, 0.375]);
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
  it('builds declaration-order CSG subtraction expressions from overlapping world-space tools', () => {
    const document = createSpatialDocument(`"+0+6/+0+6/+0+6" : "geometry: sphere; color: blue"
"+2+2/+0+6/+2+2" : "geometry: cylinder; csg: subtraction"`);

    expect(document.csgExpressions).toHaveLength(1);
    expect(document.csgExpressions[0].base.geometry.kind).toBe('sphere');
    expect(document.csgExpressions[0].operations[0].op).toBe('subtraction');
    expect(document.csgExpressions[0].operations[0].tool.geometry.kind).toBe('cylinder');
    expect(document.renderNodes).toHaveLength(0);
    expect(document.csgExpressions[0].operations[0].tool.csgConsumed).toBe(true);
  });

  it('applies a CSG tool to the nearest earlier overlapping world-space primitive', () => {
    const document = createSpatialDocument(`"+0+4/+0+4/+0+4" : "geometry: box"
"+1+4/+0+4/+0+4" : "geometry: sphere"
"+2+1/+0+4/+0+1" : "geometry: cylinder; csg: subtraction"`);

    expect(document.csgExpressions).toHaveLength(1);
    expect(document.csgExpressions[0].base.geometry.kind).toBe('sphere');
    expect(document.renderNodes.map((node) => node.geometry.kind)).toEqual(['box']);
  });


});
