/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

/**
 * Vertex shader in essl using es6 template strings.
 */
export const vShaderCode = `
    attribute vec3 aVertexPosition; // vertex position
    attribute vec3 aVertexNormal; // vertex normal
    attribute vec2 aVertexUV; // vertex texture uv

    uniform mat4 umMatrix; // the model matrix
    uniform mat4 upvmMatrix; // the project view model matrix

    varying vec3 vWorldPos; // interpolated world position of vertex
    varying vec3 vVertexNormal; // interpolated normal for frag shader
    varying vec2 vVertexUV; // interpolated uv for frag shader

    void main( void ) {
        // vertex position
        vec4 vWorldPos4 = umMatrix * vec4( aVertexPosition, 1.0 );
        vWorldPos = vWorldPos4.xyz;
        gl_Position = upvmMatrix * vec4( aVertexPosition, 1.0 );

        // vertex normal (assume no non-uniform scale)
        vec4 vWorldNormal4 = umMatrix * vec4( aVertexNormal, 0.0 );
        vVertexNormal = normalize( vWorldNormal4.xyz ); 
        
        // vertex uv
        vVertexUV = aVertexUV;
    }
`;

/**
 * Fragment shader in essl using es6 template strings.
 */
export const fShaderCode = `
    precision mediump float; // set float to medium precision

    // eye location
    uniform vec3 uEyePosition; // the eye's position in world

    // light properties
    uniform vec3 uLightAmbient; // the light's ambient color
    uniform vec3 uLightDiffuse; // the light's diffuse color
    uniform vec3 uLightSpecular; // the light's specular color
    uniform vec3 uLightPosition; // the light's position
    uniform bool uHeadlight; // are we using the light's position, or the eye's position?

    // material properties
    uniform vec3 uAmbient; // the ambient reflectivity
    uniform vec3 uDiffuse; // the diffuse reflectivity
    uniform vec3 uSpecular; // the specular reflectivity
    uniform float uShininess; // the specular exponent
    uniform float uAlpha; // material alpha component

    // texture properties
    uniform bool uUsingTexture; // if we are using a texture
    uniform sampler2D uTexture; // the texture for the fragment
    varying vec2 vVertexUV; // texture uv of fragment

    // cube mapping
    uniform samplerCube uCubeTexture; // cube map
    uniform bool uUseCubeMapping; // should we use cube mapping?
    uniform bool uMixColors; // should we mix colors?
        
    // geometry properties
    varying vec3 vWorldPos; // world xyz of fragment
    varying vec3 vVertexNormal; // normal of fragment

    void main( void ) {
        // color components
        vec3 ambient = vec3( 0.0, 0.0, 0.0 );
        vec3 diffuse = vec3( 0.0, 0.0, 0.0 );
        vec3 specular = vec3( 0.0, 0.0, 0.0 );

        // normal
        vec3 normal = normalize( vVertexNormal );

        // ambient term
        ambient += uAmbient * uLightAmbient; 
        
        // diffuse term
        vec3 light;
        if ( uHeadlight )
            light = normalize( uEyePosition - vWorldPos );
        else
            light = normalize( uLightPosition - vWorldPos );

        float lambert = max( 0.0, dot( normal, light ));
        diffuse += uDiffuse * uLightDiffuse * lambert; // diffuse term
        
        // specular term
        vec3 eye = normalize( uEyePosition - vWorldPos );
        vec3 halfVec = normalize( light + eye );
        float highlight = pow( max( 0.0, dot( normal, halfVec )), uShininess );
        specular += uSpecular * uLightSpecular * highlight; // specular term
        
        // combine to find lit color
        vec3 litColor = ambient + diffuse + specular; 
        
        // cube mapping
        if ( uUseCubeMapping ) {
            vec3 incident = normalize( vWorldPos - uEyePosition );
            vec3 reflection = reflect( incident, normalize( vVertexNormal ) );
            vec4 envColor = textureCube( uCubeTexture, reflection );

            // should we mix the lit color in?
            if ( uMixColors ) {
                vec3 mixedColor = mix( litColor, envColor.rgb, 0.5 );
                gl_FragColor = vec4( mixedColor, uAlpha );
            }
            else
                gl_FragColor = vec4( envColor.rgb, uAlpha );
        }

        // textures
        else if ( uUsingTexture ) {
            vec4 texColor = texture2D( uTexture, vVertexUV );
        
            // transparent?
            if ( texColor.a < 0.1 )
                discard;

            gl_FragColor = vec4( texColor.rgb * litColor, 1.0 );
        }
        
        // no texture
        else
            gl_FragColor = vec4( litColor, uAlpha );
    }
`;
