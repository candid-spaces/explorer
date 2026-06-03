# 3D Spatial Object Model Implementation Plan

## Product goal

The project renders realistic interior spatial compositions from a declarative DSL. The default document is an XYZ corner-room scene: a floor on the X/Z plane, a back wall at Z = 0, and a side wall at X = 0. Users add fixtures, fittings, furniture, and primitive geometry by composing DSL declarations in the same shared world space.

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

A primitive declaration has a quoted coordinate expression followed by a quoted object-property declaration:

```txt
"+xOffset+width/+yOffset+height/+zOffset+depth" : "geometry: cone; color: blue; metalness: 0.1; roughness: 0.2"
```

Each axis segment uses `+offset+size` syntax. Axis order is always X, Y, then Z. The optional `geometry` property defaults to `box` and supports `box`, `cylinder`, `cone`, and `sphere`.

## Coordinate system

The DSL uses edge-based bounding-box placement:

- X = horizontal distance from the left wall/corner plus bounding-box width.
- Y = height from the floor plus bounding-box/object height.
- Z = distance from the back wall plus bounding-box depth.

ThreeJS primitives are center-positioned, so each DSL bounding box is converted to:

```txt
position.x = x + width / 2
position.y = y + height / 2
position.z = z + depth / 2
```

The derived primitive dimensions are:

```txt
[width, height, depth]
```

Boxes map these values directly to box dimensions. Cylinders and cones use X/Z as their footprint and Y as their height. Spheres use the full bounding box as a scalable ellipsoid contract, so non-cubic dimensions intentionally render a stretched sphere that still fills the declared box.

## Examples

```txt
"+2+4/+0+6/+1+3" : "geometry: box; color: 0x333333; metalness: 0.8; roughness: 0.2"
```

This renders a box that is 4 units wide, offset 2 units from the X origin, rests on the floor at Y = 0, is 6 units high, is 1 unit away from the back wall, and is 3 units deep.

```txt
"+2+4/+7+6/+0+01" : "geometry: cone; color: yellow; metalness: 0.2; roughness: 0.5"
```

This renders a cone above the first box with a 4 × 0.1 footprint and a height of 6 units.

```txt
"+7+6/+0+15/+0+05" : "geometry: sphere; color: blue; metalness: 0.1; roughness: 0.2"
```

This renders a right-side scaled sphere inside a 6 × 15 × 0.5 bounding box.

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
    SpatialPrimitive.tsx
    materials.ts
  ui/
    DslDrawer.tsx
    DslEditor.tsx
    ObjectList.tsx
```

## Parser architecture

The parser is independent from React and ThreeJS. It converts text declarations into typed spatial objects, captures diagnostics, and preserves source strings for future editing and object provenance.

The object-property parser currently supports geometry plus material properties:

- `geometry` (`box`, `cylinder`, `cone`, `sphere`)
- `color`
- `metalness`
- `roughness`

Unsupported object properties are ignored with diagnostics so future geometry and material features can be added without changing the scene renderer contract.

## Spatial document model

The spatial document contains neutral `SpatialNode` values with:

- stable node IDs
- original source text
- parsed bounding-box dimensions
- computed bounds
- derived primitive geometry
- parsed material settings
- optional union group IDs
- future-ready metadata and children fields

This document model is the extension point for named objects, hierarchy, reusable components, anchors, relative positioning, snapping, and export formats.

## Collision and union strategy

The first implementation uses axis-aligned bounding box collision detection. Colliding components are grouped and assigned a `union-*` identifier. Rendering applies a subtle union highlight to grouped objects.

Full boolean geometry merging is intentionally deferred. The next stage can introduce a ThreeJS-compatible CSG library and replace visual grouping with real union mesh generation while preserving the document model API.

## Rendering architecture

The renderer uses React Three Fiber and Drei. `SceneRoot` owns the canvas, camera, controls, lighting, default room, and spatial primitives. `CornerRoom` creates the default floor and two walls. `SpatialPrimitive` maps each spatial node into a ThreeJS mesh by dispatching on the derived geometry kind while sharing the same material, transform, and union-highlight behavior for all primitives.

## UI drawer workflow

The UI is a full-screen 3D canvas with a popup drawer. The drawer allows users to edit declarations, see parse diagnostics, and inspect parsed objects. The scene updates immediately as the DSL source changes.

## Roadmap

1. Add richer validation and structured parse errors.
2. Add object naming and references.
3. Add group nodes and nested transforms.
4. Add fixture/furniture presets that compile to primitive geometry.
5. Add wall-mounted anchors and relative positioning.
6. Add texture presets, bevels, rounded edges, and material libraries.
7. Add real CSG boolean union for colliding geometry.
8. Add save/load, shareable URLs, JSON export, and GLTF export.
