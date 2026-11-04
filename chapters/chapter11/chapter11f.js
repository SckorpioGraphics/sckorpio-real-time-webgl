/* #############################################################
   CHAPTER 11f: Add Collison checking function

   Topics:
   - Let circles move by Physics
   - Update bboxes to move with them
   - Observe They get collided using Logs
   - Freeze their velocities
   #############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
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

    //FUNCTIONS
    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Attributes
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        // uniforms
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

// Compile Shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if(compileStatus) return shader;

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

    if(linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// CAMERA
// =============================================================
const camera = {
    // Camera Data
    width: 0,
    height: 0,
    positionX: -300,
    positionY: -200,
    zoom: 1.0,
    panSpeed: 20,
    zoomSpeed: 0.1,

    // Control state
    state: {
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,
        zoomIn: false,
        zoomOut: false
    },

    // View Matrix
    viewMatrix: mat3.create(),
    // Projection matrix
    projectionMatrix: mat3.create(),

    // FUNCTIONs
    update(gl) {
        // Match the camera's viewing region
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        // Update the pos and zooms
        if(this.state.panUp) this.positionY += this.panSpeed;
        if(this.state.panDown) this.positionY -= this.panSpeed;
        if(this.state.panLeft) this.positionX -= this.panSpeed;
        if(this.state.panRight) this.positionX += this.panSpeed;
        if(this.state.zoomIn) this.zoom += this.zoomSpeed;
        if(this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);
    },
    updateViewMatrix(gl) {
        // Update Camera values first
        this.update(gl);
        // Create View matrix
        const matrix = mat3.create();
        mat3.fromTranslation(matrix, [-camera.positionX, -camera.positionY]);
        mat3.scale(matrix, matrix, [camera.zoom, camera.zoom]);
        camera.viewMatrix = matrix;
    },
    updateProjectionMatrix(gl) {
        // Camera bounds
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        // Create projection matrix
        this.projectionMatrix = mat3.fromValues(
            2 / this.width,  0,                  0,
            0,               2 / this.height,    0,
            -1,              -1,                 1,
        );
    }
};

// =============================================================
// MESHES
// =============================================================
const circle1 = {
    /*
             v6---v5
           /   \ /   \
         v1     v0    v4
           \         /
             v2---v3
    */

    points: 100,
    radius: 100,
    positions: null,
    indices: null,
    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    modelMatrix: mat3.create(),
    color: [1.0, 0.0, 0.0, 0.3],

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Connect shader to mesh
        this.shader = shader;

        // Allocate CPU vertex data
        // 1 center + points perimeter vertices
        this.positions = new Float32Array((this.points + 1) * 2);
        this.indices = new Uint16Array(this.points + 2);

        // Center vertex
        this.positions[0] = 0.0;
        this.positions[1] = 0.0;
        this.indices[0] = 0;

        // Perimeter vertices
        for (let i = 0; i < this.points; i++) {
            const angle = (i / this.points) * (2 * Math.PI);

            const pX = this.radius * Math.cos(angle);
            const pY = this.radius * Math.sin(angle);

            const vertex = i + 1;

            this.positions[vertex * 2] = pX;
            this.positions[vertex * 2 + 1] = pY;
            this.indices[vertex] = vertex;
        }

        // Repeat First one again
        this.indices[this.points + 1] = 1;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        // Index Buffer
        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Enable position attribute
        gl.enableVertexAttribArray(this.shader.attributes.position);

        // Bind Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        // Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

        // Draw data
        this.drawMode = gl.TRIANGLE_FAN;
        this.drawOffset = 0;
        this.drawCount = this.indices.length;
        this.drawType = gl.UNSIGNED_SHORT;

        // Unbind VAO
        gl.bindVertexArray(null);
    },
    draw(gl) {
        setupModelMatrix(this);
        gl.useProgram(this.shader.program);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix,false,this.modelMatrix);
        gl.uniform4fv(this.shader.uniforms.color,this.color);
        gl.bindVertexArray(this.vao);
        gl.drawElements(
            this.drawMode,
            this.drawCount,
            this.drawType,
            this.drawOffset
        );
    }
};

