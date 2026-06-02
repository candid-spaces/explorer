import type { DslBoxSpec, DslMaterialSpec } from '../dsl/types';

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
  box: DslBoxSpec;
  bounds: SpatialBounds;
  material: DslMaterialSpec;
  unionGroupId?: string;
  children?: SpatialNode[];
  metadata?: Record<string, unknown>;
}
