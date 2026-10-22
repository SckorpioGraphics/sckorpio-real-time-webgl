# Sckorpio Graphics: Real-Time WebGL

This repository continues the WebGL 2 curriculum with Chapters 21–27:
render loops and time, animation, sprite sheets, movement, basic physics,
and collision detection.

For the introductory and foundation lessons through Chapter 20, see the
[Sckorpio Graphics WebGL Fundamentals repository](https://github.com/SckorpioGraphics/sckorpio-graphics-webgl).

See the [series overview](Documentation/series_index.txt) and
[episode guide](Documentation/series_episodes.txt).

To run a lesson, serve this folder over HTTP:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The page loads
`chapters/chapter27/chapter27j.js` by default. Change the module path in
`index.html` to select another lesson. Lil GUI and gl-matrix are loaded from
CDNs in `index.html`. Texture assets for the lessons are included under their
chapter directories.
