/* #############################################################
   CHAPTER 6h: Sckorpio driving Tank (top view)+Camera Follow

   Topics:
   - Apply 2D Linear Motion on Tank
   - Use unitVector & Speed for velocityX, velocityY
   - Use clock for delta time
   - create animation object
   - apply on the Square Textured with Tank 
   - Camera follow tank too
   #############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
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
        // program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // attribute
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.attributes.texCoord = gl.getAttribLocation(this.program, "a_texCoord");
        // uniform
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
// TEXTURE OBJECTS
// =============================================================
const tankTexture = {
    imagePath: "chapters/chapter06/assets/tank_Texture.png",

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

    // No mipmaps yet.
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);

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
        console.error(
            "Could not load texture image:",
            texture.imagePath
        );
    };

    texture.image.src = texture.imagePath;
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
const tank = {
    //    v1--------v2
    //    | \        |
    //    |    \     |
    //    |       \  |
    //    v0--------v1

    // CPU DATA
    vertexData: new Float32Array([
        // Position     // UV
        -100, -100,     0, 0,
        100, -100,      1, 0,
        -100,  100,     0, 1,

        -100,  100,     0, 1,
        100, -100,      1, 0,
        100,  100,      1, 1
    ]),

    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    modelMatrix: mat3.create(),

    //GPU DATA
    shader: null,
    texture: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader, texture) {
        // Connect shader to mesh
        this.shader = shader;
        this.texture = texture;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

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
            2,          // size: 2 components (X, Y)
            gl.FLOAT,   // type: 32-bit float
            false,      // normalize
            4 * Float32Array.BYTES_PER_ELEMENT, // stride: 4(tightly packed)
            0           // offset: start of buffer
        );

        // Texture coordinates: u, v
        gl.enableVertexAttribArray(this.shader.attributes.texCoord);
        gl.vertexAttribPointer(
            this.shader.attributes.texCoord,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 6;
    },
    draw(gl) {
        // Shader
        gl.useProgram(this.shader.program);
        // Modle Matrix
        setupModelMatrix(this);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix,false,this.modelMatrix);
        // Texture
        this.texture.bind(gl, 0);
        gl.uniform1i(this.shader.uniforms.texture, 0);
        // vao
        gl.bindVertexArray(this.vao);
        // draw call
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
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

        //Textures
        tankTexture.init(gl);

        //Shaders
        basicShader.init(gl);
        textureShader.init(gl);

        //Objects
        grid.init(gl, basicShader);
        xAxis.init(gl, basicShader);
        yAxis.init(gl, basicShader);
        tank.init(gl, textureShader, tankTexture);
    },
    update() {
        const gl = this.gl;

        camera.updateProjectionMatrix(gl);
        camera.updateViewMatrix(gl);

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
        // Shader 1
        gl.useProgram(basicShader.program);
        gl.uniformMatrix3fv(basicShader.uniforms.projectionMatrix,false,camera.projectionMatrix);
        gl.uniformMatrix3fv(basicShader.uniforms.viewMatrix,false,camera.viewMatrix);
        gl.uniformMatrix3fv(basicShader.uniforms.modelMatrix,false,mat3.create());

        // Shader 2
        gl.useProgram(textureShader.program);
        gl.uniformMatrix3fv(textureShader.uniforms.viewMatrix,false,camera.viewMatrix);
        gl.uniformMatrix3fv(textureShader.uniforms.projectionMatrix,false,camera.projectionMatrix);
        gl.uniformMatrix3fv(textureShader.uniforms.modelMatrix,false,mat3.create());

        // RENDER MESHES
        // Grid
        grid.draw(gl);
        // X-Axis
        xAxis.draw(gl);
        // Y-Axis
        yAxis.draw(gl);
        // tank
        tank.draw(gl);

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
            this.log();
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
const physicsInfo = {
    // Object connected
    mesh: null,
    // Speed
    speed: 0,
    // Unit Direction Vector
    directionX: 1.0,
    directionY: 0.0,
    directionAngle: 0,
    // Velocity
    velocityX: 100,
    velocityY: 50,
    // Control booleans
    state: {
        angleUp: false,
        angleDown: false
    },

    init(mesh) {
        this.mesh = mesh;
        this.directionX = Math.cos(this.directionAngle * Math.PI / 180);
        this.directionY = Math.sin(this.directionAngle * Math.PI / 180);
        this.velocityX = this.speed * this.directionX;
        this.velocityY = this.speed * this.directionY;
    },
    update(deltaTime) {
        // key controls
        if(this.state.angleUp) this.directionAngle += 1.0;
        if(this.state.angleDown) this.directionAngle -= 1.0;
        // direction unit vector
        this.directionX = Math.cos(this.directionAngle * Math.PI / 180);
        this.directionY = Math.sin(this.directionAngle * Math.PI / 180);
        // velocity
        this.velocityX = this.speed * this.directionX;
        this.velocityY = this.speed * this.directionY;
        // mesh transforms
        this.mesh.translationX += deltaTime * this.velocityX;
        this.mesh.translationY += deltaTime * this.velocityY;
        this.mesh.rotation = this.directionAngle;
        // camera follow
        camera.positionX = this.mesh.translationX - 500;
        camera.positionY = this.mesh.translationY - 400;

    }
};

// =============================================================
// PHYSICS SYSTEM
// =============================================================
const physicsSystem = {
    init() {
        physicsInfo.init(tank);
    },
    update() {
        physicsInfo.update(clock.deltaTime);
    }
};

// =============================================================
// GUI
// =============================================================
const gui = {
    init() {
        const gui = new lil.GUI();

        const physicsFolder = gui.addFolder("Unit Vector");
        physicsFolder.add(physicsInfo, "speed", 0, 1000).name("Speed");
        physicsFolder.add(physicsInfo, "directionAngle", 0, 180).name("Angle");

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
                
                case "A":
                case "a":
                    physicsInfo.state.angleUp = true;
                    break;
                case "D":
                case "d":
                    physicsInfo.state.angleDown = true;
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
                case "A":
                case "a":
                    physicsInfo.state.angleUp = false;
                    break;
                case "D":
                case "d":
                    physicsInfo.state.angleDown = false;
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
