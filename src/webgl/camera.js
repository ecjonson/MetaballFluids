/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Maintains world view paramaters.
 */
export class Camera {

    #theta = 0; // x camera angle in radians
    #phi = 0; // y camera angle in radians
    #radius; // camera zoom distance

    /**
     * Creates an orbital camera with the given starting values.
     * 
     * @param {vec3} eye - The camera start location.
     * @param {vec3} center - The camera look at location.
     * @param {vec3} up - Relative up vector.
     * @param {Number} fovy - Field of view.
     * @param {Number} aspect - Aspect Ratio.
     * @param {Number} near - Near clipping plane.
     * @param {Number} far - Far clipping plane.
     */
    constructor( eye, center, up, fovy, aspect, near, far ) {
        this.fovy = fovy;
        this.aspect = aspect;
        this.eye = eye;
        this.center = center;
        this.up = up;
        this.near = near;
        this.far = far;

        // get the radius
        this.#radius = vec3.distance( eye, center );

        // matrices
        this.hMatrix = mat4.fromScaling( mat4.create(), vec3.fromValues( -1, 1, 1 ) ); // handedness matrix
        this.vMatrix = mat4.lookAt( mat4.create(), this.eye, this.center, this.up ); // create the view matrix
        this.pMatrix = mat4.create(); // projection matrix
        this.mMatrix = mat4.create(); // model matrix
        this.hpvMatrix = mat4.create(); // hand * proj * view matrices
        this.hpvmMatrix = mat4.create(); // hand * proj * view * model matrices
        this.#updateView(); // update the eye and lookat vectors based on phi, theta, and radius
        this.update(); // prepare the view matrices
    }

    /**
     * Set the camera eye position based on current view parameters: center, radius, phi, and theta.
     * Updates the view matrix.
     */
    #updateView() {
        // translate radians to cartisian coordinates, scale by the radius and add the view center in place
        this.eye[ 0 ] = this.center[ 0 ] + this.#radius * Math.cos( this.#phi ) * Math.sin( this.#theta ); // x
        this.eye[ 1 ] = this.center[ 1 ] + this.#radius * Math.sin( this.#phi ); // y
        this.eye[ 2 ] = this.center[ 2 ] + this.#radius * Math.cos( this.#phi ) * Math.cos( this.#theta ); // z

        // update the view matrix
        mat4.lookAt( this.vMatrix, this.eye, this.center, this.up );
    }

    /**
     * Rotate the camera around the view center with x and y mouse translation. I took the general idea of an orbital camera
     * from the provided source here. I found the calculation and setting of theta and phi to be confusing, so I got rid of that.
     * If we keep track of the angles, we don't need to calculate them every time.
     * @see https://andreasrohner.at/posts/Web%20Development/JavaScript/Simple-orbital-camera-controls-for-THREE-js/
     * @param {Number} dx - Rotation x value in radians.
     * @param {Number} dy - Rotation y value in radians.
     */
    rotate( dx, dy ) {
        // update x and y radians
        this.#theta += dx; // we can just change theta and phi
        this.#phi += dy; // incrementally to rotate the camera

        // prevent flipping by clipping y rotation, a better solution would make y rotation continuous.
        const ub = Math.PI / 2 - 1e-6; // upper bound, where it causes flipping.
        this.#phi = Math.max( -ub, Math.min( ub, this.#phi ) ); // clip phi to prevent flipping

        // update the eye position based on the new phi and theta
        this.#updateView();
    }

    /**
     * Zoom by adding the incremental change in scroll value.
     * @param {Number} dy - WheelEvent.deltaY value.
     */
    zoom( dy ) {
        // the new radius
        const radius = this.#radius + dy;

        // prevent flipping and clip at the max distance
        if ( radius < 1 || radius > this.far - 10 ) return;

        // update the eye based on the new radius
        this.#radius = radius;
        this.#updateView();
    }

    /**
     * Recalculates pMatrix and hpvMatrix. Call whenever a view parameter changes:
     * fovy, aspect, near, far, pMatrix, vMatrix. Then feed updates to the shader.
     */
    update() {
        // set up handedness, projection and view
        mat4.perspective( this.pMatrix, this.fovy, this.aspect, this.near, this.far ); // create projection matrix
        mat4.multiply( this.hpvMatrix, this.hMatrix, this.pMatrix ); // handedness * projection
        mat4.multiply( this.hpvMatrix, this.hpvMatrix, this.vMatrix ); // handedness * projection * view
    }

    /**
     * Get the relative down direction from the current camera values. Used when rotating the cube with the camera.
     * @returns The relative down vector.
     */
    getCameraDown() {
        const dir = vec3.sub( vec3.create(), this.center, this.eye );
        vec3.normalize( dir, dir );
        const right = vec3.cross( vec3.create(), dir, this.up );
        vec3.normalize( right, right );
        const down = vec3.cross( vec3.create(), right, dir );
        vec3.normalize( down, down );
        return down;
    }
}
