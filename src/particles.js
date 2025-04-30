/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { SphereSet, Material } from "./webgl/objects.js";

/**
 * Represents a particle in the system.
 */
class Particle {
    constructor() {
        this.location = vec3.fromValues( ( 0.5 - Math.random() ) * 10, ( 0.5 - Math.random() ) * 10, ( 0.5 - Math.random() ) * 10 );
        this.direction = vec3.fromValues( 0.5 - Math.random(), 0.5 - Math.random(), 0.5 - Math.random() ); // floating direction
        this.velocity = vec3.create(); // gravity system velocity
        vec3.normalize( this.direction, this.direction );
    }
}

/**
 * Maintains the particles.
 */
export class ParticleSystem {

    #howMany = 0; // how many particles are in the system
    #radius; // the radius of each particle
    #defaultGavity; // used for a reset

    /**
     * Makes a cube particle system with the given parameters.
     * @param {WebGLModel} gl - The webgl object.
     * @param {BoundingBox} boundingBox - The systems bounding box.
     * @param {Material} material - The particle nucleus material.
     * @param {Number} particleRadius - How big are the particles?
     * @param {Number} gravityForce - How strong is the gravity?
     */
    constructor( gl, boundingBox, material, particleRadius, gravityForce ) {
        this.bb = boundingBox;
        this.sphere = new SphereSet( gl, particleRadius, material ); // blob nucleus
        this.#radius = particleRadius; // blob nucleus
        this.gForce = gravityForce; // gravity force
        this.#defaultGavity = vec3.fromValues( 0, gravityForce, 0 ); // used on reset
        this.gDirection = this.#defaultGavity; // gravity direction
        this.restlength; // spring length between particles
        this.stiffness; // spring stiffness between particles
        this.damping; // energy loss coefficient between particles
        this.range; // maximum range of springs between particles
        this.repulsion; // repulsive force between particles when too close
        this.speed = 0; // the velocity of each particle
        this.gravity = false; // is gravity and fluid mechanics on?
        this.particles = [];

        // normals for bouncing
        this.normals = {
            up: [ 0, 1, 0 ],
            down: [ 0, -1, 0 ],
            left: [ -1, 0, 0 ],
            right: [ 1, 0, 0 ],
            from: [ 0, 0, -1 ],
            to: [ 0, 0, 1 ],
        };
    }

    /**
     * Set how many particles are in the system.
     * @param {Number} n - How many particles are there now?
     */
    setHowMany( n ) {
        n -= this.#howMany; // how many to add or take away
        this.#howMany += n; // update how many we have

        // add?
        if ( n > 0 )
            for ( let i = 0; i < n; ++i )
                this.particles.push( new Particle() );

        // subtract
        else
            for ( let i = 0; i < -n; ++i )
                this.particles.pop();
    }

    /**
     * Activate the particle system. Moves and bounces the blob nuclei.
     * @param {Number} delta - Time.delta, the time between frames.
     */
    activate( delta ) {
        if ( !delta ) return;

        // apply gravity to the particles
        if ( this.gravity )
            this.#gravitate( delta );

        // move and bounce particles
        else this.#float( this.speed * delta );
    }

