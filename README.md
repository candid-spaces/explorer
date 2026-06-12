# Coordinate Object Model

A prototype for composing primitive geometry in a XYZ coordinate-space scene with a declarative DSL.

## Run locally

```bash
npm install
npm run dev
```


## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow that builds the Vite app and deploys the `dist` artifact to GitHub Pages whenever changes are pushed to `main`. You can also run the deployment manually from the **Actions** tab by selecting **Deploy to GitHub Pages** and choosing **Run workflow**.

In the repository settings, set **Pages** → **Build and deployment** → **Source** to **GitHub Actions**. The workflow automatically builds with the repository name as the Vite base path so project pages load assets from the correct URL.

## DSL example

Each declaration lays out a primitive inside an edge-based X/Y/Z bounding box. The optional `geometry` property defaults to `box` and currently supports `box`, `cylinder`, `cone`, and `sphere`. Boxes can also set `box-radius` in world units to render rounded edges and `puff: 0..5` to make cushion-like boxes use a softer rounded silhouette while keeping the same layout, transform, collision, and union contract.

Declaration keys can be anonymous world-space boxes, named world-space instances, declaration-only namespaces, or child instances inside a named parent namespace. Namespaces use slash-separated identifiers before the final three coordinate segments. Declaration-only namespaces end in `/` and do not render by themselves; they define inherited defaults for matching child instances. The `ref` property copies material, geometry, and transform defaults from a previously declared namespace and applies them to the referencing instance's own box.

Path coordinates use bare integers for paces and an optional `c` suffix for centipaces, where `100c = 1` pace. The suffix applies per number, so mixed axis values are valid: `+1+3c` means offset `1` pace and size `0.03` paces. Decimal path notation is intentionally avoided; write `10c` instead of `0.1`.

```txt
"+2+4/+0+6/+1+3" : "geometry: box; box-radius: 0.15; color: 0x333333; metalness: 0.8; roughness: 0.2"
"Sofa/+7+4/+0+3/+0+2" : "color: brown; metalness: 0.2; roughness: 0.8"
"Sofa/Cushion/" : "material-preset: upholstery.fabric; color: 0xf5f3ef; texture: fabric.weave; texture-repeat: 6 6; puff: 5"
"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"

"Table/+18+8/+0+5/+4+8" : "color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""
```

Primitive dimensions are derived from the bounding box. For example, a cone or cylinder uses X/Z as its footprint and Y as its height. Non-square footprints are rendered as scaled elliptical primitives so every primitive fills the declared bounding box. `box-radius` applies only to box geometry; omitted or zero radius renders a sharp box, and the renderer clamps positive radii to half of the smallest box dimension. `puff` is intentionally a geometry modifier, not a material setting, because it changes the rendered cushion shape.

Materials can also opt into scalable texture descriptors. `material-preset` expands to ordinary material and texture defaults (for example `upholstery.fabric`, `wood.oak`, `metal.brushed`, and `plastic.matte`), and local declarations can override those defaults. Use `texture` for built-in procedural presets, `texture-src` for a custom image color map, and channel-specific properties such as `roughness-texture`, `normal-texture-src`, `bump-texture`, and `metalness-texture`. Texture transforms are data-driven with `texture-repeat`, `texture-offset`, and `texture-rotation`, plus channel-specific variants such as `normal-texture-repeat`. Common objects should remain reusable declaration-only namespaces plus `ref` instances rather than renderer-special-cased names, so custom objects and built-in object templates inherit texture descriptors through the same path as color, roughness, and geometry.

```txt
"WoodTable/" : "material-preset: wood.oak; texture-repeat: 3 1"
"WoodTable/Top/+0+8/+4+1/+0+8" : ""
"Poster/+0+4/+2+3/+0+10c" : "texture-src: /textures/poster.png; texture-repeat: 1 1"
"Copy/+10+8/+0+5/+0+8" : "ref: WoodTable/"
```

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
