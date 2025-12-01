import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class Mesh {
  constructor(gl, vertices, indices, normals, uvs) {
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    this.indexCount = indices.length;
    gl.bindVertexArray(null);
  }

  draw(gl, program, modelMatrix) {
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_model'), false, modelMatrix);
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_normalMatrix'), false, normalMatrix);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }
}

// Ground
export function createGround(gl) {
  const vertices = [];
  const indices = [];
  const normals = [];
  const uvs = [];
  const gridSize = 20;
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = i * 4 - 40;
      const z = j * 4 - 40;
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1;
      vertices.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(i / gridSize, j / gridSize);
    }
  }
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const a = i * (gridSize + 1) + j;
      const b = a + 1;
      const c = a + (gridSize + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  return new Mesh(gl, vertices, indices, normals, uvs);
}

// Seaweed
export function createSeaweed(gl) {
    const baseVertices = [];
    const baseIndices = [];
    const baseNormals = [];
    const baseUvs = [];
    const baseSegments = 10;
    for (let lat = 0; lat <= baseSegments; lat++) {
      const theta = lat * Math.PI / baseSegments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let long = 0; long <= baseSegments; long++) {
        const phi = long * 2 * Math.PI / baseSegments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const x = cosPhi * sinTheta * 1.5;
        const y = cosTheta * 1.2 - 4.5;
        const z = sinPhi * sinTheta * 1.5;
        baseVertices.push(x, y, z);
        baseNormals.push(x, y + 4.5, z);
        baseUvs.push(long / baseSegments, lat / baseSegments);
      }
    }
    for (let lat = 0; lat < baseSegments; lat++) {
      for (let long = 0; long < baseSegments; long++) {
        const first = (lat * (baseSegments + 1)) + long;
        const second = first + baseSegments + 1;
        baseIndices.push(first, second, first + 1);
        baseIndices.push(second, second + 1, first + 1);
      }
    }
    const base = new Mesh(gl, baseVertices, baseIndices, baseNormals, baseUvs);
  
    const bladesVertices = [];
    const bladesIndices = [];
    const bladesNormals = [];
    const bladesUvs = [];
    const bladeCount = 5;
    const bladeSegments = 15;
    for (let blade = 0; blade < bladeCount; blade++) {
      const bladeAngle = blade * Math.PI * 2 / bladeCount;
      for (let i = 0; i <= bladeSegments; i++) {
        const h = i * 8 / bladeSegments;
        const sway = Math.sin(h * 0.5) * 0.5;
        const w = 0.5 * (1 - i / bladeSegments);
        const x1 = Math.cos(bladeAngle) * sway + Math.sin(bladeAngle) * (w / 2);
        const z1 = Math.sin(bladeAngle) * sway - Math.cos(bladeAngle) * (w / 2);
        const x2 = Math.cos(bladeAngle) * sway - Math.sin(bladeAngle) * (w / 2);
        const z2 = Math.sin(bladeAngle) * sway + Math.cos(bladeAngle) * (w / 2);
        bladesVertices.push(x1, h - 4, z1, x2, h - 4, z2);
        bladesNormals.push(0, 0, 1, 0, 0, 1);
        bladesUvs.push(i / bladeSegments, 0, i / bladeSegments, 1);
      }
    }
    for (let blade = 0; blade < bladeCount; blade++) {
      for (let i = 0; i < bladeSegments; i++) {
        const a = blade * (bladeSegments + 1) * 2 + i * 2;
        const b = a + 1;
        const d = a + 3;
        const c = a + 2;
        bladesIndices.push(a, b, d, a, d, c);
      }
    }
    const blades = new Mesh(gl, bladesVertices, bladesIndices, bladesNormals, bladesUvs);
  
    return { base, blades };
  }

