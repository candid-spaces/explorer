import type { ParseDiagnostic } from '../dsl/types';
import type { SpatialNode } from './SpatialNode';

export interface SpatialDocument {
  id: string;
  nodes: SpatialNode[];
  allNodes: SpatialNode[];
  nodeIndex: Map<string, SpatialNode>;
  namespaceIndex: Map<string, SpatialNode>;
  diagnostics: ParseDiagnostic[];
}
