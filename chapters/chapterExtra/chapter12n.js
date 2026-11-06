/* #############################################################
   CHAPTER 11: SCKORPIO PARKING CHALLENGE — AABB COLLISION
   - One controllable Sckorpio car
   - Multiple static parked-car meshes sharing one texture
   - Static parked cars have AABBs, but no PhysicsInfo objects
   - Player AABB is checked against each parked-car AABB
   - Collision rolls the player back to its previous transform
   ############################################################# */

// =============================================================
// SHADER OBJECTS
// =============================================================

const basicShader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform mat3 u_modelMatrix;
    uniform mat3 u_viewMatrix;
    uniform mat3 u_projectionMatrix;

    void main() {
        vec3 localPosition = vec3(a_position, 1.0);
        vec3 clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * localPosition;
        gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        out_color = u_color;
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        modelMatrix: null,
        viewMatrix: null,
        projectionMatrix: null,
        color: null
    },

    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

const textureShader = {
    vertexShaderSource: `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;

        uniform mat3 u_modelMatrix;
        uniform mat3 u_viewMatrix;
        uniform mat3 u_projectionMatrix;

        out vec2 v_texCoord;

        void main() {
            vec3 localPosition = vec3(a_position, 1.0);
            vec3 clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * localPosition;
            gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `,

    fragmentShaderSource: `#version 300 es
        precision mediump float;

        uniform sampler2D u_texture;
        in vec2 v_texCoord;
        out vec4 out_color;

        void main() {
            out_color = texture(u_texture, v_texCoord);
        }
    `,

    program: null,

    attributes: {
        position: null,
        texCoord: null
    },

    uniforms: {
        modelMatrix: null,
        viewMatrix: null,
        projectionMatrix: null,
        texture: null
    },

    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.attributes.texCoord = gl.getAttribLocation(this.program, "a_texCoord");
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.texture = gl.getUniformLocation(this.program, "u_texture");
    }
};

// Compile Shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

// Link Program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// TEXTURE OBJECTS
// =============================================================

const carTexture = {
    imagePath: "chapters/chapter12/assets/sckorpioCarSolid_Texture.jpeg",

    image: null,
    handle: null,
    loaded: false,

    init(gl) {
        createTexture(gl, this);
    },

    bind(gl, textureUnit = 0) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.handle);
    }
};

function createTexture(gl, texture) {
    texture.handle = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture.handle);

    // Temporary cyan pixel while the image loads.
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([82, 161, 171, 255])
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    texture.image = new Image();

    texture.image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture.handle);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            texture.image
        );

        texture.loaded = true;
        console.log("Texture loaded:", texture.imagePath);
    };

    texture.image.onerror = () => {
        console.error("Could not load texture image:", texture.imagePath);
    };

    texture.image.src = texture.imagePath;
}

// =============================================================
// CAMERA
// =============================================================

const camera = {
    width: 0,
    height: 0,
    positionX: 0,
    positionY: 0,
    zoom: 1.0,
    panSpeed: 20,
    zoomSpeed: 0.1,

    state: {
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,
        zoomIn: false,
        zoomOut: false
    },

    viewMatrix: mat3.create(),
    projectionMatrix: mat3.create(),

    update(gl) {
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        if (this.state.panUp) this.positionY += this.panSpeed;
        if (this.state.panDown) this.positionY -= this.panSpeed;
        if (this.state.panLeft) this.positionX -= this.panSpeed;
        if (this.state.panRight) this.positionX += this.panSpeed;
        if (this.state.zoomIn) this.zoom += this.zoomSpeed;
        if (this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);
    },

    updateViewMatrix(gl) {
        this.update(gl);

        const matrix = mat3.create();
        mat3.fromTranslation(matrix, [-camera.positionX, -camera.positionY]);
        mat3.scale(matrix, matrix, [camera.zoom, camera.zoom]);
        camera.viewMatrix = matrix;
    },

    updateProjectionMatrix(gl) {
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        this.projectionMatrix = mat3.fromValues(
            2 / this.width, 0, 0,
            0, 2 / this.height, 0,
            -1, -1, 1
        );
    }
};

// =============================================================
// PLAYER MESH
// =============================================================

