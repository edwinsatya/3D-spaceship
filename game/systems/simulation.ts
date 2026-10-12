import { Quaternion, Vector3, type PerspectiveCamera } from "three";
import { audio } from "@/game/audio/audioManager";
import { CAMERA } from "@/game/config/camera";
import { COLLISION, FLIGHT } from "@/game/config/flight";
import { EXPLORATION } from "@/game/config/exploration";
import { HANGAR } from "@/game/config/hangar";
import { MISSION } from "@/game/config/mission";
import { WORLD } from "@/game/config/world";
import type { ControlInput } from "@/game/controls/types";
import { MISSIONS } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import { SHIPS_BY_ID } from "@/game/data/ships";
import { useGameStore, type CameraMode, type GameMode } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { addBoostEnergy } from "./boost";
import {
  addTrauma,
  applyIntroBlend,
  beginIntroBlend,
  resolveShake,
  updateChaseCamera,
  updateCockpitCamera,
  updateFov,
  updateHangarCamera,
  updateMenuCamera,
  updateOrbitCamera,
  updateResultCamera,
} from "./cameraRig";
import { resolveShipSphere, spheresOverlap } from "./collision";
import { segmentCrossesDisc, type PickupSpec } from "./course";
import { arrivalFor, buildEnvironment } from "./environment";
import { EMPTY_PAYLOAD, gameEvents } from "./events";
import { decayKnockback, getShipForward, orientationFromForwardUp, resetShip, updateFlight, type ShipState } from "./flight";
import type { BoostEvent } from "./boost";
import { advanceOrbit, disengageOrbit, engageOrbit, orbitCandidate, orbitPose } from "./orbit";
import { rebaseIfNeeded } from "./floatingOrigin";
import { createHintState, updateHints } from "./hints";
import { damp, dampFactor } from "./math";
import { canFly, createMissionState, passRing, startCountdown, tickMission } from "./mission";
import type { MissionLayout } from "./missionLayout";
import { runtime } from "./runtime";
import { rateTime } from "./scoring";
import { createWarpState, isWarping, startWarp, tickWarp } from "./warp";
import { boostConfigFor, flightConfigFor, resolveShipId } from "./shipConfig";


const AUTOPILOT_INPUT: ControlInput = { pitch: 0, yaw: 0, roll: 0, throttle: 0.35, boost: false };
const IDLE_INPUT: ControlInput = { pitch: 0, yaw: 0, roll: 0, throttle: 0, boost: false };

const _referenceUp = new Vector3();
const _spawnQuaternion = new Quaternion();
const _wobble = new Quaternion();
const _wobbleAxis = new Vector3(0, 0, 1);
const _turntableAxis = new Vector3(0, 1, 0);
const _cameraPosition = new Vector3();
const _cameraQuaternion = new Quaternion();
const _targetUniverse = new Vector3();
const _ndc = new Vector3();
const _toTarget = new Vector3();
const _cameraForward = new Vector3();
const _orbitForward = new Vector3();
const _orbitPosition = new Vector3();
const _orbitTangent = new Vector3();
const _orbitUp = new Vector3();
const _orbitQuaternion = new Quaternion();

/** Nearest body's radial "up" for auto-level (keeps the horizon level in orbit). */
function referenceUp(ship: ShipState): Vector3 {
  let best = Infinity;
  const colliders = runtime.environment.colliders;
  for (let i = 0; i < colliders.length; i++) {
    const collider = colliders[i];
    const altitude = ship.position.distanceTo(collider.center) - collider.surfaceRadius;
    if (altitude < best) {
      best = altitude;
      _referenceUp.subVectors(ship.position, collider.center);
    }
  }
  return _referenceUp.normalize();
}

/** Loads the selected ship's tuning and design into the runtime. */
export function applySelectedShip(): void {
  const definition = SHIPS_BY_ID[resolveShipId(useProgressStore.getState().ships.selected)];
  runtime.flight = flightConfigFor(definition);
  runtime.boost = boostConfigFor(definition);
  runtime.shipDesign = definition.design;
}

const isExploring = (mode: GameMode) => mode !== "mission";

