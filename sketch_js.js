let particles = [];
let attractors = [];
let attractionStrength = 0.01;
let particleCount = 1000;
let particleVelocityMin = 1;
let particleVelocityMax = 4;
let particleAngleMin = -8;
let particleAngleMax = 8;
let particleAngleVariation = 0.01;
let particleVelocityVariation = 0.5;
let zMin = -10;
let zMax = 10;
let attractorSpeed = 0.5;
let attractorAngleVariation = 0.01;
let attractorBoundaryMargin = 50;
let attractorCircleRadius = 30;
let particleLimit = 10000;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  
  // Disable default touch behavior on mobile devices
  window.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, { passive: false });
  
  // Create the attractors with random but distributed positions
  let attractorCount = 5;
  for (let i = 0; i < attractorCount; i++) {
    let x = random(attractorBoundaryMargin, width - attractorBoundaryMargin);
    let y = random(attractorBoundaryMargin, height - attractorBoundaryMargin);
    let z = random(zMin, zMax);
    let circleCenter = createVector(x, y);
    attractors.push({ position: createVector(x, y, z), circleCenter: circleCenter, angle: random(TWO_PI) });
  }
}

function draw() {
  background(200);
  
  // Create new particles only if the particle count is below the limit
  while (particles.length < particleLimit) {
    let angle = random(particleAngleMin, particleAngleMax);
    let velocity = random(particleVelocityMin, particleVelocityMax);
    
    // Add variability to the angle and velocity
    angle += random(-particleAngleVariation, particleAngleVariation);
    velocity += random(-particleVelocityVariation, particleVelocityVariation);
    
    let vel = p5.Vector.fromAngle(angle);
    vel.mult(velocity);
    let z = random(zMin, zMax);
    particles.push(new Particle(width * 0.5, height * 0.5, z, vel));
  }
  
  for (let particle of particles) {
    particle.update();
    particle.display();
  }
  
  // Remove particles that have gone off the screen
  particles = particles.filter(particle => particle.isOnScreen());
  
  // Move attractors in small circles around their point of creation
  for (let attractor of attractors) {
    let circleCenter = attractor.circleCenter;
    attractor.angle += attractorAngleVariation;
    let x = circleCenter.x + cos(attractor.angle) * attractorCircleRadius;
    let y = circleCenter.y + sin(attractor.angle) * attractorCircleRadius;
    attractor.position.x = x;
    attractor.position.y = y;
  }
  
  // Display attractors as dots
  for (let attractor of attractors) {
    stroke(255, 0, 0);
    strokeWeight(3);
    point(attractor.position.x, attractor.position.y);
  }
}

function mouseClicked() {
  moveNearestAttractor(mouseX, mouseY);
}

function touchStarted() {
  moveNearestAttractor(mouseX, mouseY);
}

function moveNearestAttractor(x, y) {
  let clickedPoint = createVector(x, y);
  
  // Find the nearest attractor
  let nearestAttractor = null;
  let minDistance = Infinity;
  
  for (let attractor of attractors) {
    let distance = clickedPoint.dist(attractor.position);
    if (distance < minDistance) {
      nearestAttractor = attractor;
      minDistance = distance;
    }
  }
  
  // Move the nearest attractor to the clicked/touched point and update its circle center
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