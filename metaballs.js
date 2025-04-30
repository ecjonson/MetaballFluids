/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { Cube } from "./src/cube.js";
import { CubeMarcher } from "./src/march.js";
import { ParticleSystem } from "./src/particles.js";
import { Camera } from "./src/webgl/camera.js";
import { Controller } from "./src/webgl/controller.js";
import { BoundingBox } from "./src/webgl/geometry.js";
import { WebGLModel } from "./src/webgl/model.js";
import { Material } from "./src/webgl/objects.js";

/**
 * This is the main loop.
 * @param {Number} now - The current time. Used to track delta time for smooth controls.
 */
function render( now ) {
    // update the controller for mouse and keyboard input
    ctrl.activate( now );

    // clear frame and depth buffers by OR'ing the two bits together
    gl.rc.clear( gl.rc.COLOR_BUFFER_BIT | gl.rc.DEPTH_BUFFER_BIT );

    // update the blobs
    ps.activate( ctrl.time.delta );

    // create the blobby triangle mesh with the marching cubes algorithm
    if ( ctrl.blobs )
        marcher.march( ps.getPoints(), ctrl.shading || ctrl.cubemapping );

    // draw the cube triangles
    for ( let i = 0; i < cube.sets.length; ++i )
        gl.drawTriangles( cube.sets[ i ], ctrl.headlight );

    // draw the blob nuclei
    if ( ctrl.nuclei )
        gl.drawSpheres( ps.particles, ps.sphere );

    // draw the blobs
    if ( ctrl.blobs ) {
        // draw the blobs with shading
        if ( ctrl.shading ) {
            // and cube mapping by mixing colors
            if ( ctrl.cubemapping )
                gl.drawTriangles( marcher.triSet, ctrl.headlight, gl.cubemap, true );

            // just lambertian shading
            else gl.drawTriangles( marcher.triSet, ctrl.headlight );
        }

        // cube mapping without mixing colors
        else if ( ctrl.cubemapping )
            gl.drawTriangles( marcher.triSet, ctrl.headlight, gl.cubemap );

        // unlit
        else gl.drawBlobs( marcher );
    }

    // draw the cube lines
    gl.drawLines( cube.lines, cube.buffer, cube.color );

    // set up frame render callback
    window.requestAnimationFrame( render );
};


/* --- Default project parameters --- */

// cubemap folder
const ENV_PATH = "img/Lycksele2/";

// camera
const CAM_EYE = vec3.fromValues( 0, 0, -23 ); // default eye position in world space
// const CAM_CENTER = vec3.fromValues( 0.5, 0.5, 0.5 ); // default view direction in world space
const CAM_CENTER = vec3.fromValues( 0, 0, 0 ); // default view direction in world space
const CAM_UP = vec3.fromValues( 0, 1, 0 ); // default view up vector
const CAM_FOVY = 0.25 * Math.PI;
const CAM_ASPECT = 1;
const CAM_NEAR = 1.0;
const CAM_FAR = 50.0;

// light
const LIGHT_AMBIENT = vec3.fromValues( 1, 1, 1 ); // default light ambient emission
const LIGHT_DIFFUSE = vec3.fromValues( 1, 1, 1 ); // default light diffuse emission
const LIGHT_SPECULAR = vec3.fromValues( 1, 1, 1 ); // default light specular emission
const LIGHT_SOURCE = vec3.fromValues( 0, 4, 0 ); // default light position

// particle system
// const PS_NUCLEUS = new Material( [ 0.1, 0.1, 0.1 ], [ 0.91, 0.7, 0.18 ], [ 0.1, 0.1, 0.1 ], 3, 1.0, false );
const PS_NUCLEUS = new Material( [ 0.1, 0.1, 0.1 ], [ 0.31, 1.0, 0.48 ], [ 0.1, 0.1, 0.1 ], 3, 1.0, false );
const PS_RADIUS = 0.07; // really this is the blob radius, but it's used in the particle system
const PS_GRAVITY = -9.8; // how strong is the gravity?

// cube
const CB_BOUNDING_BOX = new BoundingBox( -5, 5, -5, 5, -5, 5 ); // cube size
const CB_MATERIAL = new Material( [ 0.1, 0.1, 0.1 ], [ 0.27, 0.28, 0.35 ], [ 0.1, 0.1, 0.1 ], 3, 1.0, false ); // cube triangle color, texture, etc.
const CB_LINE_COLOR = vec4.fromValues( 0, 1, 1, 0.1 ); // cube outline color

// blobs
const BLOB_MATERIAL = new Material( [ 0.1, 0.1, 0.1 ], [ 0.06, 0.53, 0.8 ], [ 0.1, 0.1, 0.1 ], 3, 0.8, false ); // blob material when using shading


/* --- Project globals --- */

/** The camera! Creates an orbital camera */
const cam = new Camera( CAM_EYE, CAM_CENTER, CAM_UP, CAM_FOVY, CAM_ASPECT, CAM_NEAR, CAM_FAR );

/** Maintains webgl data. Pass in a reference to the camera */
const gl = new WebGLModel( cam, ENV_PATH );

/** The cube! For rendering a cube with triangles. Pass in a reference to our webgl object */
const cube = new Cube( gl, CB_BOUNDING_BOX, CB_MATERIAL, CB_LINE_COLOR );

/** The particle system! Maintains the blobs. Use the cube size as the bounding box */
const ps = new ParticleSystem( gl, cube.bb, PS_NUCLEUS, PS_RADIUS, PS_GRAVITY );

/** The cube marcher! Calculates the metaball meshes using the Marching Cubes algorithm */
const marcher = new CubeMarcher( gl, BLOB_MATERIAL );

/** Controller object for activating user actions. */
const ctrl = new Controller( gl, ps, cam, marcher );


/* --- wait here until the html parses --- */
document.addEventListener( "DOMContentLoaded", main );

/**
 * Program starting point. Prepare webgl and render.
 */
function main() {
    // setup webgl
    gl.setupShaders( LIGHT_AMBIENT, LIGHT_DIFFUSE, LIGHT_SPECULAR, LIGHT_SOURCE );

    // start the draw loop
    render();
}