/** Energy stars of the current location (Earth reuses the mission's stars). */
function currentPickups(layout: MissionLayout): readonly PickupSpec[] {
  return runtime.environment.location === "earth" ? layout.energyStars : runtime.environment.pickups;
}

function resetPickups(pickups: readonly PickupSpec[]): void {
  runtime.pickups.active = pickups.map(() => true);
  runtime.pickups.respawnIn = pickups.map(() => 0);
  runtime.pickups.collectedAt = pickups.map(() => -Infinity);
}

/** Swaps bodies, colliders and lighting (materials share runtime.sun.direction). */
export function applyLocation(location: LocationId): void {
  if (runtime.environment.location === location) return;
  const environment = buildEnvironment(location);
  runtime.environment = environment;
  runtime.sun.direction.copy(environment.sunDirection);
  runtime.sun.size = environment.sunSize;
  runtime.sun.intensity = environment.sunIntensity;
}

/** Starts a warp from the map. Returns false if not allowed right now. */
export function beginWarp(target: LocationId): boolean {
  const game = useGameStore.getState();
  if (game.mode !== "freeflight" || game.location === target) return false;
  if (!startWarp(runtime.warp, target)) return false;
  // The cursor is still on the Warp button: don't steer towards it on arrival.
  runtime.input?.resetForRun();
  endOrbit();
  if (game.phase === "map") game.transition("playing");
  gameEvents.emit("warpStart", { target });
  return true;
}

function stepWarp(dt: number): void {
  const warp = runtime.warp;
  const target = warp.target;
  const event = tickWarp(warp, dt, EXPLORATION.warp);
  // The store change runs enterLocation (GameLoop subscription) synchronously.
  if (event === "switch" && target) useGameStore.getState().setLocation(target);
  if (event === "done") gameEvents.emit("warpArrive", { location: runtime.environment.location });
}

/** Arrive at a location (after a warp): new scene, ship at the arrival point. */
export function enterLocation(location: LocationId, layout: MissionLayout): void {
  applyLocation(location);
  const arrival = arrivalFor(location);
  const ship = runtime.ship;
  ship.position.copy(arrival.position);
  ship.previousPosition.copy(arrival.position);
  orientationFromForwardUp(arrival.forward, arrival.up, ship.quaternion);
  ship.knockback.set(0, 0, 0);
  ship.angularVelocity.set(0, 0, 0);
  runtime.origin.copy(arrival.position);
  resetPickups(currentPickups(layout));
  runtime.camera.intro = 1;
  updateChaseCamera(runtime.camera, ship, 0, true);
}

/** Ship hovering at the spawn point for the title screen and hangar. */
export function placeShipForMenu(layout: MissionLayout): void {
  applySelectedShip();
  const spawn = layout.course.spawn;
  resetShip(runtime.ship, spawn.position, spawn.forward, spawn.up);
  runtime.origin.copy(spawn.position);
  runtime.mission = createMissionState(0);
  runtime.ringPassedAt = layout.course.rings.map(() => -1);
  applyLocation("earth");
  resetPickups(layout.energyStars);
  runtime.finishTimer = 0;
  runtime.timeScale = 1;
  runtime.camera.intro = 1;
  runtime.camera.trauma = 0;
  updateMenuCamera(runtime.camera, runtime.ship, runtime.clock);
}

