import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { DecalId, ShipDesign } from "@/game/data/ships";

export interface ShipGeometries {
  fuselage: BufferGeometry;
  canopy: BufferGeometry;
  wingLeft: BufferGeometry;
  wingRight: BufferGeometry;
  fins: BufferGeometry[];
  engine: BufferGeometry;
  nozzle: BufferGeometry;
  flame: BufferGeometry;
  tip: BufferGeometry;
}

/** Decals float this far above the surface they sit on. */
const DECAL_LIFT = 0.006;

function fuselage(design: ShipDesign): BufferGeometry {
  const { profile, segments, flatten } = design.fuselage;
  // Lathe around +Y with y = -along, then lay it along Z (nose towards -Z).
  const points = profile.map(([radius, along]) => new Vector2(radius, -along));
  const geometry = new LatheGeometry(points, segments);
  geometry.rotateX(-Math.PI / 2);
  // Put a flat face (not an edge) on top so decals can lie on it.
  geometry.rotateZ(Math.PI / segments);
  geometry.scale(1, flatten, 1);
  return geometry;
}

/** Applies the wing's flat-lay, height and dihedral transform to wing-space geometry. */
function placeOnWing(geometry: BufferGeometry, design: ShipDesign, side: 1 | -1, lift: number): BufferGeometry {
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, design.wing.y + lift, 0);
  geometry.rotateZ(design.wing.dihedral * side);
  return geometry;
}

function wing(design: ShipDesign, side: 1 | -1): BufferGeometry {
  const { outline, thickness } = design.wing;
  const shape = new Shape();
  outline.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x * side, z);
    else shape.lineTo(x * side, z);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  // Extrusion runs along -Y after the flat-lay; centre the thickness.
  return placeOnWing(geometry, design, side, thickness / 2);
}

function fin(design: ShipDesign, x: number, cant: number): BufferGeometry {
  const { outline } = design.fins;
  const shape = new Shape();
  outline.forEach(([z, height], index) => {
    if (index === 0) shape.moveTo(z, height);
    else shape.lineTo(z, height);
  });
  shape.closePath();
  const thickness = 0.05;
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  // Shape x → ship z, shape y → height; then cant outwards and move to its mount.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(thickness / 2, design.fins.y, 0);
  geometry.rotateZ(-cant);
  geometry.translate(x, 0, 0);
  return geometry;
}

