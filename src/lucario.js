// Lucario: an original, code-drawn pixel-art NPC. Its route and room-clock animation
// are driven by src/main.js so every player sees it in the same place.
import * as THREE from "three";

export const LUCARIO_NEAR = 5;
export const LUCARIO_RADIUS = 1.45;

const SIZE = 32;
const SCALE = 2;
const FRAMES = 4;

const COLORS = {
  outline: "#171923",
  blue: "#2878bd",
  blueLight: "#55b5e8",
  blueDark: "#1b4f8d",
  black: "#20232d",
  blackLight: "#414957",
  cream: "#f1dfb9",
  creamShade: "#cbb78f",
  red: "#e64d55",
  white: "#f7f4ec",
};

function drawFrame(ctx, frame) {
  const pixels = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const rect = (x, y, w, h, color) => {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) pixels[py][px] = color;
  };

  const bob = frame === 2 ? 1 : 0;
  const stride = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const y = (n) => n - bob;

  // Long ears and the head silhouette. Lucario is drawn in profile, facing left.
  rect(9, y(1), 4, 9, COLORS.blueDark);
  rect(10, y(1), 2, 6, COLORS.black);
  rect(18, y(2), 4, 8, COLORS.blueDark);
  rect(19, y(2), 2, 5, COLORS.black);
  rect(8, y(7), 14, 9, COLORS.blue);
  rect(10, y(6), 10, 2, COLORS.blueLight);
  rect(7, y(10), 4, 4, COLORS.blueLight);
  rect(8, y(9), 13, 5, COLORS.black);
  rect(11, y(10), 2, 1, frame === 3 ? COLORS.blackLight : COLORS.red);
  rect(8, y(13), 5, 2, COLORS.blueDark);
  rect(8, y(12), 3, 1, COLORS.white);

  // Neck, torso and the distinctive cream chest tuft.
  rect(13, y(14), 9, 10, COLORS.blue);
  rect(14, y(15), 6, 8, COLORS.cream);
  rect(15, y(16), 4, 6, COLORS.creamShade);
  rect(18, y(16), 4, 2, COLORS.cream);
  rect(19, y(17), 3, 2, COLORS.cream);
  rect(21, y(17), 3, 2, COLORS.black);
  rect(22, y(18), 2, 2, COLORS.blackLight);

  // Arms, wrists and the small hand spikes.
  rect(10, y(16), 4, 6, COLORS.blueDark);
  rect(8, y(19 + stride), 4, 3, COLORS.black);
  rect(7, y(18 + stride), 2, 2, COLORS.blueLight);
  rect(7, y(21 + stride), 3, 1, COLORS.blackLight);
  rect(21, y(19 - stride), 4, 3, COLORS.blueDark);
  rect(23, y(20 - stride), 3, 2, COLORS.black);

  // Legs and feet alternate while walking; idle and interaction keep a grounded stance.
  const leftLeg = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  rect(13, y(22 + leftLeg), 4, 6, COLORS.blueDark);
  rect(12, y(27 + leftLeg), 6, 2, COLORS.black);
  rect(19, y(22 - leftLeg), 4, 6, COLORS.blue);
  rect(19, y(27 - leftLeg), 6, 2, COLORS.black);
  rect(13, y(27 + leftLeg), 2, 1, COLORS.blackLight);
  rect(21, y(27 - leftLeg), 2, 1, COLORS.blackLight);

  // The outline is derived from neighbouring transparent pixels, keeping crisp pixel edges.
  const outlined = pixels.map((row) => row.slice());
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      if (!pixels[py][px] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => pixels[py + dy]?.[px + dx]))
        outlined[py][px] = COLORS.outline;
    }
  }

  const x0 = frame * SIZE * SCALE;
  for (let py = 0; py < SIZE; py++)
    for (let px = 0; px < SIZE; px++)
      if (outlined[py][px]) {
        ctx.fillStyle = outlined[py][px];
        ctx.fillRect(x0 + px * SCALE, py * SCALE, SCALE, SCALE);
      }
}

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
  const canvas = Object.assign(document.createElement("canvas"), { width: SIZE * SCALE * FRAMES, height: SIZE * SCALE });
  const ctx = canvas.getContext("2d");
  for (let frame = 0; frame < FRAMES; frame++) drawFrame(ctx, frame);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(1 / FRAMES, 1);

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.45, 0);
  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking });
  mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: 0.5 });
  mesh.castShadow = true;
  mesh.scale.set(5.5, 5.5, 1);

  const aura = createAura();
  let facing = -1;
  let pose = "idle";

  const setFrame = (frame) => {
    texture.repeat.x = -facing / FRAMES;
    texture.offset.x = (facing < 0 ? frame : frame + 1) / FRAMES;
  };

  return {
    mesh,
    aura,
    setFacing(direction) {
      facing = direction < 0 ? -1 : 1;
    },
    setPose(next) {
      pose = next;
    },
    update(t) {
      if (pose === "walk") setFrame(1 + (Math.floor(t / 220) % 2));
      else if (pose === "pet" || pose === "aura") setFrame(3);
      else setFrame(t % 3600 < 140 ? 3 : 0);

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
