/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Used to get delta frame time for consistant movement.
 */
export class Time {
    constructor() {
        this.then = 0;
        this.delta = 0;
    }

    /**
     * Set now as then, and get the delta time.
     */
    set( now ) {
        now *= 0.001; // now in seconds
        this.delta = now - this.then; // change in time
        this.then = now; // store previous time
    }
}

/**
 * Represents a webgl material.
 */
export class Material {
    /**
     * Make a webgl material.
     * @param {vec3} ambient 
     * @param {vec3} diffuse 
     * @param {vec3} specular 
     * @param {Number} n 
     * @param {Number} alpha 
     * @param {String} texture 
     */
    constructor( ambient, diffuse, specular, n, alpha, texture ) {
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.n = n;
        this.alpha = alpha;
        this.texture = texture;
    }
}

/**
 * Buffer object for a triangle set.
 */
export class Buffer {
    /**
     * Make a set of triangle buffers for the given rendering context.
     * @param {WebGLRenderingContext} rc - webgl rendering context.
     */
    constructor( rc ) {
        this.vertices = rc.createBuffer();
        this.normals = rc.createBuffer();
        this.uvs = rc.createBuffer();
        this.triangles = rc.createBuffer();
    }
}

/**
 * Represents the basic format we expect from file for a set of triangles in webgl.
 */
export class TriangleSet {
    /**
     * Prepare a triangle set for webgl.
     * @param {WebGLObject} gl - our webgl object.
     * @param {Material} material - Material properties.
     * @param {Array} vertices - Unique vertices.
     * @param {Array} normals - Vertex normals.
     * @param {Array} uvs - Vertex uvs.
     * @param {Array} triangles - Vertices in triples.
     */
    constructor( gl, material, vertices, normals, uvs, triangles ) {
        this.size = triangles.length;
        this.material = material;
        this.buffer = new Buffer( gl.rc );

        // send buffers to webgl
        gl.rc.bindBuffer( gl.rc.ARRAY_BUFFER, this.buffer.vertices ); // activate that buffer
        gl.rc.bufferData( gl.rc.ARRAY_BUFFER, new Float32Array( vertices ), gl.rc.STATIC_DRAW ); // data in
        gl.rc.bindBuffer( gl.rc.ARRAY_BUFFER, this.buffer.normals ); // activate that buffer
        gl.rc.bufferData( gl.rc.ARRAY_BUFFER, new Float32Array( normals ), gl.rc.STATIC_DRAW ); // data in
        gl.rc.bindBuffer( gl.rc.ARRAY_BUFFER, this.buffer.uvs ); // activate that buffer
        gl.rc.bufferData( gl.rc.ARRAY_BUFFER, new Float32Array( uvs ), gl.rc.STATIC_DRAW ); // data in
        this.texture = gl.loadTexture( material.texture ); // load tri set's texture

        // send the triangle indices to webGL
        gl.rc.bindBuffer( gl.rc.ELEMENT_ARRAY_BUFFER, this.buffer.triangles ); // activate that buffer
        gl.rc.bufferData( gl.rc.ELEMENT_ARRAY_BUFFER, new Uint16Array( triangles ), gl.rc.STATIC_DRAW ); // data in
    }
}

/**
 * Represents a sphere for webgl. Use the oneSphere triangles.
 */
export class SphereSet {
    /**
     * Make a sphere set for the given gl object.
     * @param {WebGLModel} gl - Load the given materials texture into the gl object.
     * @param {Number} r - The sphere radius.
     * @param {Material} material - The sphere material.
     */
    constructor( gl, r, material ) {
        this.xyz = vec3.fromValues( r, r, r );
        this.material = material;
        this.texture = gl.loadTexture( material.texture );
    }
}

/**
 * Represents a webgl program. Maintains references to that programs shaders. You can
 * then attach references to those shaders to this object.
 */
export class Program {
    /**
     * Create a shader program given vertex and fragment glsl strings.
     * You can then attach shader locations to this object.
     * @param {WebGLRenderingContext} rc - The rendering context.
     * @param {String} vCode - The glsl vertex shader code.
     * @param {String} fCode - The glsl fragment shader code.
     */
    constructor( rc, vCode, fCode ) {
        // vertex shader
        const vShader = rc.createShader( rc.VERTEX_SHADER ); // create vertex shader
        rc.shaderSource( vShader, vCode ); // attach code to shader
        rc.compileShader( vShader ); // compile the code for gpu execution

        // validate
        if ( !rc.getShaderParameter( vShader, rc.COMPILE_STATUS ) ) // bad vertex shader compile
            throw "error during vertex shader compile: " + rc.getShaderInfoLog( vShader );

        // fragment shader
        const fShader = rc.createShader( rc.FRAGMENT_SHADER ); // create frag shader
        rc.shaderSource( fShader, fCode ); // attach code to shader
        rc.compileShader( fShader ); // compile the code for gpu execution

        // validate
        if ( !rc.getShaderParameter( fShader, rc.COMPILE_STATUS ) ) // bad frag shader compile
            throw "error during fragment shader compile: " + rc.getShaderInfoLog( fShader );

        // create the shader program
        this.shader = rc.createProgram();
        rc.attachShader( this.shader, vShader ); // put vertex shader in program
        rc.attachShader( this.shader, fShader ); // put frag shader in program
        rc.linkProgram( this.shader ); // link program into gl context

        // validate
        if ( !rc.getProgramParameter( this.shader, rc.LINK_STATUS ) ) // bad program link
            throw "error during shader program linking: " + rc.getProgramInfoLog( this.shader );
    }
}
