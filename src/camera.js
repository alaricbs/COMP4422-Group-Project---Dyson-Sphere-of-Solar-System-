import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class Camera {
  constructor(canvas) {
    this.eye = [0, 5, 40];
    this.center = [0, 0, 0];
    this.up = [0, 1, 0];
    this.radius = 40;
    this.theta = 0;
    this.phi = 0.5;
    this.canvas = canvas;

    let dragging = false;
    let lastX, lastY;
    canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    canvas.addEventListener('mousemove', e => {
      if (!dragging) return;
      this.theta -= (e.clientX - lastX) * 0.01;
      this.phi -= (e.clientY - lastY) * 0.01;
      this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
      lastX = e.clientX; lastY = e.clientY;
      this.updateEye();
    });
    canvas.addEventListener('mouseup', () => dragging = false);
    canvas.addEventListener('mouseleave', () => dragging = false);
    canvas.addEventListener('wheel', e => {
      this.radius += e.deltaY * 0.05;
      this.radius = Math.max(10, Math.min(60, this.radius));
      this.updateEye();
    });

    this.updateEye();
  }

  updateEye() {
    this.eye[0] = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    this.eye[1] = this.radius * Math.cos(this.phi);
    this.eye[2] = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
  }

  getViewMatrix() {
    return mat4.lookAt(mat4.create(), this.eye, this.center, this.up);
  }

  getProjectionMatrix() {
    return mat4.perspective(mat4.create(), 45 * Math.PI / 180,
      this.canvas.width / this.canvas.height, 0.1, 200);
  }
}