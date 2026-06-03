# 3D Spatial Object Model

A client-side React, TypeScript, Vite, and ThreeJS prototype for composing primitive geometry in a realistic XYZ corner-room scene with a declarative DSL.

## Run locally

```bash
npm install
npm run dev
```

## DSL example

Each declaration lays out a primitive inside an edge-based X/Y/Z bounding box. The optional `geometry` property defaults to `box` and currently supports `box`, `cylinder`, `cone`, and `sphere`.

```txt
"+2+4/+0+6/+1+3" : "geometry: box; color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+0+6/+5+3" : "geometry: cylinder; color: orange; metalness: 0.2; roughness: 0.5"
"+7+4/+0+6/+1+3" : "geometry: cone; color: yellow; metalness: 0.2; roughness: 0.5"
"+7+4/+7+4/+5+4" : "geometry: sphere; color: blue; metalness: 0.1; roughness: 0.2"
```

Primitive dimensions are derived from the bounding box. For example, a cone or cylinder uses X/Z as its footprint and Y as its height. Non-square footprints are rendered as scaled elliptical primitives so every primitive fills the declared bounding box.

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
