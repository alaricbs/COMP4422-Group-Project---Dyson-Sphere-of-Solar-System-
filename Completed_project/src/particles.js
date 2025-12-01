import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { createShader, createProgram } from './gl-utils.js';

// Simple shader for particles (Bubbles)
const particleVS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in float a_size;

uniform mat4 u_view;
uniform mat4 u_projection;

out float v_alpha;

void main() {
    // Move bubbles up over time is handled in JS, but we can do wiggle here
    gl_Position = u_projection * u_view * vec4(a_position, 1.0);
    gl_PointSize = a_size * (20.0 / gl_Position.w); // Scale by distance
    
    // Fade out as they go higher (simple hack based on Y height)
    v_alpha = clamp(1.0 - (a_position.y + 5.0) / 15.0, 0.0, 0.6); 
}
`;

const particleFS = `#version 300 es
precision highp float;
in float v_alpha;
out vec4 fragColor;

void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    // Bubble shading (white rim, transparent center)
    float dist = length(coord);
    float alpha = v_alpha * smoothstep(0.5, 0.3, dist); 
    
    fragColor = vec4(0.8, 0.9, 1.0, alpha); // Light blueish white
}
`;

export class ParticleSystem {
    constructor(gl, count) {
        this.gl = gl;
        this.count = count;
        this.particles = [];
        
        // Compile simple shader
        this.program = createProgram(gl, particleVS, particleFS);
        
        // Attributes
        this.positions = new Float32Array(count * 3);
        this.sizes = new Float32Array(count);
        
        // Initialize particles
        for(let i=0; i<count; i++) {
            this.resetParticle(i, true);
        }
        
        // VAO Setup
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        
        this.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        
        this.sizeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sizes, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
        
        gl.bindVertexArray(null);
    }

    resetParticle(i, randomY = false) {
        // Random position in scene
        this.positions[i*3] = (Math.random() - 0.5) * 30; // X
        this.positions[i*3+1] = randomY ? (Math.random() - 0.5) * 20 : -10; // Y (start bottom)
        this.positions[i*3+2] = (Math.random() - 0.5) * 30; // Z
        
        // Random speed and size
        this.particles[i] = {
            speed: 0.5 + Math.random() * 1.5,
            wobbleSpeed: Math.random() * 2,
            wobbleOffset: Math.random() * Math.PI * 2
        };
        this.sizes[i] = 5.0 + Math.random() * 10.0;
    }

    update(dt) {
        for(let i=0; i<this.count; i++) {
            const p = this.particles[i];
            
            // Move up
            this.positions[i*3+1] += p.speed * dt;
            
            // Wobble X and Z
            this.positions[i*3] += Math.sin(Date.now()/1000 * p.wobbleSpeed + p.wobbleOffset) * 0.02;
            
            // Reset if too high
            if(this.positions[i*3+1] > 10) {
                this.resetParticle(i);
            }
        }
        
        // Update buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.positions);
    }

    draw(camera) {
        const gl = this.gl;
        gl.useProgram(this.program);
        
        // Enable blending for transparent bubbles
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false); // Don't write to depth buffer
        
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_view'), false, camera.getViewMatrix());
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_projection'), false, camera.getProjectionMatrix());
        
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.POINTS, 0, this.count);
        gl.bindVertexArray(null);
        
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }
}