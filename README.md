# Metaball Fluids with Marching Cubes
**Author:** [Evan Jonson](https://github.com/ecjonson)

## About

This is a fluids simulator using [Metaballs](https://en.wikipedia.org/wiki/Metaballs) and [Spring Mechanics](https://en.wikipedia.org/wiki/Hooke%27s_law) in [WebGL 1.0](https://en.wikipedia.org/wiki/WebGL). It runs in your browser.

### Metaballs
Metaballs, also known as blobby objects, are n-dimensional isosurfaces that meld together when in close proximity.

### Marching Cubes
[Marching Cubes](https://en.wikipedia.org/wiki/Marching_cubes) is the algorithm used here to create the triangle meshes. The algorithm divides the world space into a scalar field. Particle locations are used to update these scalar values to determine where the isosurface is. For more information on how this is applied to metaballs, check out [Paul Bourke's "Polygonizing a scalar field"](https://paulbourke.net/geometry/polygonise/).

### Hooke's Law
Spring mechanics (Hooke's Law) are used here to simulate fluids by applying forces to the blobs relative to their proximity. For more information on how this is applied to particles, check out [Ahmad Moussa's "Spring Physics, Particles and Meshes"](https://www.gorillasun.de/blog/spring-physics-and-connecting-particles-with-springs/).

## Instructions
You can run it right [here](https://ecjonson.github.io/MetaballFluids/) using Github Pages! Check out my [demo](https://ecjonson.github.io/MetaballFluids/demo.mp4)!
