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

CSG operations (`operation: union`, `operation: subtraction`, and `operation: intersection`) follow declaration order. A later overlapping operator first targets earlier solids in the same namespace/local scope; if no local scoped target overlaps, it falls back to the earlier overlapping world-space solid. This lets compound objects be authored as local groups, but the group must still have a concrete namespace anchor to materialize its children:

```txt
"Mug/+0+1/+0+1/+0+1" : "color: 0xf5f3ef"
"Mug/Body/+5+2/+1+2/+1+2" : "geometry: cylinder; roughness: 0.65"
"Mug/Hollow/+530c+140c/+120c+190c/+130c+140c" : "geometry: cylinder; operation: subtraction"
"Mug/Handle/+680c+110c/+155c+110c/+135c+130c" : "box-radius: 0.18; operation: union"
"Mug/HandleHole/+700c+70c/+175c+70c/+155c+90c" : "box-radius: 0.12; operation: subtraction"
```

Remote transaction validation may limit each memo/properties field to 100 bytes, but that is a transport constraint rather than a renderer limit. Once declarations are loaded, the renderer consumes the resolved DSL document and does not impose a practical size limit on the inherited property set. Authors targeting the remote format can fit richer scenes into the 100-byte fields by putting shared material, geometry, texture, and deformation properties on declaration-only namespaces, then letting child instances inherit those defaults or add compact overrides across additional declarations.

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

## Memo content declarations

Transaction memos can still contain ordinary DSL properties such as `geometry: sphere; color: blue`. If a memo is not valid property DSL, the transaction importer treats it as scene content instead:

- Plain text becomes a paper/card mesh inscribed with the memo text.
- Plain `http` or `https` URLs become a 2D HTML card in the 3D scene.

Internally these content memos are normalized to explicit DSL properties:

```txt
"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: Hello%20world"
"+5+4/+0+3/+0+10c" : "content-kind: url; content-url-uri: https%3A%2F%2Fexample.com"
```

Manual DSL can use `content-text`/`content-url` for simple values, or the URI-encoded `content-text-uri`/`content-url-uri` properties when values may contain semicolons, quotes, newlines, or other DSL delimiters. URL content is limited to absolute `http` and `https` URLs and is embedded in a sandboxed iframe; some sites may block iframe embedding, in which case the card still shows an external "Open URL" link.

Primitive dimensions are derived from the bounding box. For example, a cone or cylinder uses X/Z as its footprint and Y as its height. Non-square footprints are rendered as scaled elliptical primitives so every primitive fills the declared bounding box. `box-radius` applies only to box geometry; omitted or zero radius renders a sharp box, and the renderer clamps positive radii to half of the smallest box dimension. `puff` is intentionally a geometry modifier, not a material setting, because it changes the rendered cushion shape.

## Texture DSL reference

Materials can opt into scalable texture descriptors. `material-preset` expands to ordinary material and texture defaults, and local declarations can override those defaults. Common objects should remain reusable declaration-only namespaces plus `ref` instances rather than renderer-special-cased names, so custom objects and built-in object templates inherit texture descriptors through the same path as color, roughness, and geometry.

### Material presets

Supported material presets are:

- `upholstery.fabric` — rough upholstery with fabric weave roughness and bump maps.
- `wood.oak` — warm oak color map and matching bump map.
- `metal.brushed` — metallic material with a brushed roughness map.
- `plastic.matte` — non-textured matte plastic defaults.

```txt
"FabricCushion/+0+4/+0+1/+0+3" : "material-preset: upholstery.fabric; color: 0xf5f3ef; puff: 5"
"OakTable/+5+8/+0+4/+0+8" : "material-preset: wood.oak; texture-repeat: 3 1"
"BrushedHandle/+0+4/+5+1/+0+1" : "material-preset: metal.brushed; roughness-texture-strength: 4"
"PlasticBin/+10+3/+0+2/+0+3" : "material-preset: plastic.matte; color: teal"
```

### Texture sources

Every texture channel can come from a built-in procedural preset or a custom image source. Generic `texture`/`texture-src` targets the color map channel. The value prefixes `preset:` and `src:` are optional shortcuts when you want to make the source kind explicit inline.

```txt
"PresetColor/+0+4/+0+1/+0+3" : "texture: wood.oak"
"PresetColorExplicit/+5+4/+0+1/+0+3" : "texture: preset:wood.oak"
"ImageColor/+10+4/+0+1/+0+3" : "texture-src: /textures/albedo.png"
"ImageColorInline/+15+4/+0+1/+0+3" : "texture: src:/textures/albedo.png"
```