const circle2 = {
    /*
             v6---v5
           /   \ /   \
         v1     v0    v4
           \         /
             v2---v3
    */

    points: 100,
    radius: 100,
    positions: null,
    indices: null,
    translationX: 1000,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    modelMatrix: mat3.create(),
    color: [0.0, 1.0, 0.0, 0.3],

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Connect shader to mesh
        this.shader = shader;

        // Allocate CPU vertex data
        // 1 center + points perimeter vertices
        this.positions = new Float32Array((this.points + 1) * 2);
        this.indices = new Uint16Array(this.points + 2);

        // Center vertex
        this.positions[0] = 0.0;
        this.positions[1] = 0.0;
        this.indices[0] = 0;

        // Perimeter vertices
        for (let i = 0; i < this.points; i++) {
            const angle = (i / this.points) * (2 * Math.PI);

            const pX = this.radius * Math.cos(angle);
            const pY = this.radius * Math.sin(angle);

            const vertex = i + 1;

            this.positions[vertex * 2] = pX;
            this.positions[vertex * 2 + 1] = pY;
            this.indices[vertex] = vertex;
        }

        // Repeat First one again
        this.indices[this.points + 1] = 1;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        // Index Buffer
        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Enable position attribute
        gl.enableVertexAttribArray(this.shader.attributes.position);

        // Bind Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        // Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

        // Draw data
        this.drawMode = gl.TRIANGLE_FAN;
        this.drawOffset = 0;
        this.drawCount = this.indices.length;
        this.drawType = gl.UNSIGNED_SHORT;

        // Unbind VAO
        gl.bindVertexArray(null);
    },
    draw(gl) {
        setupModelMatrix(this);
        gl.useProgram(this.shader.program);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix,false,this.modelMatrix);
        gl.uniform4fv(this.shader.uniforms.color,this.color);
        gl.bindVertexArray(this.vao);
        gl.drawElements(
            this.drawMode,
            this.drawCount,
            this.drawType,
            this.drawOffset
        );
    }
};

const boundingBoxes = {
    /*
             v6---v5
           /        \
         v1          v4
           \        /
             v2---v3
    */

    bboxCount: 1,
    points: 32,
    positions: null,
    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    modelMatrix: mat3.create(),
    color: [0.0, 0.0, 0.0, 1.0],

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Connect shader to mesh
        this.shader = shader;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        //gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Enable position attribute
        gl.enableVertexAttribArray(this.shader.attributes.position);

        // Bind Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        // Draw data
        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 4 * this.points * this.bboxCount;
        this.drawType = gl.UNSIGNED_SHORT;

        // Unbind VAO
        gl.bindVertexArray(null);
    },
    draw(gl) {
        setupModelMatrix(this);
        gl.useProgram(this.shader.program);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix,false,this.modelMatrix);
        gl.uniform4fv(this.shader.uniforms.color,this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    },
    updateData(gl) {
        gl.bindVertexArray(this.vao);

        const bbox1 = physicsInfoCircle1.boundingBox;
        const bbox2 = physicsInfoCircle2.boundingBox;
        const circularBBoxes = [bbox2, bbox1];
        this.bboxCount = 2;

        // Allocate CPU vertex data
        this.positions = new Float32Array(this.points * 4 * this.bboxCount);

        // counter for each circular bbox
        let c = 0;

        // For Each Bounding Box
        circularBBoxes.forEach((bbox)=>{
            const centerX = bbox.centerX;
            const centerY = bbox.centerY;
            const radius = bbox.radius;
            
            // Add (pX, 0)
            const pX = centerX + radius * Math.cos(0);
            const pY = centerY + radius * Math.sin(0);
            this.positions[c + 0] = pX;
            this.positions[c + 1] = pY;

            for (let i = 1; i < this.points; i++) {
                const angle = (i / this.points) * (2 * Math.PI);
                const pX = centerX + radius * Math.cos(angle);
                const pY = centerY + radius * Math.sin(angle);

                this.positions[(c + i * 4 + 0) - 2] = pX;
                this.positions[(c + i * 4 + 1) - 2] = pY;

                this.positions[(c + i * 4 + 2) - 2] = pX;
                this.positions[(c + i * 4 + 3) - 2] = pY;
            }

            // Add (pX, 0)
            this.positions[c + 4 * this.points - 2] = pX;
            this.positions[c + 4 * this.points - 1] = pY;

            // move to next circular Bbox
            c+= this.points * 4;
        });

        // Update vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
    }
};

