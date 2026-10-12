import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
} from "three";

/** Ship-local layout (forward = -Z). Shared with the trail & flame placement. */
export const SHIP_LAYOUT = {
  nozzles: [
    [-0.46, -0.04, 1.62],
    [0.46, -0.04, 1.62],
  ] as const,
  navLights: [
    { position: [-2.08, 0.02, 1.0] as const, color: "#ff3b4a" },
    { position: [2.08, 0.02, 1.0] as const, color: "#3bff8a" },
  ],
} as const;

export interface ShipGeometries {
  fuselage: BufferGeometry;
  canopy: BufferGeometry;
  wingLeft: BufferGeometry;
  wingRight: BufferGeometry;
  finLeft: BufferGeometry;
  finRight: BufferGeometry;
  engine: BufferGeometry;
  nozzle: BufferGeometry;
  flame: BufferGeometry;
  tip: BufferGeometry;
}

function fuselage(): BufferGeometry {
  const profile = [
    [0.0, -1.58],
    [0.3, -1.52],
    [0.47, -1.12],
    [0.55, -0.3],
    [0.47, 0.5],
    [0.3, 1.12],
    [0.13, 1.52],
    [0.0, 1.66],
  ].map(([r, y]) => new Vector2(r, y));
  const geometry = new LatheGeometry(profile, 8);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateZ(Math.PI / 8);
  geometry.scale(1, 0.72, 1);
  return geometry;
}

function wing(side: 1 | -1): BufferGeometry {
  const s = side;
  const shape = new Shape();
  shape.moveTo(0.38 * s, -0.35);
  shape.lineTo(2.05 * s, 0.72);
  shape.lineTo(2.1 * s, 1.08);
  shape.lineTo(0.38 * s, 1.02);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
  // Shape lies in XY; lay it flat into XZ (y → z) and centre the thickness.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0.035, 0);
  geometry.rotateZ(0.07 * s);
  return geometry;
}

function fin(side: 1 | -1): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(0.82, 0);
  shape.lineTo(1.55, 0);
  shape.lineTo(1.6, 0.72);
  shape.lineTo(1.35, 0.72);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  // Shape is in the ZY plane after rotating around Y.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(0.025, 0.12, 0);
  geometry.rotateZ(-0.32 * side);
  geometry.translate(0.32 * side, 0, 0);
  return geometry;
}

export function createShipGeometries(): ShipGeometries {
  const canopy = new SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  canopy.scale(1, 0.85, 2.1);
  canopy.translate(0, 0.24, -0.5);

  const engine = new CylinderGeometry(0.2, 0.25, 0.95, 8);
  engine.rotateX(Math.PI / 2);

  const nozzle = new CylinderGeometry(0.17, 0.17, 0.04, 12);
  nozzle.rotateX(Math.PI / 2);

  // Flame points along +Z (behind the ship), tip at z = 1.
  const flame = new ConeGeometry(0.16, 1, 12, 1, true);
  flame.rotateX(-Math.PI / 2);
  flame.translate(0, 0, 0.5);

  const tip = new CylinderGeometry(0.07, 0.07, 0.5, 6);
  tip.rotateX(Math.PI / 2);

  return {
    fuselage: fuselage(),
    canopy,
    wingLeft: wing(-1),
    wingRight: wing(1),
    finLeft: fin(-1),
    finRight: fin(1),
    engine,
    nozzle,
    flame,
    tip,
  };
}

export function disposeShipGeometries(geometries: ShipGeometries): void {
  for (const geometry of Object.values(geometries)) geometry.dispose();
}