export function createShipGeometries(design: ShipDesign): ShipGeometries {
  const { canopy: canopyDesign, engines, fins } = design;
  const canopy = new SphereGeometry(canopyDesign.radius, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  canopy.scale(...canopyDesign.scale);
  canopy.translate(...canopyDesign.position);

  const engine = new CylinderGeometry(engines.radius, engines.radius * 1.25, engines.length, 8);
  engine.rotateX(Math.PI / 2);

  const nozzle = new CylinderGeometry(engines.radius * 0.85, engines.radius * 0.85, 0.04, 12);
  nozzle.rotateX(Math.PI / 2);

  // Flame points along +Z (behind the ship), tip at z = 1.
  const flame = new ConeGeometry(engines.radius * 0.8, 1, 12, 1, true);
  flame.rotateX(-Math.PI / 2);
  flame.translate(0, 0, 0.5);

  const tip = new CylinderGeometry(0.07, 0.07, 0.5, 6);
  tip.rotateX(Math.PI / 2);

  const finGeometries =
    fins.layout === "single"
      ? [fin(design, 0, 0)]
      : [fin(design, -fins.offsetX, -fins.cant), fin(design, fins.offsetX, fins.cant)];

  return {
    fuselage: fuselage(design),
    canopy,
    wingLeft: wing(design, -1),
    wingRight: wing(design, 1),
    fins: finGeometries,
    engine,
    nozzle,
    flame,
    tip,
  };
}

export function disposeShipGeometries(geometries: ShipGeometries): void {
  for (const value of Object.values(geometries)) {
    if (Array.isArray(value)) value.forEach((geometry) => geometry.dispose());
    else value.dispose();
  }
}

/** Twin racing stripes following the top face of the fuselage. */
function fuselageStripes(design: ShipDesign): BufferGeometry {
  const { profile, segments, flatten } = design.fuselage;
  const apothem = Math.cos(Math.PI / segments);
  const halfWidth = 0.035;
  const offsets = [-0.09, 0.09];
  const positions: number[] = [];
  const indices: number[] = [];
  // Only where the body is wide enough for the stripes to sit on its top face.
  const points = profile.filter(([radius]) => radius > 0.25);
  for (const offset of offsets) {
    const base = positions.length / 3;
    for (const [radius, along] of points) {
      const y = radius * apothem * flatten + DECAL_LIFT;
      positions.push(offset - halfWidth, y, along, offset + halfWidth, y, along);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const a = base + i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Centre of the right wing's outline (x, z) and its span. */
function wingCentre(design: ShipDesign) {
  const outline = design.wing.outline;
  const x = outline.reduce((sum, [px]) => sum + px, 0) / outline.length;
  const z = outline.reduce((sum, [, pz]) => sum + pz, 0) / outline.length;
  const span = Math.max(...outline.map(([px]) => px)) - Math.min(...outline.map(([px]) => px));
  return { x, z, span };
}

function wingDecalShape(decal: Exclude<DecalId, "none">, design: ShipDesign, side: 1 | -1): Shape[] {
  const { x, z, span } = wingCentre(design);
  const cx = x * side;
  const size = Math.min(0.42, span * 0.24);
  if (decal === "star") {
    const shape = new Shape();
    for (let i = 0; i <= 10; i++) {
      const radius = i % 2 === 0 ? size : size * 0.42;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(px, pz);
      else shape.lineTo(px, pz);
    }
    return [shape];
  }
  if (decal === "chevron") {
    // Two nested arrows pointing forward (-Z).
    return [0, 0.32].map((shift) => {
      const shape = new Shape();
      const tipZ = z - size * 0.7 + shift;
      shape.moveTo(cx, tipZ);
      shape.lineTo(cx + size, tipZ + size * 0.7);
      shape.lineTo(cx + size, tipZ + size * 0.98);
      shape.lineTo(cx, tipZ + size * 0.3);
      shape.lineTo(cx - size, tipZ + size * 0.98);
      shape.lineTo(cx - size, tipZ + size * 0.7);
      shape.closePath();
      return shape;
    });
  }
  // Stripe along the span, parallel to the leading edge.
  const [root, tip] = [design.wing.outline[0], design.wing.outline[1]];
  const shape = new Shape();
  const inset = 0.18;
  const width = 0.09;
  shape.moveTo(root[0] * side, root[1] + inset);
  shape.lineTo(tip[0] * side * 0.94, tip[1] + inset);
  shape.lineTo(tip[0] * side * 0.94, tip[1] + inset + width);
  shape.lineTo(root[0] * side, root[1] + inset + width);
  shape.closePath();
  return [shape];
}

/** Decal meshes (one merged geometry) for the chosen pattern, or null for "none". */
export function createDecalGeometry(design: ShipDesign, decal: DecalId): BufferGeometry | null {
  if (decal === "none") return null;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const shapes = wingDecalShape(decal, design, side);
    parts.push(placeOnWing(new ShapeGeometry(shapes), design, side, design.wing.thickness / 2 + DECAL_LIFT));
  }
  if (decal === "stripe") parts.push(fuselageStripes(design));
  // mergeGeometries needs identical attributes: drop UVs, unify indexing.
  const merged = mergeGeometries(
    parts.map((part) => {
      part.deleteAttribute("uv");
      return part.toNonIndexed();
    }),
  );
  parts.forEach((part) => part.dispose());
  return merged;
}
