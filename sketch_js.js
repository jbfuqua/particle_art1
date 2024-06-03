let particles = [];
let attractors = [];
let repulsors = [];
let attractionStrength = 0.01;
let repulsionStrength = 0.02;
let particleCount = 20000;
let particleVelocityMin = 1;
let particleVelocityMax = 5;
let particleAngleMin = -8;
let particleAngleMax = 8;
let particleAngleVariation = 0.01;
let particleVelocityVariation = 0.5;
let zMin = -100;
let zMax = 100;
let attractorSpeed = 0.5;
let attractorAngleVariation = 0.01;
let attractorBoundaryMargin = 50;
let attractorCircleRadius = 40;
let particleLimit = 25000;
let particleDestroyedCount = 0;
let particleDestroyedThreshold = 5000;
let touchAttractor = null;
let touchAttractionStrength = 0.1;
let tailLength = 1;

let capturer;
let recording = false;

let flickerInterval = 30; // Adjust this value to control the flicker frequency
let flickerCounter = 0;

function setup() {
//  createCanvas(600, 600);
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);

  // Disable default touch behavior on mobile devices
  window.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, { passive: false });

  // Create the attractors with random but distributed positions
  let attractorCount = 13;
  for (let i = 0; i < attractorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    attractors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
  }

  // Create the repulsors with random but distributed positions
  let repulsorCount = 3;
  for (let i = 0; i < repulsorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    repulsors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
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

  // Create a CCapture instance
  capturer = new CCapture({
    format: 'webm',
    framerate: 30,
    verbose: true
  });
}

function draw() {
  background(200);
  let particleCountThreshold = particleCount - particleDestroyedThreshold;

  // Create new particles in batches if the particle count is below the limit and the destroyed count exceeds the threshold
  if (particles.length < particleLimit && particles.length <= particleCountThreshold) {
    for (let i = 0; i < particleDestroyedThreshold * 3; i++) {
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

  // Move repulsors in small circles around their point of creation
  for (let repulsor of repulsors) {
    let circleCenter = repulsor.circleCenter;
    repulsor.angle += attractorAngleVariation;
    let x = circleCenter.x + cos(repulsor.angle) * attractorCircleRadius;
    let y = circleCenter.y + sin(repulsor.angle) * attractorCircleRadius;
    repulsor.position.x = x;
    repulsor.position.y = y;
  }

  // Display attractors as transparent red dots with flickering and sparkling effect
  for (let attractor of attractors) {
    if (random() < 0.8) { // 80% chance of drawing the attractor
      strokeWeight(3);
      if (floor(flickerCounter / flickerInterval) % 2 === 0) {
        fill(255, 0, 0, 150);
      } else {
        fill(255, 0, 0, 50);
      }
      point(attractor.position.x, attractor.position.y);
    }
  }

  // Display repulsors as transparent blue dots with flickering and sparkling effect
  for (let repulsor of repulsors) {
    if (random() < 0.8) { // 80% chance of drawing the repulsor
      strokeWeight(3);
      if (floor(flickerCounter / flickerInterval) % 2 === 0) {
        fill(0, 0, 255, 150);
      } else {
        fill(0, 0, 255, 50);
      }
      point(repulsor.position.x, repulsor.position.y);
    }
  }

  // Display touch attractor as a transparent green dot with flickering and sparkling effect
  if (touchAttractor) {
    if (random() < 0.8) { // 80% chance of drawing the touch attractor
      strokeWeight(3);
      if (floor(flickerCounter / flickerInterval) % 2 === 0) {
        fill(0, 255, 0, 150);
      } else {
        fill(0, 255, 0, 50);
      }
      point(touchAttractor.x, touchAttractor.y);
    }
  }

  flickerCounter++;

  // Toggle recording when the 'r' key is pressed
  if (keyIsPressed && key === 'r') {
    recording = !recording;
    if (recording) {
      capturer.start();
    } else {
      capturer.stop();
      capturer.save();
    }
  }

  // Capture frames if recording is active
  if (recording) {
    capturer.capture(document.getElementById('defaultCanvas0'));
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
    this.history = [];
  }

  update() {
    // Calculate attraction forces from the attractors
    for (let attractor of attractors) {
      let force = p5.Vector.sub(attractor.position, this.pos);
      force.normalize();
      force.mult(attractionStrength);
      this.acc.add(force);
    }

    // Calculate repulsion forces from the repulsors
    for (let repulsor of repulsors) {
      let force = p5.Vector.sub(this.pos, repulsor.position);
      let distance = force.mag();
      force.normalize();
      force.mult(repulsionStrength / (distance * distance));
      this.acc.add(force);
    }

    // Calculate attraction force from the touch attractor
    if (touchAttractor) {
      let force = p5.Vector.sub(touchAttractor, this.pos);
      force.normalize();
      force.mult(touchAttractionStrength);
      this.acc.add(force);
    }

    // Apply rotational force to particles
    let rotationalForce = createVector(this.pos.y - height / 2, -(this.pos.x - width / 2));
    rotationalForce.normalize();
    rotationalForce.mult(0.01); // Adjust the strength of the rotational force
    this.acc.add(rotationalForce);

    // Update velocity and position
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Store the current position in the history array
    this.history.push(this.pos.copy());

    // Limit the tail length
    if (this.history.length > tailLength) {
      this.history.splice(0, 1);
    }
  }

  display() {
    // Calculate grayscale value based on z-coordinate
    let grayscale = map(this.pos.z, zMin, zMax, 0, 255);

    // Calculate particle size based on z-coordinate
    let particleSize = map(this.pos.z, zMin, zMax, 1, 4);

    // Randomly determine whether to draw the particle
    if (random() < 0.8) { // 80% chance of drawing the particle
      stroke(grayscale);
      strokeWeight(particleSize);

      // Draw the tail
      for (let i = 0; i < this.history.length - 1; i++) {
        let pos1 = this.history[i];
        let pos2 = this.history[i + 1];
        let tailSize = map(i, 0, this.history.length - 1, particleSize, 1);
        strokeWeight(tailSize);
        line(pos1.x, pos1.y, pos2.x, pos2.y);
      }

      // Draw the particle
      point(this.pos.x, this.pos.y);
    }
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