import { Vector3 } from "three";
import type { AsteroidFieldParams, EnergyStarParams, RingCourseParams } from "@/game/data/missions";
import type { Vec3Tuple } from "@/game/data/planets";
import { TAU } from "./math";
import { createRandom } from "./random";

export interface RingSpec {
  index: number;
  position: Vector3;
  /** Travel direction through the ring (ring plane normal). */
  normal: Vector3;
  /** Radial "up" away from the planet. */
  up: Vector3;
  radius: number;
}

export interface SpawnPoint {
  position: Vector3;
  forward: Vector3;
  up: Vector3;
}

export interface AsteroidSpec {
  position: Vector3;
  radius: number;
  /** Seed for per-instance rotation/shape variation. */
  seed: number;
}

export interface PickupSpec {
  position: Vector3;
}

export interface CourseLayout {
  rings: RingSpec[];
  spawn: SpawnPoint;
  /** Racing line samples from spawn to the last ring. */
  path: Vector3[];
  pathLength: number;
}

const PATH_SAMPLES = 240;
const TANGENT_EPSILON = 1e-3;

export function toVector(tuple: Vec3Tuple): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

/** Builds the orbital frame: e1 points at the sun projected into the plane. */
function orbitalFrame(params: RingCourseParams, sunDirection: Vec3Tuple) {
  const normal = toVector(params.planeNormal).normalize();
  const sun = toVector(sunDirection).normalize();
  const e1 = sun.clone().addScaledVector(normal, -sun.dot(normal));
  if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
  e1.normalize();
  const e2 = new Vector3().crossVectors(normal, e1).normalize();
  return { normal, e1, e2, center: toVector(params.center) };
}

export function createCoursePath(params: RingCourseParams, sunDirection: Vec3Tuple) {
  const frame = orbitalFrame(params, sunDirection);
  const theta0 = params.startAngleFromSun;

  const pointAt = (theta: number, target = new Vector3()): Vector3 => {
    const rel = theta - theta0;
    const radius = params.baseRadius + params.radialWobble * Math.sin(params.radialWobbleFrequency * rel);
    const height = params.heightWave * Math.sin(params.heightWaveFrequency * rel);
    return target
      .copy(frame.center)
      .addScaledVector(frame.e1, radius * Math.cos(theta))
      .addScaledVector(frame.e2, radius * Math.sin(theta))
      .addScaledVector(frame.normal, height);
  };

  const tangentAt = (theta: number, target = new Vector3()): Vector3 => {
    const ahead = pointAt(theta + TANGENT_EPSILON);
    const behind = pointAt(theta - TANGENT_EPSILON);
    return target.subVectors(ahead, behind).normalize();
  };

  const upAt = (theta: number, tangent: Vector3, target = new Vector3()): Vector3 => {
    pointAt(theta, target).sub(frame.center);
    target.addScaledVector(tangent, -target.dot(tangent));
    return target.normalize();
  };

  const ringAngle = (index: number) => theta0 + (params.arc * TAU * (index + 1)) / params.ringCount;

  return { frame, theta0, pointAt, tangentAt, upAt, ringAngle };
}

export function generateCourse(params: RingCourseParams, sunDirection: Vec3Tuple): CourseLayout {
  const course = createCoursePath(params, sunDirection);
  const rings: RingSpec[] = [];
  for (let i = 0; i < params.ringCount; i++) {
    const theta = course.ringAngle(i);
    const normal = course.tangentAt(theta);
    rings.push({
      index: i,
      position: course.pointAt(theta),
      normal,
      up: course.upAt(theta, normal),
      radius: params.ringRadius,
    });
  }

  const forward = course.tangentAt(course.theta0);
  const spawn: SpawnPoint = {
    position: course.pointAt(course.theta0),
    forward,
    up: course.upAt(course.theta0, forward),
  };

  const lastTheta = course.ringAngle(params.ringCount - 1);
  const path: Vector3[] = [];
  let pathLength = 0;
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const theta = course.theta0 + ((lastTheta - course.theta0) * i) / PATH_SAMPLES;
    const point = course.pointAt(theta);
    const previous = path[path.length - 1];
    if (previous) pathLength += previous.distanceTo(point);
    path.push(point);
  }

  return { rings, spawn, path, pathLength };
}

const _segment = new Vector3();
const _toPoint = new Vector3();

