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

function computeAngleAxis(object, target) {
    // Retrieve root bone info
    //let rootBone = object.bones[0];
    let rootBone = object.restBones[0];
    let rootPos = new THREE.Vector3();
    let invRootQ = new THREE.Quaternion();
    let rootScale = new THREE.Vector3();
    rootBone.matrixWorld.decompose(rootPos, invRootQ, rootScale);
 
    // Get world rotation vectors
    let n = target.clone().sub(rootPos);
    n.normalize();
    let t = new THREE.Vector3();
    //console.log(object.lengthBones - 1)
    //console.log('effector', object.effector)
    //t.setFromMatrixPosition(object.bones[object.effector + 1].matrixWorld);
    t.setFromMatrixPosition(object.restBones[object.effector + 1].matrixWorld);
    t.sub(rootPos);
    t.normalize();
 
    // Compute rotation axis
    let axis = new THREE.Vector3();
    axis.crossVectors(t, n);
    axis.normalize();

    //console.log('great axis', axis)
 
    // Compute world rotation angle
    let angle = t.dot(n);
    angle = Math.acos(angle);

    console.log('angle', angle * 180 / Math.PI)
 
    return { angle, axis };
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


export { resize, computeAngleAxis, fromLocalToGlobal, project3D, getRandomInt };