const grid = {
    //    v1------------v2
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    v0------------v1

    // CPU DATA
    vertexData: new Float32Array(),
    spacing: 100,
    range: 10000,
    color: [0.39, 0.33, 0.58, 1.0], // Sckorpio Purple

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        const positions = [];
    
        // Vertical lines
        for(let x = -this.range; x <= this.range; x += this.spacing) {
            positions.push(
                x, -this.range,
                x, this.range
            );
        }

        // Horizontal lines
        for(let y = -this.range; y <= this.range; y += this.spacing) {
            positions.push(
                -this.range, y,
                this.range, y
            );
        }

        this.vertexData = new Float32Array(positions);
        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Attrib
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        //Draw Data
        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = positions.length / 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color,this.color);  
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

const xAxis = {
    //    -x------0------+x

    // CPU DATA
    vertexData: new Float32Array([
        -grid.range, 0,
        grid.range, 0
    ]),
    color: [1.0, 0.0, 0.0, 1.0], // Red

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color,this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

const yAxis = {
    //      +y
    //      |
    //      |
    //      0
    //      |
    //      |
    //      -y

    // CPU DATA
    vertexData: new Float32Array([
        0, -grid.range,
        0, grid.range
    ]),
    color: [0.0, 1.0, 0.0, 1.0], // Green

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color,this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

function setupModelMatrix(mesh) {
    const matrix = mat3.create();

    mat3.translate(matrix, matrix, [mesh.translationX, mesh.translationY]);
    mat3.rotate(matrix, matrix, mesh.rotation * Math.PI / 180);
    mat3.scale(matrix, matrix, [mesh.scaleX, mesh.scaleY]);

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

        // Blending: Enable Alpha Blending
        gl.enable(gl.BLEND);
        // Set Blend Function
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        //Shaders
        shader.init(gl);

        //Objects
        grid.init(gl, shader);
        xAxis.init(gl, shader);
        yAxis.init(gl, shader);
        circle1.init(gl, shader);
        circle2.init(gl, shader);
        boundingBoxes.init(gl, shader);

    },
    update() {
        const gl = this.gl;
        camera.updateProjectionMatrix(gl);
        camera.updateViewMatrix(gl);
        boundingBoxes.updateData(gl);

    },
    render() {
        const gl = this.gl;

        // -------------------------------------
        // -------------------------------------
        // ---------------------------------------
        gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

        // Background
        gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
        gl.clear(gl.COLOR_BUFFER_BIT);
        // COMMON UNIFORMS
        // Shader
        gl.useProgram(shader.program);
        // Pass projection matrix to shader
        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix,false,camera.projectionMatrix);
        // Pass View matrix to shader
        gl.uniformMatrix3fv(shader.uniforms.viewMatrix,false,camera.viewMatrix);
        // Pass Model Matrix (Identity as default)
        gl.uniformMatrix3fv(shader.uniforms.modelMatrix,false,mat3.create());

        // RENDER MESHES
        // Grid
        grid.draw(gl);
        // X-Axis
        xAxis.draw(gl);
        // Y-Axis
        yAxis.draw(gl);
        // circle
        circle1.draw(gl);
        // circle2
        circle2.draw(gl);

        // Circular BBox
        boundingBoxes.draw(gl);

        //---------------------------------------------------
    }
};