const sckorpioCar = {
    vertexData: new Float32Array([
        // Position     // UV
        -150, -100,     0, 0,
         150, -100,     1, 0,
        -150,  100,     0, 1,

        -150,  100,     0, 1,
         150, -100,     1, 0,
         150,  100,     1, 1
    ]),

    initialTranslationX: 0,
    initialTranslationY: 0,
    initialRotation: 0,
    initialScaleX: 1.0,
    initialScaleY: 1.0,

    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,

    modelMatrix: mat3.create(),

    shader: null,
    texture: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    init(gl, shader, texture) {
        this.shader = shader;
        this.texture = texture;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        gl.enableVertexAttribArray(this.shader.attributes.texCoord);
        gl.vertexAttribPointer(
            this.shader.attributes.texCoord,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT
        );

        this.positionOffset = 0;
        this.stride = 4;

        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 6;
    },

    resetTransform() {
        this.translationX = this.initialTranslationX;
        this.translationY = this.initialTranslationY;
        this.rotation = this.initialRotation;
        this.scaleX = this.initialScaleX;
        this.scaleY = this.initialScaleY;
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        setupModelMatrix(this);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix, false, this.modelMatrix);

        this.texture.bind(gl, 0);
        gl.uniform1i(this.shader.uniforms.texture, 0);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
};

// =============================================================
// PARKING LOT ENVIRONMENT
// =============================================================

const parkingLot = {
    shader: null,
    vao: null,
    vbo: null,
    vertexData: null,
    drawCount: 0,
    color: [0.96, 0.94, 0.82, 1.0],

    init(gl, shader) {
        this.shader = shader;

        const vertices = [];
        const addLine = (x1, y1, x2, y2) => {
            vertices.push(x1, y1, x2, y2);
        };

        // Outer parking-lot boundary: 1800 x 1200 world units.
        const left = -900, right = 900;
        const bottom = -600, top = 600;

        addLine(left, bottom, right, bottom);
        addLine(right, bottom, right, top);
        addLine(right, top, left, top);
        addLine(left, top, left, bottom);

        // Parking-bay dividers. The middle region is the driving aisle.
        const bayXs = [-720, -360, 0, 360, 720];

        for (const x of bayXs) {
            addLine(x, 150, x, 570);
            addLine(x, -570, x, -150);
        }

        // Back edges of the parking bays.
        addLine(left, 570, right, 570);
        addLine(left, -570, right, -570);

        // Aisle edges.
        addLine(left, 150, right, 150);
        addLine(left, -150, right, -150);

        // Short yellow center markers in the driving aisle.
        for (let x = -820; x < 850; x += 180) {
            addLine(x, 0, x + 90, 0);
        }

        this.vertexData = new Float32Array(vertices);
        this.drawCount = vertices.length / 2;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        gl.bindVertexArray(null);
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.LINES, 0, this.drawCount);
    }
};


// =============================================================
// PARKED CARS
// Static obstacles: meshes + AABBs, but NO PhysicsInfo objects.
// All cars share the same already-loaded carTexture.
// =============================================================

const parkedCars = [];

