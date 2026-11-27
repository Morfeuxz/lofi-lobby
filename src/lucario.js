// Lucario uses the 25 fan-made sprite frames supplied for this project.
// The image atlas is kept in public/assets/lucario/lucario-sprites.png (5x5, 32px cells).
import * as THREE from "three";

export const LUCARIO_NEAR = 5;
export const LUCARIO_RADIUS = 1.45;

const CELL = 32;
const GRID = 5;
const FRAME_COUNT = 25;
const FRAME_TIME = {
  idle: 420,
  walk: 150,
  pet: 260,
  aura: 240,
};
const POSES = {
  idle: [0, 1, 2],
  walk: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  pet: [15, 16, 17, 18, 19],
  aura: [20, 21, 22, 23, 24],
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
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.08;
  mesh.visible = false;
  mesh.renderOrder = 9;
  return mesh;
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
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.08, depthPacking: THREE.RGBADepthPacking });
  mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: 0.08 });
  mesh.castShadow = true;
  mesh.scale.set(4.5, 4.5, 1);

  const aura = createAura();
  let facing = -1;
  let pose = "idle";

  const setFrame = (frame) => {
    const safe = Math.max(0, Math.min(FRAME_COUNT - 1, frame));
    const col = safe % GRID;
    const row = Math.floor(safe / GRID);
    texture.repeat.set(facing < 0 ? 1 / GRID : -1 / GRID, 1 / GRID);
    texture.offset.set(
      facing < 0 ? col / GRID : (col + 1) / GRID,
      1 - (row + 1) / GRID,
    );
  };

  return {
    mesh,
    aura,
    setFacing(direction) {
      facing = direction < 0 ? -1 : 1;
    },
    setPose(next) {
      pose = POSES[next] ? next : "idle";
    },
    update(t) {
      const frames = POSES[pose];
      const frame = frames[Math.floor(t / FRAME_TIME[pose]) % frames.length];
      setFrame(frame);

      const active = pose === "aura";
      aura.visible = active;
      if (active) {
        const pulse = 1 + 0.08 * Math.sin(t / 115);
        aura.scale.set(pulse, pulse, 1);
        aura.material.opacity = 0.72 + 0.18 * Math.sin(t / 170);
      }
    },
  };
}
