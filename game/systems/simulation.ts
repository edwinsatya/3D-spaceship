import { Quaternion, Vector3, type PerspectiveCamera } from "three";
import { audio } from "@/game/audio/audioManager";
import { CAMERA } from "@/game/config/camera";
import { COLLISION, FLIGHT } from "@/game/config/flight";
import { EXPLORATION } from "@/game/config/exploration";
import { HANGAR } from "@/game/config/hangar";
import { MISSION } from "@/game/config/mission";
import { WORLD } from "@/game/config/world";
import type { ControlInput } from "@/game/controls/types";
import { BODIES, type LocationId } from "@/game/data/planets";
import { SHIPS_BY_ID } from "@/game/data/ships";
import { useGameStore, type CameraMode, type GameMode } from "@/game/stores/gameStore";
import { totalStars, useProgressStore } from "@/game/stores/progressStore";
import { locationUnlocked, newlyUnlocked } from "./unlocks";
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
import { segmentCrossesDisc, toVector, type RingSpec } from "./course";
import { arrivalFor, buildEnvironment, referenceUpAt } from "./environment";
import { EMPTY_PAYLOAD, gameEvents, type ObjectiveKind } from "./events";
import { decayKnockback, orientationFromForwardUp, resetShip, updateFlight, type ShipState } from "./flight";
import { disengageOrbit, orbitCandidate } from "./orbit";
import { endOrbit, flyOrbit, toggleOrbit } from "./orbitControl";
import { currentPickups, resetPickups } from "./pickups";
import { createLandingState } from "./landing";
import {
  applyTerrain,
  handlePointsOfInterest,
  landingCandidate,
  nextPointOfInterest,
  requestLanding,
  stepLandingFlow,
} from "./landingFlow";
import { rebaseIfNeeded } from "./floatingOrigin";
import { findDiscovery } from "./discovery";
import { createHintState, updateHints } from "./hints";
import { damp } from "./math";
import { canFly, completeObjective, createMissionState, startCountdown, startImmediately, tickMission } from "./mission";
import { featurePlacement, spinToFace } from "./photo";
import { updatePhotoCamera } from "./photoMode";
import { spinAngle } from "./bodySpin";
import { PHOTO_TARGETS } from "@/game/data/photoTargets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { getMissionLayout, homeSpawn, objectiveTotal, type MissionLayout } from "./missionLayout";
import { createObjectiveState, nearestOpen } from "./objectives";
import { runtime } from "./runtime";
import { rateMission } from "./scoring";
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

/** Auto-level "up": away from the nearest body (the rings' pole over Saturn's rings), flat on a surface. */
function referenceUp(ship: ShipState): Vector3 {
  if (runtime.environment.surface) return _referenceUp.set(0, 1, 0);
  return referenceUpAt(runtime.environment, ship.position, _referenceUp);
}

/** Loads the selected ship's tuning and design into the runtime. */
export function applySelectedShip(): void {
  const definition = SHIPS_BY_ID[resolveShipId(useProgressStore.getState().ships.selected)];
  runtime.flight = flightConfigFor(definition);
  runtime.boost = boostConfigFor(definition);
  runtime.shipDesign = definition.design;
}

const isExploring = (mode: GameMode) => mode !== "mission";

