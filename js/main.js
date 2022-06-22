"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { loadScene } from './init.js'
import { getRotation, getVertex } from './utils.js';

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

// Initialize scene
loadScene(6);

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
        
            // TODO : récupérer info old time
            let new_speed = objects[k].getSpeed(objectTime, objects[k].effector + 1, objects[k].effector);
            let alpha = 0.05;
            objects[k].speed = new_speed.clone().multiplyScalar(alpha).add(objects[k].speed.clone().multiplyScalar(1 - alpha));

            
            objects[k].path.updateCurrentTime(objectTime);
            let newTarget = objects[k].path.currentPosition;
            objects[k].bones[0].localToWorld(newTarget); 
            objects[k].bend(objects[k].bones, newTarget);

            // TODO : Récupérer info current time et calculer own speeed et parent speed

            objects[k].ownVS(); // Utiliser own speed


            // Update targets
            updateChildren(objects[k], objectTime); // Utiliser parent speed
        }

        let alpha;
        if(objects[k].parent.object == null) {
            alpha = 0;
        } else {
            alpha = 0;
        }
        objects[k].blend(alpha);
    }
}

// Update children position/rotation wrt parent deformation (object is the parent)
function updateChildren(object, time) { 
    let speed = new THREE.Vector3();
    const alpha = 0.05;
    if (object.lengthPath != 0 && object.children.length != 0) {
        /*speed = object.getSpeed(time, object.bones[object.lengthBones - 1], object.bones[0]);
        speed.divideScalar(object.height); // Not height mais length bones */
        speed = object.getSpeed(time, 2, 1);
    }

    // Store local position of targets
    let localPos = [];
    for (let i = 0; i < targets.length; i++) {
        localPos.push(objects[1].bones[0].worldToLocal(targets[i].position.clone()));
    }


    //for(let k = 0; k < objects.length; k++) { // TODO: Adapt
        //if(objects[k].level == object.level + 1) {
        //if(objects[k].parent.object != null) {
    for(let k = 0; k < object.children.length; k++) { 
        let child = object.children[k];

        let vertex = getVertex(object, child.parent.anchor);
        let newRot = getRotation(object, child.parent.anchor);

        // Compute new position
        let newPos = child.parent.offsetPos.clone();
        newPos.applyQuaternion(newRot);
        newPos.add(vertex);
        child.mesh.worldToLocal(newPos); // Local space
        child.bones[0].position.set(newPos.x, newPos.y, newPos.z);


        // Compute new rotation
        newRot.multiply(child.parent.offsetQ);
        child.bones[0].setRotationFromQuaternion(newRot);
        child.bones[0].updateMatrixWorld(true);


        //if (object.lengthPath != 0) {
        child.parent.speed = speed.clone().multiplyScalar(alpha).add(child.parent.speed.clone().multiplyScalar(1 - alpha));
        //console.log(speed);
        child.parentVS();
            //}

            // Update target
        //}
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