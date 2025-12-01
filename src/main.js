import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { initGL, createProgram } from './gl-utils.js';
import { Camera } from './camera.js';
import { createGround, createStarfish, createSeaweed, createFish, createTreasureChest } from './model.js';
import { AnimationManager, Transform, RotationAnimation, TranslationAnimation, ScaleAnimation, BackAndForthFish, RealisticStarfishCreep, RealisticSeaweedSway, PulseAnimation, ChestOpeningAnimation, StorySequence } from './animation.js';
import { InteractionSystem } from './interactions.js';
import { ParticleSystem } from './particles.js';

let gl, camera, program;
let ground, starfish, seaweed, fish, chest;
let animationManager, interactionSystem, storySequence;
let objectTransforms = {};
let chestOpening;
let canvas;
let particleSystem;

async function loadShader(url) {
  const resp = await fetch(url);
  return await resp.text();
}

async function main() {
  canvas = document.getElementById('glcanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl = initGL(canvas);
  if (!gl) return;

  camera = new Camera(canvas);

  const vertexSource = await loadShader('shaders/vertex.glsl');
  const fragmentSource = await loadShader('shaders/fragment.glsl');
  program = createProgram(gl, vertexSource, fragmentSource);
  gl.useProgram(program);

  ground = createGround(gl);
  starfish = createStarfish(gl);
  seaweed = createSeaweed(gl);
  fish = createFish(gl);
  chest = createTreasureChest(gl);

  // Initialize animations
  animationManager = new AnimationManager();
  interactionSystem = new InteractionSystem();
  setupAnimations();

  // PARTICLE SYSTEM SETUP
  particleSystem = new ParticleSystem(gl, 100); // Create 100 bubbles

  // LIGHTING SETUP - Static uniforms
  gl.uniform1f(gl.getUniformLocation(program, 'u_shininess'), 32.0);

  // Fog Setup (Underwater Blue)
  gl.uniform1i(gl.getUniformLocation(program, 'u_fogEnabled'), 1); // Enable Fog
  gl.uniform3f(gl.getUniformLocation(program, 'u_fogColor'), 0.05, 0.1, 0.3); // Match bg color
  gl.uniform1f(gl.getUniformLocation(program, 'u_fogNear'), 10.0);
  gl.uniform1f(gl.getUniformLocation(program, 'u_fogFar'), 50.0);

  // Create default white texture (must be created before loadTexture function)
  const defaultTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, defaultTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // Texture loading function with improved error handling
  async function loadTexture(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          
          // Determine format based on file extension
          // PNG files might have alpha channel, JPG files don't
          const hasAlpha = url.toLowerCase().endsWith('.png');
          const format = hasAlpha ? gl.RGBA : gl.RGB;
          const internalFormat = hasAlpha ? gl.RGBA : gl.RGB;
          
          gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, img);
          
          // Check if image dimensions are power of 2 (required for mipmaps)
          const isPowerOf2 = (value) => (value & (value - 1)) === 0;
          if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          } else {
            // If not power of 2, use linear filtering without mipmaps
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
          
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
          
          console.log(`✅ Loaded texture: ${url} (${img.width}x${img.height})`);
          resolve(texture);
        } catch (error) {
          console.error(`❌ Error processing texture ${url}:`, error);
          resolve(defaultTex);
        }
      };
      img.onerror = (error) => {
        console.warn(`⚠️ Failed to load texture: ${url}, using default white texture`);
        // Return default white texture on error
        resolve(defaultTex);
      };
      img.src = url;
    });
  }

  // Texture paths - Updated to match actual texture files
  // Note: sand.png, wood.png, gold.png are sphere previews (will be used as-is)
  const texturePaths = {
    ground: 'assets/textures/sand.png',              // 地面 - 球形预览图（直接使用）
    starfish: 'assets/textures/starfish_skin.jpg',   // 海星 - 平铺纹理 ✅
    seaweed: 'assets/textures/leaf.jpg',              // 海草 - 平铺纹理 ✅
    fish: 'assets/textures/fish_scales.jpg',         // 鱼 - 平铺纹理 ✅
    chest: 'assets/textures/wood.png',               // 宝箱 - 球形预览图（直接使用）
    metal: 'assets/textures/gold.png'               // 金属配件 - 球形预览图（直接使用）
  };

  // Load textures (optional - will use default white texture if files don't exist)
  const textures = {
    ground: defaultTex,
    starfish: defaultTex,
    seaweed: defaultTex,
    fish: defaultTex,
    chest: defaultTex,
    metal: defaultTex
  };

  // Load all textures (including sphere previews)
  console.log('🔄 Loading textures...');
  try {
    const loadPromises = [
      loadTexture(texturePaths.ground).then(tex => { textures.ground = tex; }),
      loadTexture(texturePaths.starfish).then(tex => { textures.starfish = tex; }),
      loadTexture(texturePaths.seaweed).then(tex => { textures.seaweed = tex; }),
      loadTexture(texturePaths.fish).then(tex => { textures.fish = tex; }),
      loadTexture(texturePaths.chest).then(tex => { textures.chest = tex; }),
      loadTexture(texturePaths.metal).then(tex => { textures.metal = tex; })
    ];
    
    await Promise.all(loadPromises);
    console.log('✅ All textures loaded successfully!');
    console.log('ℹ️  Note: sand.png, wood.png, gold.png are sphere previews (may look stretched on flat surfaces)');
  } catch (error) {
    console.warn('⚠️ Some textures failed to load, using default textures:', error);
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

  gl.clearColor(0.05, 0.1, 0.3, 1.0);
  gl.disable(gl.CULL_FACE);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  // Keyboard controls for interactivity
  window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        if (animationManager.isPaused) {
          animationManager.resume();
          document.getElementById('playBtn').style.display = 'none';
          document.getElementById('pauseBtn').style.display = 'inline-block';
        } else {
          animationManager.pause();
          document.getElementById('pauseBtn').style.display = 'none';
          document.getElementById('playBtn').style.display = 'inline-block';
        }
        break;
      case 'r':
        animationManager.reset();
        storySequence.reset();
        storySequence.start(0);
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('speedSlider').value = 100;
        document.getElementById('speedValue').textContent = '1.0x';
        animationManager.setTimeScale(1.0);
        break;
      case 'o':
        chestOpening.open();
        break;
      case 'c':
        chestOpening.close();
        break;
    }
  });

  // Enhanced click handler for chest and other interactions
  let clickCooldown = 0;
  canvas.addEventListener('click', (event) => {
    if (clickCooldown > 0) return;
    clickCooldown = 0.3; // 300ms cooldown
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / canvas.height) * 2 + 1;
    
    // Check if clicking on chest
    if (Math.abs(x) < 0.3 && y > -0.5 && y < 0.2) {
      chestOpening.open();
      // Trigger particle burst when chest opens
      if (particleSystem) {
        // Create temporary burst of particles
        for (let i = 0; i < 20; i++) {
          const idx = Math.floor(Math.random() * particleSystem.count);
          particleSystem.positions[idx * 3] = (Math.random() - 0.5) * 2; // X near chest
          particleSystem.positions[idx * 3 + 1] = -4.5 + Math.random() * 1; // Y near chest
          particleSystem.positions[idx * 3 + 2] = 5 + (Math.random() - 0.5) * 2; // Z near chest
          particleSystem.particles[idx].speed = 2 + Math.random() * 2; // Faster bubbles
        }
      }
    }
    
    // Check if clicking on starfish (trigger animation)
    if (x > 0.1 && x < 0.4 && y > -0.3 && y < 0.1) {
      // Trigger starfish animation boost
      const boost = new PulseAnimation(
        objectTransforms.starfish,
        'scale',
        1.0, 1.2, 3.0, animationManager.globalTime
      );
      animationManager.addAnimation(boost);
      setTimeout(() => animationManager.removeAnimation(boost), 1000);
    }
  });

  // Update click cooldown
  setInterval(() => {
    if (clickCooldown > 0) clickCooldown -= 0.016;
  }, 16);

  function render() {
    // --- 1. Update animations and particles ---
    animationManager.update();
    if (particleSystem) {
        particleSystem.update(0.016); // Update particles (assuming 60fps)
    }

    // --- 2. Clear screen ---
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // --- 3. Activate main shader program ---
    gl.useProgram(program);

    // --- 4. Set view and projection matrices ---
    const view = camera.getViewMatrix();
    const proj = camera.getProjectionMatrix();
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, proj);

    // --- 5. Update lighting uniforms ---
    
    // Update viewer position (for specular lighting)
    gl.uniform3f(gl.getUniformLocation(program, 'u_viewPos'), ...camera.eye);

    // Light 1: Directional light (simulating sunlight from surface)
    gl.uniform3f(gl.getUniformLocation(program, 'u_dirLight.direction'), -0.2, -1.0, -0.3);
    gl.uniform3f(gl.getUniformLocation(program, 'u_dirLight.color'), 1.0, 1.0, 0.9); // Warm white light
    gl.uniform1f(gl.getUniformLocation(program, 'u_dirLight.ambientStrength'), 0.3); // Ambient strength

    // Light 2: Point light (glow from treasure chest)
    // Chest position is at (0, -4.8, 5), we place light slightly higher (y = -4.0)
    gl.uniform3f(gl.getUniformLocation(program, 'u_pointLight.position'), 0, -4.0, 5); 
    gl.uniform3f(gl.getUniformLocation(program, 'u_pointLight.color'), 1.0, 0.6, 0.0); // Gold/orange light
    gl.uniform1f(gl.getUniformLocation(program, 'u_pointLight.constant'), 1.0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pointLight.linear'), 0.09);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pointLight.quadratic'), 0.032);

    // Light 3: Spot light (simulating camera/diver flashlight)
    gl.uniform3f(gl.getUniformLocation(program, 'u_spotLight.position'), ...camera.eye);
    
    // Calculate spotlight direction: from camera position toward scene center (0,0,0)
    let spotDir = vec3.create();
    vec3.subtract(spotDir, [0, 0, 0], camera.eye); // target - eye
    vec3.normalize(spotDir, spotDir);
    gl.uniform3f(gl.getUniformLocation(program, 'u_spotLight.direction'), spotDir[0], spotDir[1], spotDir[2]);
    
    gl.uniform3f(gl.getUniformLocation(program, 'u_spotLight.color'), 0.8, 0.9, 1.0); // Blue-white light
    gl.uniform1f(gl.getUniformLocation(program, 'u_spotLight.cutOff'), Math.cos(12.5 * Math.PI / 180)); // Inner cutoff
    gl.uniform1f(gl.getUniformLocation(program, 'u_spotLight.outerCutOff'), Math.cos(17.5 * Math.PI / 180)); // Outer cutoff

    // --- 6. Draw scene objects ---

    // Draw ground plane
    let model = mat4.create();
    mat4.translate(model, model, [0, -5, 0]);
    gl.bindTexture(gl.TEXTURE_2D, textures.ground);
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0.6, 0.4, 0.2);
    ground.draw(gl, program, model);

    // Draw starfish
    model = mat4.multiply(mat4.create(), objectTransforms.starfish.getMatrix(), mat4.create());
    mat4.translate(model, model, [2, 0.4, 5]);
    gl.bindTexture(gl.TEXTURE_2D, textures.starfish);
    // Arms
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 1, 0, 0);
    starfish.arms.draw(gl, program, model);
    // Coin
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 1, 1, 0);
    starfish.coin.draw(gl, program, model);
    // Number "1"
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0.3, 0.3, 0.3);
    starfish.one.draw(gl, program, model);

    // Draw seaweed - multiple instances
    gl.bindTexture(gl.TEXTURE_2D, textures.seaweed);
    const seaweedPositions = [
        [-3, -3, 3], 
        [3, -3, 3], 
        [-2, -3, 6], 
        [2.5, -3, 6.5]
    ];
    seaweedPositions.forEach(pos => {
        model = mat4.multiply(mat4.create(), objectTransforms.seaweeds.getMatrix(), mat4.create());
        mat4.translate(model, model, pos);
        
        gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0.5, 0.5, 0.5);
        seaweed.base.draw(gl, program, model);
        
        gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0, 1, 0);
        seaweed.blades.draw(gl, program, model);
    });

    // Draw fish
    model = mat4.multiply(mat4.create(), objectTransforms.fish.getMatrix(), mat4.create());
    mat4.translate(model, model, [0, 0, -5]);
    gl.bindTexture(gl.TEXTURE_2D, textures.fish);
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0, 0, 1);
    fish.draw(gl, program, model);

    // Draw treasure chest
    // Chest body
    model = objectTransforms.chest.getMatrix();
    gl.bindTexture(gl.TEXTURE_2D, textures.chest);
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0.5, 0.3, 0.1);
    chest.body.draw(gl, program, model);

    // Chest lid (independent animation transform)
    let lidModel = objectTransforms.chestLid.getMatrix();
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 0.5, 0.3, 0.1);
    chest.lid.draw(gl, program, lidModel);

    // Chest accessories (metal bands and lock)
    gl.bindTexture(gl.TEXTURE_2D, textures.metal);
    gl.uniform3f(gl.getUniformLocation(program, 'u_objectColor'), 1, 0.84, 0); // Gold color
    chest.bands.draw(gl, program, model);
    chest.lock.draw(gl, program, model);

  
    if (particleSystem) {
        particleSystem.draw(camera);
    }
    
    requestAnimationFrame(render);
  } 

      requestAnimationFrame(render); 
} 