export function beginRun(mode: GameMode, layout: MissionLayout, introFromMenu: boolean): void {
  applySelectedShip();
  const spawn = layout.course.spawn;
  const ship = runtime.ship;
  resetShip(ship, spawn.position, spawn.forward, spawn.up);
  runtime.origin.copy(spawn.position);

  const session = useSessionStore.getState();
  const totalRings = mode === "mission" ? layout.course.rings.length : 0;
  runtime.mission = createMissionState(totalRings);
  session.reset(totalRings);
  if (mode === "mission") {
    const tick = startCountdown(runtime.mission, MISSION);
    session.setStatus("countdown");
    if (tick.type === "countdown") {
      session.setCountdown(tick.value);
      gameEvents.emit("countdown", { value: tick.value });
    }
  }

  runtime.ringPassedAt = layout.course.rings.map(() => -1);
  applyLocation("earth");
  resetPickups(layout.energyStars);
  runtime.timeScale = 1;
  runtime.finishTimer = 0;
  runtime.freeFlightTime = 0;
  runtime.collisionCooldown = 0;
  runtime.targetOffscreenTime = 0;
  runtime.testFlightRemaining = mode === "testflight" ? HANGAR.testFlightDuration : 0;
  runtime.warp = createWarpState();
  disengageOrbit(runtime.orbit);
  runtime.pendingActions.clear();

  runtime.startThrottle = mode === "mission" ? FLIGHT.missionStartThrottle : FLIGHT.freeFlightStartThrottle;
  runtime.input?.setThrottle(runtime.startThrottle);
  runtime.input?.resetForRun();

  const tutorial = runtime.tutorial;
  tutorial.mode = isExploring(mode) ? "freeflight" : "mission";
  tutorial.steerAmount = 0;
  tutorial.throttleRaised = false;
  tutorial.boostUsed = false;
  tutorial.rollUsed = false;
  tutorial.cameraToggled = false;
  tutorial.pickupsCollected = 0;
  tutorial.collisions = 0;
  tutorial.ringsPassed = 0;
  tutorial.timeSinceStart = 0;
  tutorial.orbited = false;
  tutorial.mapOpened = false;
  runtime.hints = createHintState(useProgressStore.getState().onboarding.completedHints);

  const camera = runtime.camera;
  camera.trauma = 0;
  camera.fov = CAMERA.fov;
  camera.orbitAngle = 0;
  if (introFromMenu) beginIntroBlend(camera);
  else camera.intro = 1;
  updateChaseCamera(camera, ship, 0, true);
}

function stepMenu(layout: MissionLayout, realDt: number): void {
  const spawn = layout.course.spawn;
  const ship = runtime.ship;
  const t = runtime.clock;
  ship.position.copy(spawn.position).addScaledVector(spawn.up, Math.sin(t * 0.9) * 0.25);
  orientationFromForwardUp(spawn.forward, spawn.up, _spawnQuaternion);
  _wobble.setFromAxisAngle(_wobbleAxis, Math.sin(t * 0.6) * 0.06);
  ship.quaternion.copy(_spawnQuaternion).multiply(_wobble);
  ship.previousPosition.copy(ship.position);
  ship.speed = 0;
  ship.velocity.set(0, 0, 0);
  ship.bank = Math.sin(t * 0.6) * 0.05;
  updateMenuCamera(runtime.camera, ship, t);
  applyIntroBlend(runtime.camera, realDt);
  runtime.camera.fov = damp(runtime.camera.fov, CAMERA.fov, CAMERA.fovResponse, realDt);
}

/** Hangar turntable: the ship spins in place over Earth; drag adds spin. */
function stepHangar(layout: MissionLayout, realDt: number): void {
  const spawn = layout.course.spawn;
  const ship = runtime.ship;
  const hangar = runtime.hangar;
  hangar.spin *= Math.exp(-HANGAR.spinDecay * realDt);
  hangar.angle += (HANGAR.autoSpin + hangar.spin) * realDt;
  ship.position.copy(spawn.position).addScaledVector(spawn.up, Math.sin(runtime.clock * 0.9) * 0.15);
  orientationFromForwardUp(spawn.forward, spawn.up, _spawnQuaternion);
  _wobble.setFromAxisAngle(_turntableAxis, hangar.angle);
  ship.quaternion.copy(_spawnQuaternion).multiply(_wobble);
  ship.previousPosition.copy(ship.position);
  ship.speed = 0;
  ship.velocity.set(0, 0, 0);
  ship.bank = 0;
  ship.visualPitch = 0;
  updateHangarCamera(runtime.camera, spawn);
  applyIntroBlend(runtime.camera, realDt);
  runtime.camera.fov = damp(runtime.camera.fov, CAMERA.fov, CAMERA.fovResponse, realDt);
}

