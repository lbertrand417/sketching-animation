"use strict;"

// Import libraries
import * as THREE from 'three';
import { MyObject } from './myObject.js';


/**
 * Resize the window
 */
function resize() {
    console.log("resize");

    // Retrieve the 2D canvas
    let canvas2D = document.getElementById('canvas');
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    let ctx = canvas2D.getContext('2d');

    // Rescale
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Compute world angle and axis between origin-effector and origin-target vectors
 * @param {THREE.Vector3} origin - The origin of the angle
 * @param {THREE.Vector3} effector - The first position
 * @param {THREE.Vector3} target - The second position
 * @returns The angle btw axes origin-effector and origin-target and the axis of rotation (from effector to target)
 */
function computeAngleAxis(origin, effector, target) { 
    // Compute normalized axis origin-target
    let n = target.clone().sub(origin);
    n.normalize();

    // Computer normalized axis origin-effector
    let t = new THREE.Vector3();
    t.copy(effector);
    t.sub(origin);
    t.normalize();
 
    // Compute rotation axis
    let axis = new THREE.Vector3();
    axis.crossVectors(t, n);
    axis.normalize();
 
    // Compute world rotation angle
    let angle = t.dot(n);
    angle = Math.acos(angle);

    if (isNaN(angle)) {
        angle = 0;
        axis = new THREE.Vector3();
    }
 
    return { angle, axis };
}

/**
 * Transfer the axis from world space to local space of bones[index]
 * @param {THREE.Vector3} axis - Axis in world space
 * @param {Array<THREE.Bone>} bones - Array of bones
 * @param {number} index - Index in bones array indicating the wanted local space
 * @returns The axis in the local space of bones[index]
 */
function localDir(axis, bones, index) {
    let local = axis.clone(); // World axis
    for (let i = 0; i <= index; i++) {
        local.applyQuaternion(bones[i].quaternion.clone().invert()); 
    }   

    return local;
}

/**
 * Rotate the frame of the origin bone
 * @param {THREE.Vector3} axis - The axis of rotation in origin local space
 * @param {number} angle - The angle of rotation
 * @param {THREE.Bone} origin - The bone whose frame is rotated
 */
function rotate(axis, angle, origin) {
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angle);
    origin.applyQuaternion(q);
    origin.updateWorldMatrix(false, false);
}

/**
 * Transfer the point from the local frame to the world frame.
 * 
 * Equivalent to
 * let test = new THREE.Vector3();
 * test.setFromMatrixPosition(object.bones[index].matrixWorld);
 * 
 * @param {THREE.Vector3} point - The position in local space
 * @param {MyObject} object - The object whose bones belong to
 * @param {Array<THREE.Bone>} bones - The bones array where the local frame is
 * @param {number} index - The index of the bone the local frame belongs to
 * @returns The position in the world frame
 */
function worldPos(point, object, bones, index) {
    let globalPos = point.clone(); // Local position
    for (let i = index; i >= 0; i--) {
        globalPos.applyMatrix4(bones[i].matrix);
    }
    globalPos.applyMatrix4(object.mesh.matrix);

    return globalPos;
}

/**
 * Transfer the point from the world frame to the local frame
 * @param {THREE.Vector3} point - The position in world space
 * @param {MyObject} object - The object whose bones belong to
 * @param {Array<THREE.Bone>} bones - The bones array where the local frame is
 * @param {number} index - The index of the bone the local frame belongs to
 * @returns The position in the local frame
 */
function localPos(point, object, bones, index) {
    let pos = point.clone(); // World position
    pos.applyMatrix4(object.mesh.matrix.clone().invert());
    for (let i = 0; i <= index; i++) {
        pos.applyMatrix4(bones[i].matrix.clone().invert());
    }

    return pos;
}

/**
 * PROBABLY WRONG
 * Transfer a quaternion from local frame to global frame
 * @param {MyObject} object - The object whose bones belong to
 * @param {Array<THREE.Bone>} bones - The bones array where the local frame is
 * @param {number} index - The index of the bone the local frame belongs to
 * @returns The quaternion in the world space
 */
 function getWorldQuaternion(object, bones, index) {
    let worldQ = new THREE.Quaternion(); // A quaternion is null in its local frame
    for (let i = index - 1; i >= 0; i--) {
        worldQ.multiply(bones[i].quaternion);
    }
    worldQ.multiply(object.mesh.quaternion);

    return worldQ;
}

/**
 * Update the matrix of an object
 * @param {Object} object 
 */
function updateMatrix(object) {
    object.matrix.compose(object.position, object.quaternion, object.scale);
}


/**
 * Project a 2D mouse position in the 3D space on the view plane going through the point p
 * @param {Event} e - Event
 * @param {HTMLElement} canvas - The 2D canvas 
 * @param {THREE.Vector3} p - The point contained in the view plane
 * @returns The 3D position of the mouse
 */
