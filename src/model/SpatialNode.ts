import type { DslBoxSpec, DslDirectiveSpec, DslMaterialSpec } from '../dsl/types';

export interface SpatialBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SpatialNode {
  id: string;
  source: string;
  line: number;
  name?: string;
  namespacePath?: string;
  path: string;
  parentId?: string;
  depth: number;
  box: DslBoxSpec;
  localBox: DslBoxSpec;
  worldBox: DslBoxSpec;
  bounds: SpatialBounds;
  material: DslMaterialSpec;
  resolvedMaterial: DslMaterialSpec;
  directives: DslDirectiveSpec;
  refTargetId?: string;
  refTargetPath?: string;
  unionGroupId?: string;
  children?: SpatialNode[];
  metadata?: Record<string, unknown>;
}
