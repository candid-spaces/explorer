# 3D Spatial Object Model

A client-side React, TypeScript, Vite, and ThreeJS prototype for composing cuboid objects in a realistic XYZ corner-room scene with a declarative DSL.

## Run locally

```bash
npm install
npm run dev
```

## DSL example

```txt
"+2+4/+0+6/+1+3" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+7+6/+0+01" : "color: yellow; metalness: 0.2; roughness: 0.5"
"+7+6/+0+15/+0+05" : "color: blue; metalness: 0.1; roughness: 0.2"
```

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