function onCollision(strength: number): void {
  const ship = runtime.ship;
  addBoostEnergy(ship.boost, -runtime.boost.collisionPenalty);
  if (ship.boost.active) {
    ship.boost.active = false;
    ship.boost.regenDelay = runtime.boost.regenDelay;
    gameEvents.emit("boostEnd", EMPTY_PAYLOAD);
  }
  addTrauma(runtime.camera, CAMERA.collisionTrauma * strength);
  runtime.collisionCooldown = COLLISION.cooldown;
  runtime.tutorial.collisions += 1;
  gameEvents.emit("collision", { strength });
}

function handleCollisions(layout: MissionLayout, dt: number): void {
  const ship = runtime.ship;
  runtime.collisionCooldown = Math.max(0, runtime.collisionCooldown - dt);
  const asteroids = runtime.environment.location === "earth" ? layout.asteroids : [];
  let impact = 0;
  for (let i = 0; i < asteroids.length; i++) {
    const radius = asteroids[i].radius * COLLISION.asteroidRadiusScale;
    const hit = resolveShipSphere(ship, runtime.flight.collisionRadius, asteroids[i].position, radius, COLLISION, runtime.flight.maxSpeed);
    impact = Math.max(impact, hit);
  }
  const colliders = runtime.environment.colliders;
  for (let i = 0; i < colliders.length; i++) {
    const planet = colliders[i];
    const hit = resolveShipSphere(ship, runtime.flight.collisionRadius, planet.center, planet.radius, COLLISION, runtime.flight.maxSpeed);
    impact = Math.max(impact, hit);
  }
  if (impact > 0 && runtime.collisionCooldown <= 0) onCollision(impact);
}

function handlePickups(layout: MissionLayout, mode: GameMode, dt: number): void {
  const ship = runtime.ship;
  const { active, respawnIn, collectedAt } = runtime.pickups;
  const pickups = currentPickups(layout);
  let nearest = Infinity;
  for (let index = 0; index < pickups.length; index++) {
    if (!active[index]) {
      if (isExploring(mode)) {
        respawnIn[index] -= dt;
        if (respawnIn[index] <= 0) active[index] = true;
      }
      continue;
    }
    const position = pickups[index].position;
    nearest = Math.min(nearest, ship.position.distanceTo(position));
    if (!spheresOverlap(ship.position, runtime.flight.collisionRadius, position, MISSION.pickupRadius)) continue;
    active[index] = false;
    respawnIn[index] = MISSION.pickupRespawn;
    collectedAt[index] = runtime.clock;
    addBoostEnergy(ship.boost, runtime.boost.pickupAmount);
    runtime.tutorial.pickupsCollected += 1;
    gameEvents.emit("pickup", { amount: runtime.boost.pickupAmount });
  }
  runtime.tutorial.nearestPickupDistance = nearest;
}

function finishMission(): void {
  const { missionId } = useGameStore.getState();
  const definition = MISSIONS[missionId];
  const timeMs = runtime.mission.elapsedMs;
  const stars = rateTime(timeMs, definition.starThresholds);
  const outcome = useProgressStore.getState().recordMissionResult(missionId, timeMs, stars);
  const session = useSessionStore.getState();
  session.setStatus("finished");
  session.setHint(null);
  session.setResult({ missionId, timeMs, stars, ...outcome });
  runtime.finishTimer = MISSION.finishDelay;
  gameEvents.emit("missionComplete", { timeMs });
}

function handleRings(layout: MissionLayout): void {
  const mission = runtime.mission;
  if (mission.status !== "running") return;
  const ring = layout.course.rings[mission.nextRing];
  if (!ring) return;
  const ship = runtime.ship;
  if (!segmentCrossesDisc(ship.previousPosition, ship.position, ring.position, ring.normal, ring.radius)) return;
  runtime.ringPassedAt[ring.index] = runtime.clock;
  const finished = passRing(mission);
  useSessionStore.getState().setRingsPassed(mission.nextRing);
  gameEvents.emit("ringPassed", { index: ring.index, total: mission.totalRings });
  if (finished) finishMission();
}

