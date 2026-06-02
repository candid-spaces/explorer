# 3D Spatial Object Model

A client-side React, TypeScript, Vite, and ThreeJS prototype for composing cuboid objects in a realistic XYZ corner-room scene with a declarative DSL.

## Run locally

```bash
npm install
npm run dev
```

## DSL example

The DSL supports anonymous world-space boxes, named world-space namespaces, imported model containers, references, and nested local-space composition.

```txt
-"+2+4/+0+6/+1+3" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
-"Sofa/+7+4/+0+3/+0+2": "import: Sofa.gltf;"
-"Mirror/+3+2/+0+6/+0+02": "import: Mirror.gltf;"
-"Referential/+3+5/+0+3/+0+15": "ref: Sofa/;"
-"Table/+3+8/+0+5/+0+8": "color: 0x333333; metalness: 0.8; roughness: 0.2"
--"Table/Top/+1+6/+0+5/+0+6": ""
--"Table/LegA/+1+2/+0+7/+0+1": ""
--"Table/LegB/+7+2/+0+7/+0+1": ""
--"Table/LegC/+1+2/+0+7/+0+7": ""
--"Table/LegD/+7+2/+0+7/+0+7": ""
```

Top-level declarations use world-space boxes. Nested declarations use parent-local offsets and sizes, and empty styles inherit the parent material. `import` directives load models from `/models/<file>` unless an absolute URL or root-relative path is supplied. `ref` directives resolve a prior namespace path and use the referenced material for the referring bounding box in the first renderer pass.

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