function project3D(e, canvas, p) {
    let pos = { x: 0, y: 0 }; // last known position
    let mouse = {x: 0, y: 0}; // mouse position

    // Retrieve the position on the window
    let rect = canvas.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;

    // Retrieve mouse position on the canvas
    e.preventDefault();
    mouse.x = (pos.x / canvas.width) * 2 - 1;
    mouse.y = - (pos.y/ canvas.height) * 2 + 1;

    let vector = new THREE.Vector3(mouse.x, mouse.y, 0); // In camera space
    vector.unproject(camera); 

    // Direction to point
    let dir = vector.sub( camera.position )
    dir.normalize();

    const p0 = camera.position; // Global camera position

    const n = new THREE.Vector3(0,0,0);
    camera.getWorldDirection(n);  // Normal to the plane

    // Find the 3D point intersecting the view plane
    const tI = ((p.clone().sub(p0)).dot(n) ) / ( dir.dot(n) );
    const pI = (dir.clone().multiplyScalar(tI)).add(p0);

    return pI;
}

/**
 * Get a random int value btw min and max
 * @param {number} min - Min
 * @param {number} max - Max
 * @returns A random int
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Interpolate btw p1 and p2 values with alpha parameterization.
 * alpha = 0 ==> returns p1
 * alpha = 1 ==> returns p2
 * @param {THREE.Vector3} p1 - First value
 * @param {THREE.Vector3} p2 - Second value
 * @param {number} alpha - Parameter btw 0 and 1
 * @returns The interpolated value
 */
function interpolate(p1, p2, alpha) {
    if (p1.isVector3) {
        return p1.clone().multiplyScalar(1 - alpha).add(p2.clone().multiplyScalar(alpha))
    } else {
        return (1 - alpha) * p1 + alpha * p2;
    }
}

/**
 * Get the world position of the vertex of an object's mesh
 * @param {MyObject} object - The object
 * @param {number} index - The index of the vertex in the buffer position
 * @returns 
 */
function getVertex(object, index) {
    const positionAttribute = object.positions;

    let vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positionAttribute, index); // Rest pose local position

    // Find actual local position of the vertex (skinning) 
    object.mesh.boneTransform(index, vertex) 

    vertex.applyMatrix4(object.mesh.matrix); // World position

    return vertex;
}

/**
 * Get the world rotation of the vertex of an object's mesh
 * @param {MyObject} object - The object
 * @param {number} index - The index of the vertex in the buffer position
 * @returns 
 */
 function getRotation(object, index) {
    let skinWeight = new THREE.Vector4();
    let skinIndex = new THREE.Vector4();
    skinIndex.fromBufferAttribute( object.skinIndex, index );
    skinWeight.fromBufferAttribute( object.skinWeight, index );

    // Compute the rotation of the vertex in world space
    let Q = new THREE.Quaternion(0, 0, 0, 0); // World space
    for (let i = 0; i < 4; i++) {
        let weight = skinWeight.getComponent(i);

        if(weight != 0) {
            
            let boneIndex = skinIndex.getComponent(i);
            
            let boneQ = getWorldQuaternion(object, object.bones, boneIndex);
            boneQ = new THREE.Quaternion();
            object.bones[boneIndex].getWorldQuaternion(boneQ);
            boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
            Q.set(Q.x + boneQ.x, Q.y + boneQ.y, Q.z + boneQ.z, Q.w + boneQ.w);
        }
    }
    Q.normalize();

    return Q;
}

/**
 * Get the local position of the effector when following a path
 * @param {MyObject} object - The object whose effector is attached to
 * @param {Array<THREE.Vector3>} positions - The path followed by the object
 * @returns The positions of the effector in the local frame
 */
function getEffectorPositions(object, positions) {
    let effectorPos = [];

    /* Store the info for the current bending of the object. 
    Getting the effector positions requires to update the bending but we want to keep the
    current bending in mind*/
    let currentTarget = object.bones[object.effector + 1].position.clone(); // Local position
    currentTarget = worldPos(currentTarget, object, object.bones, object.effector); // World position

    // Go through the path
    for(let i = 0; i < positions.length; i++) {
        let newTarget = positions[i].clone(); // Local position
        object.bones[0].localToWorld(newTarget); // World position
        object.bend(object.bones, newTarget);

        let newPos = object.bones[object.effector + 1].position.clone(); // Local position (bones[effector])
        newPos = worldPos(newPos, object, object.bones, object.effector); // World position
        newPos = localPos(newPos, object, object.bones, 0); // Local position (bones[0])
        effectorPos.push(newPos);        
    }

    // Retrieve the initial bending
    object.bend(object.bones, currentTarget);

    return effectorPos;
}

export { resize, computeAngleAxis, localDir, rotate, worldPos, localPos, project3D, 
    getRandomInt, interpolate, getVertex, getRotation, updateMatrix, getEffectorPositions };