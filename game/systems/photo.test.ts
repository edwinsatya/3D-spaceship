import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { JUPITER, SATURN } from "@/game/data/planets";
import { PHOTO_TARGETS, type FeatureTarget } from "@/game/data/photoTargets";
import {
  applyColorMatrix,
  bodyToWorld,
  featurePlacement,
  filterCss,
  filterMatrix,
  scorePhoto,
  spinToFace,
  textureDirection,
  type PhotoCamera,
} from "./photo";

const redSpot = PHOTO_TARGETS["red-spot"] as FeatureTarget;

/** A camera `distance` away from `point` along `direction`, looking back at it. */
function cameraAt(point: Vector3, direction: Vector3, distance: number, fov = 50): PhotoCamera {
  const position = point.clone().addScaledVector(direction, distance);
  const forward = point.clone().sub(position).normalize();
  const up = new Vector3(0, 1, 0).addScaledVector(forward, -forward.y).normalize();
  return { position, forward, up, fov, aspect: 16 / 9 };
}

describe("planet frames", () => {
  it("maps the texture's top edge to the north pole and u = 0.25 to +z", () => {
    expect(textureDirection(0.3, 90, new Vector3()).y).toBeCloseTo(1);
    const quarter = textureDirection(0.25, 0, new Vector3());
    expect(quarter.z).toBeCloseTo(1);
  });

  it("tilts the pole like the planet group (about Z)", () => {
    const pole = bodyToWorld(new Vector3(0, 1, 0), 0.7, SATURN.axialTilt, new Vector3());
    expect(pole.x).toBeLessThan(0);
    expect(pole.angleTo(new Vector3(0, 1, 0))).toBeCloseTo((SATURN.axialTilt * Math.PI) / 180);
  });

  it("can spin a feature round to face a chosen direction", () => {
    const wanted = new Vector3(0.6, -0.2, 0.75).normalize();
    const spin = spinToFace(redSpot, JUPITER, wanted);
    const position = new Vector3();
    const normal = new Vector3();
    featurePlacement(redSpot, JUPITER, spin, position, normal);
    expect(normal.dot(wanted)).toBeGreaterThan(0.95);
  });
});

describe("photo scoring", () => {
  const sun = new Vector3(0.3, 0.1, 1).normalize();
  const spin = spinToFace(redSpot, JUPITER, sun);
  const spot = new Vector3();
  const normal = new Vector3();
  featurePlacement(redSpot, JUPITER, spin, spot, normal);

  it("loves a close, centred, sunlit, face-on shot of the Great Red Spot", () => {
    const shot = scorePhoto(redSpot, JUPITER, spin, cameraAt(spot, normal, 260), sun);
    expect(shot.score).toBeGreaterThanOrEqual(80);
  });

  it("scores a far-away shot lower", () => {
    const close = scorePhoto(redSpot, JUPITER, spin, cameraAt(spot, normal, 260), sun).score;
    const far = scorePhoto(redSpot, JUPITER, spin, cameraAt(spot, normal, 3000), sun).score;
    expect(far).toBeLessThan(close - 15);
    expect(far).toBeGreaterThan(0);
  });

  it("gives nothing when the spot is round the back of the planet", () => {
    const behind = cameraAt(spot, normal.clone().negate(), JUPITER.radius * 3);
    expect(scorePhoto(redSpot, JUPITER, spin, behind, sun).score).toBe(0);
  });

  it("gives nothing when the camera looks away", () => {
    const camera = cameraAt(spot, normal, 300);
    camera.forward.negate();
    expect(scorePhoto(redSpot, JUPITER, spin, camera, sun).score).toBe(0);
  });

  it("wants Saturn's rings seen from above, all of Saturn in frame", () => {
    const saturn = PHOTO_TARGETS.saturn;
    const center = new Vector3(...SATURN.position);
    const pole = bodyToWorld(new Vector3(0, 1, 0), 0, SATURN.axialTilt, new Vector3());
    const sideways = new Vector3().crossVectors(pole, new Vector3(0, 0, 1)).normalize();
    const above = sideways.clone().multiplyScalar(0.8).addScaledVector(pole, 0.6).normalize();
    const saturnSun = above.clone();
    const good = scorePhoto(saturn, SATURN, 0, cameraAt(center, above, 2200), saturnSun).score;
    const edgeOn = scorePhoto(saturn, SATURN, 0, cameraAt(center, sideways, 2200), saturnSun).score;
    const tooClose = scorePhoto(saturn, SATURN, 0, cameraAt(center, above, 1300), saturnSun).score;
    expect(good).toBeGreaterThanOrEqual(80);
    expect(edgeOn).toBeLessThan(good - 20);
    expect(tooClose).toBeLessThan(good);
  });
});

describe("photo filters", () => {
  it("leaves pixels alone without a filter", () => {
    const pixels = new Uint8ClampedArray([10, 120, 240, 255]);
    applyColorMatrix(pixels, filterMatrix("none"));
    expect(Array.from(pixels)).toEqual([10, 120, 240, 255]);
    expect(filterCss("none")).toBe("none");
  });

  it("turns colours grey in mono", () => {
    const pixels = new Uint8ClampedArray([200, 40, 90, 255]);
    applyColorMatrix(pixels, filterMatrix("mono"));
    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[3]).toBe(255);
  });

  it("describes the same chain in CSS for the preview", () => {
    expect(filterCss("nebula")).toBe("hue-rotate(35deg) saturate(1.35)");
    expect(filterCss("vivid")).toBe("saturate(1.5) contrast(1.12)");
  });
});
