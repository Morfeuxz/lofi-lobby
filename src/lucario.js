// Lucario's sprite atlas is a 5x5 grid of individually cut 32px frames.
// Only the front idle, side-walk and two interaction poses are animated/used.
import * as THREE from "three";

export const LUCARIO_NEAR = 5;
export const LUCARIO_RADIUS = 1.45;

const CELL = 32;
const GRID = 5;
const FRAME_TIME = 320;

// Atlas order follows the supplied sheet, row by row.
// 1: neutral front pose; 6-8: horizontal walking cycle;
// 17: head tucked/face hidden (pet reaction); 16: raised-arm aura pose.
const POSES = {
  idle: [1],
  walk: [6, 7, 8],
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
  // Keep alpha-tested pixels opaque to the renderer. Transparent atlas pixels are
  // discarded, not blended, so lights and shadows cannot shine through the sprite.
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    alphaTest: 0.5,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    map: texture, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking,
  });
  mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: 0.5 });
  mesh.castShadow = true;
  mesh.scale.set(4.5, 4.5, 1);

  const aura = createAura();
  let facing = -1;
  let pose = "idle";
  let lastFrame = -1;

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
      if (next !== facing) {
        facing = next;
        lastFrame = -1;
      }
    },
    setPose(next) {
      const safe = POSES[next] ? next : "idle";
      if (safe !== pose) {
        pose = safe;
        lastFrame = -1;
      }
    },
    // Uses the shared room clock, just like the capybara. Three slow frames
    // create a calm walk; interaction poses are single-frame and stay still.
    update(t) {
      const frames = POSES[pose];
      const frame = pose === "walk"
        ? frames[Math.floor(t / FRAME_TIME) % frames.length]
        : frames[0];
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