function createParkedCar(gl, shader, texture, options = {}) {
    const {
        x = 0,
        y = 0,
        rotation = 0,
        scaleX = 0.85,
        scaleY = 0.85,
        flipX = false,
        tint = [1.0, 1.0, 1.0, 1.0]
    } = options;

    const width = 300;
    const height = 200;

    const u0 = flipX ? 1 : 0;
    const u1 = flipX ? 0 : 1;

    const car = {
        vertexData: new Float32Array([
            -width / 2, -height / 2, u0, 0,
             width / 2, -height / 2, u1, 0,
            -width / 2,  height / 2, u0, 1,

            -width / 2,  height / 2, u0, 1,
             width / 2, -height / 2, u1, 0,
             width / 2,  height / 2, u1, 1
        ]),

        initialTranslationX: x,
        initialTranslationY: y,
        initialRotation: rotation,
        initialScaleX: scaleX,
        initialScaleY: scaleY,

        translationX: x,
        translationY: y,
        rotation,
        scaleX,
        scaleY,

        modelMatrix: mat3.create(),

        shader: null,
        texture: null,
        tint,

        vao: null,
        vbo: null,
        drawMode: null,
        drawOffset: 0,
        drawCount: 6,

        positionOffset: 0,
        stride: 4,

        boundingBox: {
            localMinX: 0,
            localMinY: 0,
            localMaxX: 0,
            localMaxY: 0,
            worldMinX: 0,
            worldMinY: 0,
            worldMaxX: 0,
            worldMaxY: 0
        },

        init(gl, shader, texture) {
            this.shader = shader;
            this.texture = texture;

            this.vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

            this.vao = gl.createVertexArray();
            gl.bindVertexArray(this.vao);

            gl.enableVertexAttribArray(shader.attributes.position);
            gl.vertexAttribPointer(
                shader.attributes.position,
                2,
                gl.FLOAT,
                false,
                4 * Float32Array.BYTES_PER_ELEMENT,
                0
            );

            gl.enableVertexAttribArray(shader.attributes.texCoord);
            gl.vertexAttribPointer(
                shader.attributes.texCoord,
                2,
                gl.FLOAT,
                false,
                4 * Float32Array.BYTES_PER_ELEMENT,
                2 * Float32Array.BYTES_PER_ELEMENT
            );

            this.drawMode = gl.TRIANGLES;

            gl.bindVertexArray(null);

            setupModelMatrix(this);
            calculateBoundingBox(this);
            updateBoundingBox(this);
        },

        draw(gl) {
            gl.useProgram(this.shader.program);

            setupModelMatrix(this);

            gl.uniformMatrix3fv(
                this.shader.uniforms.modelMatrix,
                false,
                this.modelMatrix
            );

            this.texture.bind(gl, 0);
            gl.uniform1i(this.shader.uniforms.texture, 0);

            gl.uniform4fv(this.shader.uniforms.tint, this.tint);

            gl.bindVertexArray(this.vao);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    };

    car.init(gl, shader, texture);
    return car;
}

function createParkingCars(gl, shader, texture) {
    parkedCars.length = 0;

    const layout = [
        {
            x: -540, y: 360,
            tint: [1.0, 0.25, 0.20, 1.0],
            flipX: false,
            scaleX: 0.85, scaleY: 0.85
        },
        {
            x: -180, y: 360,
            tint: [0.15, 0.45, 1.0, 1.0],
            flipX: true,
            scaleX: 0.80, scaleY: 0.80
        },
        {
            x: 180, y: 360,
            tint: [1.0, 0.75, 0.10, 1.0],
            flipX: false,
            scaleX: 0.90, scaleY: 0.90
        },
        {
            x: 540, y: 360,
            tint: [0.15, 0.80, 0.35, 1.0],
            flipX: true,
            scaleX: 0.85, scaleY: 0.85
        },
        {
            x: -540, y: -360,
            tint: [1.0, 0.40, 0.10, 1.0],
            flipX: true,
            scaleX: 0.90, scaleY: 0.90
        },
        {
            x: -180, y: -360,
            tint: [0.65, 0.25, 0.90, 1.0],
            flipX: false,
            scaleX: 0.80, scaleY: 0.80
        },
        {
            x: 180, y: -360,
            tint: [0.70, 0.75, 0.85, 1.0],
            flipX: true,
            scaleX: 0.85, scaleY: 0.85
        },
        {
            x: 540, y: -360,
            tint: [1.0, 0.35, 0.65, 1.0],
            flipX: false,
            scaleX: 0.90, scaleY: 0.90
        }
    ];

    for (const options of layout) {
        parkedCars.push(
            createParkedCar(gl, shader, texture, options)
        );
    }
}

function drawParkedCars(gl) {
    for (const car of parkedCars) {
        car.draw(gl);
    }
}


// =============================================================
// BOUNDING BOXES DEBUG RENDERER
// =============================================================

const boundingBoxes = {
    vertexData: null,

    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    modelMatrix: mat3.create(),
    color: [0.0, 0.0, 0.0, 1.0],

    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 0;
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        setupModelMatrix(this);

        gl.uniformMatrix3fv(
            this.shader.uniforms.modelMatrix,
            false,
            this.modelMatrix
        );

        gl.uniform4fv(this.shader.uniforms.color, this.color);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    },

    updateData(gl) {
        gl.bindVertexArray(this.vao);

        // Player AABB plus the static AABBs of every parked car.
        const boxes = [
            physicsInfoSckorpioCar.boundingBox,
            ...parkedCars.map(car => car.boundingBox)
        ];

        const vertices = [];

        for (const bbox of boxes) {
            vertices.push(
                bbox.worldMinX, bbox.worldMinY,
                bbox.worldMaxX, bbox.worldMinY,

                bbox.worldMaxX, bbox.worldMinY,
                bbox.worldMaxX, bbox.worldMaxY,

                bbox.worldMaxX, bbox.worldMaxY,
                bbox.worldMinX, bbox.worldMaxY,

                bbox.worldMinX, bbox.worldMaxY,
                bbox.worldMinX, bbox.worldMinY
            );
        }

        this.vertexData = new Float32Array(vertices);
        this.drawCount = this.vertexData.length / 2;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    }
};

