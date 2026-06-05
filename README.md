# Coordinate Object Model

A prototype for composing primitive geometry in a XYZ coordinate-space scene with a declarative DSL.

## Run locally

```bash
npm install
npm run dev
```

## DSL example

Each declaration lays out a primitive inside an edge-based X/Y/Z bounding box. The optional `geometry` property defaults to `box` and currently supports `box`, `cylinder`, `cone`, and `sphere`.

Declaration keys can be anonymous world-space boxes, named world-space instances, declaration-only namespaces, or child instances inside a named parent namespace. Namespaces use slash-separated identifiers before the final three coordinate segments. Declaration-only namespaces end in `/` and do not render by themselves; they define inherited defaults for matching child instances. The `ref` property copies material, geometry, and transform defaults from a previously declared namespace and applies them to the referencing instance's own box.

```txt
"+2+4/+0+6/+1+3" : "geometry: box; color: 0x333333; metalness: 0.8; roughness: 0.2"
"Sofa/+7+4/+0+3/+0+2" : "color: brown; metalness: 0.2; roughness: 0.8"
"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"

"Table/+18+8/+0+5/+4+8" : "color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""
```

Primitive dimensions are derived from the bounding box. For example, a cone or cylinder uses X/Z as its footprint and Y as its height. Non-square footprints are rendered as scaled elliptical primitives so every primitive fills the declared bounding box.

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
