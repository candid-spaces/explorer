import type { AxisName, DslAxisSpec, DslBoxSpec, ParseDiagnostic, ParseResult, SpatialObject } from './types';
import { parseObjectProperties } from './objectDeclarationParser';

const AXES: AxisName[] = ['x', 'y', 'z'];
const DECLARATION_PATTERN = /^\s*"(?<box>[^"]+)"\s*:\s*"(?<properties>[^"]*)"\s*$/;
const AXIS_PATTERN = /^\+(?<offset>\d+)\+(?<size>\d+)$/;

export function parseCompactNumber(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Expected digits only, received "${raw}".`);
  }

  if (raw.length > 1 && raw.startsWith('0')) {
    return Number(`0.${raw.slice(1)}`);
  }

  return Number(raw);
}

export function parseAxisSpec(raw: string, axis: AxisName): DslAxisSpec {
  const match = raw.match(AXIS_PATTERN);

  if (!match?.groups) {
    throw new Error(`Axis ${axis.toUpperCase()} must use +offset+size syntax.`);
  }

  const offset = parseCompactNumber(match.groups.offset);
  const size = parseCompactNumber(match.groups.size);

  if (size <= 0) {
    throw new Error(`Axis ${axis.toUpperCase()} size must be greater than zero.`);
  }

  return { axis, offset, size };
}

export function parseBoxSpec(source: string): DslBoxSpec {
  const segments = source.split('/');

  if (segments.length !== 3) {
    throw new Error('Box spec must contain X/Y/Z axis segments separated by / characters.');
  }

  const [xAxis, yAxis, zAxis] = segments.map((segment, index) => parseAxisSpec(segment, AXES[index]));

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

export function parseDslDeclaration(line: string, lineNumber = 1): ParseResult<SpatialObject> {
  const match = line.match(DECLARATION_PATTERN);
  const diagnostics: ParseDiagnostic[] = [];

  if (!match?.groups) {
    return {
      ok: false,
      diagnostics: [
        {
          line: lineNumber,
          source: line,
          message: 'Declaration must look like "+2+4/+0+6/+1+3" : "geometry: box; color: blue; metalness: 0.1".',
        },
      ],
    };
  }

  try {
    const box = parseBoxSpec(match.groups.box);
    const properties = parseObjectProperties(match.groups.properties);

    return {
      ok: true,
      value: {
        id: `node-${lineNumber}`,
        source: line,
        box,
        material: properties.material,
        geometry: properties.geometry,
        transform: properties.transform,
      },
      diagnostics: properties.diagnostics.map((message) => ({ line: lineNumber, source: line, message })),
    };
  } catch (error) {
    diagnostics.push({
      line: lineNumber,
      source: line,
      message: error instanceof Error ? error.message : 'Unknown parse error.',
    });

    return { ok: false, diagnostics };
  }
}

export function parseDslDocument(source: string): ParseResult<SpatialObject[]> {
  const objects: SpatialObject[] = [];
  const diagnostics: ParseDiagnostic[] = [];

  source
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .forEach(({ line, lineNumber }) => {
      const result = parseDslDeclaration(line, lineNumber);

      diagnostics.push(...result.diagnostics);

      if (result.ok && result.value) {
        objects.push({ ...result.value, id: `node-${objects.length + 1}` });
      }
    });

  return {
    ok: diagnostics.length === 0,
    value: objects,
    diagnostics,
  };
}