// =============================================================
// GRID
// =============================================================

const grid = {
    vertexData: new Float32Array(),
    spacing: 100,
    range: 10000,
    color: [0.39, 0.33, 0.58, 1.0],

    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    init(gl, shader) {
        this.shader = shader;

        const positions = [];

        for (let x = -this.range; x <= this.range; x += this.spacing) {
            positions.push(x, -this.range, x, this.range);
        }

        for (let y = -this.range; y <= this.range; y += this.spacing) {
            positions.push(-this.range, y, this.range, y);
        }

        this.vertexData = new Float32Array(positions);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = positions.length / 2;
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
};


// =============================================================
// X AXIS
// =============================================================

const xAxis = {
    vertexData: new Float32Array([
        -grid.range, 0,
         grid.range, 0
    ]),

    color: [1.0, 0.0, 0.0, 1.0],

    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
};


// =============================================================
// Y AXIS
// =============================================================

const yAxis = {
    vertexData: new Float32Array([
        0, -grid.range,
        0,  grid.range
    ]),

    color: [0.0, 1.0, 0.0, 1.0],

    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
};


// =============================================================
// MODEL MATRIX
// =============================================================

function setupModelMatrix(mesh) {
    const matrix = mat3.create();

    mat3.translate(matrix, matrix, [
        mesh.translationX,
        mesh.translationY
    ]);

    mat3.rotate(matrix, matrix, mesh.rotation * Math.PI / 180);

    mat3.scale(matrix, matrix, [
        mesh.scaleX,
        mesh.scaleY
    ]);

    mesh.modelMatrix = matrix;
}


// =============================================================
// RENDER SYSTEM
// =============================================================

const renderSystem = {
    canvas: null,
    gl: null,

    initWebgl() {
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element not found");
            return;
        }

        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported by this browser");
            return;
        }
    },

    resizeCanvasToDisplaySize(multiplier = 1) {
        const width = (this.canvas.clientWidth * multiplier) | 0;
        const height = (this.canvas.clientHeight * multiplier) | 0;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    },

    init() {
        this.initWebgl();

        if (!this.gl) return;

        const gl = this.gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Textures
        carTexture.init(gl);

        // Shaders
        basicShader.init(gl);
        textureShader.init(gl);

        // Parking lot
        parkingLot.init(gl, basicShader);

        // Player car
        sckorpioCar.init(gl, textureShader, carTexture);

        // Parked cars
        createParkingCars(gl, textureShader, carTexture);

        // Debug bounding boxes
        boundingBoxes.init(gl, basicShader);
    },

    update() {
        const gl = this.gl;

        camera.updateProjectionMatrix(gl);
        camera.updateViewMatrix(gl);

        boundingBoxes.updateData(gl);
    },

    render() {
        const gl = this.gl;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Background
        gl.clearColor(0.20, 0.22, 0.24, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Basic shader common uniforms
        gl.useProgram(basicShader.program);

        gl.uniformMatrix3fv(
            basicShader.uniforms.projectionMatrix,
            false,
            camera.projectionMatrix
        );

        gl.uniformMatrix3fv(
            basicShader.uniforms.viewMatrix,
            false,
            camera.viewMatrix
        );

        gl.uniformMatrix3fv(
            basicShader.uniforms.modelMatrix,
            false,
            mat3.create()
        );

        // Texture shader common uniforms
        gl.useProgram(textureShader.program);

        gl.uniformMatrix3fv(
            textureShader.uniforms.viewMatrix,
            false,
            camera.viewMatrix
        );

        gl.uniformMatrix3fv(
            textureShader.uniforms.projectionMatrix,
            false,
            camera.projectionMatrix
        );

        gl.uniformMatrix3fv(
            textureShader.uniforms.modelMatrix,
            false,
            mat3.create()
        );

        // Render parking lot
        parkingLot.draw(gl);

        // Render static parked vehicles
        drawParkedCars(gl);

        // Render player vehicle
        sckorpioCar.draw(gl);

        // Render debug AABBs
        boundingBoxes.draw(gl);
    }
};


