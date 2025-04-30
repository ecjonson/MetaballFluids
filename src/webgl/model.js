/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { Sphere } from "./geometry.js";
import { Buffer, Program } from "./objects.js";
import { vShaderCode, fShaderCode } from "../glsl/lambert.js";
import { lineVShaderCode, lineFShaderCode } from "../glsl/lines.js";
import { blobbyVShaderCode, blobbyFShaderCode } from "../glsl/blobs.js";

/**
 * Maintains the webgl rendering context and parameters.
 */
export class WebGLModel {
    /**
     * Pass a reference to the camera for rendering.
     * @param {Camera} camera - the camera.
     */
    constructor( camera, cubemapFolder ) {
        // reference to the camera
        this.camera = camera;

        // shader programs
        this.programs = [];

        // buffers prepared for webgl
        this.textureMap = new Map(); // maps url to texture buffers for reuse

        // the canvas element
        this.canvas = document.getElementById( "canvas" );

        /**
         * @type {WebGLRenderingContext} WebGLRenderingContext
         */
        this.rc = this.canvas.getContext( "webgl" ); // create a webgl canvas object and set it up

        // validate
        if ( !this.rc ) {
            console.log( "unable to create gl context -- is your browser gl ready?" );
            return;
        };

        // prepare the rendering context
        this.rc.clearColor( 0.38, 0.45, 0.64, 1.0 ); // use this color when we clear the frame buffer
        this.rc.clearDepth( 1.0 ); // use max when we clear the depth buffer
        this.rc.enable( this.rc.DEPTH_TEST ); // use hidden surface removal (with zbuffering)

        // alpha blending
        this.rc.blendFunc( this.rc.SRC_ALPHA, this.rc.ONE_MINUS_SRC_ALPHA ); // set the blend function for alpha blending
        this.rc.enable( this.rc.BLEND ); // enable alpha blending

        // culling
        this.rc.cullFace( this.rc.BACK ); // set back facing triangles as cullable
        this.rc.enable( this.rc.CULL_FACE ); // enable culling

        // default size
        this.defaultWidth = this.rc.canvas.width;
        this.defaultHeight = this.rc.canvas.height;

        // full screen listener. Triggers on this.resize()
        document.addEventListener( "fullscreenchange", () => this.#fullscreen( this.camera ) );

        // build a sphere for reuse
        this.#buildOneSphere();

        // load the environment texture
        this.#loadCubeMap( cubemapFolder );
    }

    #fullscreen() {
        // enter fullscreen
        if ( document.fullscreenElement ) {
            this.rc.canvas.width = window.innerWidth;
            this.rc.canvas.height = window.innerHeight;
        }
        // exit fullscreen
        else {
            this.rc.canvas.width = this.defaultWidth;
            this.rc.canvas.height = this.defaultHeight;
        }

        // update the viewport size
        this.rc.viewport( 0, 0, this.rc.canvas.width, this.rc.canvas.height );

        // update the aspect ratio
        this.camera.aspect = this.rc.canvas.width / this.rc.canvas.height;
        this.updateCamera();
    }

    /**
     * Go fullscreen!
     */
    resize() {
        // exit full screen
        if ( document.fullscreenElement )
            document.exitFullscreen();

        // enter full screen!
        else this.rc.canvas.requestFullscreen().catch( e => {
            console.log( e );
        } );
    }

    /**
     * Prepare a sphere for webgl. Reuses the same sphere data for all spheres.
     */
    #buildOneSphere() {
        // add a sphere for reuse
        this.oneSphere = new Sphere( 16 );
        this.oneSphere.buffer = new Buffer( this.rc );

