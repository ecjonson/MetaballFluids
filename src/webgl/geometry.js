/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Represents a ray as an origin and a normalized direction.
 */
export class Ray {
    /**
     * Use from and to points to make the ray.
     * @param from - Point of ray origin.
     * @param to - Point of ray destination.
     */
    constructor( from, to ) {
        this.origin = from;
        this.direction = vec3.sub( vec3.create(), to, from );
        vec3.normalize( this.direction, this.direction );
    }
}

/**
 * Represents a plane.
 */
export class Plane {
    /**
     * Make a plane out of three points.
     * Edges: b->a, b->c.
     * @param a - Point a.
     * @param b - Point b.
     * @param c - Point c.
     */
    constructor( a, b, c ) {
        // edges
        const leftEdge1 = vec3.sub( vec3.create(), a, b );
        const leftEdge2 = vec3.sub( vec3.create(), c, b );
        // normal
        this.normal = vec3.cross( vec3.create(), leftEdge1, leftEdge2 );
        vec3.normalize( this.normal, this.normal );
        // distance
        this.distance = -vec3.dot( this.normal, b );
    }
}

/**
 * Maintains a bounding box by creating corners.
 */
export class BoundingBox {
    /**
     * Builds corners from min and max values.
     * @param {Number} xMin - Minimum x value.
     * @param {Number} xMax - Maximum x value.
     * @param {Number} yMin - Minimum y value.
     * @param {Number} yMax - Maximum y value.
     * @param {Number} zMin - Minimum z value.
     * @param {Number} zMax - Maximum z value.
     */
    constructor( xMin = 0, xMax = 1, yMin = 0, yMax = 1, zMin = 0, zMax = 1 ) {
        // near
        this.nbl = vec3.fromValues( xMin, yMin, zMin );
        this.nbr = vec3.fromValues( xMax, yMin, zMin );
        this.ntl = vec3.fromValues( xMin, yMax, zMin );
        this.ntr = vec3.fromValues( xMax, yMax, zMin );
        // far
        this.fbl = vec3.fromValues( xMin, yMin, zMax );
        this.fbr = vec3.fromValues( xMax, yMin, zMax );
        this.ftl = vec3.fromValues( xMin, yMax, zMax );
        this.ftr = vec3.fromValues( xMax, yMax, zMax );

        this.buffer = 0.2;
    }
}

/**
 * Represents a sphere object for webgl.
 */
export class Sphere {
    /**
     * Builds a sphere for webgl.
     * @param {int} numLongSteps - Number of longitute steps.
     * @param {WebGLBuffer} buffer - A webgl buffer.
     */
    constructor( numLongSteps, buffer ) {
        if ( numLongSteps % 2 != 0 ) {
            console.log( "in makeSphere: uneven number of longitude steps!" );
            return null;
        } else if ( numLongSteps < 4 ) {
            console.log( "in makeSphere: number of longitude steps too small!" );
            return null;
        }

        // make vertices, normals and uvs -- repeat longitude seam
        this.vertices = [ 0, -1, 0 ]; // vertices, init to south pole
        this.uvs = [ 0.5, 0 ]; // uvs, bottom texture row collapsed to one texel

        const INVPI = 1 / Math.PI, TWOPI = Math.PI + Math.PI, INV2PI = 1 / TWOPI, epsilon = 0.001 * Math.PI;
        const angleIncr = TWOPI / numLongSteps; // angular increment 
        const latLimitAngle = angleIncr * ( Math.floor( numLongSteps * 0.25 ) - 1 ); // start/end lat angle
        let latRadius, latY, latV; // radius, Y and texture V at current latitude
        for ( let latAngle = -latLimitAngle; latAngle <= latLimitAngle + epsilon; latAngle += angleIncr ) {
            latRadius = Math.cos( latAngle ); // radius of current latitude
            latY = Math.sin( latAngle ); // height at current latitude
            latV = latAngle * INVPI + 0.5; // texture v = (latAngle + 0.5*PI) / PI
            for ( let longAngle = 0; longAngle <= TWOPI + epsilon; longAngle += angleIncr ) { // for each long
                this.vertices.push( -latRadius * Math.sin( longAngle ), latY, latRadius * Math.cos( longAngle ) );
                this.uvs.push( longAngle * INV2PI, latV ); // texture u = (longAngle/2PI)
            } // end for each longitude
        } // end for each latitude

        this.vertices.push( 0, 1, 0 ); // add north pole
        this.uvs.push( 0.5, 1 ); // top texture row collapsed to one texel

        // const this.normals = this.vertices.slice(); // for this sphere, vertices = normals; return these
        this.normals = this.vertices.map( v => -v ); // normals = -vertices, fix vertex winding by flipping the normals

        // make triangles, first poles then middle latitudes
        this.triangles = []; // triangles to return

        const numVertices = Math.floor( this.vertices.length / 3 ); // number of vertices in sphere
        for ( let whichLong = 1; whichLong <= numLongSteps; whichLong++ ) { // poles
            this.triangles.push( 0, whichLong, whichLong + 1 );
            this.triangles.push( numVertices - 1, numVertices - whichLong - 1, numVertices - whichLong - 2 );
        } // end for each long

        let llVertex; // lower left vertex in the current quad
        for ( let whichLat = 0; whichLat < ( numLongSteps / 2 - 2 ); whichLat++ ) { // middle lats
            for ( let whichLong = 0; whichLong < numLongSteps; whichLong++ ) {
                llVertex = whichLat * ( numLongSteps + 1 ) + whichLong + 1;
                this.triangles.push( llVertex, llVertex + numLongSteps + 1, llVertex + numLongSteps + 2 );
                this.triangles.push( llVertex, llVertex + numLongSteps + 2, llVertex + 1 );
            } // end for each longitude
        } // end for each latitude

        this.transform = mat4.create();
        this.buffer = buffer;
    }
}