// =============================================================
// CLOCK
// =============================================================

const clock = {
    isPlaying: false,
    elapsedTime: 0,
    lastElapsedTime: 0,

    startTime: 0,
    previousTime: 0,
    currentTime: 0,
    deltaTime: 0,
    fps: 0,

    timerDisplay: 0,
    lastLogTime: 0,

    play() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.startTime = 0;
    },

    pause() {
        if (!this.isPlaying) return;

        this.lastElapsedTime = this.elapsedTime;
        this.isPlaying = false;
        this.startTime = 0;
        this.deltaTime = 0;
    },

    reset() {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.lastElapsedTime = 0;
        this.startTime = 0;
        this.previousTime = 0;
        this.currentTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.timerDisplay = "0.00 s";

        this.log();
    },

    update(timeStamp) {
        this.currentTime = timeStamp;

        if (!this.isPlaying) return;

        if (this.startTime === 0 && timeStamp !== undefined) {
            this.startTime = this.currentTime;
            this.previousTime = this.currentTime;
        }

        this.elapsedTime =
            this.lastElapsedTime +
            (this.currentTime - this.startTime) * 0.001;

        this.deltaTime =
            (this.currentTime - this.previousTime) * 0.001;

        this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0;

        if (this.currentTime - this.lastLogTime >= 100) {
            this.lastLogTime = this.currentTime;
        }

        this.previousTime = this.currentTime;
        this.timerDisplay = this.elapsedTime.toFixed(2) + " s";
    },

    log() {
        console.clear();
        console.log("----- Timer ------------------");
        console.log("Elapsed Time   : ", this.elapsedTime?.toFixed(2), "s");
        console.log("----- Frames -----------------");
        console.log("Start Time     : ", this.startTime?.toFixed(2), "ms");
        console.log("Current Time   : ", this.currentTime?.toFixed(2), "ms");
        console.log("Previous Time  : ", this.previousTime?.toFixed(2), "ms");
        console.log("Delta Time     : ", this.deltaTime?.toFixed(4), "s");
        console.log("FPS            : ", this.fps?.toFixed(0), "/s");
        console.log("------------------------------");
    }
};


// =============================================================
// PHYSICS INFO — PLAYER ONLY
// =============================================================

const physicsInfoSckorpioCar = {
    mesh: null,

    speed: 500,

    directionX: 1.0,
    directionY: 0.0,
    directionAngle: 0,

    velocityX: 100,
    velocityY: 50,

    state: {
        angleUp: false,
        angleDown: false,
        forward: false,
        backward: false
    },

    boundingBox: {
        localMinX: 0,
        localMinY: 0,
        localMaxX: 0,
        localMaxY: 0,

        worldMinX: 0,
        worldMinY: 0,
        worldMaxX: 0,
        worldMaxY: 0
    },

    previousX: 0,
    previousY: 0,
    previousDirectionAngle: 0,
    isCollision: false,

    init(mesh) {
        this.mesh = mesh;

        this.directionX = Math.cos(this.directionAngle * Math.PI / 180);
        this.directionY = Math.sin(this.directionAngle * Math.PI / 180);

        this.velocityX = this.speed * this.directionX;
        this.velocityY = this.speed * this.directionY;

        calculateBoundingBox(this);
        updateBoundingBox(this);

        console.log(this.boundingBox);
    },

    update(deltaTime) {
        // Save previous transform.
        this.previousX = this.mesh.translationX;
        this.previousY = this.mesh.translationY;
        this.previousDirectionAngle = this.mesh.rotation;

        // Key controls.
        if (this.state.angleUp) this.directionAngle += 1.0;
        if (this.state.angleDown) this.directionAngle -= 1.0;

        // Direction unit vector.
        this.directionX = Math.cos(this.directionAngle * Math.PI / 180);
        this.directionY = Math.sin(this.directionAngle * Math.PI / 180);

        // Velocity.
        if (this.state.forward) {
            this.velocityX = this.speed * this.directionX;
            this.velocityY = this.speed * this.directionY;
        } else if (this.state.backward) {
            this.velocityX = -this.speed * this.directionX;
            this.velocityY = -this.speed * this.directionY;
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }

        // Mesh transforms.
        this.mesh.translationX += deltaTime * this.velocityX;
        this.mesh.translationY += deltaTime * this.velocityY;
        this.mesh.rotation = this.directionAngle;

        // Update matrix for collision calculations.
        setupModelMatrix(this.mesh);
        updateBoundingBox(this);
    },

    onCollision() {
        this.velocityX = 0;
        this.velocityY = 0;

        this.mesh.translationX = this.previousX;
        this.mesh.translationY = this.previousY;
        this.mesh.rotation = this.previousDirectionAngle;

        setupModelMatrix(this.mesh);
        updateBoundingBox(this);

        this.collision = false;
    },

    reset() {
        this.mesh.resetTransform();
    }
};

