"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials } from './materials.js';
import { Vector3 } from 'three';
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

// Initialize material
/*materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034, transparent: true, opacity: 0.5 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4, transparent: true, opacity: 0.5}),
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
};*/

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
            objects[k].updateLinksDisplay();
            objects[k].updatePathDisplay();
            objects[k].updateTimingDisplay();
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
    for(let k = 0; k < objects.length; k++) {
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
        
            let new_speed = objects[k].getSpeed(objectTime, objects[k].bones[objects[k].effector + 1], objects[k].bones[objects[k].effector]);
            let alpha = 0.05;
            objects[k].speed = new_speed.clone().multiplyScalar(alpha).add(objects[k].speed.clone().multiplyScalar(1 - alpha));

            
            objects[k].path.updateCurrentTime(objectTime);
            let newTarget = objects[k].path.currentPosition;
            objects[k].bones[0].localToWorld(newTarget); 
            objects[k].updateBones(newTarget);
            objects[k].ownVS();

            if (objects[k].level == 0) {
                updateChildren(parent, objectTime);
            }
        }

        let alpha;
        if(objects[k].level == 0) {
            alpha = 0;
        } else {
            alpha = 0.5;
        }
        objects[k].blend(alpha);
    }
}

// Update children position/rotation wrt parent deformation (object is the parent)
function updateChildren(object, time) { 
    let speed = new THREE.Vector3();
    const alpha = 0.05;
    if (object.lengthPath != 0) {
        /*speed = object.getSpeed(time, object.bones[object.lengthBones - 1], object.bones[0]);
        speed.divideScalar(object.height); // Not height mais length bones */
        speed = object.getSpeed(time, object.bones[2], object.bones[1]);
    }

    // Store local position of targets
    let localPos = [];
    for (let i = 0; i < targets.length; i++) {
        localPos.push(objects[1].bones[0].worldToLocal(targets[i].position.clone()));
    }


    for(let k = 0; k < objects.length; k++) { // TODO: Adapt
        if(objects[k].level == object.level + 1) {
            let vertex = getVertex(object, objects[k].parent.index);
            let newRot = getRotation(object, objects[k].parent.index);

            // Compute new position
            let newPos = objects[k].parent.offsetPos.clone();
            newPos.applyQuaternion(newRot);
            newPos.add(vertex);
            objects[k].mesh.worldToLocal(newPos); // Local space
            objects[k].bones[0].position.set(newPos.x, newPos.y, newPos.z);


            // Compute new rotation
            newRot.multiply(objects[k].parent.offsetQ);
            objects[k].bones[0].setRotationFromQuaternion(newRot);
            objects[k].bones[0].updateMatrixWorld(true);


            //if (object.lengthPath != 0) {
                objects[k].parentSpeed = speed.clone().multiplyScalar(alpha).add(objects[k].parentSpeed.clone().multiplyScalar(1 - alpha));
                //console.log(speed);
                objects[k].parentVS();
            //}

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