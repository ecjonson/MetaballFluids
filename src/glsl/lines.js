/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Simple shader for drawing lines.
 */
export const lineVShaderCode = `
    attribute vec3 aPosition; // position  

    uniform mat4 upvmMatrix; // the projection view model matrix

    varying vec3 vWorldPos; // vertex world position

    void main(void) {
        vWorldPos = aPosition;

        gl_Position = upvmMatrix * vec4(aPosition, 1.0);
    }
`;

/**
 * Simple shader for drawing lines.
 */
export const lineFShaderCode = `
    precision mediump float;

    uniform vec4 uColor; // line color
    uniform vec3 uEyePosition; // the eye's position in world

    varying vec3 vWorldPos; // fragment world position

    void main( void ) {
        // make alpha as a function of distance from the eye
        float dist = distance( vWorldPos, uEyePosition );
        
        // given a min and max expected distance, we can create a percentage
        float minD = 10.0;
        float maxD = 40.0;
        float alpha = 1.0 - ((dist - maxD) / (minD - maxD));

        gl_FragColor = vec4( uColor.xyz, alpha );
    }
`;