// =============================================================
// BOUNDING BOX CALCULATION
// =============================================================

function calculateBoundingBox(object) {
    const mesh = object.mesh || object;
    const bbox = object.boundingBox;
    const vertexData = mesh.vertexData;

    const stride = mesh.stride;
    const positionOffset = mesh.positionOffset;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = positionOffset; i < vertexData.length; i += stride) {
        const x = vertexData[i];
        const y = vertexData[i + 1];

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);

        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    bbox.localMinX = minX;
    bbox.localMinY = minY;
    bbox.localMaxX = maxX;
    bbox.localMaxY = maxY;
}


// =============================================================
// UPDATE WORLD-SPACE BOUNDING BOX
// =============================================================

function updateBoundingBox(object) {
    const mesh = object.mesh || object;
    const modelMatrix = mesh.modelMatrix;
    const bbox = object.boundingBox;

    const minX = bbox.localMinX;
    const minY = bbox.localMinY;
    const maxX = bbox.localMaxX;
    const maxY = bbox.localMaxY;

    // Four local-space corners.
    const corners = [
        [minX, minY, 1],
        [maxX, minY, 1],
        [maxX, maxY, 1],
        [minX, maxY, 1]
    ];

    let worldMinX = Infinity;
    let worldMinY = Infinity;
    let worldMaxX = -Infinity;
    let worldMaxY = -Infinity;

    for (const corner of corners) {
        const worldVertex = vec3.transformMat3(
            vec3.create(),
            corner,
            modelMatrix
        );

        worldMinX = Math.min(worldMinX, worldVertex[0]);
        worldMinY = Math.min(worldMinY, worldVertex[1]);

        worldMaxX = Math.max(worldMaxX, worldVertex[0]);
        worldMaxY = Math.max(worldMaxY, worldVertex[1]);
    }

    bbox.worldMinX = worldMinX;
    bbox.worldMinY = worldMinY;
    bbox.worldMaxX = worldMaxX;
    bbox.worldMaxY = worldMaxY;
}


// =============================================================
// AABB COLLISION DETECTION
// =============================================================

function checkCollision(physicsInfoA, physicsInfoB) {
    const a = physicsInfoA.boundingBox;
    const b = physicsInfoB.boundingBox;

    const isCollision =
        a.worldMinX < b.worldMaxX &&
        a.worldMaxX > b.worldMinX &&
        a.worldMinY < b.worldMaxY &&
        a.worldMaxY > b.worldMinY;

    return isCollision;
}


// =============================================================
// PHYSICS SYSTEM
// =============================================================

const physicsSystem = {
    wasColliding: false,

    init() {
        physicsInfoSckorpioCar.init(sckorpioCar);
    },

    update() {
        physicsInfoSckorpioCar.update(clock.deltaTime);

        let collidedCar = null;

        // Check the player against every parked car.
        // Each player/parked-car pair is checked once per frame.
        for (const parkedCar of parkedCars) {
            if (checkCollision(physicsInfoSckorpioCar, parkedCar)) {
                collidedCar = parkedCar;
                break;
            }
        }

        const isCollision = collidedCar !== null;

        if (isCollision) {
            physicsInfoSckorpioCar.onCollision();

            if (!this.wasColliding) {
                console.log("Sckorpio collided with a parked car!");
            }
        }

        physicsInfoSckorpioCar.isCollision = isCollision;
        this.wasColliding = isCollision;
    },

    reset() {
        physicsInfoSckorpioCar.reset();

        physicsInfoSckorpioCar.directionAngle = sckorpioCar.initialRotation;
        physicsInfoSckorpioCar.velocityX = 0;
        physicsInfoSckorpioCar.velocityY = 0;
        physicsInfoSckorpioCar.isCollision = false;

        this.wasColliding = false;

        setupModelMatrix(sckorpioCar);
        updateBoundingBox(physicsInfoSckorpioCar);
    }
};