function setupAnimations() {
  // Create transforms
  objectTransforms.starfish = new Transform();
  objectTransforms.seaweeds = new Transform();
  objectTransforms.fish = new Transform();
  objectTransforms.chest = new Transform();
  objectTransforms.chestLid = new Transform();

  // Setup parent-child hierarchy
  objectTransforms.chestLid.setParent(objectTransforms.chest);
  objectTransforms.chestLid.setPosition(0, 0, 0);
  
  objectTransforms.chest.setPosition(0, -4.8, 5);

  // Starfish animation
  const starfishCreep = new RealisticStarfishCreep(objectTransforms.starfish);
  animationManager.addAnimation(starfishCreep);

  // Fish animation
  const fishSwim = new BackAndForthFish(objectTransforms.fish, {
    leftX: -12,
    rightX: 12,
    swimSpeed: 4,
    turnDuration: 0.3,
    pauseDuration: 0.2,
    pivotOffset: [-0.5, 0, 0]
  });
  animationManager.addAnimation(fishSwim);

  // Seaweed animation
  const seaweedSway = new RealisticSeaweedSway(objectTransforms.seaweeds);
  animationManager.addAnimation(seaweedSway);

  // Chest pulse animation
  const chestMystery = new PulseAnimation(
    objectTransforms.chest,
    'scale',
    1.0, 1.02, 0.8, 0
  );
  animationManager.addAnimation(chestMystery);

  // Chest lid opening animation
  chestOpening = new ChestOpeningAnimation(objectTransforms.chestLid, {
    maxAngle: -Math.PI / 12,
    duration: 1.5
  });
  animationManager.addAnimation(chestOpening);

  // Story sequence - Enhanced narrative
  storySequence = new StorySequence(animationManager);
  
  // Story event 1: Fish arrives at scene (5 seconds)
  storySequence.addEvent({
    triggerTime: 5.0,
    action: () => {
      console.log('🐟 Fish arrives at the underwater scene');
      // Could trigger additional effects here
    }
  });

  // Story event 2: Chest starts glowing (10 seconds)
  storySequence.addEvent({
    triggerTime: 10.0,
    action: () => {
      console.log('✨ Treasure chest begins to glow mysteriously');
      // Enhance chest pulse animation
      const enhancedPulse = new PulseAnimation(
        objectTransforms.chest,
        'scale',
        1.0, 1.05, 1.2, 0
      );
      animationManager.addAnimation(enhancedPulse);
    }
  });

  // Story event 3: Seaweed responds to chest (15 seconds)
  storySequence.addEvent({
    triggerTime: 15.0,
    action: () => {
      console.log('🌿 Seaweed sways more dramatically near the treasure');
      // Could modify seaweed animation parameters
    }
  });

  // Story event 4: Starfish notices treasure (20 seconds)
  storySequence.addEvent({
    triggerTime: 20.0,
    action: () => {
      console.log('⭐ Starfish becomes more active near the treasure');
    }
  });

  // Story event 5: Final reveal (25 seconds)
  storySequence.addEvent({
    triggerTime: 25.0,
    action: () => {
      console.log('💎 The underwater treasure reveals its secrets!');
    }
  });

  animationManager.addAnimation(storySequence);
  storySequence.start(0);

  document.getElementById('closeBtn').addEventListener('click', () => {
    chestOpening.close();
  });

  // Time control setup
  const pauseBtn = document.getElementById('pauseBtn');
  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const rewindBtn = document.getElementById('rewindBtn');

  pauseBtn.addEventListener('click', () => {
    animationManager.pause();
    pauseBtn.style.display = 'none';
    playBtn.style.display = 'inline-block';
  });

  playBtn.addEventListener('click', () => {
    animationManager.resume();
    playBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
  });

  resetBtn.addEventListener('click', () => {
    animationManager.reset();
    storySequence.reset();
    storySequence.start(0);
    playBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    speedSlider.value = 100;
    speedValue.textContent = '1.0x';
    animationManager.setTimeScale(1.0);
  });

  speedSlider.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value) / 100;
    speedValue.textContent = speed.toFixed(1) + 'x';
    animationManager.setTimeScale(speed);
  });

  rewindBtn.addEventListener('click', () => {
    animationManager.setTimeScale(-1.0);
    speedSlider.value = -100;
    speedValue.textContent = '-1.0x';
  });
}

main();