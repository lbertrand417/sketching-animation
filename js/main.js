"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { settings } from './gui.js';
import { loadScene } from './init.js'
import { MyObject } from './myObject.js';
import { getRotation, getVertex, worldPos, localPos } from './utils.js';

// --------------- INIT ---------------

// Initalize renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement); // renderer.domElement creates a canvas

// Initialize camera
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 0, 350);
camera.lookAt(0, 50, 0);

// Initialize scene
loadScene(settings.scenes);

// Controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.update();

// ------------------------------------

// --------------- ANIMATION ---------------

// Main animation loop
function animate() {
    
    // Animation
    if(animation.isAnimating) {
        // Store local position of targets
        let localPosA = [];
        for (let i = 0; i < targets.length; i++) {
            let pos = targets[i].pos.clone(); // World position
            pos = localPos(pos, objects[1], objects[1].bones, 0); // Local position
            localPosA.push(pos);
        }

        // Update animation
        updateAnimation(animation.currentTime, root);

        // Update targets position
        for (let i = 0; i < targets.length; i++) {
            let newPos = worldPos(localPosA[i], objects[1], objects[1].bones, 0);
            targets[i].pos = newPos.clone();
        }

        // Update displays
        updateTimeline();
        for (let k = 0; k < objects.length; k++) {
            objects[k].display.updateLinks();
            objects[k].display.updatePath();
            objects[k].display.updateTiming();
        }
        //animation.isAnimating = false; // For debugging purposes

        animation.currentTime += 16;
    }

    // Update matrices
    for (let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthBones; i++) {
            objects[k].bones[i].updateWorldMatrix(false, false);
        }
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
}
animate();

// ---------------------------------------


// --------------- UPDATE FUNCTIONS ---------------

// Recursive animation
/**
 * Recursive function that updates an object and its children
 * @param {number} currentTime - Current time of the animation
 * @param {MyObject} object - Object to be updated
 */
function updateAnimation(currentTime, object) {

    // --------------- DEFORM OBJECT ---------------

    // Retrieve the bone pos of the object (old because object not updated yet)
    // (used to compute the speed at the root of the object)
    let oldBonePos = object.lbs[2].position.clone(); // Local position
    oldBonePos = worldPos(oldBonePos, object, object.lbs, 1); // World position

    let newBonePos; // Store the new bone position

    // Update current object
    if(object.lengthPath != 0) { 
        // --------------- Find the time in the object cycle ---------------
        /* For each object only one cycle is stored but "current time" is a linear value
        so we must find the "object time", proper to an object, which give the time in the cycle. */
        let objectTime = currentTime;

        // TODO: Put this part in updateCurrentTime function?
        while (objectTime < object.path.timings[0]) {
            objectTime += object.lengthPath * 16;
        }

        while (objectTime > object.path.timings[object.lengthPath - 1]) {
            objectTime -= object.lengthPath * 16;
        }
        object.path.updateCurrentTime(objectTime);

        // --------------- Update LBS + VS ---------------
    
        // Old effector position (used to compute speed at effector)
        let oldEffectorPos = object.lbs[object.effector + 1].position.clone(); // Local position
        oldEffectorPos = worldPos(oldEffectorPos, object, object.lbs, object.effector); // World position

        // Retrieve target
        let newTarget = object.path.currentPosition; // New local position in the input stroke
        object.bones[0].localToWorld(newTarget); // World position

        // Bend the object towards the target
        object.bend(object.bones, newTarget);
        object.bend(object.lbs, newTarget);

        // New effector position
        let newEffectorPos = object.lbs[object.effector + 1].position.clone(); // Local position
        newEffectorPos = worldPos(newEffectorPos, object, object.lbs, object.effector); // World position

        // Compute speed at effector position
        let new_speed = object.getSpeed(object.effector, oldEffectorPos, newEffectorPos);
        let alpha = 0.05;
        object.speed = new_speed.clone().multiplyScalar(alpha).add(object.speed.clone().multiplyScalar(1 - alpha));

        // Don't apply velocity skinning if the object is the main body
        if (object.parent.object != null) {
            object.ownVS();
        }
    }

    // --------------- Blend between object deformation (LBS + VS) and hiearchical VS (h-VS) deformation ---------------
    // TODO: Must be improved because threshold is chosen arbitrarly

    // Don't apply hierarchical VS on the main body (root of the hierarchy) or when h-VS deactivated
    if(object.parent.object == null || !settings.parentVS) { 
        object.alpha = 0;
    } else {
        if (object.lengthPath == 0) { // If no input, only h-VS
            object.alpha = 1;
        } else {
            // TODO: improve the computation of alpha (blending parameter)
            let newAlpha = object.parent.speed.length() / 0.001; 
            let a = 0.2;
            object.alpha = a * newAlpha + (1 - a) * object.alpha;

            if(object.alpha > 0.7) {
                object.alpha = 0.7;
            }
            object.alpha = 0; // Uncomment to deactivate the blending
        }
    }
    object.blend();

    // Retrieve the new bone pos 
    newBonePos = object.lbs[2].position.clone();
    newBonePos = worldPos(newBonePos, object, object.lbs, 1);

    // --------------- UPDATE CHILDREN ---------------

    if(object.children.length != 0) {
        // Compute speed at the root of the object (the parent of the children)
        let speed = object.getSpeed(1, oldBonePos, newBonePos); 

        // Update children's rigid position/rotation
        updateChildren(object, speed);

        // Update children deformation
        for(let k = 0; k < object.children.length; k++) {
            updateAnimation(currentTime, object.children[k])
        }
    }
}
    
/**
 * Update the position/rotation (rigid transformation) of all the children of the object
 * @param {MyObject} object - Parent whose children are transformed
 * @param {THREE.Vector3} speed - Speed at the root bone of the object (i.e. parent)
 */
function updateChildren(object, speed) { 
    const alpha = 0.05;

    for(let k = 0; k < object.children.length; k++) { 
        let child = object.children[k];

        // Retrieve info of the correspondence
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

        // Update speed for h-VS (based on speed at the root of the parent)
        child.parent.speed = speed.clone().multiplyScalar(alpha).add(child.parent.speed.clone().multiplyScalar(1 - alpha));

        // Apply h-VS
        child.parentVS();
    }
}

/**
 * Update the timeline based on the cycle of the first selected object.
 */
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