        // send buffers to webgl
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.vertices ); // activate that buffer
        this.rc.bufferData( this.rc.ARRAY_BUFFER, new Float32Array( this.oneSphere.vertices ), this.rc.STATIC_DRAW ); // data in
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.normals ); // activate that buffer
        this.rc.bufferData( this.rc.ARRAY_BUFFER, new Float32Array( this.oneSphere.normals ), this.rc.STATIC_DRAW ); // data in
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.uvs ); // activate that buffer
        this.rc.bufferData( this.rc.ARRAY_BUFFER, new Float32Array( this.oneSphere.uvs ), this.rc.STATIC_DRAW ); // data in

        // send the triangle indices to webGL
        this.rc.bindBuffer( this.rc.ELEMENT_ARRAY_BUFFER, this.oneSphere.buffer.triangles ); // activate that buffer
        this.rc.bufferData( this.rc.ELEMENT_ARRAY_BUFFER, new Uint16Array( this.oneSphere.triangles ), this.rc.STATIC_DRAW ); // data in
    }

    /**
     * Render an array of spheres
     * @param {Array<Blob>} blobs - Contains the sphere locations.
     * @param {SphereSet} sphere - The single sphere set.
     */
    drawSpheres( blobs, sphere ) {
        // reuse the same buffer
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.vertices ); // activate vertex buffer
        this.rc.vertexAttribPointer( this.programs[ 0 ].vPosAttribLoc, 3, this.rc.FLOAT, false, 0, 0 ); // feed vertex buffer to shader
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.normals ); // activate normal buffer
        this.rc.vertexAttribPointer( this.programs[ 0 ].vNormAttribLoc, 3, this.rc.FLOAT, false, 0, 0 ); // feed normal buffer to shader
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, this.oneSphere.buffer.uvs ); // activate uv
        this.rc.vertexAttribPointer( this.programs[ 0 ].vUVAttribLoc, 2, this.rc.FLOAT, false, 0, 0 ); // feed
        this.rc.bindBuffer( this.rc.ELEMENT_ARRAY_BUFFER, this.oneSphere.buffer.triangles ); // activate tri buffer

        // for each sphere
        for ( let i = 0; i < blobs.length; ++i )
            this.#drawSphere( blobs[ i ].location, sphere );
    }

    /**
     * Render a sphere.
     * @param {Object} sphere - Sphere data from file.
     */
    #drawSphere( location, sphere ) {
        // define model transform, premult with pvmMatrix, feed to shader
        mat4.fromTranslation( this.oneSphere.transform, location ); // recenter sphere
        mat4.scale( this.oneSphere.transform, this.oneSphere.transform, sphere.xyz ); // change size
        mat4.mul( this.camera.hpvmMatrix, this.camera.hpvMatrix, this.oneSphere.transform );
        this.rc.uniformMatrix4fv( this.programs[ 0 ].mMatrixULoc, false, this.oneSphere.transform ); // pass in model matrix
        this.rc.uniformMatrix4fv( this.programs[ 0 ].pvmMatrixULoc, false, this.camera.hpvmMatrix ); // pass in handed project view model matrix

        // reflectivity: feed to the fragment shader
        this.rc.uniform3fv( this.programs[ 0 ].ambientULoc, sphere.material.ambient ); // pass in the ambient reflectivity
        this.rc.uniform3fv( this.programs[ 0 ].diffuseULoc, sphere.material.diffuse ); // pass in the diffuse reflectivity
        this.rc.uniform3fv( this.programs[ 0 ].specularULoc, sphere.material.specular ); // pass in the specular reflectivity
        this.rc.uniform1f( this.programs[ 0 ].alphaULoc, sphere.material.alpha ); // pass in the material alpha component
        this.rc.uniform1f( this.programs[ 0 ].shininessULoc, sphere.material.n ); // pass in the specular exponent
        this.rc.uniform1i( this.programs[ 0 ].usingTextureULoc, ( sphere.material.texture != false ) ); // whether the sphere uses texture
        this.rc.activeTexture( this.rc.TEXTURE0 ); // bind to active texture 0 (the first)
        this.rc.bindTexture( this.rc.TEXTURE_2D, sphere.texture ); // bind the set's texture
        this.rc.uniform1i( this.programs[ 0 ].textureULoc, 0 ); // pass in the texture and active texture 0

        // draw a transformed instance of the sphere
        this.rc.drawElements( this.rc.TRIANGLES, this.oneSphere.triangles.length, this.rc.UNSIGNED_SHORT, 0 ); // render
    }

    /**
     * Render this triangle set.
     * @param {TriangleSet} triSet - A triangle set object.
     */
    drawTriangles( triSet, headlight = false, cubemap = false, mix = false, normalmap = false ) {
        // get the handedness * project * view * model matrix
        mat4.multiply( this.camera.hpvmMatrix, this.camera.hpvMatrix, this.camera.mMatrix ); // handedness * project * view * model
        this.rc.uniformMatrix4fv( this.programs[ 0 ].mMatrixULoc, false, this.camera.mMatrix ); // pass in the m matrix
        this.rc.uniformMatrix4fv( this.programs[ 0 ].pvmMatrixULoc, false, this.camera.hpvmMatrix ); // pass in the hpvm matrix

        // reflectivity: feed to the fragment shader
        this.rc.uniform3fv( this.programs[ 0 ].ambientULoc, triSet.material.ambient ); // pass in the ambient reflectivity
        this.rc.uniform3fv( this.programs[ 0 ].diffuseULoc, triSet.material.diffuse ); // pass in the diffuse reflectivity
        this.rc.uniform3fv( this.programs[ 0 ].specularULoc, triSet.material.specular ); // pass in the specular reflectivity
        this.rc.uniform1f( this.programs[ 0 ].alphaULoc, triSet.material.alpha ); // pass in the material alpha component
        this.rc.uniform1f( this.programs[ 0 ].shininessULoc, triSet.material.n ); // pass in the specular exponent
        this.rc.uniform1i( this.programs[ 0 ].usingTextureULoc, ( triSet.material.texture != false ) ); // whether the set uses texture
        this.rc.uniform1i( this.programs[ 0 ].uHeadlightULoc, headlight ? 1 : 0 ); // are we using a headlight or global light
        this.rc.activeTexture( this.rc.TEXTURE0 ); // bind to active texture 0 (the first)
        this.rc.bindTexture( this.rc.TEXTURE_2D, triSet.texture ); // bind the set's texture
        this.rc.uniform1i( this.programs[ 0 ].textureULoc, 0 ); // pass in the texture and active texture 0

        // cube mapping
        this.rc.activeTexture( this.rc.TEXTURE1 );
        this.rc.bindTexture( this.rc.TEXTURE_CUBE_MAP, ( cubemap || null ) );
        this.rc.uniform1i( this.programs[ 0 ].cubeTextureULoc, 1 );
        this.rc.uniform1i( this.programs[ 0 ].useCubeMappingULoc, ( cubemap != false ) );
        this.rc.uniform1i( this.programs[ 0 ].uMixColorsULoc, mix );

        // position, normal and uv buffers: activate and feed into vertex shader
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, triSet.buffer.vertices ); // activate position
        this.rc.vertexAttribPointer( this.programs[ 0 ].vPosAttribLoc, 3, this.rc.FLOAT, false, 0, 0 ); // feed
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, triSet.buffer.normals ); // activate normal
        this.rc.vertexAttribPointer( this.programs[ 0 ].vNormAttribLoc, 3, this.rc.FLOAT, false, 0, 0 ); // feed
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, triSet.buffer.uvs ); // activate uv
        this.rc.vertexAttribPointer( this.programs[ 0 ].vUVAttribLoc, 2, this.rc.FLOAT, false, 0, 0 ); // feed

        // triangle buffer: activate and render
        this.rc.bindBuffer( this.rc.ELEMENT_ARRAY_BUFFER, triSet.buffer.triangles ); // activate
        this.rc.drawElements( this.rc.TRIANGLES, triSet.size, this.rc.UNSIGNED_SHORT, 0 ); // render
    }

    /**
     * Draww the provided lines in a color.
     * @param {Array} lines - Array of lines for webgl.
     * @param {Buffer} buffer - Buffer object.
     * @param {vec4} color - The color, rgba.
     */
    drawLines( lines, buffer, color ) {
        // use the line shaders
        this.rc.useProgram( this.programs[ 1 ].shader );

        // pass in the line data and draw
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, buffer );
        this.rc.bufferData( this.rc.ARRAY_BUFFER, new Float32Array( lines ), this.rc.STATIC_DRAW );
        this.rc.uniformMatrix4fv( this.programs[ 1 ].hpvMatrixULoc, false, this.camera.hpvMatrix );
        this.rc.uniform4fv( this.programs[ 1 ].colorULoc, color );
        this.rc.vertexAttribPointer( this.programs[ 1 ].vPosAttribLoc, 3, this.rc.FLOAT, false, 0, 0 );
        this.rc.drawArrays( this.rc.LINES, 0, lines.length / 3 );

        // switch back to the normal program
        this.rc.useProgram( this.programs[ 0 ].shader );
    }

    /**
     * Draw unlit blobs.
     * @param {CubeMarcher} marcher - A reference to the CubeMarcher object. 
     */
    drawBlobs( marcher ) {
        // use the blob shader
        this.rc.useProgram( this.programs[ 2 ].shader );

        // pass in the blob triangles
        this.rc.bindBuffer( this.rc.ARRAY_BUFFER, marcher.bufferV );
        this.rc.bufferData( this.rc.ARRAY_BUFFER, new Float32Array( marcher.triangles ), this.rc.STATIC_DRAW );
        this.rc.bindBuffer( this.rc.ELEMENT_ARRAY_BUFFER, marcher.bufferT );
        this.rc.uniformMatrix4fv( this.programs[ 2 ].hpvMatrixULoc, false, this.camera.hpvMatrix );
        this.rc.uniform4fv( this.programs[ 2 ].colorULoc, marcher.color );
        this.rc.vertexAttribPointer( this.programs[ 2 ].vPosAttribLoc, 3, this.rc.FLOAT, false, 0, 0 );
        this.rc.drawArrays( this.rc.TRIANGLES, 0, marcher.triangles.length / 3 );

        // switch back to the normal program
        this.rc.useProgram( this.programs[ 0 ].shader );
    }

    /**
     * Load a texture for WebGl.
     * @param {string} textureFile - Local file name.
     */
    loadTexture( textureFile ) {
        // check if we have loaded this texture already
        const tex = this.textureMap.get( textureFile );
        if ( tex ) return tex;

        // load a 1x1 gray image into texture for use when no texture, and until texture loads
        const currTexture = this.rc.createTexture(); // shorthand
        this.rc.bindTexture( this.rc.TEXTURE_2D, currTexture ); // activate model's texture
        this.rc.texImage2D( this.rc.TEXTURE_2D, 0, this.rc.RGBA, 1, 1, 0, this.rc.RGBA, this.rc.UNSIGNED_BYTE, new Uint8Array( [ 64, 64, 64, 255 ] ) ); // defaults to gray
        this.rc.texParameteri( this.rc.TEXTURE_2D, this.rc.TEXTURE_MAG_FILTER, this.rc.LINEAR ); // use linear filter for magnification
        this.rc.texParameteri( this.rc.TEXTURE_2D, this.rc.TEXTURE_MIN_FILTER, this.rc.LINEAR_MIPMAP_LINEAR ); // use mipmap for minification
        this.rc.generateMipmap( this.rc.TEXTURE_2D ); // construct mipmap pyramid
        this.rc.bindTexture( this.rc.TEXTURE_2D, null ); // deactivate model's texture

        // if there is a texture to load, asynchronously load it
        if ( textureFile ) {
            currTexture.image = new Image(); // new image struct for texture
            currTexture.image.onload = () => { // when texture image loaded...
                this.rc.bindTexture( this.rc.TEXTURE_2D, currTexture ); // activate model's new texture
                this.rc.pixelStorei( this.rc.UNPACK_FLIP_Y_WEBGL, true ); // invert vertical texcoord v
                this.rc.texImage2D( this.rc.TEXTURE_2D, 0, this.rc.RGBA, this.rc.RGBA, this.rc.UNSIGNED_BYTE, currTexture.image ); // norm 2D texture
                this.rc.generateMipmap( this.rc.TEXTURE_2D ); // rebuild mipmap pyramid
                this.rc.bindTexture( this.rc.TEXTURE_2D, null ); // deactivate model's new texture
            }; // end when texture image loaded
            currTexture.image.onerror = function () { // when texture image load fails...
                console.log( "Unable to load texture " + textureFile );
            }; // end when texture image load fails
            currTexture.image.crossOrigin = "Anonymous"; // allow cross origin load, please
            currTexture.image.src = textureFile; // set image location
        }

        // put url and texture buffer into the texture map
        this.textureMap.set( textureFile, currTexture );

        // return the texture buffer
        return currTexture;
    }

    /**
     * Builds a cube map for webgl with the provided images.
     * @param {string} folder - The folder that contains the 6 images used for cube mapping. (posx.jpg, negx.jpg, posy.jpg, etc.)
     */
    #loadCubeMap( folder ) {
        this.cubemap = false;
        const cube = this.rc.createTexture();

        // references to the faces of the cubes
        const faces = [
            { target: this.rc.TEXTURE_CUBE_MAP_POSITIVE_X, url: folder + "posx.jpg" },
            { target: this.rc.TEXTURE_CUBE_MAP_NEGATIVE_X, url: folder + "negx.jpg" },
            { target: this.rc.TEXTURE_CUBE_MAP_POSITIVE_Y, url: folder + "posy.jpg" },
            { target: this.rc.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: folder + "negy.jpg" },
            { target: this.rc.TEXTURE_CUBE_MAP_POSITIVE_Z, url: folder + "posz.jpg" },
            { target: this.rc.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: folder + "negz.jpg" },
        ];

        // load all 6 faces, when all size are loaded bind the final texture with mipmapping and update the public reference.
        let loaded = 0;
        for ( const face of faces ) {
            const { target, url } = face;
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.rc.bindTexture( this.rc.TEXTURE_CUBE_MAP, cube );
                this.rc.texImage2D( target, 0, this.rc.RGBA, this.rc.RGBA, this.rc.UNSIGNED_BYTE, img );
                ++loaded;

                // are all six sides done loading?
                if ( loaded == 6 ) {
                    this.rc.bindTexture( this.rc.TEXTURE_CUBE_MAP, cube );
                    this.rc.generateMipmap( this.rc.TEXTURE_CUBE_MAP );
                    this.rc.texParameteri( this.rc.TEXTURE_CUBE_MAP, this.rc.TEXTURE_MIN_FILTER, this.rc.LINEAR_MIPMAP_LINEAR );
                    this.rc.texParameteri( this.rc.TEXTURE_CUBE_MAP, this.rc.TEXTURE_MAG_FILTER, this.rc.LINEAR );
                    this.cubemap = cube; // public reference
                }
            };
        }
    }

    /**
     * Feed camera parameters to webgl.
     */
    updateCamera() {
        // update the camera parameters
        this.camera.update();

        // pass in the eye's position
        this.rc.uniform3fv( this.programs[ 0 ].eyePositionULoc, this.camera.eye );
        this.rc.useProgram( this.programs[ 1 ].shader );
        this.rc.uniform3fv( this.programs[ 1 ].eyePositionULoc, this.camera.eye ); // pass in the eye's position
        this.rc.useProgram( this.programs[ 0 ].shader );
    }

    /**
     * Setup the webGL shaders.
     */
    setupShaders( ambient, diffuse, specular, position ) {
        // create the shader programs
        const lambert = new Program( this.rc, vShaderCode, fShaderCode );
        const lines = new Program( this.rc, lineVShaderCode, lineFShaderCode );
        const blobs = new Program( this.rc, blobbyVShaderCode, blobbyFShaderCode );
        this.programs.push( lambert, lines, blobs );

        // activate the main shader program (frag and vert)
        this.rc.useProgram( this.programs[ 0 ].shader );

        /* --- setup the triangle shader --- */

        // locate and enable vertex attributes
        lambert.vPosAttribLoc = this.rc.getAttribLocation( lambert.shader, "aVertexPosition" ); // ptr to vertex pos attrib
        this.rc.enableVertexAttribArray( lambert.vPosAttribLoc ); // connect attrib to array
        lambert.vNormAttribLoc = this.rc.getAttribLocation( lambert.shader, "aVertexNormal" ); // ptr to vertex normal attrib
        this.rc.enableVertexAttribArray( lambert.vNormAttribLoc ); // connect attrib to array
        lambert.vUVAttribLoc = this.rc.getAttribLocation( lambert.shader, "aVertexUV" ); // ptr to vertex UV attrib
        this.rc.enableVertexAttribArray( lambert.vUVAttribLoc ); // connect attrib to array

        // locate vertex uniforms
        lambert.mMatrixULoc = this.rc.getUniformLocation( lambert.shader, "umMatrix" ); // ptr to mmat
        lambert.pvmMatrixULoc = this.rc.getUniformLocation( lambert.shader, "upvmMatrix" ); // ptr to pvmmat

        // locate fragment uniforms
        const lightAmbientULoc = this.rc.getUniformLocation( lambert.shader, "uLightAmbient" ); // ptr to light ambient
        const lightDiffuseULoc = this.rc.getUniformLocation( lambert.shader, "uLightDiffuse" ); // ptr to light diffuse
        const lightSpecularULoc = this.rc.getUniformLocation( lambert.shader, "uLightSpecular" ); // ptr to light specular
        const lightPositionULoc = this.rc.getUniformLocation( lambert.shader, "uLightPosition" ); // ptr to the light position
        lambert.ambientULoc = this.rc.getUniformLocation( lambert.shader, "uAmbient" ); // ptr to ambient
        lambert.diffuseULoc = this.rc.getUniformLocation( lambert.shader, "uDiffuse" ); // ptr to diffuse
        lambert.specularULoc = this.rc.getUniformLocation( lambert.shader, "uSpecular" ); // ptr to specular
        lambert.alphaULoc = this.rc.getUniformLocation( lambert.shader, "uAlpha" ); // ptr to alpha
        lambert.shininessULoc = this.rc.getUniformLocation( lambert.shader, "uShininess" ); // ptr to shininess
        lambert.usingTextureULoc = this.rc.getUniformLocation( lambert.shader, "uUsingTexture" ); // ptr to using texture
        lambert.textureULoc = this.rc.getUniformLocation( lambert.shader, "uTexture" ); // ptr to texture
        lambert.eyePositionULoc = this.rc.getUniformLocation( lambert.shader, "uEyePosition" ); // ptr to eye position
        lambert.cubeTextureULoc = this.rc.getUniformLocation( lambert.shader, "uCubeTexture" ); // ptr to cube map texture
        lambert.useCubeMappingULoc = this.rc.getUniformLocation( lambert.shader, "uUseCubeMapping" ); // ptr to boolean for cube mapping
        lambert.uMixColorsULoc = this.rc.getUniformLocation( lambert.shader, "uMixColors" ); // ptr to boolean for color mixing    
        lambert.uHeadlightULoc = this.rc.getUniformLocation( lambert.shader, "uHeadlight" ); // ptr to boolean for headlight  

        // pass global (not per model) constants into fragment uniforms
        this.rc.uniform3fv( lightAmbientULoc, ambient ); // pass in the light's ambient emission
        this.rc.uniform3fv( lightDiffuseULoc, diffuse ); // pass in the light's diffuse emission
        this.rc.uniform3fv( lightSpecularULoc, specular ); // pass in the light's specular emission
        this.rc.uniform3fv( lightPositionULoc, position ); // pass in the light's position

        /* --- setup the line shader --- */

        // setup shader locations
        lines.vPosAttribLoc = this.rc.getAttribLocation( lines.shader, "aPosition" ); // ptr to vertex pos attrib
        this.rc.enableVertexAttribArray( lines.vPosAttribLoc ); // connect attrib to array
        lines.hpvMatrixULoc = this.rc.getUniformLocation( lines.shader, "upvmMatrix" ); // ptr to pvmmat
        lines.colorULoc = this.rc.getUniformLocation( lines.shader, "uColor" );
        lines.eyePositionULoc = this.rc.getUniformLocation( lines.shader, "uEyePosition" ); // ptr to eye position

        /* --- setup the blob shader --- */

        // setup shader locations
        blobs.vPosAttribLoc = this.rc.getAttribLocation( blobs.shader, "aPosition" ); // ptr to vertex pos attrib
        this.rc.enableVertexAttribArray( blobs.vPosAttribLoc ); // connect attrib to array
        blobs.hpvMatrixULoc = this.rc.getUniformLocation( blobs.shader, "upvmMatrix" ); // ptr to pvmmat
        blobs.colorULoc = this.rc.getUniformLocation( blobs.shader, "uColor" );

        // update the camera
        this.updateCamera();
    }
}

/**
 * @typedef {WebGLModel} WebGLModelType
 */
export { WebGLModel as WebGLModelType };
