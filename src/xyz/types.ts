export type AxisName = 'x' | 'y' | 'z';

export interface XyzAxisSpec {
  axis: AxisName;
  offset: number;
  size: number;
}

export interface XyzBoxSpec {
  source: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface XyzPathSpec {
  source: string;
  namespace: string[];
  box?: XyzBoxSpec;
  canonicalPath: string;
  isDeclarationOnly: boolean;
}

export type XyzGeometryKind = 'box' | 'cylinder' | 'cone' | 'sphere';
export type XyzCsgOperation = 'union' | 'subtraction' | 'intersection';

export interface XyzGeometrySpec {
  kind: XyzGeometryKind;
  diagnostics: string[];
  declared?: boolean;
  kindDeclared?: boolean;
  'box-radius'?: number;
  puff?: number;
  operation?: XyzCsgOperation;
}


export type XyzTextureChannel = 'map' | 'roughnessMap' | 'normalMap' | 'bumpMap' | 'metalnessMap' | 'alphaMap';

export interface XyzTextureSpec {
  preset?: string;
  src?: string;
  repeat?: [number, number];
  rotation?: number;
  offset?: [number, number];
  strength?: number;
}

export interface XyzMaterialSpec {
  materialPreset?: string;
  semanticMaterial?: string;
  materialVariant?: string;
  materialPattern?: string;
  materialFinish?: string;
  textures?: Partial<Record<XyzTextureChannel, XyzTextureSpec>>;
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

export interface XyzTransformSpec {
  rotation: [number, number, number];
  diagnostics: string[];
  declared?: boolean;
}

export type XyzContentSpec =
  | { kind?: undefined; diagnostics: string[] }
  | { kind: 'text'; text: string; diagnostics: string[] }
  | { kind: 'url'; url: string; diagnostics: string[] };

export interface XyzReferenceSpec {
  targetPath?: string;
  scale?: boolean;
  diagnostics: string[];
}

export interface SpatialObject {
  id: string;
  source: string;
  path: XyzPathSpec;
  namespace: string[];
  box?: XyzBoxSpec;
  material: XyzMaterialSpec;
  geometry: XyzGeometrySpec;
  transform: XyzTransformSpec;
  reference: XyzReferenceSpec;
  content: XyzContentSpec;
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
