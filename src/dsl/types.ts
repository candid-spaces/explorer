export type AxisName = 'x' | 'y' | 'z';

export interface DslAxisSpec {
  axis: AxisName;
  offset: number;
  size: number;
}

export interface DslBoxSpec {
  source: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface DslMaterialSpec {
  color?: string | number;
  metalness?: number;
  roughness?: number;
  diagnostics: string[];
}

export interface SpatialObject {
  id: string;
  source: string;
  box: DslBoxSpec;
  material: DslMaterialSpec;
  unionGroupId?: string;
}

export interface ParseDiagnostic {
  line: number;
  message: string;
  source: string;
}

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  diagnostics: ParseDiagnostic[];
}