    /**
     * Uses Hooke's law (spring mechanics) to apply forces to the particles based on their relative locations. The
     * complexity of this algorithm is O(n^2) where n=#particles.
     * @see https://www.gorillasun.de/blog/spring-physics-and-connecting-particles-with-springs/
     * @param {Number} delta - Time.delta, the time between frames.
     */
    #gravitate( delta ) {
        for ( let i = 0; i < this.particles.length; ++i ) {
            const particle = this.particles[ i ];

            // apply gravity
            vec3.scaleAndAdd( particle.velocity, particle.velocity, this.gDirection, delta );

            // add spring forces using Hooke's law
            const spring = vec3.create();
            for ( let j = 0; j < this.particles.length; ++j ) {

                // skip this particle
                if ( i == j ) continue;

                // other particle
                const other = this.particles[ j ];

                // distance between these particles
                const deltaLoc = vec3.sub( vec3.create(), other.location, particle.location );
                const distance = vec3.len( deltaLoc );

                // max spring distance
                if ( distance == 0 || distance > this.range ) continue;

                // spring force direction
                const direction = vec3.scale( vec3.create(), deltaLoc, 1 / distance );

                // Hooke's Law: F = -k(x - L)
                const magnitude = this.stiffness * ( distance - this.restlength );
                const force = vec3.scale( vec3.create(), direction, magnitude );

                // add repulsion if blobs are too close
                // if ( distance < 0.07 ) {
                if ( distance < this.restlength * 0.5 ) {
                    const repulsion = vec3.scale( vec3.create(), direction, -this.repulsion * ( 0.5 - distance ) );
                    vec3.add( force, force, repulsion );
                }

                // apply damping
                const relativeVelocity = vec3.dot( vec3.sub( vec3.create(), other.velocity, particle.velocity ), direction );
                const dampingForce = vec3.scale( vec3.create(), direction, -this.damping * relativeVelocity );
                vec3.sub( force, force, dampingForce );

                // sum the damped forces
                vec3.add( spring, spring, force );
            }

            // apply the cumulative spring force
            vec3.scaleAndAdd( particle.velocity, particle.velocity, spring, delta );

            // calculate new location
            const location = vec3.scaleAndAdd( vec3.create(), particle.location, particle.velocity, delta );

            // check for collisions before updating location
            this.#collide( particle, location, this.#radius );
        }
    }

    /**
     * Move particles in constant but random directions, and bounce them off walls of the cube
     * with reflection vectors.
     * @param {Number} speed - The scalar value for how fast to translate the particles.
     */
    #float( speed ) {
        for ( let i = 0; i < this.particles.length; ++i ) {
            const particle = this.particles[ i ];

            // translate
            let translation = vec3.scale( vec3.create(), particle.direction, speed );
            let location = vec3.add( vec3.create(), particle.location, translation );

            // new direction if necessary
            const reflection = this.bounce( location, particle.direction, this.#radius );

            // bounce
            if ( reflection ) {
                vec3.scale( translation, reflection, speed );
                vec3.add( location, particle.location, translation );
            }

            // keep moving in this direction
            else particle.location = location;
        }
    }

    /**
     * Determines of the particle should bounce or not.
     * @param {vec3} loc - Particle location vector.
     * @param {vec3} dir - Particle direction vector.
     * @param {Number} buf - The radius of the particle.
     * @returns {vec3|null} The new direction of the particle, or null if there was no bounce.
     */
    bounce( loc, dir, buf = 0 ) {
        // xMin
        if ( dir[ 0 ] < 0 && loc[ 0 ] - buf < this.bb.nbl[ 0 ] )
            return this.#reflect( dir, this.normals.right );

        // xMax
        if ( dir[ 0 ] > 0 && loc[ 0 ] + buf > this.bb.nbr[ 0 ] )
            return this.#reflect( dir, this.normals.left );

        // yMin
        if ( dir[ 1 ] < 0 && loc[ 1 ] - buf < this.bb.nbl[ 1 ] )
            return this.#reflect( dir, this.normals.up );

        // yMax
        if ( dir[ 1 ] > 0 && loc[ 1 ] + buf > this.bb.ntl[ 1 ] )
            return this.#reflect( dir, this.normals.down );

        // zMin
        if ( dir[ 2 ] < 0 && loc[ 2 ] - buf < this.bb.nbl[ 2 ] )
            return this.#reflect( dir, this.normals.to );

        // zMax
        if ( dir[ 2 ] > 0 && loc[ 2 ] + buf > this.bb.fbl[ 2 ] )
            return this.#reflect( dir, this.normals.from );

        // keep moving in this direction
        return null;
    }

    /**
     * Calculate a reflection vector.
     * @param {vec3} dir - Particle direction vector.
     * @param {vec3} normal - Surface normal vector.
     * @returns {vec3} The reflection vector.
     */
    #reflect( dir, normal ) {
        vec3.sub( dir, dir, vec3.scale( vec3.create(), normal, 2 * vec3.dot( dir, normal ) ) );
        return vec3.normalize( dir, dir );
    }

    /**
     * Checks if the given particle can be moved to the given location. If it collides with
     * the bounding box of the cube it bounces back with some energy loss.
     * @param {Particle} p - The particle to check.
     * @param {vec3} loc - The location we want to move the particle to.
     * @param {Number} buf - The particles radius.
     */
    #collide( p, loc, buf = 0 ) {
        // xMin
        if ( p.velocity[ 0 ] < 0 && loc[ 0 ] - buf < this.bb.nbl[ 0 ] ) {
            loc[ 0 ] = this.bb.nbl[ 0 ] + buf; // collide
            p.velocity[ 0 ] *= -0.5; // bounce with energy loss
        }

        // xMax
        else if ( p.velocity[ 0 ] > 0 && loc[ 0 ] + buf > this.bb.nbr[ 0 ] ) {
            loc[ 0 ] = this.bb.nbr[ 0 ] - buf; // collide
            p.velocity[ 0 ] *= -0.5; // bounce with energy loss
        }

        // yMin
        if ( p.velocity[ 1 ] < 0 && loc[ 1 ] - buf < this.bb.nbl[ 1 ] ) {
            loc[ 1 ] = this.bb.nbl[ 1 ] + buf; // collide
            p.velocity[ 1 ] *= -0.5; // bounce with energy loss
        }

        // yMax
        else if ( p.velocity[ 1 ] > 0 && loc[ 1 ] + buf > this.bb.ntl[ 1 ] ) {
            loc[ 1 ] = this.bb.ntl[ 1 ] - buf; // collide
            p.velocity[ 1 ] *= -0.5; // bounce with energy loss
        }

        // zMin
        if ( p.velocity[ 2 ] < 0 && loc[ 2 ] - buf < this.bb.nbl[ 2 ] ) {
            loc[ 2 ] = this.bb.nbl[ 2 ] + buf; // collide
            p.velocity[ 2 ] *= -0.5; // bounce with energy loss
        }

        // zMax
        else if ( p.velocity[ 2 ] > 0 && loc[ 2 ] + buf > this.bb.fbl[ 2 ] ) {
            loc[ 2 ] = this.bb.fbl[ 2 ] - buf; // collide
            p.velocity[ 2 ] *= -0.5; // bounce with energy loss
        }

        // update the particles location
        p.location = loc;
    }

    /**
     * Get all of the particle locations.
     * @returns The particle locations as an array.
     */
    getPoints() {
        return this.particles.map( p => p.location );
    }

    /**
     * Set the gravity direction back to the default value. Used when rotating the cube with the camera.
     */
    resetGravity() {
        this.gDirection = this.#defaultGavity;
    }
}
