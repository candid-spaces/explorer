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

export interface DslPathSpec {
  source: string;
  namespace: string[];
  box?: DslBoxSpec;
  canonicalPath: string;
  isDeclarationOnly: boolean;
}

export type DslGeometryKind = 'box' | 'cylinder' | 'cone' | 'sphere';

export interface DslGeometrySpec {
  kind: DslGeometryKind;
  diagnostics: string[];
  declared?: boolean;
  kindDeclared?: boolean;
  'box-radius'?: number;
  puff?: number;
}

export interface DslMaterialSpec {
  color?: string | number;
  metalness?: number;
  roughness?: number;
  fabric?: number;
  sheen?: number;
  clearcoat?: number;
  bump?: number;
  diagnostics: string[];
}

export interface DslTransformSpec {
  rotation: [number, number, number];
  diagnostics: string[];
  declared?: boolean;
}

export interface DslReferenceSpec {
  targetPath?: string;
  diagnostics: string[];
}

export interface SpatialObject {
  id: string;
  source: string;
  path: DslPathSpec;
  namespace: string[];
  box?: DslBoxSpec;
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
  reference: DslReferenceSpec;
  declarationOnly: boolean;
  lineNumber: number;
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
