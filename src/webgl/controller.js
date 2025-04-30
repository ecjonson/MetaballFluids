/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { Time } from "./objects.js";
import { Material } from "./objects.js";

/**
 * Maintains pressed keys for a combination of discrete and continuous actions.
 */
export class Controller {
    // keyboard
    #pressed = {}; // continuous key actions
    #deltaKeys; // keyboard action speed

    // mouse
    #x = 0; // last known location on canvas
    #y = 0; // last known location on canvas
    #drag = false; // dragging the mouse?
    #deltaMouse;
    #deltaScroll;
    #deltaZoom;
    #follow;

    // blob html elements
    #blobbyEl;
    #howManyEl;
    #howFastEl;
    #resolutionEl;
    #isolevelEl;
    #nucleiEl;

    // physics html elements
    #gravityEl;
    #followEl;
    #rangeEl;
    #lengthEl;
    #stiffnessEl;
    #dampingEl;
    #repulsionEl;
    #waterEl;
    #mercuryEl;
    #slimeEl;
    #plasmaEl;

    // shading html elements
    #colorEl;
    #alphaEl;
    #shadingEl;
    #cubeMappingEl;
    #headlightEl;

    // shading variables
    #diffuse;
    #alpha;
    #waterMat;
    #mercuryMat;
    #slimeMat;
    #plasmaMat;
    #waterHex;
    #mercuryHex;
    #slimeHex;
    #plasmaHex;

