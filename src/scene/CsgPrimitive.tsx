import { useMemo } from 'react';
import { Brush, Evaluator, INTERSECTION, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type BufferGeometry, type MeshStandardMaterialParameters } from 'three';
import type { CsgExpression, CsgOperationNode } from '../model/csg';
import type { SpatialGeometry } from '../model/geometry';
import type { SpatialNode } from '../model/SpatialNode';
import { materialParameters, needsPhysicalMaterial } from './SpatialPrimitive';

interface CsgPrimitiveProps {
  expression: CsgExpression;
}

function geometryFor(geometry: SpatialGeometry): BufferGeometry {
  switch (geometry.kind) {
    case 'cylinder':
      return new CylinderGeometry(0.5, 0.5, 1, 48);
    case 'cone':
      return new ConeGeometry(0.5, 1, 48);
    case 'sphere':
      return new SphereGeometry(0.5, 48, 24);
    case 'box':
    default:
      return new BoxGeometry(1, 1, 1);
  }
}

function brushFor(node: SpatialNode): Brush {
  const brush = new Brush(geometryFor(node.geometry));
  const { position, rotation, scale } = node.transform;
  brush.position.set(...position);
  brush.rotation.set(...rotation);
  brush.scale.set(...scale);
  brush.updateMatrixWorld(true);
  brush.geometry.applyMatrix4(brush.matrixWorld);
  brush.position.set(0, 0, 0);
  brush.rotation.set(0, 0, 0);
  brush.scale.set(1, 1, 1);
  brush.updateMatrixWorld(true);
  return brush;
}

function csgOperation({ op }: CsgOperationNode) {
  switch (op) {
    case 'union':
      return ADDITION;
    case 'intersection':
      return INTERSECTION;
    case 'subtraction':
    default:
      return SUBTRACTION;
  }
}

export function CsgPrimitive({ expression }: CsgPrimitiveProps) {
  const geometry = useMemo(() => {
    const evaluator = new Evaluator();
    evaluator.attributes = ['position', 'normal', 'uv'];
    let result = brushFor(expression.base);

    expression.operations.forEach((operation) => {
      result = evaluator.evaluate(result, brushFor(operation.tool), csgOperation(operation));
    });

    return result.geometry;
  }, [expression]);
  const material = materialParameters(expression.base);

  return (
    <mesh castShadow receiveShadow geometry={geometry} userData={{ spatialNodeId: expression.base.id, csgExpressionId: expression.id }}>
      {needsPhysicalMaterial(expression.base) ? (
        <meshPhysicalMaterial {...material} />
      ) : (
        <meshStandardMaterial {...(material as MeshStandardMaterialParameters)} />
      )}
    </mesh>
  );
}
