// Lucario #448 sprites from PMDCollab/SpriteCollab.
// Every animation has eight directional rows: down, down-right, right, up-right,
// up, up-left, left, down-left. Frame sizes and timing follow AnimData.xml.
import * as THREE from "three";

export const LUCARIO_NEAR = 5.5;
export const LUCARIO_RADIUS = 1.45;

const TICK_MS = 1000 / 60;
const SHEETS = {
  walk: {
    file: "Walk-Anim.png", columns: 4, rows: 8, frameWidth: 32, frameHeight: 48,
    durations: [6, 6, 6, 6],
  },
  idle: {
    file: "Idle-Anim.png", columns: 6, rows: 8, frameWidth: 32, frameHeight: 56,
    durations: [40, 2, 2, 4, 2, 2],
  },
  pet: {
    file: "Nod-Anim.png", columns: 3, rows: 8, frameWidth: 32, frameHeight: 48,
    durations: [6, 8, 6],
  },
  aura: {
    file: "Charge-Anim.png", columns: 10, rows: 8, frameWidth: 32, frameHeight: 40,
    durations: Array(10).fill(2),
  },
};

// atan2 sectors are ordered right, down-right, down, down-left, left,
// up-left, up, up-right; SpriteCollab rows start at down.
const DIRECTION_ROWS = [2, 1, 0, 7, 6, 5, 4, 3];