/** Swaps bodies, colliders and lighting (materials share runtime.sun.direction). */
export function applyLocation(location: LocationId): void {
  if (runtime.environment.location === location && !runtime.environment.surface) return;
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
  if (!locationUnlocked(target, totalStars(useProgressStore.getState().missions))) return false;
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
export function enterLocation(location: LocationId): void {
  // Warps never start on a surface; this only guards against a stray location change.
  if (runtime.environment.surface) {
    runtime.landing = createLandingState();
    runtime.terrain = null;
    useGameStore.getState().setSurface(null);
  }
  applyLocation(location);
  const arrival = arrivalFor(location);
  const ship = runtime.ship;
  ship.position.copy(arrival.position);
  ship.previousPosition.copy(arrival.position);
  orientationFromForwardUp(arrival.forward, arrival.up, ship.quaternion);
  ship.knockback.set(0, 0, 0);
  ship.angularVelocity.set(0, 0, 0);
  runtime.origin.copy(arrival.position);
  resetPickups(currentPickups());
  runtime.camera.intro = 1;
  updateChaseCamera(runtime.camera, ship, 0, true);
}

/** Ship hovering at the spawn point for the title screen and hangar. */
export function placeShipForMenu(): void {
  applySelectedShip();
  runtime.landing = createLandingState();
  runtime.terrain = null;
  runtime.layout = null;
  const spawn = homeSpawn();
  resetShip(runtime.ship, spawn.position, spawn.forward, spawn.up);
  runtime.origin.copy(spawn.position);
  runtime.mission = createMissionState(0);
  runtime.gatePassedAt = [];
  applyLocation("earth");
  resetPickups(currentPickups());
  runtime.finishTimer = 0;
  runtime.timeScale = 1;
  runtime.camera.intro = 1;
  runtime.camera.trauma = 0;
  updateMenuCamera(runtime.camera, runtime.ship, runtime.clock);
}

export function beginRun(mode: GameMode, introFromMenu: boolean): void {
  applySelectedShip();
  const layout = mode === "mission" ? getMissionLayout(useGameStore.getState().missionId) : null;
  runtime.layout = layout;
  const spawn = layout?.spawn ?? homeSpawn();
  const ship = runtime.ship;
  resetShip(ship, spawn.position, spawn.forward, spawn.up);
  runtime.origin.copy(spawn.position);

  const session = useSessionStore.getState();
  const total = layout ? objectiveTotal(layout) : 0;
  runtime.mission = createMissionState(total);
  session.reset(total);
  runtime.spinOffsets = {};
  if (layout?.mission.objective.type === "photo") {
    // No race: the clock just runs while you find a good shot.
    startImmediately(runtime.mission);
    session.setStatus("running");
    turnSubjectIntoView(layout);
  } else if (layout) {
    const tick = startCountdown(runtime.mission, MISSION);
    session.setStatus("countdown");
    if (tick.type === "countdown") {
      session.setCountdown(tick.value);
      gameEvents.emit("countdown", { value: tick.value });
    }
  }

  runtime.gatePassedAt = layout ? layout.gates.map(() => -1) : [];
  runtime.objective = createObjectiveState(layout?.collectibles.length ?? 0);
  session.setCarrying(false);
  applyLocation(layout?.mission.location ?? "earth");
  resetPickups(currentPickups());
  runtime.timeScale = 1;
  runtime.finishTimer = 0;
  runtime.freeFlightTime = 0;
  runtime.collisionCooldown = 0;
  runtime.targetOffscreenTime = 0;
  runtime.testFlightRemaining = mode === "testflight" ? HANGAR.testFlightDuration : 0;
  runtime.warp = createWarpState();
  disengageOrbit(runtime.orbit);
  runtime.pendingActions.clear();
  runtime.landing = createLandingState();
  runtime.terrain = null;

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
  tutorial.objective = layout?.mission.objective.type ?? null;
  tutorial.objectivesDone = 0;
  tutorial.timeSinceStart = 0;
  tutorial.orbited = false;
  tutorial.landed = false;
  tutorial.photoOpened = false;
  tutorial.mapOpened = false;
  runtime.hints = createHintState(useProgressStore.getState().onboarding.completedHints);
  runtime.discovered = new Set(useProgressStore.getState().discovered);

  const camera = runtime.camera;
  camera.trauma = 0;
  camera.fov = CAMERA.fov;
  camera.orbitAngle = 0;
  if (introFromMenu) beginIntroBlend(camera);
  else camera.intro = 1;
  updateChaseCamera(camera, ship, 0, true);
}

function stepMenu(realDt: number): void {
  const spawn = homeSpawn();
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
function stepHangar(realDt: number): void {
  const spawn = homeSpawn();
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

function handleCollisions(dt: number): void {
  const ship = runtime.ship;
  runtime.collisionCooldown = Math.max(0, runtime.collisionCooldown - dt);
  const asteroids = runtime.environment.asteroids;
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
  const obstacles = runtime.environment.obstacles;
  for (let i = 0; i < obstacles.length; i++) {
    const prop = obstacles[i];
    const hit = resolveShipSphere(ship, runtime.flight.collisionRadius, prop.center, prop.radius, COLLISION, runtime.flight.maxSpeed);
    impact = Math.max(impact, hit);
  }
  if (impact > 0 && runtime.collisionCooldown <= 0) onCollision(impact);
}

function handlePickups(mode: GameMode, dt: number): void {
  const ship = runtime.ship;
  const { active, respawnIn, collectedAt } = runtime.pickups;
  const pickups = currentPickups();
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

/** `value` is the run's time (ms) or score, matching the mission's rating. */
function finishMission(layout: MissionLayout, value: number, photoUrl?: string): void {
  const { mission: definition } = layout;
  const stars = rateMission(value, definition.rating);
  const progress = useProgressStore.getState();
  const starsBefore = totalStars(progress.missions);
  const outcome = progress.recordMissionResult(definition.id, value, stars);
  const unlocked = newlyUnlocked(starsBefore, totalStars(useProgressStore.getState().missions));
  const session = useSessionStore.getState();
  session.setStatus("finished");
  session.setHint(null);
  session.setResult({ missionId: definition.id, stars, value, photoUrl, unlocked, ...outcome });
  runtime.finishTimer = MISSION.finishDelay;
  gameEvents.emit("missionComplete", { mission: definition.id });
}

/** Records one finished objective; ends the mission after the last one. */
function objectiveDone(layout: MissionLayout, kind: ObjectiveKind): void {
  const mission = runtime.mission;
  const finished = completeObjective(mission);
  useSessionStore.getState().setObjectiveDone(mission.completed);
  gameEvents.emit("objectiveProgress", { kind, done: mission.completed, total: mission.total });
  if (finished) finishMission(layout, mission.elapsedMs);
}

function crossesGate(gate: RingSpec): boolean {
  const ship = runtime.ship;
  return segmentCrossesDisc(ship.previousPosition, ship.position, gate.position, gate.normal, gate.radius);
}

/** Index of the first not-yet-collected item the ship is touching, or -1. */
function touchedCollectible(layout: MissionLayout, radius: number): number {
  const { collected } = runtime.objective;
  const items = layout.collectibles;
  for (let index = 0; index < items.length; index++) {
    if (collected[index]) continue;
    if (spheresOverlap(runtime.ship.position, runtime.flight.collisionRadius, items[index].position, radius)) return index;
  }
  return -1;
}

function collect(index: number): void {
  runtime.objective.collected[index] = true;
  runtime.objective.collectedAt[index] = runtime.clock;
}

function handleObjectives(): void {
  const layout = runtime.layout;
  const mission = runtime.mission;
  if (!layout || mission.status !== "running") return;
  const objective = runtime.objective;
  switch (layout.mission.objective.type) {
    case "rings": {
      const gate = layout.gates[mission.completed];
      if (!gate || !crossesGate(gate)) return;
      runtime.gatePassedAt[gate.index] = runtime.clock;
      objectiveDone(layout, "ring");
      return;
    }
    case "collect": {
      const index = touchedCollectible(layout, MISSION.crystalPickupRadius);
      if (index < 0) return;
      collect(index);
      objectiveDone(layout, "crystal");
      return;
    }
    case "photo":
      // Finished by submitMissionPhoto when a shot is taken in photo mode.
      return;
    case "delivery": {
      if (objective.carrying < 0) {
        const index = touchedCollectible(layout, MISSION.podPickupRadius);
        if (index < 0) return;
        collect(index);
        objective.carrying = index;
        useSessionStore.getState().setCarrying(true);
        gameEvents.emit("cargoLoaded", { index });
        return;
      }
      if (!crossesGate(layout.gates[0])) return;
      objective.carrying = -1;
      runtime.gatePassedAt[0] = runtime.clock;
      useSessionStore.getState().setCarrying(false);
      objectiveDone(layout, "delivery");
    }
  }
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
  tutorial.objectivesDone = mission.completed;
  tutorial.carrying = runtime.objective.carrying >= 0;
  tutorial.steerAmount += (Math.abs(input.pitch) + Math.abs(input.yaw)) * realDt;
  tutorial.throttleRaised ||= input.throttle > runtime.startThrottle + 0.12;
  tutorial.rollUsed ||= Math.abs(input.roll) > 0.5;
  tutorial.boostEnergy = runtime.ship.boost.energy;
  tutorial.targetOffscreenTime = runtime.targetOffscreenTime;
  tutorial.orbitAvailable = runtime.prompts.orbit !== null;
  const land = runtime.prompts.land;
  tutorial.landAvailable = land !== null && BODIES[land].landing.landable;
  tutorial.landed ||= runtime.landing.phase !== "idle";

  const update = updateHints(runtime.hints, tutorial, realDt);
  if (update.changed) useSessionStore.getState().setHint(runtime.hints.active);
  if (update.completed) useProgressStore.getState().completeHint(update.completed);
}

/** Orbit / land requests queued by the input layer (keys or touch buttons). */
function handleActions(controllable: boolean, mode: GameMode): void {
  const actions = runtime.pendingActions;
  if (actions.size === 0) return;
  if (controllable && isExploring(mode)) {
    if (actions.has("orbit") && !runtime.environment.surface) toggleOrbit();
    if (actions.has("land")) requestLanding();
  }
  actions.clear();
}

/** First visit to a body (free flight only): persist, then celebrate. */
function handleDiscovery(mode: GameMode): void {
  if (mode !== "freeflight" || runtime.warp.phase === "tunnel" || runtime.environment.surface) return;
  const found = findDiscovery(
    runtime.ship.position,
    runtime.environment.colliders,
    runtime.discovered,
    EXPLORATION.discoveryDistance,
    EXPLORATION.minDiscoveryDistance,
  );
  if (!found) return;
  runtime.discovered.add(found);
  if (useProgressStore.getState().discover(found)) gameEvents.emit("discovered", { body: found });
}

function updatePrompts(mode: GameMode, controllable: boolean): void {
  const prompts = runtime.prompts;
  const orbit = runtime.orbit;
  const inSpace = !runtime.environment.surface;
  const available = controllable && isExploring(mode) && inSpace;
  const colliders = runtime.environment.colliders;
  prompts.orbit =
    available && !orbit.active ? (orbitCandidate(runtime.ship.position, colliders, EXPLORATION.orbit)?.id ?? null) : null;
  const land = available ? (landingCandidate(runtime.ship.position, colliders)?.id ?? null) : null;
  // The free-flight course circles Earth: a permanent "Can we land on Earth?" button would be noise (L still answers).
  prompts.land = land === "earth" ? null : land;
  prompts.takeOff = controllable && runtime.landing.phase === "surface";
}

function stepFlight(
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
  const scripted = phase === "playing" && stepLandingFlow(realDt, applySelectedShip);
  const controllable = phase === "playing" && !finished && !warping && !scripted;
  input?.update(realDt, controllable);

  if (phase === "playing" && mode === "mission") handleMissionClock(dt);
  const canMove = isExploring(mode) || canFly(mission);
  const control = controllable ? (input?.input ?? IDLE_INPUT) : AUTOPILOT_INPUT;

  handleActions(controllable, mode);
  const orbiting = runtime.orbit.active;
  const boostEvent = scripted
    ? null
    : orbiting
      ? flyOrbit(control, dt)
      : updateFlight(ship, control, dt, { canMove, referenceUp: referenceUp(ship) }, runtime.flight, runtime.boost);
  if (!scripted) {
    const bump = applyTerrain(ship, dt);
    if (bump > 0.25 && runtime.collisionCooldown <= 0) onCollision(bump * 0.6);
  }
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

  if (warpPhase !== "tunnel" && !scripted) handleCollisions(dt);
  if (phase === "playing") handlePointsOfInterest();
  handlePickups(mode, dt);
  if (phase === "playing") handleDiscovery(mode);
  if (mode === "mission") handleObjectives();
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

const _subject = new Vector3();
const _subjectNormal = new Vector3();

/** Photo missions: where the subject is right now (a surface feature turns with its planet). */
export function photoSubject(layout: MissionLayout | null): Vector3 | null {
  if (layout?.mission.objective.type !== "photo") return null;
  const target = PHOTO_TARGETS[layout.mission.objective.target];
  const body = BODIES[target.body];
  if (target.kind === "planet") return _subject.set(...body.position);
  featurePlacement(target, body, spinAngle(body), _subject, _subjectNormal);
  return _subject;
}

/** Spins the subject's planet so the feature faces between the Sun and where you arrive. */
function turnSubjectIntoView(layout: MissionLayout): void {
  if (layout.mission.objective.type !== "photo") return;
  const target = PHOTO_TARGETS[layout.mission.objective.target];
  if (target.kind !== "feature") return;
  const body = BODIES[target.body];
  const toArrival = layout.spawn.position.clone().sub(_subject.set(...body.position)).normalize();
  // The location may not be loaded yet when a run starts: use its sun direction directly.
  const sun = toVector(sunDirectionFor(layout.mission.location));
  const wanted = toArrival.multiplyScalar(0.85).addScaledVector(sun, 0.55).normalize();
  runtime.spinOffsets[body.id] = spinToFace(target, body, wanted) - body.rotationSpeed * runtime.clock;
}

/**
 * Photo missions end with the first shot that has the subject in it.
 * Returns false (and the mission goes on) when the subject is not in the picture.
 */
export function submitMissionPhoto(score: number, photoUrl: string): boolean {
  const layout = runtime.layout;
  if (layout?.mission.objective.type !== "photo" || runtime.mission.status !== "running" || score <= 0) return false;
  completeObjective(runtime.mission);
  useSessionStore.getState().setObjectiveDone(1);
  finishMission(layout, score, photoUrl);
  return true;
}

/** Where the mission wants you next: the next ring, the nearest crystal or pod, or the dock. */
function missionGoal(): Vector3 | null {
  const layout = runtime.layout;
  if (!layout) return null;
  const objective = runtime.objective;
  switch (layout.mission.objective.type) {
    case "rings":
      return layout.gates[runtime.mission.completed]?.position ?? null;
    case "collect":
      return nearestOpen(layout.collectibles, objective.collected, runtime.ship.position);
    case "delivery":
      return objective.carrying >= 0
        ? layout.gates[0].position
        : nearestOpen(layout.collectibles, objective.collected, runtime.ship.position);
    case "photo":
      return photoSubject(layout);
  }
}

function updateTargetIndicator(mode: GameMode, camera: PerspectiveCamera, dt: number): void {
  const target = runtime.target;
  const mission = runtime.mission;
  const ship = runtime.ship;
  let surface = 0;

  if (mode === "mission") {
    const goal = missionGoal();
    if (!goal || mission.status === "finished") {
      target.visible = false;
      runtime.targetOffscreenTime = 0;
      return;
    }
    _targetUniverse.copy(goal);
    target.kind = "ring";
    target.bodyId = null;
    target.returning = false;
  } else if (runtime.environment.surface) {
    if (!nextPointOfInterest(_targetUniverse)) {
      target.visible = false;
      runtime.targetOffscreenTime = 0;
      return;
    }
    target.kind = "poi";
    target.bodyId = null;
    target.returning = false;
  } else {
    const environment = runtime.environment;
    const primary = environment.colliders[0];
    const returnDistance = Math.max(primary.surfaceRadius * EXPLORATION.returnDistance, EXPLORATION.minReturnDistance);
    const far = ship.position.distanceTo(primary.center) > returnDistance;
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
export function stepSimulation(camera: PerspectiveCamera, delta: number): void {
  const { phase, mode, cameraMode } = useGameStore.getState();
  if (phase === "boot" || phase === "loading" || phase === "paused" || phase === "map") {
    if (phase !== "paused") writeTransforms(camera, 0);
    return;
  }
  if (phase === "photo") {
    // The world is frozen (no clock, no physics); only the photo camera moves.
    updatePhotoCamera();
    writeTransforms(camera, 0);
    return;
  }

  const realDt = Math.min(delta, WORLD.maxFrameDelta);
  const targetScale = runtime.finishTimer > 0 ? MISSION.finishTimeScale : 1;
  runtime.timeScale = damp(runtime.timeScale, targetScale, 6, realDt);
  const dt = realDt * runtime.timeScale;
  runtime.clock += dt;

  if (phase === "menu") stepMenu(realDt);
  else if (phase === "hangar") stepHangar(realDt);
  else stepFlight(phase, mode, cameraMode, dt, realDt);

  rebaseIfNeeded(runtime.ship.position, runtime.origin, WORLD.floatingOriginThreshold);
  writeTransforms(camera, realDt);
  if (phase === "playing" || phase === "result") updateTargetIndicator(mode, camera, realDt);
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
