// Lucario sprite atlas: 5x5 cells, 32x32 pixels each.
import * as THREE from "three";

export const LUCARIO_NEAR = 5;
export const LUCARIO_RADIUS = 1.45;

const GRID = 5;
const FRAME_TIME = 360;
const POSES = {
  idle: [1],
  horizontal: [6, 7, 8],
  verticalDown: [0, 1, 2],
  verticalUp: [3, 4],
  diagonal: [10, 11, 12, 13, 14],
  pet: [17],
  aura: [16],
};

function createAura() {
  const canvas = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
  const ctx = canvas.getContext("2d");
  const glow = ctx.createRadialGradient(32, 32, 5, 32, 32, 31);
  glow.addColorStop(0, "rgba(66, 174, 255, 0.04)");
  glow.addColorStop(0.55, "rgba(66, 174, 255, 0.22)");
  glow.addColorStop(0.78, "rgba(123, 211, 255, 0.62)");
  glow.addColorStop(1, "rgba(66, 174, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const aura = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.08;
  aura.visible = false;
  aura.renderOrder = 9;
  return aura;
}

export function createLucario() {
  const texture = new THREE.TextureLoader().load("/assets/lucario/lucario-sprites.png");
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.repeat.set(1 / GRID, 1 / GRID);

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.48, 0);
  const material = new THREE.MeshLambertMaterial({
    map: texture, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    map: texture, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking,
  });
  mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: 0.5 });
  mesh.castShadow = true;
  mesh.scale.set(4.5, 4.5, 1);

  const aura = createAura();
  let pose = "idle";
  let facing = -1;
  let lastFrame = -1;
  let lastPose = "idle";

  const setFrame = (frame) => {
    if (frame === lastFrame) return;
    lastFrame = frame;
    const col = frame % GRID;
    const row = Math.floor(frame / GRID);
    texture.repeat.set(facing < 0 ? 1 / GRID : -1 / GRID, 1 / GRID);
    texture.offset.set(facing < 0 ? col / GRID : (col + 1) / GRID, 1 - (row + 1) / GRID);
  };

  return {
    mesh,
    aura,
    setFacing(direction) {
      const next = direction < 0 ? -1 : 1;
      if (next !== facing) { facing = next; lastFrame = -1; }
    },
    setPose(next) {
      const safe = POSES[next] ? next : "idle";
      if (safe !== pose) { pose = safe; lastPose = safe; lastFrame = -1; }
    },
    setDirection(dx, dz) {
      // Horizontal travel uses the established side-walk frames. Vertical and
      // diagonal travel use their own atlas poses instead of flipping every turn.
      if (Math.abs(dx) > Math.abs(dz) * 1.35) {
        pose = "horizontal";
        this.setFacing(dx < 0 ? -1 : 1);
      } else if (Math.abs(dz) > Math.abs(dx) * 1.35) {
        pose = dz < 0 ? "verticalUp" : "verticalDown";
        this.setFacing(-1);
      } else {
        pose = "diagonal";
        this.setFacing(dx < 0 ? -1 : 1);
      }
      if (pose !== lastPose) { lastPose = pose; lastFrame = -1; }
    },
    update(t) {
      const frames = POSES[pose] || POSES.idle;
      const frame = frames[Math.floor(t / FRAME_TIME) % frames.length];
      setFrame(frame);
      const active = pose === "aura";
      aura.visible = active;
      if (active) {
        const pulse = 1 + 0.045 * Math.sin(t / 420);
        aura.scale.set(pulse, pulse, 1);
        aura.material.opacity = 0.68 + 0.12 * Math.sin(t / 620);
      }
    },
  };
}