// Fish
export function createFish(gl) {
  const vertices = [];
  const indices = [];
  const normals = [];
  const uvs = [];
  const slices = 20;
  const zOffset = 1;

  for (let i = 0; i <= slices; i++) {
    for (let j = 0; j <= slices; j++) {
      const theta = (i / slices) * Math.PI;
      const phi = (j / slices) * Math.PI * 2;
      const x = Math.sin(theta) * Math.cos(phi) * 1.5;
      const y = Math.sin(theta) * Math.sin(phi) * 1;
      const z = Math.cos(theta) * 3 + zOffset;
      vertices.push(x, y, z);
      normals.push(x / 1.5, y / 1, z / 3);
      uvs.push(j / slices, i / slices);
    }
  }
  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j;
      const b = a + 1;
      const c = a + (slices + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const tailBase = vertices.length / 3;
  vertices.push(
    0, 0, -3 + zOffset,
    -0.8, 0.5, -5 + zOffset,
    -0.8, -0.5, -5 + zOffset,
    0.8, 0, -5 + zOffset
  );
  normals.push(
    0, 0, -1,
    -0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, 0, 0
  );
  uvs.push(0.5, 0.5, 0, 1, 0, 0, 1, 0);
  indices.push(
    tailBase, tailBase+1, tailBase+2,
    tailBase, tailBase+2, tailBase+3,
    tailBase, tailBase+3, tailBase+1,
    tailBase+1, tailBase+2, tailBase+3
  );

  return new Mesh(gl, vertices, indices, normals, uvs);
}

// Treasure Chest
export function createTreasureChest(gl) {
    const bodyVertices = [];
    const bodyIndices = [];
    const bodyNormals = [];
    const bodyUvs = [];
    const baseWidth = 3;
    const baseHeight = 2;
    const baseDepth = 2;
    const bodyBaseVertices = [
      -baseWidth / 2, 0, -baseDepth / 2,
      baseWidth / 2, 0, -baseDepth / 2,
      baseWidth / 2, 0, baseDepth / 2,
      -baseWidth / 2, 0, baseDepth / 2,
      -baseWidth / 2, baseHeight, -baseDepth / 2,
      baseWidth / 2, baseHeight, -baseDepth / 2,
      baseWidth / 2, baseHeight, baseDepth / 2,
      -baseWidth / 2, baseHeight, baseDepth / 2,
    ];
    const bodyBaseIndices = [
      0, 1, 2, 0, 2, 3,
      0, 1, 5, 0, 5, 4,
      1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6,
      3, 0, 4, 3, 4, 7,
    ];
    bodyVertices.push(...bodyBaseVertices);
    bodyNormals.push(
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
    );
    bodyUvs.push(0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1);
    bodyIndices.push(...bodyBaseIndices);
    const body = new Mesh(gl, bodyVertices, bodyIndices, bodyNormals, bodyUvs);
  
    const lidVertices = [];
    const lidIndices = [];
    const lidNormals = [];
    const lidUvs = [];
    const lidRadius = baseHeight / 2;
    const lidSegments = 20;
    const lidWidth = baseWidth;
    for (let i = 0; i <= lidSegments; i++) {
      const theta = 0 + i * Math.PI / lidSegments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      lidVertices.push(-lidWidth / 2, baseHeight + lidRadius * sinTheta, lidRadius * cosTheta);
      lidVertices.push(lidWidth / 2, baseHeight + lidRadius * sinTheta, lidRadius * cosTheta);
      lidNormals.push(0, sinTheta, cosTheta, 0, sinTheta, cosTheta);
      lidUvs.push(0, i / lidSegments, 1, i / lidSegments);
    }
    for (let i = 0; i < lidSegments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      lidIndices.push(a, b, d, a, d, c);
    }
    const lid = new Mesh(gl, lidVertices, lidIndices, lidNormals, lidUvs);
  
    const bandsVertices = [];
    const bandsIndices = [];
    const bandsNormals = [];
    const bandsUvs = [];
    const bandThickness = 0.2;
    const bandHeight = baseHeight;
    const bandPositions = [-baseWidth / 2 + bandThickness, baseWidth / 2 - bandThickness];
    for (let pos of bandPositions) {
      const bandBaseVertices = [
        pos - bandThickness / 2, 0, -baseDepth / 2 - bandThickness / 2,
        pos + bandThickness / 2, 0, -baseDepth / 2 - bandThickness / 2,
        pos + bandThickness / 2, bandHeight, -baseDepth / 2 - bandThickness / 2,
        pos - bandThickness / 2, bandHeight, -baseDepth / 2 - bandThickness / 2,
        pos - bandThickness / 2, 0, baseDepth / 2 + bandThickness / 2,
        pos + bandThickness / 2, 0, baseDepth / 2 + bandThickness / 2,
        pos + bandThickness / 2, bandHeight, baseDepth / 2 + bandThickness / 2,
        pos - bandThickness / 2, bandHeight, baseDepth / 2 + bandThickness / 2,
      ];
      const bandOffset = bandsVertices.length / 3;
      bandsVertices.push(...bandBaseVertices);
      bandsNormals.push(
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
      );
      bandsUvs.push(0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1);
      const prismIndices = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        0, 1, 5, 0, 5, 4,
        3, 2, 6, 3, 6, 7,
        0, 3, 7, 0, 7, 4,
        1, 2, 6, 1, 6, 5,
      ];
      prismIndices.forEach(i => bandsIndices.push(i + bandOffset));
    }
    const bands = new Mesh(gl, bandsVertices, bandsIndices, bandsNormals, bandsUvs);
  
    const lockVertices = [];
    const lockIndices = [];
    const lockNormals = [];
    const lockUvs = [];
    const lockWidth = 0.8;
    const lockHeight = 1.2;
    const lockDepth = 0.3;
    const lockY = baseHeight / 2;
    const lockZ = -baseDepth / 2 - lockDepth / 2;
    const lockBaseVertices = [
      -lockWidth / 2, lockY - lockHeight / 2, lockZ,
      lockWidth / 2, lockY - lockHeight / 2, lockZ,
      lockWidth / 2, lockY + lockHeight / 2, lockZ,
      -lockWidth / 2, lockY + lockHeight / 2, lockZ,
      -lockWidth / 2, lockY - lockHeight / 2, lockZ + lockDepth,
      lockWidth / 2, lockY - lockHeight / 2, lockZ + lockDepth,
      lockWidth / 2, lockY + lockHeight / 2, lockZ + lockDepth,
      -lockWidth / 2, lockY + lockHeight / 2, lockZ + lockDepth,
    ];
    lockVertices.push(...lockBaseVertices);
    lockNormals.push(
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
    );
    lockUvs.push(0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1);
    const prismIndices = [
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      0, 1, 5, 0, 5, 4,
      3, 2, 6, 3, 6, 7,
      0, 3, 7, 0, 7, 4,
      1, 2, 6, 1, 6, 5,
    ];
    prismIndices.forEach(i => lockIndices.push(i));
    const lock = new Mesh(gl, lockVertices, lockIndices, lockNormals, lockUvs);
  
    return { body, lid, bands, lock };
  }