    /**
     * Makes a keyboard and mouse controller for the provided webgl object and camera.
     * @param {WebGLModel} gl - The webgl object. 
     * @param {ParticleSystem} ps - The particle system.
     * @param {Camera} camera - The camera.
     * @param {CubeMarcher} marcher - The cube marcher.
     * @param {Number} speedKeys - The multiplier for continuous key actions.
     * @param {Number} speedMouse - The multiplier for mouse actions.
     * @param {Number} speedScroll - The speed of zooming with scroll.
     * @param {Number} deltaZoom - The speed of zooming with keyboard.
     */
    constructor( gl, ps, camera, marcher, speedKeys = 1.5, speedMouse = 0.005, speedScroll = 0.01, deltaZoom = 10.0 ) {
        // references to the controlled objects
        this.gl = gl;
        this.ps = ps;
        this.marcher = marcher;
        this.camera = camera;
        this.time = new Time();

        // variables
        this.#deltaKeys = speedKeys;
        this.#deltaMouse = speedMouse;
        this.#deltaScroll = speedScroll;
        this.#deltaZoom = deltaZoom;

        // activate continous keys until keyup
        document.addEventListener( "keydown", e => this.#press( e.code ) );
        document.addEventListener( "keyup", e => this.#pressed[ e.code ] = false );

        // mouse
        this.gl.canvas.addEventListener( "mousedown", e => this.#mouseDown( e ) );
        this.gl.canvas.addEventListener( "mouseup", () => this.#drag = false );
        this.gl.canvas.addEventListener( "mousemove", e => this.#drag && this.#mouseMove( e ) );
        this.gl.canvas.addEventListener( "wheel", e => this.#scroll( e ) );

        /* setup ui interactions */
        const uiEl = document.getElementById( "sidebar-left" );
        const blobsEl = uiEl.querySelector( "#blobs" );
        const physicsEl = uiEl.querySelector( "#physics" );
        const lightingEl = uiEl.querySelector( "#lighting" );

        /* blobs */
        this.#blobbyEl = blobsEl.querySelector( "#blobby" );
        this.blobs = this.#blobbyEl.checked;
        this.#blobbyEl.addEventListener( "change", e => this.blobs = e.target.checked );

        // numbuer of particles
        this.#howManyEl = blobsEl.querySelector( "#numBlobs" );
        this.ps.setHowMany( Number( this.#howManyEl.value ) );
        this.#howManyEl.addEventListener( "change", e => this.ps.setHowMany( Number( e.target.value ) ) );

        // particle velocity
        this.#howFastEl = blobsEl.querySelector( "#velocity" );
        this.ps.speed = Number( this.#howFastEl.value );
        this.#howFastEl.addEventListener( "change", e => this.ps.speed = Number( e.target.value ) );

        // grid resolution
        this.#resolutionEl = blobsEl.querySelector( "#resolution" );
        this.marcher.setResolution( Number( this.#resolutionEl.value ) );
        this.#resolutionEl.addEventListener( "change", e => this.marcher.setResolution( Number( e.target.value ) ) );

        // grid isovalue
        this.#isolevelEl = blobsEl.querySelector( "#isolevel" );
        this.marcher.isolevel = Number( this.#isolevelEl.value );
        this.#isolevelEl.addEventListener( "change", e => this.marcher.isolevel = Number( e.target.value ) );

        // display blob nuclei?
        this.#nucleiEl = blobsEl.querySelector( "#nuclei" );
        this.nuclei = this.#nucleiEl.checked;
        this.#nucleiEl.addEventListener( "change", e => this.nuclei = e.target.checked );

        /* physics */

        // spring range
        this.#rangeEl = physicsEl.querySelector( "#range" );
        this.ps.range = Number( this.#rangeEl.value );
        this.#rangeEl.addEventListener( "change", e => this.ps.range = Number( e.target.value ) );

        // spring length
        this.#lengthEl = physicsEl.querySelector( "#length" );
        this.ps.restlength = Number( this.#lengthEl.value );
        this.#lengthEl.addEventListener( "change", e => this.ps.restlength = Number( e.target.value ) );

        // spring stiffness
        this.#stiffnessEl = physicsEl.querySelector( "#stiffness" );
        this.ps.stiffness = Number( this.#stiffnessEl.value );
        this.#stiffnessEl.addEventListener( "change", e => this.ps.stiffness = Number( e.target.value ) );

        // spring damping
        this.#dampingEl = physicsEl.querySelector( "#damping" );
        this.ps.damping = Number( this.#dampingEl.value );
        this.#dampingEl.addEventListener( "change", e => this.ps.damping = Number( e.target.value ) );

        // spring repulsion
        this.#repulsionEl = physicsEl.querySelector( "#repulsion" );
        this.ps.repulsion = Number( this.#repulsionEl.value );
        this.#repulsionEl.addEventListener( "change", e => this.ps.repulsion = Number( e.target.value ) );

        // water preset
        this.#waterEl = physicsEl.querySelector( "#water" );
        this.#waterEl.addEventListener( "click", () => this.#presetWater() );

        // mercury preset
        this.#mercuryEl = physicsEl.querySelector( "#mercury" );
        this.#mercuryEl.addEventListener( "click", () => this.#presetMercury() );

        // slime preset
        this.#slimeEl = physicsEl.querySelector( "#slime" );
        this.#slimeEl.addEventListener( "click", () => this.#presetSlime() );

        // plasma preset
        this.#plasmaEl = physicsEl.querySelector( "#plasma" );
        this.#plasmaEl.addEventListener( "click", () => this.#presetPlasma() );

        // gravity downward toggle
        this.#followEl = physicsEl.querySelector( "#follow" );
        this.#setFollow( this.#followEl.checked );
        this.#followEl.addEventListener( "change", e => this.#setFollow( e.target.checked ) );

        // physics toggle
        this.#gravityEl = physicsEl.querySelector( "#gravity" );
        this.#setPhysics( this.#gravityEl.checked );
        this.#gravityEl.addEventListener( "change", e => this.#setPhysics( e.target.checked ) );

        /* lighting */

        // alpha
        this.#alphaEl = lightingEl.querySelector( "#alpha" );
        this.#alpha = Number( this.#alphaEl.value );
        this.#alphaEl.addEventListener( "change", e => this.#setAlpha( Number( e.target.value ) ) );

        // color picker
        this.#colorEl = lightingEl.querySelector( "#diffuse" );
        this.#setDiffuse( this.#colorEl.value );
        this.#colorEl.addEventListener( "change", e => this.#setDiffuse( e.target.value ) );

        // blob shading
        this.#shadingEl = lightingEl.querySelector( "#shading" );
        this.shading = this.#shadingEl.checked;
        this.#shadingEl.addEventListener( "change", e => this.shading = e.target.checked );

        // cube mapping
        this.#cubeMappingEl = lightingEl.querySelector( "#cubemapping" );
        this.cubemapping = this.#cubeMappingEl.checked;
        this.#cubeMappingEl.addEventListener( "change", e => this.cubemapping = e.target.checked );

        // light source
        this.#headlightEl = lightingEl.querySelector( "#headlight" );
        this.headlight = this.#headlightEl.checked;
        this.#headlightEl.addEventListener( "change", e => this.headlight = e.target.checked );

        // prepare preset materials
        this.#waterHex = "#0f87cc";
        this.#mercuryHex = "#cccccc";
        this.#slimeHex = "#72f909";
        this.#plasmaHex = "#c321a5";
        this.#waterMat = new Material( [ 0.1, 0.1, 0.1 ], this.#hexToRGB( this.#waterHex ), [ 0.1, 0.1, 0.1 ], 3, 0.85, false );
        this.#mercuryMat = new Material( [ 0.1, 0.1, 0.1 ], this.#hexToRGB( this.#mercuryHex ), [ 0.1, 0.1, 0.1 ], 3, 1.0, false );
        this.#slimeMat = new Material( [ 0.1, 0.1, 0.1 ], this.#hexToRGB( this.#slimeHex ), [ 0.1, 0.1, 0.1 ], 3, 0.9, false );
        this.#plasmaMat = new Material( [ 0.1, 0.1, 0.1 ], this.#hexToRGB( this.#plasmaHex ), [ 0.1, 0.1, 0.1 ], 3, 0.95, false );
    }

    #setFollow( bool ) {
        if ( bool )
            this.#follow = true;
        else {
            this.#follow = false;
            this.ps.resetGravity();
        }
    }

    #hexToRGB( hex ) {
        const r = parseInt( hex.slice( 1, 3 ), 16 ) / 255;
        const g = parseInt( hex.slice( 3, 5 ), 16 ) / 255;
        const b = parseInt( hex.slice( 5, 7 ), 16 ) / 255;
        return [ r, g, b ];
    }

    #setDiffuse( hex ) {
        this.#setMaterial( new Material( [ 0.1, 0.1, 0.1 ], this.#hexToRGB( hex ), [ 0.1, 0.1, 0.1 ], 3, this.#alpha, false ) );
    }

    #setAlpha( alpha ) {
        this.#setMaterial( new Material( [ 0.1, 0.1, 0.1 ], this.#diffuse, [ 0.1, 0.1, 0.1 ], 3, alpha, false ) );
    }

    #setMaterial( material ) {
        this.#diffuse = material.diffuse;
        this.#alpha = material.alpha;
        this.marcher.setMaterial( material );
    }

    #updateMaterialUI( hex, alpha ) {
        this.#colorEl.value = hex;
        this.#alphaEl.value = alpha;
    }

    #setPhysics( b ) {
        this.#howFastEl.disabled = b;
        this.#rangeEl.disabled = !b;
        this.#lengthEl.disabled = !b;
        this.#stiffnessEl.disabled = !b;
        this.#dampingEl.disabled = !b;
        this.#repulsionEl.disabled = !b;
        this.#followEl.disabled = !b;
        this.ps.gravity = b;
    }

    #setRange( n ) {
        this.ps.range = n;
        this.#rangeEl.value = n;
    }

    #setLength( n ) {
        this.ps.restlength = n;
        this.#lengthEl.value = n;
    }

    #setStiffness( n ) {
        this.ps.stiffness = n;
        this.#stiffnessEl.value = n;
    }

    #setDamping( n ) {
        this.ps.damping = n;
        this.#dampingEl.value = n;
    }

    #setRepulsion( n ) {
        this.ps.repulsion = n;
        this.#repulsionEl.value = n;
    }

    #presetWater() {
        this.#setMaterial( this.#waterMat );
        this.#updateMaterialUI( this.#waterHex, this.#waterMat.alpha );
        this.#setRange( 0.8 );
        this.#setLength( 0.5 );
        this.#setStiffness( 2.0 );
        this.#setDamping( -0.1 );
        this.#setRepulsion( 2.0 );
        this.shading = true;
        this.#shadingEl.checked = true;
        this.cubemapping = true;
        this.#cubeMappingEl.checked = true;
    }

    #presetMercury() {
        this.#setMaterial( this.#mercuryMat );
        this.#updateMaterialUI( this.#mercuryHex, this.#mercuryMat.alpha );
        this.#setRange( 2.0 );
        this.#setLength( 0.8 );
        this.#setStiffness( 0.2 );
        this.#setDamping( 0.1 );
        this.#setRepulsion( 0.1 );
        this.shading = false;
        this.#shadingEl.checked = false;
        this.cubemapping = true;
        this.#cubeMappingEl.checked = true;
    }

    #presetSlime() {
        this.#setMaterial( this.#slimeMat );
        this.#updateMaterialUI( this.#slimeHex, this.#slimeMat.alpha );
        this.#setRange( 1.2 );
        this.#setLength( 0.5 );
        this.#setStiffness( 4.0 );
        this.#setDamping( -0.05 );
        this.#setRepulsion( 1.5 );
        this.shading = true;
        this.#shadingEl.checked = true;
        this.cubemapping = false;
        this.#cubeMappingEl.checked = false;
    }

    #presetPlasma() {
        this.#setMaterial( this.#plasmaMat );
        this.#updateMaterialUI( this.#plasmaHex, this.#plasmaMat.alpha );
        this.#setRange( 1.5 );
        this.#setLength( 0.8 );
        this.#setStiffness( 0.2 );
        this.#setDamping( -1.8 );
        this.#setRepulsion( 5.0 );
        this.shading = true;
        this.#shadingEl.checked = true;
        this.cubemapping = true;
        this.#cubeMappingEl.checked = true;
    }

    #setMouse( x, y ) {
        this.#x = x;
        this.#y = y;
    }

