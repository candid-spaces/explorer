# 3D Spatial Object Model Implementation Plan

## Product goal

The project renders realistic interior spatial compositions from a declarative DSL. The default document is an XYZ corner-room scene: a floor on the X/Z plane, a back wall at Z = 0, and a side wall at X = 0. Users add fixtures, fittings, furniture, and other cuboid objects by composing DSL declarations in the same shared world space.

The long-term model is intentionally DOM-like: the DSL compiles into a neutral spatial document model, and the ThreeJS renderer consumes that document. This keeps parsing, layout, collision handling, and rendering independently extensible.

## Unit model

- 1 adult step/pace = 3 DSL units.
- 1 DSL unit = 1/3 adult step/pace.
- Numeric values use digits only.
- Leading-zero digit strings represent fractions between 0 and 1:
  - `01` = `0.1`
  - `001` = `0.01`
  - `05` = `0.5`
- Non-leading-zero values parse as integers:
  - `2` = `2`
  - `15` = `15`

## DSL grammar

A cuboid declaration has a quoted coordinate expression followed by a quoted material declaration:

```txt
"+xOffset+width/+yOffset+height/+zOffset+depth" : "color: blue; metalness: 0.1; roughness: 0.2"
```

Each axis segment uses `+offset+size` syntax. Axis order is always X, Y, then Z.

## Coordinate system

The DSL uses edge-based cuboid placement:

- X = horizontal distance from the left wall/corner plus width.
- Y = height from the floor plus object height.
- Z = distance from the back wall plus depth.

ThreeJS boxes are center-positioned, so each DSL box is converted to:

```txt
position.x = x + width / 2
position.y = y + height / 2
position.z = z + depth / 2
```

The rendered geometry dimensions are:

```txt
[width, height, depth]
```

## Examples

```txt
"+2+4/+0+6/+1+3" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
```

This renders a cuboid that is 4 units wide, offset 2 units from the X origin, rests on the floor at Y = 0, is 6 units high, is 1 unit away from the back wall, and is 3 units deep.

```txt
"+2+4/+7+6/+0+01" : "color: yellow; metalness: 0.2; roughness: 0.5"
```

This renders a flat object above the first cuboid with a depth of 0.1 units.

```txt
"+7+6/+0+15/+0+05" : "color: blue; metalness: 0.1; roughness: 0.2"
```

This renders a right-side rectangular object that is 15 units high and 0.5 units deep.

## Current architecture

```txt
src/
  dsl/
    materialParser.ts
    parser.ts
    types.ts
  model/
    SpatialDocument.ts
    SpatialNode.ts
    collision.ts
    createSpatialDocument.ts
  scene/
    CornerRoom.tsx
    Lighting.tsx
    SceneRoot.tsx
    SpatialBox.tsx
    coordinateMapping.ts
    materials.ts
  ui/
    DslDrawer.tsx
    DslEditor.tsx
    ObjectList.tsx
```

## Parser architecture

The parser is independent from React and ThreeJS. It converts text declarations into typed spatial objects, captures diagnostics, and preserves source strings for future editing and object provenance.

The material parser currently supports:

- `color`
- `metalness`
- `roughness`

Unsupported material properties are ignored with diagnostics so future material features can be added without changing the scene renderer contract.

## Spatial document model

The spatial document contains neutral `SpatialNode` values with:

- stable node IDs
- original source text
- parsed cuboid dimensions
- computed bounds
- parsed material settings
- optional union group IDs
- future-ready metadata and children fields

This document model is the extension point for named objects, hierarchy, reusable components, anchors, relative positioning, snapping, and export formats.

## Collision and union strategy

The first implementation uses axis-aligned bounding box collision detection. Colliding components are grouped and assigned a `union-*` identifier. Rendering applies a subtle union highlight to grouped objects.

Full boolean geometry merging is intentionally deferred. The next stage can introduce a ThreeJS-compatible CSG library and replace visual grouping with real union mesh generation while preserving the document model API.

## Rendering architecture

The renderer uses React Three Fiber and Drei. `SceneRoot` owns the canvas, camera, controls, lighting, default room, and spatial boxes. `CornerRoom` creates the default floor and two walls. `SpatialBox` maps each spatial node into a ThreeJS mesh by using the isolated coordinate conversion module.

## UI drawer workflow

The UI is a full-screen 3D canvas with a popup drawer. The drawer allows users to edit declarations, see parse diagnostics, and inspect parsed objects. The scene updates immediately as the DSL source changes.

## Roadmap

1. Add richer validation and structured parse errors.
2. Add object naming and references.
3. Add group nodes and nested transforms.
4. Add fixture/furniture presets that compile to cuboid primitives.
5. Add wall-mounted anchors and relative positioning.
6. Add texture presets, bevels, rounded edges, and material libraries.
7. Add real CSG boolean union for colliding geometry.
8. Add save/load, shareable URLs, JSON export, and GLTF export.
