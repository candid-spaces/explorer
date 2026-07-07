import type { SpatialNode } from './SpatialNode';

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export const DEFAULT_ROOM_DIMENSIONS: RoomDimensions = {
  width: 40,
  depth: 40,
  height: 28,
};

// Keep two project units of clearance around authored geometry (20 cm).
export const ROOM_DIMENSION_MARGIN = 2;

function expandDimension(current: number, required: number): number {
  if (!Number.isFinite(required) || required <= current) {
    return current;
  }

  return Math.ceil(required);
}

export function dimensionsFromNodes(nodes: SpatialNode[]): RoomDimensions {
  return nodes.reduce<RoomDimensions>(
    (dimensions, node) => ({
      width: expandDimension(dimensions.width, node.bounds.maxX + ROOM_DIMENSION_MARGIN),
      depth: expandDimension(dimensions.depth, node.bounds.maxZ + ROOM_DIMENSION_MARGIN),
      height: expandDimension(dimensions.height, node.bounds.maxY + ROOM_DIMENSION_MARGIN),
    }),
    { ...DEFAULT_ROOM_DIMENSIONS },
  );
}
