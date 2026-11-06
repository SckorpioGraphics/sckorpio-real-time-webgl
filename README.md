# Sckorpio Graphics: Real-Time WebGL

This repository is the real-time WebGL curriculum, progressing from Chapter 0
through Chapter 14:

- Chapter 0: `requestAnimationFrame`, elapsed time, delta time, FPS, and clocks
- Chapter 1: animated vertex colors
- Chapter 2: translation, rotation, scale, and combined transform animation
- Chapter 3: animated color and alpha, including per-vertex color effects
- Chapter 4: texture scrolling, offsets, maps, and zoomed/animated textures
- Chapter 5: sprite-sheet animation and frame playback
- Chapter 6–10: velocity, acceleration, gravity, projectiles, rotational motion,
  multiple-wheel motion, friction, and tank/vehicle simulations
- Chapter 11: local, world, and model-space axis-aligned bounding boxes and AABB
  collision handling
- Chapter 13: circular bounding volumes and circle-circle collision experiments
- Chapter 14: velocity exchange and collision-response demonstrations

For the introductory and foundation lessons through Chapter 20, see the
[Sckorpio Graphics WebGL Fundamentals repository](https://github.com/SckorpioGraphics/sckorpio-graphics-webgl).

Each lesson remains a self-contained JavaScript module. Shader objects own
shader setup, the camera owns view and projection state, meshes own geometry
and drawing, and `renderSystem` owns WebGL resources, resizing, and rendering.
Lessons with time-based behavior keep elapsed and delta time in `clock`;
`animationInfo` and `physicsInfo` objects describe per-object state, while
`animationSystem` and `physicsSystem` initialize and update that state. Those
systems use `clock` values without receiving a timestamp. The `appLoop()`
updates the clock and scene systems before rendering, then schedules the next
frame. `renderSystem.render()` only renders and does not resize the canvas or
advance scene state.

Lesson sections follow this order where applicable: shader objects, camera,
meshes, render system, clock, animation and physics info, animation and physics
systems, GUI, key events, app, and main. `appInit()` initializes WebGL
resources, systems, GUI controls, and keyboard events once; `main()` starts
the continuous `appLoop()`.

For the canonical section layout and lifecycle, see the
[Chapter 2a lesson template](https://github.com/SckorpioGraphics/sckorpio-graphics-webgl/blob/main/chapters/chapter02/chapter2a.js).
The [Chapter 3a lesson](https://github.com/SckorpioGraphics/sckorpio-graphics-webgl/blob/main/chapters/chapter03/chapter3a.js)
is a concise example of applying that organization to a graphics lesson.

See the [series overview](Documentation/series_index.txt) and
[episode guide](Documentation/series_episodes.txt).

To run a lesson, serve this folder over HTTP:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The page loads
`chapters/chapter11/chapter11o.js` by default. Change the module path in
`index.html` to select another lesson. Lil GUI and gl-matrix are loaded from
CDNs in `index.html`. Texture assets for the lessons are included under their
chapter directories.
