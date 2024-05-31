let particles = [];
let attractors = [];
let attractionStrength = 0.01;
let particleCount = 15000;
let particleVelocityMin = 1;
let particleVelocityMax = 6;
let particleAngleMin = -8;
let particleAngleMax = 8;
let particleAngleVariation = 0.01;
let particleVelocityVariation = 0.5;
let zMin = -20;
let zMax = 20;
let attractorSpeed = 0.5;
let attractorAngleVariation = 0.01;
let attractorBoundaryMargin = 50;
let attractorCircleRadius = 40;
let particleLimit = 20000;
let particleDestroyedCount = 0;
let particleDestroyedThreshold = 2000;
let touchAttractor = null;
let touchAttractionStrength = 0.1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);

  // Disable default touch behavior on mobile devices
  window.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, { passive: false });

  // Create the attractors with random but distributed positions
  let attractorCount = 9;
  for (let i = 0; i < attractorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    attractors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
  }

  // Create initial particles
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
  background(200);
  let particleCountThreshold = particleCount - particleDestroyedThreshold;

  // Create new particles in batches if the particle count is below the limit and the destroyed count exceeds the threshold
  if (particles.length < particleLimit && particles.length <= particleCountThreshold) {
    for (let i = 0; i < particleDestroyedThreshold*2; i++) {
      let angle = random(particleAngleMin, particleAngleMax);
      let velocity = random(particleVelocityMin, particleVelocityMax);
      angle += random(-particleAngleVariation, particleAngleVariation);
      velocity += random(-particleVelocityVariation, particleVelocityVariation);
      let vel = p5.Vector.fromAngle(angle);
      vel.mult(velocity);
      let z = random(zMin, zMax);
      particles.push(new Particle(width * 0.5, height * 0.5, z, vel));
    }
    particleDestroyedCount = 0;
  }

  for (let particle of particles) {
    particle.update();
    particle.display();
  }

  // Remove particles that have gone off the screen
  let initialLength = particles.length;
  particles = particles.filter(particle => particle.isOnScreen());
  particleDestroyedCount += initialLength - particles.length;

  // Move attractors in small circles around their point of creation
  for (let attractor of attractors) {
    let circleCenter = attractor.circleCenter;
    attractor.angle += attractorAngleVariation;
    let x = circleCenter.x + cos(attractor.angle) * attractorCircleRadius;
    let y = circleCenter.y + sin(attractor.angle) * attractorCircleRadius;
    attractor.position.x = x;
    attractor.position.y = y;
  }

  // Display attractors as transparent dots
  for (let attractor of attractors) {
    strokeWeight(2);
    fill(255, 0, 0, 150); // Set the fill color to red with transparency (alpha value of 150)
    point(attractor.position.x, attractor.position.y);
  }

  // Display touch attractor as a transparent dot
  if (touchAttractor) {
    strokeWeight(8);
    fill(0, 255, 0, 150); // Set the fill color to green with transparency (alpha value of 150)
    point(touchAttractor.x, touchAttractor.y);
  }
}

function mousePressed() {
  touchAttractor = createVector(mouseX, mouseY);
}

function mouseDragged() {
  touchAttractor.x = mouseX;
  touchAttractor.y = mouseY;
}

function mouseReleased() {
  touchAttractor = null;
  moveNearestAttractor(mouseX, mouseY);
}

function touchStarted() {
  touchAttractor = createVector(mouseX, mouseY);
}

function touchMoved() {
  touchAttractor.x = mouseX;
  touchAttractor.y = mouseY;
}

function touchEnded() {
  touchAttractor = null;
  moveNearestAttractor(mouseX, mouseY);
}

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

class Particle {
  constructor(x, y, z, vel) {
    this.pos = createVector(x, y, z);
    this.vel = vel;
    this.acc = createVector();
  }

  update() {
    // Calculate attraction forces from the attractors
    for (let attractor of attractors) {
      let force = p5.Vector.sub(attractor.position, this.pos);
      force.normalize();
      force.mult(attractionStrength);
      this.acc.add(force);
    }

    // Calculate attraction force from the touch attractor
    if (touchAttractor) {
      let force = p5.Vector.sub(touchAttractor, this.pos);
      force.normalize();
      force.mult(touchAttractionStrength);
      this.acc.add(force);
    }

    // Update velocity and position
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  display() {
    // Calculate grayscale value based on z-coordinate
    let grayscale = map(this.pos.z, zMin, zMax, 0, 255);
    stroke(grayscale);
    point(this.pos.x, this.pos.y);
  }

  isOnScreen() {
    return (
      this.pos.x >= 0 &&
      this.pos.x <= width &&
      this.pos.y >= 0 &&
      this.pos.y <= height
    );
  }
}