function handleMissionClock(dt: number): void {
  const tick = tickMission(runtime.mission, dt, MISSION);
  if (tick.type === "none") return;
  const session = useSessionStore.getState();
  if (tick.type === "countdown") {
    session.setCountdown(tick.value);
    gameEvents.emit("countdown", { value: tick.value });
  } else {
    session.setCountdown(0);
    session.setStatus("running");
    gameEvents.emit("go", EMPTY_PAYLOAD);
  }
}

function updateTutorial(input: ControlInput, mode: GameMode, realDt: number): void {
  const tutorial = runtime.tutorial;
  const mission = runtime.mission;
  tutorial.device = useGameStore.getState().device;
  tutorial.active =
    isExploring(mode) || mission.status === "countdown" || mission.status === "running";
  tutorial.timeSinceStart = mode === "mission" ? mission.elapsedMs / 1000 : runtime.freeFlightTime;
  tutorial.ringsPassed = mission.nextRing;
  tutorial.steerAmount += (Math.abs(input.pitch) + Math.abs(input.yaw)) * realDt;
  tutorial.throttleRaised ||= input.throttle > runtime.startThrottle + 0.12;
  tutorial.rollUsed ||= Math.abs(input.roll) > 0.5;
  tutorial.boostEnergy = runtime.ship.boost.energy;
  tutorial.targetOffscreenTime = runtime.targetOffscreenTime;
  tutorial.orbitAvailable = runtime.prompts.orbit !== null;

  const update = updateHints(runtime.hints, tutorial, realDt);
  if (update.changed) useSessionStore.getState().setHint(runtime.hints.active);
  if (update.completed) useProgressStore.getState().completeHint(update.completed);
}

function endOrbit(): void {
  if (!runtime.orbit.active) return;
  disengageOrbit(runtime.orbit);
  gameEvents.emit("orbitEnd", EMPTY_PAYLOAD);
}

/** Orbit / land requests queued by the input layer (keys or touch buttons). */
function handleActions(controllable: boolean, mode: GameMode): void {
  const actions = runtime.pendingActions;
  if (actions.size === 0) return;
  if (!controllable || !isExploring(mode)) {
    actions.clear();
    return;
  }
  if (actions.has("orbit")) {
    if (runtime.orbit.active) endOrbit();
    else {
      const candidate = orbitCandidate(runtime.ship.position, runtime.environment.colliders, EXPLORATION.orbit);
      if (candidate?.id) {
        getShipForward(runtime.ship, _orbitForward);
        engageOrbit(runtime.orbit, runtime.ship.position, _orbitForward, candidate, EXPLORATION.orbit);
        runtime.tutorial.orbited = true;
        gameEvents.emit("orbitStart", { body: candidate.id });
      }
    }
  }
  actions.clear();
}

/** Autopilot: ease onto the orbit path, face along it, belly to the planet. */
function flyOrbit(control: ControlInput, dt: number): BoostEvent {
  const orbit = runtime.orbit;
  const ship = runtime.ship;
  const config = EXPLORATION.orbit;
  const steering = Math.max(Math.abs(control.pitch), Math.abs(control.yaw));
  orbit.breakout = steering > config.breakoutInput ? orbit.breakout + dt : 0;
  if (orbit.breakout > config.breakoutTime || control.boost) {
    endOrbit();
    return null;
  }
  advanceOrbit(orbit, dt, config);
  orbitPose(orbit, _orbitPosition, _orbitTangent);
  _orbitUp.subVectors(_orbitPosition, orbit.center).normalize();
  ship.previousPosition.copy(ship.position);
  const follow = orbit.blend < 1 ? dampFactor(1.8 + orbit.blend * 4, dt) : 1;
  ship.position.lerp(_orbitPosition, follow);
  orientationFromForwardUp(_orbitTangent, _orbitUp, _orbitQuaternion);
  ship.quaternion.slerp(_orbitQuaternion, dampFactor(3, dt));
  ship.speed = damp(ship.speed, orbit.speed, 2, dt);
  ship.velocity.copy(_orbitTangent).multiplyScalar(ship.speed);
  ship.angularVelocity.set(0, 0, 0);
  ship.bank = damp(ship.bank, 0, 3, dt);
  ship.visualPitch = damp(ship.visualPitch, 0, 3, dt);
  return null;
}

