import type { ParseDiagnostic } from '../dsl/types';
import type { SpatialNode } from './SpatialNode';

export interface SpatialDocument {
  id: string;
  nodes: SpatialNode[];
  renderNodes: SpatialNode[];
  diagnostics: ParseDiagnostic[];
}
