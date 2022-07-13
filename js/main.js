"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { loadScene } from './init.js'
import { getRotation, getVertex, worldPos, localPos } from './utils.js';

// --------------- INIT ---------------

// Initalize renderer
global.renderer = new THREE.WebGLRenderer();
global.renderer.setSize(window.innerWidth, window.innerHeight);
//global.renderer.shadowMap.enabled = true;
document.body.appendChild(global.renderer.domElement); // renderer.domElement creates a canvas

// Initialize camera
global.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
global.camera.position.set(0, 0, 250);
global.camera.lookAt(0, 0, 0);

// Initialize scene
loadScene(6);



// Controls
const orbitControls = new OrbitControls(global.camera, global.renderer.domElement);
orbitControls.update();

// ------------------------------------

// --------------- ANIMATION ---------------

// Main animation loop
function animate() {
    
    // Animation
    if(global.animation.isAnimating) {
        // Update animation
        updateAnimation(global.animation.currentTime);

        // Update displays
        updateTimeline();
        for (let k = 0; k < objects.length; k++) {
            objects[k].display.updateLinks();
            objects[k].display.updatePath();
            objects[k].display.updateTiming();
        }
        //global.animation.isAnimating = false;

        global.animation.currentTime += 16;
    }

    for (let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthBones; i++) {
            objects[k].bones[i].updateWorldMatrix(false, false);
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
    for(let k = 0; k < objects.length; k++) { // Replace by a recursive call on the hierarchy??
        // If object animated, update its animation
        if(objects[k].lengthPath != 0) { 
            // Find the time in the object cycle
            let objectTime = currentTime;
            while (objectTime < objects[k].path.timings[0]) {
                objectTime += objects[k].lengthPath * 16;
            }

            while (objectTime > objects[k].path.timings[objects[k].lengthPath - 1]) {
                objectTime -= objects[k].lengthPath * 16;
            }

            //console.log('object Time', objectTime)
        
            // Old effector position
            let oldPos = objects[k].lbs[objects[k].effector + 1].position.clone();
            oldPos = worldPos(oldPos, objects[k], objects[k].lbs, objects[k].effector);

            let oldRootPos;
            if(objects[k].children.length != 0) {
                oldRootPos = objects[k].lbs[2].position.clone();
                oldRootPos = worldPos(oldRootPos, objects[k], objects[k].lbs, 1);
            }

            objects[k].path.updateCurrentTime(objectTime);
            let newTarget = objects[k].path.currentPosition;
            objects[k].bones[0].localToWorld(newTarget); 
            objects[k].bend(objects[k].bones, newTarget);
            objects[k].bend(objects[k].lbs, newTarget);

            let newPos = objects[k].lbs[objects[k].effector + 1].position.clone();
            newPos = worldPos(newPos, objects[k], objects[k].lbs, objects[k].effector);

            let newRootPos;
            if(objects[k].children.length != 0) {
                newRootPos = objects[k].lbs[2].position.clone();
                newRootPos = worldPos(newRootPos, objects[k], objects[k].lbs, 1);
            }


            let new_speed = objects[k].getSpeed(objects[k].effector, oldPos, newPos);
            let alpha = 0.05;
            objects[k].speed = new_speed.clone().multiplyScalar(alpha).add(objects[k].speed.clone().multiplyScalar(1 - alpha));

            
            if (objects[k].children.length == 0) {
                objects[k].ownVS(); // Utiliser own speed
            }


            // Update targets
            if(objects[k].children.length != 0) {
                let speed = objects[k].getSpeed(1, oldRootPos, newRootPos);
                //console.log('speed 2', speed.length())
                updateChildren(objects[k], speed); // Utiliser parent speed
            }
        }

        if(objects[k].parent.object == null) {
            objects[k].alpha = 0;
        } else {
            if (objects[k].path.lengthPath == 0) {
                objects[k].alpha = 1;
            } else {
                //console.log(objects[k].parent.speed.length())
                let newAlpha = objects[k].parent.speed.length() / 0.005;
                let a = 0.05;
                objects[k].alpha = a * newAlpha + (1 - a) * objects[k].alpha;

                if(objects[k].alpha > 1) {
                    objects[k].alpha = 1;
                }
                //console.log(objects[k].alpha);
            }
            //objects[k].alpha = 1;
        }
        
        objects[k].blend(); // Ne blend plus...
    }
}

// Update children position/rotation wrt parent deformation (object is the parent)
function updateChildren(object, speed) { 
    const alpha = 0.05;

    // Store local position of targets
    let localPosA = [];
    let oldWorldPosA = [];
    for (let i = 0; i < targets.length; i++) {
        let pos = targets[i].pos.clone();
        oldWorldPosA.push(pos.clone());
        pos = localPos(pos, objects[1], objects[1].bones, 0);
        localPosA.push(pos);
    }


    for(let k = 0; k < object.children.length; k++) { 
        let child = object.children[k];

        let vertex = getVertex(object, child.parent.anchor);
        let newRot = getRotation(object, child.parent.anchor);

        // Compute new position
        let newPos = child.parent.offsetPos.clone();
        newPos.applyQuaternion(newRot);
        newPos.add(vertex);
        newPos = localPos(newPos, child, child.bones, -1);
        child.bones[0].position.set(newPos.x, newPos.y, newPos.z);


        // Compute new rotation
        newRot.multiply(child.parent.offsetQ);
        child.bones[0].setRotationFromQuaternion(newRot);
        child.bones[0].updateWorldMatrix(false, false);


        child.parent.speed = speed.clone().multiplyScalar(alpha).add(child.parent.speed.clone().multiplyScalar(1 - alpha));
        child.parentVS();
    }

    // Update targets (Adapt?) --> Add VS on the target too?
    for (let i = 0; i < targets.length; i++) {
        let newPos = worldPos(localPosA[i], objects[1], objects[1].bones, 0);
        let speed = object.getSpeed(object.lengthBones - 1, oldWorldPosA[i], newPos);
        targets[i].speed = speed.clone().multiplyScalar(alpha).add(targets[i].speed.clone().multiplyScalar(1 - alpha));
        targets[i].pos = newPos.clone();
        //targets[i].parentVS();
        //targets[i].updateWorldMatrix(false, false);
    }

    /*for (let i = 0; i < objects.length; i++) {
        if(objects[i].hasTarget) {
            addTarget(objects[i]);
        }
    }*/


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