function updatePrompts(mode: GameMode, controllable: boolean): void {
  const prompts = runtime.prompts;
  const orbit = runtime.orbit;
  const available = controllable && isExploring(mode) && !orbit.active;
  prompts.orbit = available
    ? (orbitCandidate(runtime.ship.position, runtime.environment.colliders, EXPLORATION.orbit)?.id ?? null)
    : null;
}

function stepFlight(
  layout: MissionLayout,
  phase: "playing" | "result",
  mode: GameMode,
  cameraMode: CameraMode,
  dt: number,
  realDt: number,
): void {
  const ship = runtime.ship;
  const mission = runtime.mission;
  const input = runtime.input;
  const finished = mission.status === "finished";
  const warping = isWarping(runtime.warp);
  if (warping && phase === "playing") stepWarp(realDt);
  const controllable = phase === "playing" && !finished && !warping;
  input?.update(realDt, controllable);

  if (phase === "playing" && mode === "mission") handleMissionClock(dt);
  const canMove = isExploring(mode) || canFly(mission);
  const control = controllable ? (input?.input ?? IDLE_INPUT) : AUTOPILOT_INPUT;

  handleActions(controllable, mode);
  const orbiting = runtime.orbit.active;
  const boostEvent = orbiting
    ? flyOrbit(control, dt)
    : updateFlight(ship, control, dt, { canMove, referenceUp: referenceUp(ship) }, runtime.flight, runtime.boost);
  if (boostEvent === "started") {
    runtime.tutorial.boostUsed = true;
    gameEvents.emit("boostStart", EMPTY_PAYLOAD);
  } else if (boostEvent === "ended") {
    gameEvents.emit("boostEnd", EMPTY_PAYLOAD);
  } else if (boostEvent === "denied") {
    gameEvents.emit("boostDenied", EMPTY_PAYLOAD);
  }
  decayKnockback(ship, COLLISION.knockbackDecay, dt);

  const warpPhase = runtime.warp.phase;
  if (warpPhase === "charge" || warpPhase === "tunnel") {
    ship.speed = damp(ship.speed, runtime.flight.boostSpeed * EXPLORATION.warp.speedMultiplier, 2.5, dt);
    if (warpPhase === "tunnel") addTrauma(runtime.camera, 0.4 * dt);
  } else if (warpPhase === "arrive") {
    ship.speed = damp(ship.speed, runtime.flight.maxSpeed * 0.6, 1.5, dt);
  }

  if (warpPhase !== "tunnel") handleCollisions(layout, dt);
  handlePickups(layout, mode, dt);
  if (mode === "mission") handleRings(layout);
  if (isExploring(mode) && phase === "playing") runtime.freeFlightTime += dt;
  if (mode === "testflight" && phase === "playing") {
    runtime.testFlightRemaining = Math.max(0, runtime.testFlightRemaining - realDt);
    if (runtime.testFlightRemaining === 0) useGameStore.getState().endTestFlight();
  }
  if (phase === "playing" && !finished) updateTutorial(control, mode, realDt);

  if (runtime.finishTimer > 0) {
    runtime.finishTimer -= realDt;
    if (runtime.finishTimer <= 0) useGameStore.getState().showResult();
  }

  const camera = runtime.camera;
  if (phase === "result") updateResultCamera(camera, ship, realDt);
  else if (cameraMode === "cockpit") updateCockpitCamera(camera, ship);
  else if (runtime.orbit.active) updateOrbitCamera(camera, ship, runtime.orbit, realDt, runtime.clock);
  else updateChaseCamera(camera, ship, realDt);
  updatePrompts(mode, controllable);
  applyIntroBlend(camera, realDt);
  updateFov(camera, ship, realDt);
}

