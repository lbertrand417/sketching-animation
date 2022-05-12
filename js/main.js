"use strict;"

// Import libraries
import * as THREE from 'three';
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

// Main animation loop
function animate() {
    
    // Animation
    if(global.animation.isAnimating) {
        let currentTime = new Date().getTime() - global.animation.startTime; // Time since animation is started
        // TODO: restart startTime when attaining max timing
        //console.log('currentTime', currentTime);

        // Reset timeline if no object selected
        /*if(selectedObjects.length == 0) {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
        // else find the time in the timeline wrt to currentTime
        } else {
            let timelineValue = currentTime;
            while (timelineValue < parseInt(timeline.min)) {
                timelineValue += parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }
            while (timelineValue > parseInt(timeline.max)) {
                timelineValue -= parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }

            timeline.value = timelineValue;
        }*/

        // Update animation
        updateAnimation(currentTime);
        updateTimeline();
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
            //let new_pos = findPosition(objects[k], objectTime);
            objects[k].path.updateCurrentState(objectTime);
            let new_pos = objects[k].path.currentPosition;
            objects[k].bones[0].localToWorld(new_pos);


            // Display target
            objects[k].timingDisplay.geometry = new THREE.BufferGeometry().setFromPoints([new_pos]);

            // Update bones
            let worldRotation = computeAngleAxis(objects[k], new_pos);
            updateBones(objects[k], worldRotation);

            // Update children if parent mesh
            if(objects[k].level == 0) {
                updateChildren(objects[k]);
            }
        }
    }
}

// Update bones and joints display
function updateDisplay(object) {
    // Update bones
    for(let i = 0; i < object.lengthBones; i++) {
        object.bones[i].updateMatrixWorld(true);
    }
    
    // Update joints display
    for(let i = 0; i < object.lengthLinks; i++) {
        object.links[i].position.setFromMatrixPosition(object.bones[i+1].matrixWorld);
    }
    object.root.position.setFromMatrixPosition(object.bones[0].matrixWorld);
}

// Update bones of the object (deformation), knowing the global rotation
function updateBones(object, worldRotation) {

    for(let i = 1; i <= object.effector; i++) {
        // Put axis in parent space
        let parentBone = object.bones[i-1];
        let parentPos = new THREE.Vector3();
        let invParentQ = new THREE.Quaternion();
        let parentScale = new THREE.Vector3();
        parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
        invParentQ.invert();
        let localAxis = worldRotation.axis.clone().applyQuaternion(invParentQ);

        // Compute quaternion
        // On peut parametrer les angles mais il faut que sum(theta_i) = theta
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(localAxis, worldRotation.angle / object.effector);
        object.bones[i].applyQuaternion(q);
    }

    // Update display
    updateDisplay(object);
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
                    //object.mesh.skeleton.bones[boneIndex].getWorldQuaternion(boneQ);
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
                
            // Update display
            updateDisplay(objects[k]);

            // Update path display
            objects[k].updatePathDisplay();
        }
    }

    for (let i = 0; i < targets.length; i++) {
        let newPos = objects[1].bones[0].localToWorld(localPos[i]);
        targets[i].position.set(newPos.x, newPos.y, newPos.z);
    }

}

function updateTimeline() {
    if(selectedObjects.length > 0 && selectedObjects[0].lengthPath > 0) {
        //let currentState = selectedObjects[0].findCurrentState(time);
        timeline.min = selectedObjects[0].path.timings[0];
        timeline.max = selectedObjects[0].path.timings[selectedObjects[0].lengthPath - 1];
        //timeline.value = currentState
        timeline.value = selectedObjects[0].path.currentTime;
        /*console.log("max", timeline.max);
        console.log("value", timeline.value)*/
    } else {
        timeline.min = 0;
        timeline.max = 0;
        timeline.value = 0;
    }
    //timeline.value = value;
}
// -------------------------------------------


export { orbitControls, updateAnimation, updateDisplay, updateBones, updateChildren, updateTimeline };