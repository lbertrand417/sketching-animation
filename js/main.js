"use strict;"

// Import libraries
import * as THREE from 'three';
import { Vector2, Vector3 } from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { loadScene, findCorrespondences } from './init.js'
import { computeAngleAxis } from './utils.js';

// --------------- INIT ---------------

// Initalize renderer
global.renderer = new THREE.WebGLRenderer();
global.renderer.setSize(window.innerWidth, window.innerHeight);
global.renderer.shadowMap.enabled = true;
document.body.appendChild(global.renderer.domElement); // renderer.domElement creates a canvas

// Initialize camera
global.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
global.camera.position.set(0, 0, 250);
global.camera.lookAt(0, 0, 0);

// Initialize material
materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034, transparent: true, opacity: 0.8 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4 }),
    selectedBis : new THREE.MeshPhongMaterial( { color: 0x1246bf }),
    effector : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x88ff88 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    links : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x8888ff ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    root : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0xff8888 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    unselectedpath : new THREE.LineBasicMaterial( { color: 0x0000ff }),
    timing : new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
};

// Initialize scene
loadScene(2);
findCorrespondences();

// Controls
const orbitControls = new OrbitControls(global.camera, global.renderer.domElement);
orbitControls.update();

// ------------------------------------




// --------------- ANIMATION ---------------

//let dt = new Date().getTime();
// Main animation loop
function animate() {
    
    // Animation
    if(global.animation.isAnimating) {
        //console.log(new Date().getTime() - dt);
        //dt = new Date().getTime();
        let currentTime = new Date().getTime() - global.animation.startTime; // Time since animation is started
        // TODO: restart startTime when attaining max timing

        // Update animation
        updateAnimation(currentTime);

        // Update displays
        updateTimeline();
        for (let k = 0; k < objects.length; k++) {
            //objects[k].updateLinksDisplay();
            objects[k].updatePathDisplay();
            objects[k].updateTimingDisplay();
        }
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    global.renderer.render(global.scene, global.camera);
}
animate();

// ---------------------------------------


// --------------- UPDATE FUNCTIONS ---------------

// Update the animation
function updateAnimation(currentTime) {    
    // BETTER TO DO IN MULTIPLE STEPS
    // 1) Bending update
    // 2) Update mass-spring system (use actual effector position or constraint?)
    // 3) Mass-spring "bending"
    // 4) Blend both quaternions
    for(let k = 0; k < objects.length; k++) {
        // If object animated, update its animation
        if(objects[k].lengthPath != 0) { 
            // Find the time in the object cycle
            let objectTime = currentTime;
            while (objectTime < objects[k].path.timings[0]) {
                objectTime += objects[k].path.timings[objects[k].lengthPath - 1] - objects[k].path.timings[0] + 1;
            }

            while (objectTime > objects[k].path.timings[objects[k].lengthPath - 1]) {
                objectTime -= objects[k].path.timings[objects[k].lengthPath- 1] - objects[k].path.timings[0] + 1;
            }

            // Find position on the path wrt timing
            objects[k].path.updateCurrentState(objectTime);
            let new_pos = objects[k].path.currentPosition;
            //console.log(objects[k].path.currentAcceleration)
            //console.log(objects[k].path.currentAcceleration.length())
            objects[k].bones[0].localToWorld(new_pos);

            // Update bones
            let worldRotation = computeAngleAxis(objects[k], new_pos);
            let quaternions = objects[k].updateBones(worldRotation);


            //objects[k].updateForces(objects[k].path.currentAcceleration);
            //console.log('original', objects[k].path.currentAcceleration);
            //console.log('original', objects[k].path.currentAcceleration.length());
            //console.log('x100', objects[k].path.currentAcceleration.clone().multiplyScalar(100));
            for (let i = 0; i < 50; i++) {
                
                //objects[k].updateForces(objects[k].path.currentAcceleration);
                objects[k].updateForces(new Vector3(0,0,0));
                objects[k].updatePV(new_pos);
                //objects[k].updatePV(new THREE.Vector3(0, 20, 0));
            }
            objects[k].updateBones2(quaternions);
            


            // Update children if parent mesh
            /*if(objects[k].level == 0) {
                updateChildren(objects[k]);
            }*/
        }
    }
}

// Update children position/rotation wrt parent deformation
function updateChildren(object) { 
    const positionAttribute = object.positions;
    let vertex = new THREE.Vector3();
    let skinWeight = new THREE.Vector4();
    let skinIndex = new THREE.Vector4();

    // Store local position of targets
    let localPos = [];
    for (let i = 0; i < targets.length; i++) {
        localPos.push(objects[1].bones[0].worldToLocal(targets[i].position.clone()));
    }


    for(let k = 0; k < objects.length; k++) { // TODO: Adapt
        if(objects[k].level == object.level + 1) {

            vertex.fromBufferAttribute(positionAttribute, objects[k].parent.index); // Rest pose local position

            skinIndex.fromBufferAttribute( object.skinIndex, objects[k].parent.index );
            skinWeight.fromBufferAttribute( object.skinWeight, objects[k].parent.index );

            // Compute the rotation of the vertex in world space
            let newRot = new THREE.Quaternion(0, 0, 0, 0); // World space
            for (let i = 0; i < 4; i++) {
                let weight = skinWeight.getComponent(i);

                if(weight != 0) {
                    
                    let boneIndex = skinIndex.getComponent(i);
                    
                    let boneQ = new THREE.Quaternion();
                    object.bones[boneIndex].getWorldQuaternion(boneQ);
                    boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
                    newRot.set(newRot.x + boneQ.x, newRot.y + boneQ.y, newRot.z + boneQ.z, newRot.w + boneQ.w);
                }
            }
            newRot.normalize();

            object.mesh.boneTransform(objects[k].parent.index, vertex) // Find actual local position of the vertex (skinning) 
            vertex = object.mesh.localToWorld(vertex.clone()); // World space

            // Rotate the translation offset
            let rotatedOffset = objects[k].parent.offsetPos.clone();
            rotatedOffset.applyQuaternion(newRot);

            // Compute new position
            let newPos = vertex.clone().sub(rotatedOffset); // Global space
            objects[k].mesh.worldToLocal(newPos); // Local space
            objects[k].bones[0].position.set(newPos.x, newPos.y, newPos.z); 

            // Compute new rotation
            newRot.multiply(objects[k].parent.offsetQ);
            objects[k].bones[0].setRotationFromQuaternion(newRot);

            // Update target
        }
    }

    // Update targets (Adapt?)
    for (let i = 0; i < targets.length; i++) {
        let newPos = objects[1].bones[0].localToWorld(localPos[i]);
        targets[i].position.set(newPos.x, newPos.y, newPos.z);
    }

}

function updateTimeline() {
    if(selectedObjects.length > 0 && selectedObjects[0].lengthPath > 0) {
        timeline.min = selectedObjects[0].path.timings[0];
        timeline.max = selectedObjects[0].path.timings[selectedObjects[0].lengthPath - 1];
        timeline.value = selectedObjects[0].path.currentTime;
    } else {
        timeline.min = 0;
        timeline.max = 0;
        timeline.value = 0;
    }
}
// -------------------------------------------


export { orbitControls, updateAnimation, updateChildren, updateTimeline };