function updateTargetIndicator(layout: MissionLayout, mode: GameMode, camera: PerspectiveCamera, dt: number): void {
  const target = runtime.target;
  const mission = runtime.mission;
  const ship = runtime.ship;
  let surface = 0;

  if (mode === "mission") {
    const ring = layout.course.rings[mission.nextRing];
    if (!ring || mission.status === "finished") {
      target.visible = false;
      runtime.targetOffscreenTime = 0;
      return;
    }
    _targetUniverse.copy(ring.position);
    target.kind = "ring";
    target.bodyId = null;
    target.returning = false;
  } else {
    const environment = runtime.environment;
    const primary = environment.colliders[0];
    const far = ship.position.distanceTo(primary.center) > primary.surfaceRadius * EXPLORATION.returnDistance;
    const secondary = environment.location === "earth" ? environment.colliders[1] : null;
    const goal = far || !secondary ? primary : secondary;
    if (!far && !secondary) {
      target.visible = false;
      target.returning = false;
      runtime.targetOffscreenTime = 0;
      return;
    }
    _targetUniverse.copy(goal.center);
    surface = goal.surfaceRadius;
    target.kind = "body";
    target.bodyId = goal.id;
    target.returning = far;
  }

  target.visible = true;
  target.distance = Math.max(0, ship.position.distanceTo(_targetUniverse) - surface);
  _toTarget.subVectors(_targetUniverse, runtime.camera.position);
  camera.getWorldDirection(_cameraForward);
  const behind = _toTarget.dot(_cameraForward) < 0;
  _ndc.copy(_targetUniverse).sub(runtime.origin).project(camera);
  let x = behind ? -_ndc.x : _ndc.x;
  let y = behind ? -_ndc.y : _ndc.y;
  const margin = MISSION.targetScreenMargin;
  const onScreen = !behind && Math.abs(x) <= margin && Math.abs(y) <= margin;
  if (!onScreen) {
    if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) y = -1;
    const scale = margin / Math.max(Math.abs(x), Math.abs(y));
    x *= scale;
    y *= scale;
  }
  target.onScreen = onScreen;
  target.x = x;
  target.y = y;
  target.angle = Math.atan2(y, x);
  runtime.targetOffscreenTime = onScreen ? 0 : runtime.targetOffscreenTime + dt;
}

/** One simulation frame. Allocation-free; called from GameLoop's useFrame. */
export function stepSimulation(layout: MissionLayout, camera: PerspectiveCamera, delta: number): void {
  const { phase, mode, cameraMode } = useGameStore.getState();
  if (phase === "boot" || phase === "loading" || phase === "paused" || phase === "map") {
    if (phase !== "paused") writeTransforms(camera, 0);
    return;
  }

  const realDt = Math.min(delta, WORLD.maxFrameDelta);
  const targetScale = runtime.finishTimer > 0 ? MISSION.finishTimeScale : 1;
  runtime.timeScale = damp(runtime.timeScale, targetScale, 6, realDt);
  const dt = realDt * runtime.timeScale;
  runtime.clock += dt;

  if (phase === "menu") stepMenu(layout, realDt);
  else if (phase === "hangar") stepHangar(layout, realDt);
  else stepFlight(layout, phase, mode, cameraMode, dt, realDt);

  rebaseIfNeeded(runtime.ship.position, runtime.origin, WORLD.floatingOriginThreshold);
  writeTransforms(camera, realDt);
  if (phase === "playing" || phase === "result") updateTargetIndicator(layout, mode, camera, realDt);
  else runtime.target.visible = false;

  if (phase !== "menu" && phase !== "hangar") {
    const ship = runtime.ship;
    audio.updateEngine(ship.speed / runtime.flight.maxSpeed, runtime.input?.input.throttle ?? 0, ship.boost.active, realDt);
  }
}

/** Universe → render space for the world root, ship and camera (floating origin). */
function writeTransforms(camera: PerspectiveCamera, realDt: number): void {
  const { worldRoot, ship: shipGroup } = runtime.refs;
  worldRoot?.position.copy(runtime.origin).negate();
  if (shipGroup) {
    shipGroup.position.subVectors(runtime.ship.position, runtime.origin);
    shipGroup.quaternion.copy(runtime.ship.quaternion);
  }
  resolveShake(runtime.camera, realDt, _cameraPosition, _cameraQuaternion);
  camera.position.subVectors(_cameraPosition, runtime.origin);
  camera.quaternion.copy(_cameraQuaternion);
  if (Math.abs(camera.fov - runtime.camera.fov) > 0.01) {
    camera.fov = runtime.camera.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}
