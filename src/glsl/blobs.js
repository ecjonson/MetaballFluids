/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Simple shader for unlit triangles.
 */
export const blobbyVShaderCode = `
    attribute vec3 aPosition; // blob triangles

    uniform mat4 upvmMatrix; // the projection view model matrix

    void main(void) {
       gl_Position = upvmMatrix * vec4(aPosition, 1.0);
    }
`;

/**
 * Simple shader for unlit triangles.
 */
export const blobbyFShaderCode = `
    precision mediump float;

    uniform vec4 uColor; // fragment color

    void main(void) {
        gl_FragColor = uColor;
    }
`;
