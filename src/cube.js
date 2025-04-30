/*
    Evan Jonson (ecjonson)
    CSC 562
    Project
    3/18/2025
*/

import { TriangleSet } from "./webgl/objects.js";

/**
 * The cube! Prepares a cube for rendering in webgl.
 */
export class Cube {
    /**
     * Make a cube for webgl.
     * @param {WebGLModel} gl - The webgl object.  
     */
    constructor( gl, BoundingBox, material, lineColor ) {
        this.sets = [];
        this.color = lineColor;
        this.bb = BoundingBox;
        this.buffer = gl.rc.createBuffer();

        // the flattened cube lines for webgl when rendering lines
        this.lines = [
            // top
            this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ], this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ],
            this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ], this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ],
            this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ], this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ],
            this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ], this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ],
            // bottom
            this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ], this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ],
            this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ], this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ],
            this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ], this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ],
            this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ], this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ],
            // sides
            this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ], this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ],
            this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ], this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ],
            this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ], this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ],
            this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ], this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ],
        ];

        // the cube vertices prepared for webgl
        const verts = {
            top: [
                this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ],
                this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ],
                this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ],
                this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ],
            ],
            bottom: [
                this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ],
                this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ],
                this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ],
                this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ],
            ],
            left: [
                this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ],
                this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ],
                this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ],
                this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ],
            ],
            right: [
                this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ],
                this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ],
                this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ],
                this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ],
            ],
            front: [
                this.bb.ntl[ 0 ], this.bb.ntl[ 1 ], this.bb.ntl[ 2 ],
                this.bb.ntr[ 0 ], this.bb.ntr[ 1 ], this.bb.ntr[ 2 ],
                this.bb.nbr[ 0 ], this.bb.nbr[ 1 ], this.bb.nbr[ 2 ],
                this.bb.nbl[ 0 ], this.bb.nbl[ 1 ], this.bb.nbl[ 2 ],
            ],
            back: [
                this.bb.ftr[ 0 ], this.bb.ftr[ 1 ], this.bb.ftr[ 2 ],
                this.bb.ftl[ 0 ], this.bb.ftl[ 1 ], this.bb.ftl[ 2 ],
                this.bb.fbl[ 0 ], this.bb.fbl[ 1 ], this.bb.fbl[ 2 ],
                this.bb.fbr[ 0 ], this.bb.fbr[ 1 ], this.bb.fbr[ 2 ],
            ],
        };

        // normals prepared for webgl
        const normals = {
            top: [ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ],
            bottom: [ 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0 ],
            left: [ -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0 ],
            right: [ 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0 ],
            front: [ 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1 ],
            back: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        };

        // uv coordinates prepared for webgl
        const uvs = [ 0, 1, 1, 1, 1, 0, 0, 0 ];
        const triangles = [ 0, 1, 2, 3, 0, 2 ];

        // put it all together
        this.sets = [
            new TriangleSet( gl, material, verts.top, normals.bottom, uvs, triangles ), // top
            new TriangleSet( gl, material, verts.bottom, normals.top, uvs, triangles ), // bottom
            new TriangleSet( gl, material, verts.left, normals.right, uvs, triangles ), // left
            new TriangleSet( gl, material, verts.right, normals.left, uvs, triangles ), // right
            new TriangleSet( gl, material, verts.front, normals.back, uvs, triangles ), // front
            new TriangleSet( gl, material, verts.back, normals.front, uvs, triangles ), // back
        ];
    }
}
