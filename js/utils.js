"use strict;"

// Import libraries
import * as THREE from 'three';

// Resize window
function resize(e) {
    console.log("resize");

    let canvas2D = document.getElementById('canvas'); // 2D sketch canvas
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    let ctx = canvas2D.getContext('2d');

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    global.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Compute world angle and axis between effector-origin and target-origin vectors
function computeAngleAxis(origin, effector, target) { 
    // Get world rotation vectors
    let n = target.clone().sub(origin);
    n.normalize();
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

// Put global axis in local space 
function localDir(axis, bones, index) {
    let local = axis.clone();
    for (let i = 0; i <= index; i++) {
        local.applyQuaternion(bones[i].quaternion.clone().invert());
    }   

    return local;
}

function rotate(axis, angle, origin) {
    // Compute quaternion
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angle);
    origin.applyQuaternion(q);
    origin.updateWorldMatrix(false, false);
}


function worldPos(point, object, bones, index) {
    let globalPos = point.clone();
    for (let i = index; i >= 0; i--) {
        globalPos.applyMatrix4(bones[i].matrix);
    }
    globalPos.applyMatrix4(object.mesh.matrix);

    return globalPos;
}

function localPos(point, object, bones, index) {
    let pos = point.clone();
    pos.applyMatrix4(object.mesh.matrix.clone().invert());
    for (let i = 0; i <= index; i++) {
        // Replace by quaternion as bones don't translate?
        pos.applyMatrix4(bones[i].matrix.clone().invert());
    }

    return pos;
}

function project3D(e, canvas, p) {
    let pos = { x: 0, y: 0 }; // last known position
    let mouse = {x: 0, y: 0}; // mouse position

    let rect = canvas.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;

    e.preventDefault();
    mouse.x = (pos.x / canvas.width) * 2 - 1;
    mouse.y = - (pos.y/ canvas.height) * 2 + 1;

    let vector = new THREE.Vector3(mouse.x, mouse.y, 0); // In camera space
    vector.unproject( global.camera );

    // Direction to point
    let dir = vector.sub( global.camera.position )
    dir.normalize();

    const p0 = global.camera.position; // Global camera position

    const n = new THREE.Vector3(0,0,0);
    global.camera.getWorldDirection(n);  // normale au plan

    const tI = ((p.clone().sub(p0)).dot(n) ) / ( dir.dot(n) );
    const pI = (dir.clone().multiplyScalar(tI)).add(p0); // le point d'intersection

    return pI;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}



function interpolate(p1, p2, alpha) {
    if (p1.isVector3) {
        return p1.clone().multiplyScalar(1 - alpha).add(p2.clone().multiplyScalar(alpha))
    } else {
        return (1 - alpha) * p1 + alpha * p2;
    }
}

function getVertex(object, index) {
    const positionAttribute = object.positions;

    let vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positionAttribute, index); // Rest pose local position
    object.mesh.boneTransform(index, vertex) // Find actual local position of the vertex (skinning) 
    vertex.applyMatrix4(object.mesh.matrix);
    //object.mesh.localToWorld(vertex); // World space

    return vertex;
}

// WRONG?
function getWorldQuaternion(object, bones, index) {
    let worldQ = new THREE.Quaternion();
    for (let i = index - 1; i >= 0; i--) {
        worldQ.multiply(bones[i].quaternion);
    }
    worldQ.multiply(object.mesh.quaternion);

    return worldQ;
}

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

function updateMatrix(object) {
    object.matrix.compose(object.position, object.quaternion, object.scale);
}


function compareNombres(a, b) {
    return a - b;
}

function getEffectorPositions(object, positions) {
    let effectorPos = [];
    let globalEffectorPos = [];
    for(let i = 0; i < positions.length; i++) {
        let newTarget = positions[i].clone();
        object.bones[0].localToWorld(newTarget); 
        object.bend(object.bones, newTarget);

        let newPos = object.bones[object.effector + 1].position.clone();
        newPos = worldPos(newPos, object, object.bones, object.effector);
        globalEffectorPos.push(newPos.clone());
        newPos = localPos(newPos, object, object.bones, 0);
        effectorPos.push(newPos);        
    }

    return effectorPos;
}

export { resize, computeAngleAxis, localDir, rotate, worldPos, localPos, project3D, 
    getRandomInt, interpolate, getVertex, getRotation, updateMatrix, 
    compareNombres, getEffectorPositions };