export function distanceToPolyline(point: Vector3, polyline: readonly Vector3[]): number {
  let best = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    _segment.subVectors(b, a);
    _toPoint.subVectors(point, a);
    const lengthSq = _segment.lengthSq();
    const t = lengthSq > 0 ? Math.min(1, Math.max(0, _toPoint.dot(_segment) / lengthSq)) : 0;
    _toPoint.addScaledVector(_segment, -t);
    best = Math.min(best, _toPoint.length());
  }
  return best;
}

export function generateAsteroids(
  params: AsteroidFieldParams,
  courseParams: RingCourseParams,
  layout: CourseLayout,
  sunDirection: Vec3Tuple,
): AsteroidSpec[] {
  const random = createRandom(params.seed);
  const course = createCoursePath(courseParams, sunDirection);
  const asteroids: AsteroidSpec[] = [];
  const maxAttempts = params.count * 60;
  const lastTheta = course.ringAngle(courseParams.ringCount - 1);

  const overlapsExisting = (position: Vector3, radius: number) =>
    asteroids.some((a) => a.position.distanceTo(position) < a.radius + radius + 4);

  // Asteroids deliberately close to the racing line: a light, readable challenge.
  for (let attempt = 0; attempt < maxAttempts && asteroids.length < params.nearLineCount; attempt++) {
    const theta = random.range(course.theta0 + 0.15, lastTheta);
    const radius = random.range(params.minRadius, params.maxRadius);
    const tangent = course.tangentAt(theta);
    const up = course.upAt(theta, tangent);
    const side = new Vector3().crossVectors(tangent, up).normalize();
    const angle = random.range(0, TAU);
    const offset = params.corridorClearance + radius + params.nearLineDistance * random.next();
    const position = course
      .pointAt(theta)
      .addScaledVector(side, Math.cos(angle) * offset)
      .addScaledVector(up, Math.sin(angle) * offset);
    if (distanceToPolyline(position, layout.path) - radius < params.corridorClearance) continue;
    if (overlapsExisting(position, radius)) continue;
    asteroids.push({ position, radius, seed: random.int(0, 1_000_000) });
  }

  for (let attempt = 0; attempt < maxAttempts && asteroids.length < params.count; attempt++) {
    const theta = random.range(0, TAU);
    const radial = courseParams.baseRadius + random.range(params.radialMin, params.radialMax);
    const height = random.range(-params.heightSpread, params.heightSpread);
    const radius = random.range(params.minRadius, params.maxRadius);
    const position = course.frame.center
      .clone()
      .addScaledVector(course.frame.e1, radial * Math.cos(theta))
      .addScaledVector(course.frame.e2, radial * Math.sin(theta))
      .addScaledVector(course.frame.normal, height);
    if (distanceToPolyline(position, layout.path) - radius < params.corridorClearance) continue;
    if (overlapsExisting(position, radius)) continue;
    asteroids.push({ position, radius, seed: random.int(0, 1_000_000) });
  }

  return asteroids;
}

export function generateEnergyStars(
  params: EnergyStarParams,
  courseParams: RingCourseParams,
  sunDirection: Vec3Tuple,
): PickupSpec[] {
  const course = createCoursePath(courseParams, sunDirection);
  return params.afterRings.map((ringIndex, i) => {
    const theta = (course.ringAngle(ringIndex) + course.ringAngle(ringIndex + 1)) / 2;
    const tangent = course.tangentAt(theta);
    const up = course.upAt(theta, tangent);
    const side = new Vector3().crossVectors(tangent, up).normalize();
    const direction = i % 2 === 0 ? 1 : -1;
    return { position: course.pointAt(theta).addScaledVector(side, params.sideOffset * direction) };
  });
}

const _relPrev = new Vector3();
const _relCurr = new Vector3();
const _hit = new Vector3();

/**
 * True when the segment prev→curr crosses the disc (ring opening) defined by
 * center/normal/radius. Works at any speed (no tunnelling) and in both directions.
 */
export function segmentCrossesDisc(
  prev: Vector3,
  curr: Vector3,
  center: Vector3,
  normal: Vector3,
  radius: number,
): boolean {
  _relPrev.subVectors(prev, center);
  _relCurr.subVectors(curr, center);
  const d0 = _relPrev.dot(normal);
  const d1 = _relCurr.dot(normal);
  if (d0 === d1) return false;
  if (d0 > 0 && d1 > 0) return false;
  if (d0 < 0 && d1 < 0) return false;
  if (d0 === 0) return false;
  const t = d0 / (d0 - d1);
  _hit.copy(_relPrev).lerp(_relCurr, t);
  return _hit.lengthSq() <= radius * radius;
}
