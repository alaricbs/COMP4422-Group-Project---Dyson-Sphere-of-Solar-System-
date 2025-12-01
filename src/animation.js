import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class AnimationManager {
  constructor() {
    this.animations = [];
    this.startTime = Date.now();
    this.globalTime = 0;
    this.pausedTime = 0;
    this.isPaused = false;
    this.timeScale = 1.0; // 1.0 = normal, 2.0 = 2x speed, -1.0 = reverse
    this.lastUpdateTime = Date.now();
    this.pauseStartTime = null;
  }

  pause() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseStartTime = Date.now();
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      // Adjust start time to account for pause duration
      const pauseDuration = (Date.now() - this.pauseStartTime) / 1000;
      this.startTime += pauseDuration * 1000;
      this.pauseStartTime = null;
    }
  }

  setTimeScale(scale) {
    this.timeScale = scale;
    // Recalculate start time based on current global time
    if (!this.isPaused) {
      this.startTime = Date.now() - (this.globalTime / this.timeScale) * 1000;
      this.lastUpdateTime = Date.now();
    }
  }

  reset() {
    this.startTime = Date.now();
    this.globalTime = 0;
    this.pausedTime = 0;
    this.isPaused = false;
    this.timeScale = 1.0;
    this.lastUpdateTime = Date.now();
    this.pauseStartTime = null;
  }

  update() {
    if (this.isPaused) {
      return; // Don't update animations when paused
    }
    
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;
    
    this.globalTime += deltaTime * this.timeScale;
    
    // Clamp time to prevent negative values when rewinding
    if (this.globalTime < 0) {
      this.globalTime = 0;
      this.startTime = Date.now();
    }
    
    this.animations.forEach(anim => {
      if (anim.active) {
        anim.update(this.globalTime);
      }
    });
  }

  addAnimation(animation) {
    this.animations.push(animation);
  }

  removeAnimation(animation) {
    const index = this.animations.indexOf(animation);
    if (index > -1) {
      this.animations.splice(index, 1);
    }
  }
}

export class Transform {
  constructor() {
    this.position = vec3.create();
    this.rotation = vec3.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.matrix = mat4.create();
    this.isDirty = true;
    this.parent = null;
  }

  setPosition(x, y, z) {
    vec3.set(this.position, x, y, z);
    this.isDirty = true;
  }

  setRotation(x, y, z) {
    vec3.set(this.rotation, x, y, z);
    this.isDirty = true;
  }

  setScale(x, y, z) {
    vec3.set(this.scale, x, y, z);
    this.isDirty = true;
  }

  setParent(parentTransform) {
    this.parent = parentTransform;
    this.isDirty = true;
  }

  getMatrix() {
    if (this.isDirty) {
      mat4.identity(this.matrix);
      mat4.translate(this.matrix, this.matrix, this.position);
      mat4.rotateX(this.matrix, this.matrix, this.rotation[0]);
      mat4.rotateY(this.matrix, this.matrix, this.rotation[1]);
      mat4.rotateZ(this.matrix, this.matrix, this.rotation[2]);
      mat4.scale(this.matrix, this.matrix, this.scale);
      this.isDirty = false;
    }
    
    if (this.parent) {
      const combined = mat4.create();
      mat4.multiply(combined, this.parent.getMatrix(), this.matrix);
      return combined;
    }
    return this.matrix;
  }
}

// Animation Types
export class RotationAnimation {
  constructor(transform, axis, speed) {
    this.transform = transform;
    this.axis = axis;
    this.speed = speed;
    this.active = true;
  }

  update(time) {
    const rotation = this.speed * time;
    if (this.axis === 'x') {
      this.transform.setRotation(rotation, this.transform.rotation[1], this.transform.rotation[2]);
    } else if (this.axis === 'y') {
      this.transform.setRotation(this.transform.rotation[0], rotation, this.transform.rotation[2]);
    } else if (this.axis === 'z') {
      this.transform.setRotation(this.transform.rotation[0], this.transform.rotation[1], rotation);
    }
  }
}

export class TranslationAnimation {
  constructor(transform, direction, amplitude, frequency) {
    this.transform = transform;
    this.direction = direction;
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.initialPosition = vec3.clone(transform.position);
    this.active = true;
  }

  update(time) {
    const offset = Math.sin(time * this.frequency) * this.amplitude;
    const newPos = vec3.create();
    vec3.scaleAndAdd(newPos, this.initialPosition, this.direction, offset);
    this.transform.setPosition(newPos[0], newPos[1], newPos[2]);
  }
}

export class ScaleAnimation {
  constructor(transform, minScale, maxScale, frequency) {
    this.transform = transform;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.frequency = frequency;
    this.active = true;
  }

