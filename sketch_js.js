// ── Tunable parameters ──────────────────────────────────────────────
// Atmosphere
let bgColor = [2, 1, 4];              // deep space black
let trailAlpha = 12;                   // trail persistence

// Particle population
let particleCount = 4000;

// Motion
let particleVelocityMin = 0.6;
let particleVelocityMax = 2.5;
let particleAngleMin = -8;
let particleAngleMax = 8;
let particleAngleVariation = 0.01;
let particleVelocityVariation = 0.3;
let rotationalStrength = 0.008;
let dragFactor = 1.0;

// Depth (z-axis)
let zMin = -100;
let zMax = 100;

// Forces
let attractionStrength = 0.006;
let repulsionStrength = 0.035;
let attractorAngleVariation = 0.01;
let attractorBoundaryMargin = 50;
let attractorCircleRadius = 40;

// Touch interaction
let touchAttractor = null;
let touchAttractionStrength = 0.1;

// Trail (per-particle history)
let tailLength = 8;

// ── Psychedelic palette (RGB) — blue dominant, fire accents ──
const PALETTE = [
  [0, 38, 255],      // deep electric blue
  [0, 102, 255],     // bright blue
  [0, 179, 255],     // cyan-blue
  [0, 77, 230],      // dark blue
  [255, 25, 0],      // hot red
  [255, 128, 0],     // orange
  [255, 230, 50],    // yellow-white burst
  [255, 50, 0],      // red-orange
  [50, 0, 204],      // violet
  [0, 38, 255],      // back to deep blue (wraps)
];

function paletteColor(t) {
  t = ((t % 1.0) + 1.0) % 1.0;
  let idx = t * (PALETTE.length - 1);
  let i = floor(idx);
  let f = idx - i;
  // Smoothstep for organic blending
  f = f * f * (3 - 2 * f);
  let a = PALETTE[i], b = PALETTE[min(i + 1, PALETTE.length - 1)];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// ── State ───────────────────────────────────────────────────────────
let particles = [];
let attractors = [];
let repulsors = [];
let capturer;
let recording = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  background(bgColor[0], bgColor[1], bgColor[2]);

  // Disable default touch behavior on mobile
  window.addEventListener('touchmove', function (event) {
    event.preventDefault();
  }, { passive: false });

  // Attractors
  let attractorCount = 13;
  for (let i = 0; i < attractorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    attractors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
  }

  // Repulsors
  let repulsorCount = 3;
  for (let i = 0; i < repulsorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    repulsors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
  }

  // Initial particles
  for (let i = 0; i < particleCount; i++) {
    let angle = random(particleAngleMin, particleAngleMax);
    let velocity = random(particleVelocityMin, particleVelocityMax);
    angle += random(-particleAngleVariation, particleAngleVariation);
    velocity += random(-particleVelocityVariation, particleVelocityVariation);
    let vel = p5.Vector.fromAngle(angle);
    vel.mult(velocity);
    let z = random(zMin, zMax);
    particles.push(new Particle(width * 0.5, height * 0.5, z, vel));
  }
}

function draw() {
  // Semi-transparent background overlay — creates trail persistence
  noStroke();
  fill(bgColor[0], bgColor[1], bgColor[2], trailAlpha);
  rect(0, 0, width, height);

  // Update & draw particles
  for (let particle of particles) {
    particle.update();
    particle.display();
  }

  // Orbit attractors
  for (let attractor of attractors) {
    attractor.angle += attractorAngleVariation;
    attractor.position.x = attractor.circleCenter.x + cos(attractor.angle) * attractorCircleRadius;
    attractor.position.y = attractor.circleCenter.y + sin(attractor.angle) * attractorCircleRadius;
  }

  // Orbit repulsors
  for (let repulsor of repulsors) {
    repulsor.angle += attractorAngleVariation;
    repulsor.position.x = repulsor.circleCenter.x + cos(repulsor.angle) * attractorCircleRadius;
    repulsor.position.y = repulsor.circleCenter.y + sin(repulsor.angle) * attractorCircleRadius;
  }

  // Recording support
  if (keyIsPressed && key === 'r') {
    recording = !recording;
    if (recording) { capturer.start(); } else { capturer.stop(); capturer.save(); }
  }
  if (recording) {
    capturer.capture(document.getElementById('defaultCanvas0'));
  }
}

// ── Interaction ─────────────────────────────────────────────────────
function mousePressed()  { touchAttractor = createVector(mouseX, mouseY); }
function mouseDragged()  { touchAttractor.x = mouseX; touchAttractor.y = mouseY; }
function mouseReleased() { touchAttractor = null; moveNearestAttractor(mouseX, mouseY); }
function touchStarted()  { touchAttractor = createVector(mouseX, mouseY); }
function touchMoved()    { touchAttractor.x = mouseX; touchAttractor.y = mouseY; }
function touchEnded()    { touchAttractor = null; moveNearestAttractor(mouseX, mouseY); }

