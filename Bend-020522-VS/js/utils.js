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
    // Retrieve root bone info
    let rootPos = new THREE.Vector3();
    rootPos.setFromMatrixPosition(origin.matrixWorld)
 
    // Get world rotation vectors
    let n = target.clone().sub(rootPos);
    n.normalize();
    let t = new THREE.Vector3();
    t.copy(effector);
    t.sub(rootPos);
    t.normalize();
 
    // Compute rotation axis
    let axis = new THREE.Vector3();
    axis.crossVectors(t, n);
    axis.normalize();
 
    // Compute world rotation angle
    let angle = t.dot(n);
    angle = Math.acos(angle);
 
    return { angle, axis };
}

// Put global axis in local space 
function getLocal(global, space) {
    // Put axis in parent space
    let parentBone = space;
    let parentPos = new THREE.Vector3();
    let invParentQ = new THREE.Quaternion();
    let parentScale = new THREE.Vector3();
    parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
    invParentQ.invert(); // Why?
    let local = global.clone().applyQuaternion(invParentQ);

    return local;
}

function fromLocalToGlobal(positions, space) {
    let globalPos = [];
    for(let i = 0; i < positions.length; i++) {
        let p = positions[i].clone();
        globalPos.push(space.localToWorld(p));
    }
    return globalPos;
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

// Find closest point in an array (return i st value in [array[i], array[i+1]])
function findInArray(value, array) {
    let i = 0;
    let alpha = 0;
    while (i < array.length - 1) {
        if(value >= array[i] && value <= array[i + 1]) {
            alpha = (value - array[i]) / (array[i + 1] - array[i]);
            return { i, alpha };
        } else {
            i++;
        }
    }
    i = array.length - 1;
    return { i, alpha };
}

function interpolate(p1, p2, alpha) {
    if (p1.isVector3) {
        return p1.clone().multiplyScalar(1 - alpha).add(p2.clone().multiplyScalar(alpha))
    } else {
        return (1 - alpha) * p1 + alpha * p2;
    }
}


export { resize, computeAngleAxis, getLocal, fromLocalToGlobal, project3D, getRandomInt, findInArray, interpolate };