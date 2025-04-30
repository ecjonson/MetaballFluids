/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { edgeTable, triTable } from "./lookup.js";
import { TriangleSet } from "./webgl/objects.js";

export class CubeMarcher {
    #resolution; // the size of each triangle
    #scale = 10.0; // the size of the world
    #points = []; // the cube/isovalue points, the center point between the grid lines
    #values = []; // grid point isovalues
    #normals = []; // triangle normals for shading

    constructor( gl, material ) {
        this.gl = gl;
        this.setMaterial( material );

        // for rendering with shading
        this.isolevel = 0.5;
        this.triSet = null;

        // for rendering without shading
        this.triangles = [];
        this.vertices = [];
        this.bufferT = gl.rc.createBuffer();
        this.bufferV = gl.rc.createBuffer();
    }

    setMaterial( material ) {
        this.material = material;
        this.color = vec4.fromValues( material.diffuse[ 0 ], material.diffuse[ 1 ], material.diffuse[ 2 ], material.alpha );
    }

    /**
     * Set the grid size/resolution.
     * @param {Number} n - The new grid resolution.
     */
    setResolution( n ) {
        this.#resolution = n;
        this.#points = [];
        this.#values = new Array( this.#resolution * this.#resolution * this.#resolution ).fill( 0 );

        // generate the grid points
        const half = this.#scale / 2;
        const den = this.#resolution - 1;
        for ( let i = 0; i < this.#resolution; ++i )
            for ( let j = 0; j < this.#resolution; ++j )
                for ( let k = 0; k < this.#resolution; ++k )
                    this.#points.push( vec3.fromValues( -half + this.#scale * i / den, -half + this.#scale * j / den, -half + this.#scale * k / den ) );
    }

    /**
     * Build a triangle mesh with the Marching Cubes algorithm. A scalar field is used to determine where the
     * surface is relative to the particle locations. Lookup tables are used to simplify the math needed to determine
     * how to build the mesh. The complexity of this algorithm is O(n*(m-1)^3) ~ O(m^3) where n=#blobs and m=grid resolution.
     * @see https://paulbourke.net/geometry/polygonise/
     * @param {Array<vec3>} metaballs - Metaball locations.
     * @param {boolean} shade - Should we build a triangle set with normals for shading, or simply a set of vertices?
     */
    march( metaballs, shade ) {
        // reset the isovalues
        for ( let i = 0; i < this.#values.length; ++i )
            this.#values[ i ] = 0;

        // calculate the iso-field
        for ( let i = 0; i < metaballs.length; ++i ) {
            const ball = metaballs[ i ];

            for ( let j = 0; j < this.#points.length; ++j ) {
                const dist = 0.5 - vec3.distance( ball, this.#points[ j ] );
                this.#values[ j ] += Math.exp( -dist * dist );
            }
        }

        // march!
        this.triangles = [];
        this.vertices = [];
        let count = 0;
        const vertexMap = new Map();

        // cube vertices
        let vertices = Array.from( { length: 12 }, () => vec3.create() );
        const res2 = this.#resolution * this.#resolution;

        // for each cube in the grid
        for ( let i = 0; i < this.#resolution - 1; ++i ) {
            for ( let j = 0; j < this.#resolution - 1; ++j ) {
                for ( let k = 0; k < this.#resolution - 1; ++k ) {

                    // the index of each cube corner
                    const p = i + this.#resolution * j + res2 * k;
                    const px = p + 1;
                    const py = p + this.#resolution;
                    const pxy = py + 1;
                    const pz = p + res2;
                    const pxz = px + res2;
                    const pyz = py + res2;
                    const pxyz = pxy + res2;

                    // the 8 cube corners
                    const v0 = this.#values[ p ];
                    const v1 = this.#values[ px ];
                    const v2 = this.#values[ py ];
                    const v3 = this.#values[ pxy ];
                    const v4 = this.#values[ pz ];
                    const v5 = this.#values[ pxz ];
                    const v6 = this.#values[ pyz ];
                    const v7 = this.#values[ pxyz ];

                    // cube index, mark bits in cube index as active if that vertex
                    // is above the scalar field isolevel
                    let cubeIndex = 0;
                    if ( v0 < this.isolevel ) cubeIndex |= 1;
                    if ( v1 < this.isolevel ) cubeIndex |= 2;
                    if ( v2 < this.isolevel ) cubeIndex |= 8;
                    if ( v3 < this.isolevel ) cubeIndex |= 4;
                    if ( v4 < this.isolevel ) cubeIndex |= 16;
                    if ( v5 < this.isolevel ) cubeIndex |= 32;
                    if ( v6 < this.isolevel ) cubeIndex |= 128;
                    if ( v7 < this.isolevel ) cubeIndex |= 64;

                    // look up the edges that will make the surface based on the cubeindex
                    const bits = edgeTable[ cubeIndex ];
                    if ( bits == 0 ) continue;

                    // approximate intersection points between those edges with interpolation
                    // bottom of the cube
                    if ( bits & 1 )
                        vec3.lerp( vertices[ 0 ], this.#points[ p ], this.#points[ px ], ( this.isolevel - v0 ) / ( v1 - v0 ) );
                    if ( bits & 2 )
                        vec3.lerp( vertices[ 1 ], this.#points[ px ], this.#points[ pxy ], ( this.isolevel - v1 ) / ( v3 - v1 ) );
                    if ( bits & 4 )
                        vec3.lerp( vertices[ 2 ], this.#points[ py ], this.#points[ pxy ], ( this.isolevel - v2 ) / ( v3 - v2 ) );
                    if ( bits & 8 )
                        vec3.lerp( vertices[ 3 ], this.#points[ p ], this.#points[ py ], ( this.isolevel - v0 ) / ( v2 - v0 ) );

                    // top of the cube
                    if ( bits & 16 )
                        vec3.lerp( vertices[ 4 ], this.#points[ pz ], this.#points[ pxz ], ( this.isolevel - v4 ) / ( v5 - v4 ) );
                    if ( bits & 32 )
                        vec3.lerp( vertices[ 5 ], this.#points[ pxz ], this.#points[ pxyz ], ( this.isolevel - v5 ) / ( v7 - v5 ) );
                    if ( bits & 64 )
                        vec3.lerp( vertices[ 6 ], this.#points[ pyz ], this.#points[ pxyz ], ( this.isolevel - v6 ) / ( v7 - v6 ) );
                    if ( bits & 128 )
                        vec3.lerp( vertices[ 7 ], this.#points[ pz ], this.#points[ pyz ], ( this.isolevel - v4 ) / ( v6 - v4 ) );

                    // vertical lines of the cube
                    if ( bits & 256 )
                        vec3.lerp( vertices[ 8 ], this.#points[ p ], this.#points[ pz ], ( this.isolevel - v0 ) / ( v4 - v0 ) );
                    if ( bits & 512 )
                        vec3.lerp( vertices[ 9 ], this.#points[ px ], this.#points[ pxz ], ( this.isolevel - v1 ) / ( v5 - v1 ) );
                    if ( bits & 1024 )
                        vec3.lerp( vertices[ 10 ], this.#points[ pxy ], this.#points[ pxyz ], ( this.isolevel - v3 ) / ( v7 - v3 ) );
                    if ( bits & 2048 )
                        vec3.lerp( vertices[ 11 ], this.#points[ py ], this.#points[ pyz ], ( this.isolevel - v2 ) / ( v6 - v2 ) );

                    // build the mesh with the triangle table
                    cubeIndex <<= 4; // multiply by 16 for the width of the triangle table

                    // de-duplicate vertices for the lambertian shaders
                    if ( shade ) {
                        for ( let i = 0; triTable[ cubeIndex + i ] != -1; ++i ) {
                            // this triangles vertices
                            const v = vertices[ triTable[ cubeIndex + i ] ];

                            // simple hash for the vertex
                            const key = `${v[ 0 ].toFixed( 5 )},${v[ 1 ].toFixed( 5 )},${v[ 2 ].toFixed( 5 )}`;

                            // check if we already are using these vertices
                            if ( !vertexMap.has( key ) ) {
                                vertexMap.set( key, count++ );
                                this.vertices.push( v[ 0 ], v[ 1 ], v[ 2 ] );
                            }

                            // add triangle indices
                            this.triangles.push( vertexMap.get( key ) );
                        }
                    }

                    // or add every vertex, even duplicates, for a simple shader with no lighting
                    else {
                        for ( let i = 0; triTable[ cubeIndex + i ] != -1; ++i ) {
                            const v = vertices[ triTable[ cubeIndex + i ] ];
                            this.triangles.push( v[ 0 ], v[ 1 ], v[ 2 ] );
                        }
                    }
                }
            }
        }

        // compute normals and prepare the triangle set for rendering
        if ( shade ) {
            // get smooth normals
            this.#smoothNormals();

            // create the triangle set for rendering
            this.triSet = new TriangleSet( this.gl, this.material, this.vertices, this.#normals, [], this.triangles );
        }
    }

    #smoothNormals() {
        const normals = new Float32Array( this.vertices.length );

        for ( let i = 0; i < this.triangles.length; i += 3 ) {
            // vertex indices
            const ia = this.triangles[ i ] * 3;
            const ib = this.triangles[ i + 1 ] * 3;
            const ic = this.triangles[ i + 2 ] * 3;

            // vertices
            const a = this.vertices.slice( ia, ia + 3 );
            const b = this.vertices.slice( ib, ib + 3 );
            const c = this.vertices.slice( ic, ic + 3 );

            // compute the normal
            const edge1 = vec3.sub( vec3.create(), b, a );
            const edge2 = vec3.sub( vec3.create(), c, a );
            const normal = vec3.cross( vec3.create(), edge2, edge1 );
            vec3.normalize( normal, normal );

            // sum the normals per vertex to get smooth shading
            normals[ ia ] += normal[ 0 ];
            normals[ ia + 1 ] += normal[ 1 ];
            normals[ ia + 2 ] += normal[ 2 ];
            normals[ ib ] += normal[ 0 ];
            normals[ ib + 1 ] += normal[ 1 ];
            normals[ ib + 2 ] += normal[ 2 ];
            normals[ ic ] += normal[ 0 ];
            normals[ ic + 1 ] += normal[ 1 ];
            normals[ ic + 2 ] += normal[ 2 ];
        }

        // normalize
        for ( let i = 0; i < normals.length; i += 3 ) {
            const normal = vec3.fromValues( normals[ i ], normals[ i + 1 ], normals[ i + 2 ] );
            vec3.normalize( normal, normal );
            normals[ i ] = normal[ 0 ];
            normals[ i + 1 ] = normal[ 1 ];
            normals[ i + 2 ] = normal[ 2 ];
        }

        // update the public array
        this.#normals = normals;
    }
}
