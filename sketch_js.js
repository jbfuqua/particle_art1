// ── Tunable parameters ──────────────────────────────────────────────
// Atmosphere
let bgColor = [3, 1, 5];              // deep space black
let trailAlpha = 8;                    // very low = dense buildup like gas clouds

// Particle population
let particleCount = 8000;

// Motion
let particleVelocityMin = 0.6;
let particleVelocityMax = 2.5;
let particleAngleMin = -8;
let particleAngleMax = 8;
let particleAngleVariation = 0.01;
let particleVelocityVariation = 0.3;
let rotationalStrength = 0.008;
let dragFactor = 1.0;                  // no drag — particles stay energetic

// Depth (z-axis)
let zMin = -100;
let zMax = 100;

// Forces
let attractionStrength = 0.006;         // softer pull — particles spread more
let repulsionStrength = 0.035;          // stronger push — breaks up clumps
let attractorAngleVariation = 0.01;
let attractorBoundaryMargin = 50;
let attractorCircleRadius = 40;

// Touch interaction
let touchAttractor = null;
let touchAttractionStrength = 0.1;

// Trail (per-particle history)
let tailLength = 5;

// Noise-driven color
let hueNoiseScale = 0.003;            // spatial scale of color regions
let hueTimeSpeed = 0.0003;            // how fast colors drift over time
let baseSaturation = 220;             // rich but not neon (0-255)
let minBrightness = 120;
let maxBrightness = 255;

// ── State ───────────────────────────────────────────────────────────
let particles = [];
let attractors = [];
let repulsors = [];
let capturer;
let recording = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 255, 255, 255);
  background(0);

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
  // Semi-transparent background overlay — particles accumulate into dense clouds
  noStroke();
  colorMode(RGB, 255);
  fill(bgColor[0], bgColor[1], bgColor[2], trailAlpha);
  rect(0, 0, width, height);
  colorMode(HSB, 360, 255, 255, 255);

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
  background(0);
}

// ── Particle class ──────────────────────────────────────────────────
class Particle {
  constructor(x, y, z, vel) {
    this.pos = createVector(x, y, z);
    this.vel = vel;
    this.acc = createVector();
    this.history = [];
    this.depthFactor = map(z, zMin, zMax, 0, 1);
    // Per-particle noise offset so they don't all share the same color
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

    // Gentle gravity toward center — stronger the further out, keeps composition framed
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
    let d = this.depthFactor; // 0 = far (small, dim), 1 = close (large, bright)

    // Drifting radial hue gradient — origin orbits, rotation shifts over time
    let t = frameCount * 0.001;
    let originX = width * 0.5 + cos(t * 0.7) * width * 0.15;
    let originY = height * 0.5 + sin(t * 0.5) * height * 0.15;
    let cx = this.pos.x - originX;
    let cy = this.pos.y - originY;
    let angleFromCenter = atan2(cy, cx);
    let hueRotation = t * 30; // whole palette rotates over time
    let baseHue = map(angleFromCenter, -PI, PI, 0, 360) + hueRotation;
    // Noise adds organic variation on top
    let n = noise(
      this.pos.x * hueNoiseScale + this.noiseOffset,
      this.pos.y * hueNoiseScale,
      frameCount * hueTimeSpeed
    );
    let hue = (baseHue + n * 120 - 60) % 360;
    if (hue < 0) hue += 360;

    // Closer particles (high z) are larger and brighter
    let baseSize = map(d, 0, 1, 0.5, 4.0);
    let bri = map(d, 0, 1, minBrightness, maxBrightness);
    let alpha = map(d, 0, 1, 60, 220);

    // Saturation/brightness pulse — each particle pulses at its own phase
    let pulse = sin(frameCount * 0.02 + this.noiseOffset * 6.0);
    let satPulse = baseSaturation * map(pulse, -1, 1, 0.6, 1.0);
    let briPulse = bri * map(pulse, -1, 1, 0.7, 1.0);

    // ── Draw trail ──
    if (this.history.length > 1) {
      for (let i = 0; i < this.history.length - 1; i++) {
        let t = i / (this.history.length - 1);
        let trailA = alpha * t * 0.4;
        let trailSize = baseSize * (0.3 + 0.7 * t);
        stroke(hue, satPulse, briPulse, trailA);
        strokeWeight(trailSize);
        let p1 = this.history[i];
        let p2 = this.history[i + 1];
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // ── Soft glow — scales with particle size ──
    noStroke();
    let glowSize = baseSize * 3;
    fill(hue, satPulse, briPulse, alpha * 0.03);
    ellipse(this.pos.x, this.pos.y, glowSize, glowSize);

    // ── Core point ──
    stroke(hue, satPulse * 0.5, briPulse, alpha);
    strokeWeight(baseSize);
    point(this.pos.x, this.pos.y);
  }
}
