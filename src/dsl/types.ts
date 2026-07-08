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
export type DslCsgOperation = 'union' | 'subtraction' | 'intersection';

export interface DslGeometrySpec {
  kind: DslGeometryKind;
  diagnostics: string[];
  declared?: boolean;
  kindDeclared?: boolean;
  'box-radius'?: number;
  puff?: number;
  operation?: DslCsgOperation;
}


export type DslTextureChannel = 'map' | 'roughnessMap' | 'normalMap' | 'bumpMap' | 'metalnessMap' | 'alphaMap';

export interface DslTextureSpec {
  preset?: string;
  src?: string;
  repeat?: [number, number];
  rotation?: number;
  offset?: [number, number];
  strength?: number;
}

export interface DslMaterialSpec {
  materialPreset?: string;
  semanticMaterial?: string;
  materialVariant?: string;
  materialPattern?: string;
  materialFinish?: string;
  textures?: Partial<Record<DslTextureChannel, DslTextureSpec>>;
  color?: string | number;
  metalness?: number;
  roughness?: number;
  reflectivity?: number;
  clearcoat?: number;
  opacity?: number;
  transmission?: number;
  ior?: number;
  diagnostics: string[];
}

export interface DslTransformSpec {
  rotation: [number, number, number];
  diagnostics: string[];
  declared?: boolean;
}

export type DslContentSpec =
  | { kind?: undefined; diagnostics: string[] }
  | { kind: 'text'; text: string; diagnostics: string[] }
  | { kind: 'url'; url: string; diagnostics: string[] };

export interface DslReferenceSpec {
  targetPath?: string;
  scale?: boolean;
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
  content: DslContentSpec;
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
