import type { AxisName, DslAxisSpec, DslBoxSpec, DslPathSpec } from './types';

const AXES = ['x', 'y', 'z'] as const;
const PATH_NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:p\d+)?$/;
const LEGACY_LEADING_ZERO_PATTERN = /^0\d+$/;
const AXIS_PATTERN = /^\+(?<offset>[^+]+)\+(?<size>[^+]+)$/;
const NAMESPACE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function isAxisSegment(segment: string): boolean {
  return /^\+[^+]*\+[^+]*$/.test(segment);
}

export function parsePathNumber(raw: string): number {
  if (LEGACY_LEADING_ZERO_PATTERN.test(raw)) {
    throw new Error(`Legacy leading-zero decimals are no longer supported; use "0p${raw.slice(1)}" instead of "${raw}".`);
  }

  if (!PATH_NUMBER_PATTERN.test(raw)) {
    throw new Error(`Expected a number using digits with optional p-decimal syntax, received "${raw}".`);
  }

  return Number(raw.replace('p', '.'));
}

function parsePathAxisSpec(raw: string, axis: AxisName): DslAxisSpec {
  const match = raw.match(AXIS_PATTERN);

  if (!match?.groups) {
    throw new Error(`Axis ${axis.toUpperCase()} must use +offset+size syntax.`);
  }

  const offset = parsePathNumber(match.groups.offset);
  const size = parsePathNumber(match.groups.size);

  if (size <= 0) {
    throw new Error(`Axis ${axis.toUpperCase()} size must be greater than zero.`);
  }

  return { axis, offset, size };
}

function parseBoxSegments(segments: string[], source: string): DslBoxSpec {
  const [xAxis, yAxis, zAxis] = segments.map((segment, index) => parsePathAxisSpec(segment, AXES[index]));

  return {
    source,
    x: xAxis.offset,
    y: yAxis.offset,
    z: zAxis.offset,
    width: xAxis.size,
    height: yAxis.size,
    depth: zAxis.size,
  };
}

export function normalizeNamespacePath(path: string): string {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

export function canonicalNamespacePath(namespace: string[]): string {
  return namespace.length > 0 ? `${namespace.join('/')}/` : '';
}

export function parseDslPath(source: string): DslPathSpec {
  const trimmed = source.trim();

  if (!trimmed) {
    throw new Error('Declaration path cannot be empty.');
  }

  const declarationOnly = trimmed.endsWith('/');
  const rawSegments = trimmed.split('/');
  const segments = rawSegments.filter((segment, index) => !(declarationOnly && index === rawSegments.length - 1));

  if (segments.some((segment) => segment.trim() !== segment || segment.length === 0)) {
    throw new Error('Path segments cannot be empty or contain leading/trailing whitespace.');
  }

  if (declarationOnly) {
    if (segments.length === 0) {
      throw new Error('Namespace declaration must include at least one namespace segment.');
    }

    const axisIndex = segments.findIndex(isAxisSegment);
    if (axisIndex !== -1) {
      throw new Error('Declaration-only namespaces cannot include coordinate axis segments.');
    }

    validateNamespaceSegments(segments);

    return {
      source,
      namespace: segments,
      canonicalPath: canonicalNamespacePath(segments),
      isDeclarationOnly: true,
    };
  }

  const axisStart = segments.findIndex(isAxisSegment);

  if (axisStart === -1) {
    validateNamespaceSegments(segments);

    return {
      source,
      namespace: segments,
      canonicalPath: canonicalNamespacePath(segments),
      isDeclarationOnly: true,
    };
  }

  const namespace = segments.slice(0, axisStart);
  const axisSegments = segments.slice(axisStart);

  validateNamespaceSegments(namespace);

  if (axisSegments.length !== 3 || !axisSegments.every(isAxisSegment)) {
    throw new Error('Namespaced instance paths must end with exactly X/Y/Z axis segments.');
  }

  const boxSource = axisSegments.join('/');

  return {
    source,
    namespace,
    box: parseBoxSegments(axisSegments, boxSource),
    canonicalPath: namespace.length > 0 ? `${namespace.join('/')}/${boxSource}` : boxSource,
    isDeclarationOnly: false,
  };
}

function validateNamespaceSegments(segments: string[]): void {
  const invalid = segments.find((segment) => !NAMESPACE_PATTERN.test(segment));

  if (invalid) {
    throw new Error(`Namespace segment "${invalid}" must start with a letter and contain only letters, numbers, _ or -.`);
  }
}