function createAura() {
  const canvas = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
  const ctx = canvas.getContext("2d");
  const glow = ctx.createRadialGradient(32, 32, 5, 32, 32, 31);
  glow.addColorStop(0, "rgba(66,174,255,.04)");
  glow.addColorStop(.55, "rgba(66,174,255,.22)");
  glow.addColorStop(.78, "rgba(123,211,255,.62)");
  glow.addColorStop(1, "rgba(66,174,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const aura = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = .08;
  aura.visible = false;
  aura.renderOrder = 9;
  return aura;
}

export function createLucario() {
  const loader = new THREE.TextureLoader();
  const sheets = Object.fromEntries(Object.entries(SHEETS).map(([pose, config]) => {
    const texture = loader.load(`/assets/lucario/${config.file}`);
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.repeat.set(1 / config.columns, 1 / config.rows);
    return [pose, { ...config, texture }];
  }));

  // Crop each animation frame to its opaque pixels and normalize its visible height.
  // The source sheets have different canvas heights (40, 48 and 56 px); using the
  // full cell aspect ratio made Lucario grow/shrink whenever its pose changed.
  const VISIBLE_HEIGHT = 1;
  const frameBounds = (sheet, frame, row) => {
    const image = sheet.texture.image;
    if (!image?.width || !image?.height) return null;
    if (!sheet.alphaPixels) {
      try {
        const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        sheet.alphaPixels = ctx.getImageData(0, 0, image.width, image.height).data;
      } catch { return null; }
    }
    sheet.frameBounds ??= new Map();
    const key = row * sheet.columns + frame;
    if (sheet.frameBounds.has(key)) return sheet.frameBounds.get(key);
    const pixels = sheet.alphaPixels;
    const x0 = frame * sheet.frameWidth, y0 = row * sheet.frameHeight;
    let minX = sheet.frameWidth, minY = sheet.frameHeight, maxX = -1, maxY = -1;
    for (let y = 0; y < sheet.frameHeight; y++) {
      const py = (y0 + y) * image.width;
      for (let x = 0; x < sheet.frameWidth; x++) {
        if (pixels[(py + x0 + x) * 4 + 3] < 32) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;
    // Use the central lower portion to locate the paws, ignoring a tail or aura
    // that may extend below the body at the edge of the frame.
    const footMinX = Math.floor(sheet.frameWidth * .2);
    const footMaxX = Math.ceil(sheet.frameWidth * .8);
    let footY = -1;
    for (let y = maxY; y >= minY && footY < 0; y--) {
      const py = (y0 + y) * image.width;
      for (let x = footMinX; x < footMaxX; x++) {
        if (pixels[(py + x0 + x) * 4 + 3] >= 32) { footY = y; break; }
      }
    }
    if (footY < 0) footY = maxY;
    // A one-pixel transparent border prevents texture filtering from shaving outlines.
    const x = Math.max(0, minX - 1), y = Math.max(0, minY - 1);
    const right = Math.min(sheet.frameWidth - 1, maxX + 1);
    const bottom = Math.min(sheet.frameHeight - 1, maxY + 1);
    const bounds = { x, y, width: right - x + 1, height: bottom - y + 1, footY };
    sheet.frameBounds.set(key, bounds);
    return bounds;
  };
  const geometryFor = (bounds) => {
    const geometry = new THREE.PlaneGeometry(bounds.width / bounds.height, VISIBLE_HEIGHT);
    // PlaneGeometry is centered. Move it so the lower edge of the paw pixels
    // sits at local y=0, which is the mesh's sampled ground position.
    const footFromTop = bounds.footY - bounds.y + 1;
    geometry.translate(0, (footFromTop / bounds.height - .5) * VISIBLE_HEIGHT, 0);
    return geometry;
  };
  const initial = sheets.idle;
  const material = new THREE.MeshLambertMaterial({
    map: initial.texture,
    alphaTest: .5,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometryFor(initial), material);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    map: initial.texture,
    alphaTest: .5,
    depthPacking: THREE.RGBADepthPacking,
  });
  mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({
    map: initial.texture,
    alphaTest: .5,
  });
  mesh.castShadow = true;
  // A modest increase keeps Lucario readable beside the capybara and trainers.
  mesh.scale.set(5.4, 5.4, 1);

  const aura = createAura();
  let pose = "idle";
  let directionRow = 0;
  let lastFrame = -1;
  let poseStartedAt = performance.now();

  let lastSheet = null;
  let lastRow = -1;
  const setFrame = (frame, sheet) => {
    if (frame === lastFrame && sheet === lastSheet && directionRow === lastRow) return;
    const bounds = frameBounds(sheet, frame, directionRow);
    if (!bounds) return; // Keep the previous valid frame until the texture is ready.
    lastFrame = frame;
    lastSheet = sheet;
    lastRow = directionRow;
    const image = sheet.texture.image;
    const x = frame * sheet.frameWidth + bounds.x;
    const y = directionRow * sheet.frameHeight + bounds.y;
    sheet.texture.repeat.set(bounds.width / image.width, bounds.height / image.height);
    sheet.texture.offset.set(x / image.width, 1 - (y + bounds.height) / image.height);
    mesh.geometry.dispose();
    mesh.geometry = geometryFor(bounds);
  };

  const setPose = (next) => {
    const safe = sheets[next] ? next : "idle";
    if (safe === pose) return;
    pose = safe;
    poseStartedAt = performance.now();
    lastFrame = -1;

    const sheet = sheets[pose];
    mesh.geometry.dispose();
    lastSheet = null;
    lastRow = -1;
    material.map = sheet.texture;
    material.needsUpdate = true;
    mesh.customDepthMaterial.map = sheet.texture;
    mesh.customDistanceMaterial.map = sheet.texture;
  };

  return {
    mesh,
    aura,
    setPose,
    setFacing(direction) {
      this.setDirection(direction, 0);
    },
    setDirection(dx, dz) {
      if (Math.abs(dx) < .001 && Math.abs(dz) < .001) return;
      const sector = (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8;
      const next = DIRECTION_ROWS[sector];
      if (next !== directionRow) {
        directionRow = next;
        lastFrame = -1;
      }
    },
    update(t) {
      const sheet = sheets[pose];
      const total = sheet.durations.reduce((sum, ticks) => sum + ticks * TICK_MS, 0);
      let elapsed = Math.max(0, t - poseStartedAt) % total;
      let frame = 0;
      while (frame < sheet.durations.length - 1) {
        const duration = sheet.durations[frame] * TICK_MS;
        if (elapsed < duration) break;
        elapsed -= duration;
        frame++;
      }
      setFrame(frame, sheet);

      const active = pose === "aura";
      aura.visible = active;
      if (active) {
        const pulse = 1 + .045 * Math.sin(t / 420);
        aura.scale.set(pulse, pulse, 1);
        aura.material.opacity = .68 + .12 * Math.sin(t / 620);
      }
    },
  };
}