// =============================================================
// CLOCK
// =============================================================
const clock = {
    // time
    isPlaying: false,
    elapsedTime: 0,
    lastElapsedTime: 0,

    // per frame
    startTime: 0,
    previousTime: 0,
    currentTime: 0,
    deltaTime: 0,
    fps: 0,
    
    // for log
    timerDisplay: 0,
    lastLogTime: 0,

    play() {
        // Already playing? Do nothing.
        if (this.isPlaying) return;
        // Play
        this.isPlaying = true;
        // Reset startTime
        this.startTime = 0;
    },
    pause() {
        // Already paused? Do nothing.
        if (!this.isPlaying) return;
        // Preserve the elapsed time
        this.lastElapsedTime = this.elapsedTime;
        // Pause
        this.isPlaying = false;
        // Reset startTime
        this.startTime = 0;
        this.deltaTime = 0;
    },
    reset() {
        // Reset all
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.lastElapsedTime = 0;
        this.startTime = 0;
        this.previousTime = 0;
        this.currentTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.timerDisplay = "0.00 s"
        this.log();
    },

    update(timeStamp) {
        this.currentTime = timeStamp;

        // Don't advance the clock while paused
        if (!this.isPlaying) return;

        // First frame of a play/resume session
        if (this.startTime === 0 && timeStamp!= undefined) {
            this.startTime = this.currentTime;
            this.previousTime = this.currentTime;
        }

        // Total time = previous sessions + current session
        this.elapsedTime = this.lastElapsedTime + (this.currentTime - this.startTime) * 0.001;

        // Time since the previous frame
        this.deltaTime = (this.currentTime - this.previousTime) * 0.001;

        this.fps = this.deltaTime > 0 ? 1 / this.deltaTime: 0;

        // Log only once every second
        if (this.currentTime - this.lastLogTime >= 100) {
            //this.log();
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
}

// =============================================================
// PHYSICS INFOS
// =============================================================
const physicsInfoCircle1 = {
    // Object
    mesh: null,
    // Velocity
    velocityX: 200,
    // Bounding Box
    boundingBox: {
        centerX: 0,
        centerY: 0,
        radius: 100
    },

    init(mesh) {
        this.mesh = mesh;
        updateBoundingBox(this);
    },
    update(deltaTime) {
        this.mesh.translationX += deltaTime * this.velocityX;
        updateBoundingBox(this);
    }
};

const physicsInfoCircle2 = {
    // Object
    mesh: null,
    // Velocity
    velocityX: -100,
    // Bounding Box
    boundingBox: {
        centerX: 1000,
        centerY: 0,
        radius: 100
    },

    init(mesh) {
        this.mesh = mesh;
        updateBoundingBox(this);
    },
    update(deltaTime) {
        this.mesh.translationX += deltaTime * this.velocityX;
        updateBoundingBox(this);
    }
};

function updateBoundingBox(physicsInfo) {
    const mesh = physicsInfo.mesh;
    physicsInfo.boundingBox.centerX = mesh.translationX;
    physicsInfo.boundingBox.centerY = mesh.translationY;
}

function checkCollision(physicsInfoA, physicsInfoB) {
    const a = physicsInfoA.boundingBox;
    const b = physicsInfoB.boundingBox;

    const dist = Math.sqrt(
        (a.centerX - b.centerX) * (a.centerX - b.centerX) +
        (a.centerY - b.centerY) * (a.centerY - b.centerY));

    // Check whether the Circular bounding boxes overlap
    const isColliding = dist < (a.radius + b.radius);

    return isColliding;
}

// =============================================================
// PHYSICS SYSTEM
// =============================================================
const physicsSystem = {
    init() {
        physicsInfoCircle1.init(circle1);
        physicsInfoCircle2.init(circle2);
    },
    update() {
        physicsInfoCircle1.update(clock.deltaTime);
        physicsInfoCircle2.update(clock.deltaTime);
        // Detect collision
        const isColliding = checkCollision(
            physicsInfoCircle1,
            physicsInfoCircle2
        );

        if (isColliding) {
            console.log("Collision detected!");
            const temp = physicsInfoCircle2.velocityX
            physicsInfoCircle2.velocityX = 0;
            physicsInfoCircle1.velocityX = 0;
        }
    }
};

// =============================================================
// GUI
// =============================================================
const gui = {
    init() {
        const gui = new lil.GUI();

        const physicsFolder1 = gui.addFolder("Physics circle");
        physicsFolder1.add(physicsInfoCircle1, "velocityX", -1000, 1000).name("velocityX");

        const physicsFolder2 = gui.addFolder("Physics circle2");
        physicsFolder2.add(physicsInfoCircle2, "velocityX", -1000, 1000).name("velocityX");
    
        const animationFolder = gui.addFolder("Clock");
        animationFolder.add(clock, "play");
        animationFolder.add(clock, "pause");
        animationFolder.add(clock, "reset");

        // Elapsed time display
        clock.timerDisplay = "0.00 s";

        const timerController = animationFolder.add(clock, "timerDisplay").name("Elapsed Time");
        timerController.listen();
    }
};

// =============================================================
// KEY EVENTS
// =============================================================
const keyEvent = {
    init() {
        window.addEventListener("keydown", event => {
            switch(event.key) {
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
                default:
            }
        });

        window.addEventListener("keyup", event => {
            switch(event.key) {
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
                default:
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
