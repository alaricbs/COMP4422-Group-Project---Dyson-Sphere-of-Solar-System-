import { vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class InteractionSystem {
  constructor() {
    this.interactions = [];
  }

  addInteraction(sourceObj, targetObj, type, params) {
    this.interactions.push({
      source: sourceObj,
      target: targetObj,
      type: type,
      params: params,
      active: true
    });
  }

  update() {
    this.interactions.forEach(interaction => {
      if (interaction.active) {
        this.processInteraction(interaction);
      }
    });
  }

  processInteraction(interaction) {
    switch(interaction.type) {
      case 'follow':
        this.followInteraction(interaction);
        break;
      case 'orbit':
        this.orbitInteraction(interaction);
        break;
      case 'avoid':
        this.avoidanceInteraction(interaction);
        break;
      case 'synchronize':
        this.synchronizeInteraction(interaction);
        break;
    }
  }

  followInteraction(interaction) {
    const sourcePos = interaction.source.transform.position;
    const targetPos = interaction.target.transform.position;
    const speed = interaction.params.speed || 0.01;
    
    const direction = vec3.create();
    vec3.subtract(direction, targetPos, sourcePos);
    vec3.normalize(direction, direction);
    vec3.scaleAndAdd(sourcePos, sourcePos, direction, speed);
    
    interaction.source.transform.setPosition(sourcePos[0], sourcePos[1], sourcePos[2]);
  }

  orbitInteraction(interaction) {
    const time = Date.now() / 1000;
    const radius = interaction.params.radius || 5;
    const speed = interaction.params.speed || 1;
    const centerPos = interaction.target.transform.position;
    
    const angle = time * speed;
    const x = centerPos[0] + Math.cos(angle) * radius;
    const z = centerPos[2] + Math.sin(angle) * radius;
    
    interaction.source.transform.setPosition(x, interaction.source.transform.position[1], z);
  }

  avoidanceInteraction(interaction) {
    const sourcePos = interaction.source.transform.position;
    const targetPos = interaction.target.transform.position;
    const minDistance = interaction.params.minDistance || 2;
    const repelForce = interaction.params.repelForce || 0.02;
    
    const distance = vec3.distance(sourcePos, targetPos);
    
    if (distance < minDistance) {
      const direction = vec3.create();
      vec3.subtract(direction, sourcePos, targetPos);
      vec3.normalize(direction, direction);
      vec3.scaleAndAdd(sourcePos, sourcePos, direction, repelForce);
      
      interaction.source.transform.setPosition(sourcePos[0], sourcePos[1], sourcePos[2]);
    }
  }

  synchronizeInteraction(interaction) {
    const sourceRotation = interaction.source.transform.rotation;
    const targetRotation = interaction.target.transform.rotation;
    const syncFactor = interaction.params.syncFactor || 0.5;
    
    sourceRotation[1] = targetRotation[1] * syncFactor;
    interaction.source.transform.setRotation(sourceRotation[0], sourceRotation[1], sourceRotation[2]);
  }
}