let particles = [];
let attractors = [];
let attractionStrength = 0.2;
let particleCount = 200;
let particleVelocityMin = 1;
let particleVelocityMax = 3;
let particleAngleMin = -2.5;
let particleAngleMax = 2.5;
let particleAngleVariation = 0.2;
let particleVelocityVariation = 0.5;
let zMin = -100;
let zMax = 100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  
  // Create the attractors with a spread
  let attractorCount = 6;
  let attractorSpread = 0.4;
  
  for (let i = 0; i < attractorCount; i++) {
    let angle = map(i, 0, attractorCount, 0, TWO_PI);
    let x = width * 0.5 + cos(angle) * width * attractorSpread;
    let y = height * 0.5 + sin(angle) * height * attractorSpread;
    let z = random(zMin, zMax);
    attractors.push(createVector(x, y, z));
  }
}

function draw() {
  background(200);
  
  // Create new particles
  for (let i = 0; i < particleCount; i++) {
    let angle = random(particleAngleMin, particleAngleMax);
    let velocity = random(particleVelocityMin, particleVelocityMax);
    
    // Add variability to the angle and velocity
    angle += random(-particleAngleVariation, particleAngleVariation);
    velocity += random(-particleVelocityVariation, particleVelocityVariation);
    
    let vel = p5.Vector.fromAngle(angle);
    vel.mult(velocity);
    let z = random(zMin, zMax);
    particles.push(new Particle(width * 0.9, height -height, z, vel));
  }
  
  for (let particle of particles) {
    particle.update();
    particle.display();
  }
  
  // Remove particles that have gone off the screen
  particles = particles.filter(particle => particle.isOnScreen());
}

function mouseClicked() {
  let clickedPoint = createVector(mouseX, mouseY);
  
  // Randomly select an attractor to relocate
  let randomIndex = floor(random(attractors.length));
  let selectedAttractor = attractors[randomIndex];
  
  // Move the selected attractor to the clicked point
  selectedAttractor.x = mouseX;
  selectedAttractor.y = mouseY;
  // Set the z-coordinate to a random value within the specified range
  selectedAttractor.z = random(zMin, zMax);
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
      let force = p5.Vector.sub(attractor, this.pos);
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