  update(time) {
    const scaleValue = this.minScale + (this.maxScale - this.minScale) * 
                      (Math.sin(time * this.frequency) * 0.5 + 0.5);
    this.transform.setScale(scaleValue, scaleValue, scaleValue);
  }
}

// Fish swimming animation with realistic turning behavior
export class BackAndForthFish {
  constructor(transform, options = {}) {
    this.transform = transform;
    this.active = true;

    this.leftX = options.leftX ?? -12;
    this.rightX = options.rightX ?? 12;
    this.baseY = options.baseY ?? 0.2;
    this.swimSpeed = options.swimSpeed ?? 3;
    this.turnDuration = options.turnDuration ?? 1.5;
    this.pauseDuration = options.pauseDuration ?? 0.4;

    this.state = 'swimRight';
    this.positionX = this.leftX;
    this.heading = 0;
    this.timeInState = 0;
    this.lastTime = null;

    this.headingRight = Math.PI / 2;
    this.headingLeft = -Math.PI / 2;
    this.heading = this.headingRight;
    // Pivot offset: vector from model origin to rotation center
    this.pivotOffset = options.pivotOffset
      ? vec3.clone(options.pivotOffset)
      : vec3.fromValues(0, 0, 0);
    this.turnPivotWorld = null;
  }

  update(time) {
    if (this.lastTime === null) {
      this.lastTime = time;
      return;
    }

    const dt = time - this.lastTime;
    this.lastTime = time;
    this.timeInState += dt;

    switch (this.state) {
      case 'swimRight':
        this.positionX += this.swimSpeed * dt;
        if (this.positionX >= this.rightX) {
          this.positionX = this.rightX;
          this._transition('pauseRight');
        }
        break;

      case 'pauseRight':
        if (this.timeInState >= this.pauseDuration) {
          this._transition('turnRight');
        }
        break;

      case 'turnRight':
        this._updateTurn(this.headingRight, this.headingLeft);
        break;

      case 'swimLeft':
        this.positionX -= this.swimSpeed * dt;
        if (this.positionX <= this.leftX) {
          this.positionX = this.leftX;
          this._transition('pauseLeft');
        }
        break;

      case 'pauseLeft':
        if (this.timeInState >= this.pauseDuration) {
          this._transition('turnLeft');
        }
        break;

      case 'turnLeft':
        this._updateTurn(this.headingLeft, this.headingRight);
        break;
    }

    const isSwimming = this.state === 'swimRight' || this.state === 'swimLeft';
    const swimBob = isSwimming ? Math.sin(time * 3.2) * 0.05 : 0;
    const pitch = isSwimming ? Math.sin(time * 6) * 0.03 : 0;

    const headPosition = vec3.fromValues(this.positionX, this.baseY + swimBob, 0);

    const rotationMatrix = mat4.create();
    mat4.rotateX(rotationMatrix, rotationMatrix, pitch);
    mat4.rotateY(rotationMatrix, rotationMatrix, this.heading);

    let worldPivot;
    if (this.turnPivotWorld) {
      worldPivot = vec3.clone(this.turnPivotWorld);
      worldPivot[1] = headPosition[1];
    } else {
      const rotatedPivot = vec3.transformMat4(vec3.create(), this.pivotOffset, rotationMatrix);
      worldPivot = vec3.create();
      vec3.add(worldPivot, headPosition, rotatedPivot);
    }

    const m = mat4.create();
    mat4.translate(m, m, worldPivot);
    mat4.multiply(m, m, rotationMatrix);
    mat4.scale(m, m, this.transform.scale);
    mat4.translate(m, m, vec3.negate(vec3.create(), this.pivotOffset));

    this.transform.matrix = m;
    this.transform.isDirty = false;
  }

  _updateTurn(startHeading, endHeading) {
    const progress = Math.min(this.timeInState / this.turnDuration, 1);
    this.heading = this._lerpAngle(startHeading, endHeading, progress);

    if (progress >= 1) {
      this.heading = endHeading;
      const nextState = endHeading === this.headingLeft ? 'swimLeft' : 'swimRight';
      this._transition(nextState);
    }
  }

  _lerpAngle(start, end, t) {
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return start + delta * t;
  }

  _transition(nextState) {
    this.state = nextState;
    this.timeInState = 0;
    if (nextState === 'turnRight' || nextState === 'turnLeft') {
      const headPosition = vec3.fromValues(this.positionX, this.baseY, 0);
      const rotationMatrix = mat4.create();
      mat4.rotateY(rotationMatrix, rotationMatrix, this.heading);
      const rotatedPivot = vec3.transformMat4(vec3.create(), this.pivotOffset, rotationMatrix);
      this.turnPivotWorld = vec3.create();
      vec3.add(this.turnPivotWorld, headPosition, rotatedPivot);
    } else {
      this.turnPivotWorld = null;
    }
  }
}