    /**
     * Press the provided key code.
     * @param {String} code - KeyEvent.code 
     */
    #press( code ) {
        // these key actions happen once
        switch ( code ) {
            case "KeyF":
                this.gl.resize();
                break;
            // these key actions are continuous
            default:
                this.#pressed[ code ] = true;
        }
    }

    /**
     * Update dragging and mouse position.
     * @param {MouseEvent} e - MouseEvent.
     */
    #mouseDown( e ) {
        this.#drag = true;
        this.#setMouse( e.clientX, e.clientY );
    }

    /**
     * Updates the gravity direction if we are "rotating" the cube.
     */
    #setGravity() {
        if ( this.#follow ) {
            const down = this.camera.getCameraDown();
            vec3.scale( down, down, this.ps.gForce );
            this.ps.gDirection = down;
        }
    }

    /**
     * Rotate the camera around the center.
     * @param {MouseEvent} e - MouseEvent
     */
    #mouseMove( e ) {
        const dx = ( e.clientX - this.#x ) * this.#deltaMouse;
        const dy = ( e.clientY - this.#y ) * this.#deltaMouse;
        this.camera.rotate( dx, dy );
        this.#setMouse( e.clientX, e.clientY );
        this.gl.updateCamera();
        this.#setGravity(); // update gravity if needed
    }

    #scroll( e ) {
        // side scrolling does nothing
        if ( !e.deltaY )
            return;

        // pass the camera a continues delta y value for zooming
        this.camera.zoom( e.deltaY * this.#deltaScroll );
        this.gl.updateCamera();
    }

    /**
     * Activate the continuous key actions. Called per frame. Uses delta time to maintain consistent movement.
     */
    activate( now ) {
        // update delta time
        this.time.set( now );

        // rotate left
        if ( this.#pressed[ "ArrowLeft" ] || this.#pressed[ "KeyA" ] )
            this.camera.rotate( this.#deltaKeys * this.time.delta, 0 );

        // rotate right
        if ( this.#pressed[ "ArrowRight" ] || this.#pressed[ "KeyD" ] )
            this.camera.rotate( -this.#deltaKeys * this.time.delta, 0 );

        // rotate up
        if ( this.#pressed[ "ArrowUp" ] || this.#pressed[ "KeyW" ] )
            this.camera.rotate( 0, this.#deltaKeys * this.time.delta );

        // rotate down
        if ( this.#pressed[ "ArrowDown" ] || this.#pressed[ "KeyS" ] )
            this.camera.rotate( 0, -this.#deltaKeys * this.time.delta );

        // zoom in
        if ( this.#pressed[ "KeyQ" ] )
            this.camera.zoom( this.#deltaKeys * this.time.delta * this.#deltaZoom );

        // zoom out
        if ( this.#pressed[ "KeyE" ] )
            this.camera.zoom( -this.#deltaKeys * this.time.delta * this.#deltaZoom );

        // feed the new matrices to the camera
        this.gl.updateCamera();

        // update gravity if needed
        this.#setGravity();
    }
}