function moveNearestAttractor(x, y) {
  let minDistance = Infinity;
  let nearestAttractor = null;
  for (let attractor of attractors) {
    let distance = dist(x, y, attractor.position.x, attractor.position.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestAttractor = attractor;
    }
  }
  if (nearestAttractor) {
    nearestAttractor.position.x = x;
    nearestAttractor.position.y = y;
    nearestAttractor.circleCenter.x = x;
    nearestAttractor.circleCenter.y = y;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(bgColor[0], bgColor[1], bgColor[2]);
}

// ── Particle class ──────────────────────────────────────────────────
class Particle {
  constructor(x, y, z, vel) {
    this.pos = createVector(x, y, z);
    this.vel = vel;
    this.acc = createVector();
    this.history = [];
    this.depthFactor = map(z, zMin, zMax, 0, 1);
    this.noiseOffset = random(1000);
  }

  update() {
    // Attraction
    for (let attractor of attractors) {
      let force = p5.Vector.sub(attractor.position, this.pos);
      force.normalize();
      force.mult(attractionStrength);
      this.acc.add(force);
    }

    // Repulsion
    for (let repulsor of repulsors) {
      let force = p5.Vector.sub(this.pos, repulsor.position);
      let distance = force.mag();
      force.normalize();
      force.mult(repulsionStrength / (distance * distance));
      this.acc.add(force);
    }

    // Touch attractor
    if (touchAttractor) {
      let force = p5.Vector.sub(touchAttractor, this.pos);
      force.normalize();
      force.mult(touchAttractionStrength);
      this.acc.add(force);
    }

    // Rotational force
    let rotationalForce = createVector(this.pos.y - height / 2, -(this.pos.x - width / 2));
    rotationalForce.normalize();
    rotationalForce.mult(rotationalStrength);
    this.acc.add(rotationalForce);

    // Gentle gravity toward center
    let toCenter = createVector(width * 0.5 - this.pos.x, height * 0.5 - this.pos.y);
    let distFromCenter = toCenter.mag();
    let maxDist = dist(0, 0, width * 0.5, height * 0.5);
    let gravityStrength = map(distFromCenter, 0, maxDist, 0, 0.015);
    toCenter.normalize();
    toCenter.mult(gravityStrength);
    this.acc.add(toCenter);

    // Integrate
    this.vel.mult(dragFactor);
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Trail history
    this.history.push(this.pos.copy());
    if (this.history.length > tailLength) {
      this.history.splice(0, 1);
    }
  }

  display() {
    let d = this.depthFactor; // 0 = far, 1 = close

    // ── Hallucinatory color field — overlapping waves ──
    let px = this.pos.x / width;
    let py = this.pos.y / height;
    let t = frameCount * 0.001;

    let wave1 = sin(px * 12.0 + t * 30) * 0.5 + 0.5;
    let wave2 = sin(py * 15.0 - t * 20 + px * 9.0) * 0.5 + 0.5;
    let wave3 = sin((px + py) * 10.0 + t * 15) * 0.5 + 0.5;
    let wave4 = sin(atan2(py - 0.5, px - 0.5) * 3.0 +
                sqrt((px-0.5)*(px-0.5) + (py-0.5)*(py-0.5)) * 18.0 -
                t * 40) * 0.5 + 0.5;

    let hueT = (wave1 * 0.3 + wave2 * 0.25 + wave3 * 0.2 + wave4 * 0.25 +
                this.noiseOffset * 0.00005) % 1.0;
    let [cr, cg, cb] = paletteColor(hueT);

    // Depth-based size and alpha
    let baseSize = map(d, 0, 1, 0.5, 3.5);
    let alpha = map(d, 0, 1, 40, 180);

    // Per-particle pulse
    let pulse = sin(frameCount * 0.02 + this.noiseOffset * 6.0);
    let briPulse = map(pulse, -1, 1, 0.7, 1.0);
    cr *= briPulse;
    cg *= briPulse;
    cb *= briPulse;

    // ── Draw trail ──
    if (this.history.length > 1) {
      for (let i = 0; i < this.history.length - 1; i++) {
        let segT = i / (this.history.length - 1);
        let trailA = alpha * segT * segT * 0.35;
        let trailSize = baseSize * (0.3 + 0.7 * segT);
        stroke(cr, cg, cb, trailA);
        strokeWeight(trailSize);
        let p1 = this.history[i];
        let p2 = this.history[i + 1];
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // ── Soft glow ──
    noStroke();
    let glowSize = baseSize * 3.5;
    fill(cr, cg, cb, alpha * 0.025);
    ellipse(this.pos.x, this.pos.y, glowSize, glowSize);

    // ── Core point ──
    stroke(cr, cg, cb, alpha);
    strokeWeight(baseSize);
    point(this.pos.x, this.pos.y);
  }
}