Built-in procedural texture presets are:

- `fabric.weave`
- `bump.noise`
- `wood.oak`
- `metal.brushed`

### Texture channels

Supported texture channels map directly to ThreeJS material map slots:

| Channel | Preset key | Image key | Repeat aliases | Offset aliases | Rotation aliases | Strength aliases |
| --- | --- | --- | --- | --- | --- | --- |
| Color map (`map`) | `texture`, `map`, `color-texture` | `texture-src`, `map-src`, `color-texture-src` | `texture-repeat`, `map-repeat`, `color-texture-repeat` | `texture-offset`, `map-offset` | `texture-rotation`, `map-rotation` | `texture-strength`, `map-strength` |
| Roughness map | `roughness-texture` | `roughness-texture-src` | `roughness-repeat`, `roughness-texture-repeat` | `texture-offset`, `roughness-texture-offset` | `texture-rotation`, `roughness-texture-rotation` | `texture-strength`, `roughness-texture-strength` |
| Normal map | `normal-texture` | `normal-texture-src` | `normal-repeat`, `normal-texture-repeat` | `texture-offset`, `normal-texture-offset` | `texture-rotation`, `normal-texture-rotation` | `texture-strength`, `normal-texture-strength` |
| Bump map | `bump-texture` | `bump-texture-src` | `bump-repeat`, `bump-texture-repeat` | `texture-offset`, `bump-texture-offset` | `texture-rotation`, `bump-texture-rotation` | `texture-strength`, `bump-texture-strength` |
| Metalness map | `metalness-texture` | `metalness-texture-src` | `metalness-repeat`, `metalness-texture-repeat` | `texture-offset`, `metalness-texture-offset` | `texture-rotation`, `metalness-texture-rotation` | `texture-strength`, `metalness-texture-strength` |
| Alpha map | `alpha-texture` | `alpha-texture-src` | `alpha-repeat`, `alpha-texture-repeat` | `texture-offset`, `alpha-texture-offset` | `texture-rotation`, `alpha-texture-rotation` | `texture-strength`, `alpha-texture-strength` |

```txt
"AllTextureChannels/+0+6/+0+2/+0+3" : "texture: wood.oak; roughness-texture: fabric.weave; normal-texture-src: /textures/panel-normal.png; bump-texture: bump.noise; metalness-texture: metal.brushed; alpha-texture-src: /textures/panel-alpha.png"
```

### Texture transforms and strength

Texture transforms are optional and can be generic or channel-specific:

- `texture-repeat: x y` applies to all currently declared texture channels, or creates a color map transform when no texture channel exists yet.
- `texture-offset: x y` and `texture-rotation: radians` follow the same generic behavior.
- Channel-specific forms include `normal-texture-repeat`, `bump-texture-offset`, `metalness-texture-rotation`, and `roughness-texture-strength`.
- Strength is a `0..5` authoring scale used by procedural presets; image textures can carry it in the descriptor, but the current renderer only uses strength for procedural generation and bump scale.

```txt
"RepeatedWood/+0+6/+0+1/+0+3" : "texture: wood.oak; texture-repeat: 4 1; texture-offset: 0.25 0; texture-rotation: 1.5708"
"ChannelTransforms/+0+6/+2+1/+0+3" : "roughness-texture: fabric.weave; roughness-texture-repeat: 8 8; bump-texture: bump.noise; bump-texture-strength: 4; bump-texture-offset: 0.1 0.2; metalness-texture: metal.brushed; metalness-texture-rotation: 1.5708"
```

### Custom object templates with texture inheritance

Texture descriptors inherit through declaration-only namespaces and `ref`. Referencing instances can override individual descriptor fields, such as changing an inherited preset color map to a custom image while keeping the inherited bump map.

```txt
"WoodTable/" : "material-preset: wood.oak; texture-repeat: 3 1"
"WoodTable/Top/+0+8/+4+1/+0+8" : ""
"WoodTable/Leg/" : "geometry: cylinder; texture-repeat: 1 3"
"WoodTable/Leg/+0+1/+0+4/+0+1" : ""
"WoodTable/Leg/+7+1/+0+4/+7+1" : ""
"CopiedTable/+10+8/+0+5/+0+8" : "ref: WoodTable/"
"CustomPoster/+0+4/+2+3/+0+10c" : "texture-src: /textures/poster.png; texture-repeat: 1 1"
```

See [docs/implementation-plan.md](docs/implementation-plan.md) for architecture details and the feature roadmap.