// Starfish
export function createStarfish(gl) {
    const armsVertices = [];
    const armsIndices = [];
    const armsNormals = [];
    const armsUvs = [];
    const armCount = 5;
    const armSegments = 20;
    const crossPoints = 5;
    const thickness = 0.4;
    for (let arm = 0; arm < armCount; arm++) {
      const armAngle = arm * Math.PI * 2 / armCount;
      for (let i = 0; i <= armSegments; i++) {
        const dist = 0.95 + i * 2.05 / armSegments;
        const w = 1.2 * (1 - i / armSegments);
        const height = 0.2 * (1 - i / armSegments);
        const x_left = Math.cos(armAngle) * dist + Math.sin(armAngle) * (w / 2);
        const z_left = Math.sin(armAngle) * dist - Math.cos(armAngle) * (w / 2);
        const x_right = Math.cos(armAngle) * dist - Math.sin(armAngle) * (w / 2);
        const z_right = Math.sin(armAngle) * dist + Math.cos(armAngle) * (w / 2);
        for (let j = 0; j < crossPoints; j++) {
          const t = j / (crossPoints - 1);
          const x = x_left + (x_right - x_left) * t;
          const z = z_left + (z_right - z_left) * t;
          const y_offset = height * Math.sin(Math.PI * t);
          armsVertices.push(x, -4.8 + y_offset, z);
          const sin_a = Math.sin(armAngle);
          const cos_a = Math.cos(armAngle);
          const curve_deriv = Math.PI * Math.cos(Math.PI * t);
          let nx = curve_deriv * sin_a;
          let ny = w / 2;
          let nz = -curve_deriv * cos_a;
          let normal_len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 0.001;
          let point_normal = [nx / normal_len, ny / normal_len, nz / normal_len];
          if (point_normal[1] < 0) point_normal = point_normal.map(v => -v);
          armsNormals.push(...point_normal);
          armsUvs.push(t, i / armSegments);
        }
        for (let j = 0; j < crossPoints; j++) {
          const t = j / (crossPoints - 1);
          const x = x_left + (x_right - x_left) * t;
          const z = z_left + (z_right - z_left) * t;
          armsVertices.push(x, -4.8 - thickness, z);
          armsNormals.push(0, -1, 0);
          armsUvs.push(t, i / armSegments);
        }
      }
    }
    for (let arm = 0; arm < armCount; arm++) {
      const base = arm * (armSegments + 1) * crossPoints * 2;
      for (let i = 0; i < armSegments; i++) {
        for (let j = 0; j < crossPoints - 1; j++) {
          const a = base + i * crossPoints * 2 + j;
          const b = a + 1;
          const d = a + crossPoints * 2 + 1;
          const c = a + crossPoints * 2;
          armsIndices.push(a, b, d, a, d, c);
        }
        for (let j = 0; j < crossPoints - 1; j++) {
          const a = base + i * crossPoints * 2 + j + crossPoints;
          const b = a + 1;
          const d = a + crossPoints * 2 + 1;
          const c = a + crossPoints * 2;
          armsIndices.push(a, d, b, a, c, d);
        }
        for (let j = 0; j < crossPoints; j++) {
          const top_curr = base + i * crossPoints * 2 + j;
          const bottom_curr = top_curr + crossPoints;
          const top_next = top_curr + crossPoints * 2;
          const bottom_next = bottom_curr + crossPoints * 2;
          let nx = 0;
          let ny = 0;
          let nz = 1;
          armsIndices.push(top_curr, bottom_curr, bottom_next, top_curr, bottom_next, top_next);
        }
      }
    }
    const arms = new Mesh(gl, armsVertices, armsIndices, armsNormals, armsUvs);
  
    const coinVertices = [];
    const coinIndices = [];
    const coinNormals = [];
    const coinUvs = [];
    const radius = 1;
    const segments = 20;
    const cylinder_height = 0.2;
    const base_y = -4.8;
    const top_y = base_y + cylinder_height;
  
    const bottomCenterIdx = coinVertices.length / 3;
    coinVertices.push(0, base_y, 0);
    coinNormals.push(0, -1, 0);
    coinUvs.push(0.5, 0.5);
    const bottomPerimStart = bottomCenterIdx + 1;
    for (let a = 0; a < segments; a++) {
      const angle = a * Math.PI * 2 / segments;
      coinVertices.push(Math.cos(angle) * radius, base_y, Math.sin(angle) * radius);
      coinNormals.push(0, -1, 0);
      coinUvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
    }
    for (let a = 0; a < segments; a++) {
      coinIndices.push(bottomCenterIdx, bottomPerimStart + (a + 1) % segments, bottomPerimStart + a);
    }
  
    const topCenterIdx = coinVertices.length / 3;
    coinVertices.push(0, top_y, 0);
    coinNormals.push(0, 1, 0);
    coinUvs.push(0.5, 0.5);
    const topPerimStart = topCenterIdx + 1;
    for (let a = 0; a < segments; a++) {
      const angle = a * Math.PI * 2 / segments;
      coinVertices.push(Math.cos(angle) * radius, top_y, Math.sin(angle) * radius);
      coinNormals.push(0, 1, 0);
      coinUvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
    }
    for (let a = 0; a < segments; a++) {
      coinIndices.push(topCenterIdx, topPerimStart + a, topPerimStart + (a + 1) % segments);
    }
  
    const sideBottomPerimStart = coinVertices.length / 3;
    for (let a = 0; a < segments; a++) {
      const angle = a * Math.PI * 2 / segments;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      coinVertices.push(Math.cos(angle) * radius, base_y, Math.sin(angle) * radius);
      coinNormals.push(nx, 0, nz);
      coinUvs.push(a / segments, 0);
    }
    const sideTopPerimStart = coinVertices.length / 3;
    for (let a = 0; a < segments; a++) {
      const angle = a * Math.PI * 2 / segments;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      coinVertices.push(Math.cos(angle) * radius, top_y, Math.sin(angle) * radius);
      coinNormals.push(nx, 0, nz);
      coinUvs.push(a / segments, 1);
    }
    for (let a = 0; a < segments; a++) {
      const b1 = sideBottomPerimStart + a;
      const b2 = sideBottomPerimStart + (a + 1) % segments;
      const t1 = sideTopPerimStart + a;
      const t2 = sideTopPerimStart + (a + 1) % segments;
      coinIndices.push(t1, t2, b2, t1, b2, b1);
    }
    const coin = new Mesh(gl, coinVertices, coinIndices, coinNormals, coinUvs);
  
    const oneVertices = [];
    const oneIndices = [];
    const oneNormals = [];
    const oneUvs = [];
    const bar_height = 0.1;
    const bar_width = 0.2;
    const bar_length = 0.8;
    const bar_base_y = top_y;
    const bar_top_y = bar_base_y + bar_height;
    const bar_vertices = [
      -bar_width / 2, bar_base_y, -bar_length / 2,
      bar_width / 2, bar_base_y, -bar_length / 2,
      bar_width / 2, bar_base_y, bar_length / 2,
      -bar_width / 2, bar_base_y, bar_length / 2,
      -bar_width / 2, bar_top_y, -bar_length / 2,
      bar_width / 2, bar_top_y, -bar_length / 2,
      bar_width / 2, bar_top_y, bar_length / 2,
      -bar_width / 2, bar_top_y, bar_length / 2,
    ];
    const bar_normals = [
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    ];
    oneVertices.push(...bar_vertices);
    oneNormals.push(...bar_normals);
    for (let i = 0; i < bar_vertices.length / 3; i++) {
      oneUvs.push(0.5, 0.5);
    }
    oneIndices.push(0, 1, 2, 0, 2, 3);
    oneIndices.push(4, 5, 6, 4, 6, 7);
    oneIndices.push(0, 1, 5, 0, 5, 4);
    oneIndices.push(1, 2, 6, 1, 6, 5);
    oneIndices.push(2, 3, 7, 2, 7, 6);
    oneIndices.push(3, 0, 4, 3, 4, 7);
    const one = new Mesh(gl, oneVertices, oneIndices, oneNormals, oneUvs);
  
    return { arms, coin, one };
  }