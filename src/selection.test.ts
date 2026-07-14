import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from './model/createSpatialDocument';
import {
  findNodeById,
  findNodePathById,
  lineNumberForNode,
  sceneHighlightIdForNode,
  selectionTargetForNodeId,
} from './selection';

const OUTLET_DSL = `"Outlet/+3+4/+0+2/+1+20c":""
"Outlet/Plate/+0+2/+0+3/+1+15c" : "color: 0xf2f2ee; roughness: 0.7; box-radius: 0.12"
"Outlet/SlotL/+65c+18c/+150c+75c/+90c+40c" : "box-radius: 0.03; operation: subtraction"
"Outlet/SlotR/+117c+18c/+150c+75c/+90c+40c" : "box-radius: 0.03; operation: subtraction"
"Outlet/ScrewTop/+85c+30c/+45c+30c/+90c+40c" : "geometry: cylinder; operation: subtraction"
"Outlet/ScrewBottom/+85c+30c/+250c+30c/+90c+40c" : "geometry: cylinder; operation: subtraction"`;

describe('selectionTargetForNodeId', () => {
  it('promotes rendered compound children to their editable root anchor', () => {
    const document = createSpatialDocument(OUTLET_DSL);
    const plate = document.csgExpressions[0].base;
    const target = selectionTargetForNodeId(document.nodes, plate.id);

    expect(target?.namespacePath).toBe('Outlet/');
    expect(lineNumberForNode(target)).toBe(1);
  });

  it('returns the full hierarchy for rendered compound children', () => {
    const document = createSpatialDocument(OUTLET_DSL);
    const plate = document.csgExpressions[0].base;

    expect(findNodePathById(document.nodes, plate.id).map((node) => node.namespacePath)).toEqual(['Outlet/', 'Outlet/Plate/']);
  });

  it('maps promoted container anchors back to a renderable scene highlight', () => {
    const document = createSpatialDocument(OUTLET_DSL);
    const plate = document.csgExpressions[0].base;
    const root = selectionTargetForNodeId(document.nodes, plate.id);

    expect(sceneHighlightIdForNode(document.nodes, root)).toBe(plate.id);
  });

  it('maps consumed boolean tools back to their rendered boolean base for highlighting', () => {
    const document = createSpatialDocument(OUTLET_DSL);
    const plate = document.csgExpressions[0].base;
    const slot = document.csgExpressions[0].operations[0].tool;

    expect(sceneHighlightIdForNode(document.nodes, slot)).toBe(plate.id);
  });

  it('keeps standalone primitives selected when there is no container anchor', () => {
    const document = createSpatialDocument('"+0+1/+0+1/+0+1" : "color: red"');
    const primitive = document.renderNodes[0];
    const target = selectionTargetForNodeId(document.nodes, primitive.id);

    expect(target?.id).toBe(primitive.id);
    expect(findNodeById(document.nodes, primitive.id)).toBe(target);
  });

});
