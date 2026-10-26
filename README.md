# Sckorpio Graphics: Real-Time WebGL

This repository continues the WebGL 2 curriculum with Chapters 1–7:
render loops and time, animation, sprite sheets, movement, basic physics,
and collision detection.

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
`chapters/chapter6/chapter6i.js` by default. Change the module path in
`index.html` to select another lesson. Lil GUI and gl-matrix are loaded from
CDNs in `index.html`. Texture assets for the lessons are included under their
chapter directories.