// =============================================================
// GUI
// =============================================================

const gui = {
    init() {
        const gui = new lil.GUI();

        // Sckorpio car.
        const rectangleFolder = gui.addFolder("Sckorpio Car");

        rectangleFolder
            .add(sckorpioCar, "translationX", -1000, 1000)
            .name("translationX");

        rectangleFolder
            .add(sckorpioCar, "translationY", -1000, 1000)
            .name("translationY");

        rectangleFolder
            .add(sckorpioCar, "rotation", 0, 360)
            .name("rotation");

        rectangleFolder
            .add(sckorpioCar, "scaleX", 0.1, 3.0)
            .name("scaleX");

        rectangleFolder
            .add(sckorpioCar, "scaleY", 0.1, 3.0)
            .name("scaleY");

        // Player physics.
        const physicsFolder1 = gui.addFolder("Player Physics");

        physicsFolder1
            .add(physicsInfoSckorpioCar, "speed", 0, 1000)
            .name("Speed");

        // Clock.
        const animationFolder = gui.addFolder("Clock");

        animationFolder.add(clock, "play");
        animationFolder.add(clock, "pause");

        animationFolder.add({
            reset: () => {
                clock.reset();
                physicsSystem.reset();
            }
        }, "reset");

        clock.timerDisplay = "0.00 s";

        const timerController = animationFolder
            .add(clock, "timerDisplay")
            .name("Elapsed Time");

        timerController.listen();
    }
};


// =============================================================
// KEY EVENTS
// =============================================================

const keyEvent = {
    init() {
        window.addEventListener("keydown", event => {
            switch (event.key) {
                case "ArrowUp":
                    camera.state.panUp = true;
                    break;

                case "ArrowLeft":
                    camera.state.panLeft = true;
                    break;

                case "ArrowDown":
                    camera.state.panDown = true;
                    break;

                case "ArrowRight":
                    camera.state.panRight = true;
                    break;

                case "+":
                case "=":
                    camera.state.zoomIn = true;
                    break;

                case "-":
                case "_":
                    camera.state.zoomOut = true;
                    break;

                case "A":
                case "a":
                    physicsInfoSckorpioCar.state.angleUp = true;
                    break;

                case "D":
                case "d":
                    physicsInfoSckorpioCar.state.angleDown = true;
                    break;

                case "W":
                case "w":
                    physicsInfoSckorpioCar.state.forward = true;
                    break;

                case "S":
                case "s":
                    physicsInfoSckorpioCar.state.backward = true;
                    break;

                default:
                    break;
            }
        });

        window.addEventListener("keyup", event => {
            switch (event.key) {
                case "ArrowUp":
                    camera.state.panUp = false;
                    break;

                case "ArrowLeft":
                    camera.state.panLeft = false;
                    break;

                case "ArrowDown":
                    camera.state.panDown = false;
                    break;

                case "ArrowRight":
                    camera.state.panRight = false;
                    break;

                case "+":
                case "=":
                    camera.state.zoomIn = false;
                    break;

                case "-":
                case "_":
                    camera.state.zoomOut = false;
                    break;

                case "A":
                case "a":
                    physicsInfoSckorpioCar.state.angleUp = false;
                    break;

                case "D":
                case "d":
                    physicsInfoSckorpioCar.state.angleDown = false;
                    break;

                case "W":
                case "w":
                    physicsInfoSckorpioCar.state.forward = false;
                    break;

                case "S":
                case "s":
                    physicsInfoSckorpioCar.state.backward = false;
                    break;

                default:
                    break;
            }
        });
    }
};


// =============================================================
// APP
// =============================================================

function appInit() {
    renderSystem.init();

    if (!renderSystem.gl) return;

    physicsSystem.init();
    gui.init();
    keyEvent.init();
}

function appLoop(timeStamp) {
    renderSystem.resizeCanvasToDisplaySize();

    clock.update(timeStamp);
    physicsSystem.update();

    renderSystem.update();
    renderSystem.render();

    requestAnimationFrame(appLoop);
}


// =============================================================
// MAIN
// =============================================================

function main() {
    appInit();
    appLoop();
}


// =============================================================
// STARTUP AND EXPORTS
// =============================================================

window.addEventListener("DOMContentLoaded", main);

export {
    main
};