// Starfish resting animation with breathing
export class RealisticStarfishCreep {
  constructor(transform) {
    this.transform = transform;
    this.basePosition = [2, 0.4, 5];
    this.currentPosition = [...this.basePosition];
    this.heading = 0;
    this.targetHeading = 0;
    this.speed = 0;
    this.active = true;
    this.nextDirectionChange = 5.0;
  }

  update(time) {
    const dt = 1/60;
    
    const pitchWobble = Math.sin(time * 0.3) * 0.02;
    const rollWobble = Math.sin(time * 0.37) * 0.02; 
    const breathScale = 0.97 + 0.03 * Math.sin(time * 0.5);
    const verticalAdjust = 0.4;
    
    this.transform.setPosition(this.currentPosition[0], verticalAdjust, this.currentPosition[2]);
    this.transform.setRotation(pitchWobble, this.heading, rollWobble);
    this.transform.setScale(breathScale, breathScale, breathScale);
  }
}

// Seaweed swaying animation
export class RealisticSeaweedSway {
  constructor(transform) {
    this.transform = transform;
    this.active = true;
  }

  update(time) {
    const swayAngle = Math.sin(time * 0.4) * 0.15;
    const pitchWobble = Math.sin(time * 0.4 + Math.PI/2) * 0.05;
    const verticalStretch = 1 + 0.01 * Math.sin(time * 0.4 + 0.3 * Math.PI);
    
    this.transform.setPosition(0, 0, 0);
    this.transform.setRotation(pitchWobble, swayAngle, 0);
    this.transform.setScale(1, verticalStretch, 1);
  }
}

// Pulsing animation
export class PulseAnimation {
  constructor(transform, axis, minValue, maxValue, frequency, phase = 0) {
    this.transform = transform;
    this.axis = axis; // 'scale', 'rotation', 'position'
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.frequency = frequency;
    this.phase = phase;
    this.active = true;
  }

  update(time) {
    const value = this.minValue + (this.maxValue - this.minValue) * 
                  (Math.sin(time * this.frequency + this.phase) * 0.5 + 0.5);
    
    if (this.axis === 'scale') {
      this.transform.setScale(value, value, value);
    } else if (this.axis === 'rotation') {
      this.transform.setRotation(0, value, 0);
    }
  }
}

// Chest lid opening/closing animation
export class ChestOpeningAnimation {
  constructor(lidTransform, options = {}) {
    this.lidTransform = lidTransform;
    this.active = true;
    this.minAngle = 0;
    this.maxAngle = options.maxAngle ?? -Math.PI / 2;
    this.duration = options.duration ?? 1.5;
    this.startTime = null;
    this.isOpening = false;
    this.isClosing = false;
    this.currentAngle = 0;
  }

  open() {
    if (!this.isOpening && this.currentAngle > this.maxAngle) {
      this.isOpening = true;
      this.isClosing = false;
      this.startTime = null;
    }
  }

  close() {
    if (!this.isClosing && this.currentAngle < this.minAngle) {
      this.isClosing = true;
      this.isOpening = false;
      this.startTime = null;
    }
  }

  update(time) {
    if (!this.isOpening && !this.isClosing) return;

    if (this.startTime === null) {
      this.startTime = time;
    }

    const elapsed = time - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    const easedProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    if (this.isOpening) {
      this.currentAngle = this.minAngle + (this.maxAngle - this.minAngle) * easedProgress;
      if (progress >= 1) {
        this.currentAngle = this.maxAngle;
        this.isOpening = false;
      }
    } else if (this.isClosing) {
      const startAngle = this.currentAngle;
      this.currentAngle = startAngle + (this.minAngle - startAngle) * easedProgress;
      if (progress >= 1) {
        this.currentAngle = this.minAngle;
        this.isClosing = false;
      }
    }

    this.lidTransform.setRotation(-this.currentAngle, 0, 0);
  }
}

// Story sequence manager
export class StorySequence {
  constructor(animationManager) {
    this.animationManager = animationManager;
    this.events = [];
    this.currentEventIndex = 0;
    this.startTime = null;
    this.active = false;
  }

  addEvent(event) {
    this.events.push(event);
  }

  start(time) {
    this.active = true;
    this.startTime = time;
    this.currentEventIndex = 0;
  }

  update(time) {
    if (!this.active || this.currentEventIndex >= this.events.length) return;

    const elapsed = time - this.startTime;
    const event = this.events[this.currentEventIndex];

    let shouldTrigger = false;
    if (event.triggerTime !== undefined && elapsed >= event.triggerTime) {
      shouldTrigger = true;
    } else if (event.condition && event.condition()) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      event.action();
      this.currentEventIndex++;
    }
  }

  reset() {
    this.currentEventIndex = 0;
    this.startTime = null;
    this.active = false;
  }
}