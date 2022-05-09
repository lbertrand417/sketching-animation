"use strict;"

// Import libraries
import * as THREE from 'three';
import { fromLocalToGlobal, getRandomInt } from './utils.js'
import { findEffector } from './mesh.js'

// Find position in the object path wrt a given timing
function findPosition(object, time) {
    // Find closest point in the timing array
    let i = 0;
    object.pathIndex = 0;
    while (i < object.lengthPath - 1) {
        if(time >= object.pathTimings[i] && time <= object.pathTimings[i + 1]) {
            object.pathIndex = i;
            i = object.lengthPath;
        } else {
            i++;
        }
    }

    // Interpolate
    let index = object.pathIndex;
    let alpha = (time - object.pathTimings[index]) / (object.pathTimings[index + 1] - object.pathTimings[index]);
    let position = object.pathPos[index].clone().multiplyScalar(1 - alpha).add(object.pathPos[index + 1].clone().multiplyScalar(alpha)); // Local position
    object.bones[0].localToWorld(position); // Global position
    
    return position;
}

// Paste the drawn path to the first selected object
function updatePath() {
    if(global.sketch.positions.length >= 2) {
        // Find the unwanted part at the beginning of the drawing (BUG!!)
        let id = 1;

        let v1 = global.sketch.positions[id - 1].clone().sub(global.sketch.positions[id]);
        let v2 = global.sketch.positions[id].clone().sub(global.sketch.positions[id + 1]);

        while (v1.dot(v2) > 0 && id < global.sketch.positions.length - 2) {
            id++;
            v1 = global.sketch.positions[id - 1].clone().sub(global.sketch.positions[id]);
            v2 = global.sketch.positions[id].clone().sub(global.sketch.positions[id + 1]);
        }

        // Remove the unwanted part from the path
        if (id != global.sketch.positions.length - 2) {
            for(let j = 0; j < id; j++) {
                global.sketch.positions.shift();
                global.sketch.timings.shift();
            }
        }

        // Copy the path to the first selected object
        selectedObjects[0].pathPos = [...global.sketch.positions];
        selectedObjects[0].pathTimings = [...global.sketch.timings];

        // Create a cycle with the path
        for (let i = global.sketch.timings.length - 2; i >= 0; i--) {
            selectedObjects[0].pathPos.push(selectedObjects[0].pathPos[i].clone());
            selectedObjects[0].pathTimings.push(selectedObjects[0].pathTimings[selectedObjects[0].lengthPath - 1] + (global.sketch.timings[i + 1] - global.sketch.timings[i]));
        }

        // Display path
        let globalPos = fromLocalToGlobal(selectedObjects[0].pathPos, selectedObjects[0].bones[0]);
        selectedObjects[0].pathDisplay.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);

        // Update timeline 
        timeline.min = selectedObjects[0].pathTimings[0];
        timeline.max = selectedObjects[0].pathTimings[selectedObjects[0].lengthPath - 1];
    }

    // Start animation
    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();
}

// Paste path of the first selected object to the other selected objects
function pastePath(e) {
    console.log('paste');
    for(let k = 1; k < selectedObjects.length; k++) {
            // Paste information of the selected object
            selectedObjects[k].pathPos = [];
            selectedObjects[k].pathTimings = [...selectedObjects[0].pathTimings];
            selectedObjects[k].pathStart = selectedObjects[0].pathStart; // Bug
            selectedObjects[k].path.index = selectedObjects[0].path.index;
            //selectedObjects[k].path.effector = selectedObjects[0].path.effector; // Replace with closest effector

            // Put positions in local space
            let scale = selectedObjects[k].height / selectedObjects[0].height; // scale
            for(let i = 0; i < selectedObjects[0].path.positions.length; i++) {
                // Retrieve local position (wrt root of original object)
                let localPos = selectedObjects[0].path.positions[i].clone();

                // Scale the path
                localPos.multiplyScalar(scale);
                selectedObjects[k].path.positions.push(localPos); 
            }

            selectedObjects[k].path.effector = findEffector(selectedObjects[k], scale);

        // Print 3D path
        if(selectedObjects[k].path.positions.length != 0) {
            console.log("print");
            let globalPos = fromLocalToGlobal(selectedObjects[k].path.positions, selectedObjects[k].bones[0])
            selectedObjects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
        }
    }
}

// Add a random timing offset to all selected objects
function offsetTiming(event) {
    for(let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = getRandomInt(0, selectedObjects[k].path.timings[selectedObjects[k].path.timings.length - 1]);
        selectedObjects[k].path.timings = selectedObjects[k].path.timings.map( function(value) { 
            return value + randomOffset; 
        } );
    }

    // Update the timeline wrt the first selected object
    if (selectedObjects.length != 0) {
        timeline.min = selectedObjects[0].path.timings[0];
        timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
    }
}

// Add a random rotation offset (around the rest pose axis) to all selected objects
function offsetOrientation(event) {
    for(let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = Math.random() * Math.PI * 2;

        let length = (selectedObjects[k].path.positions.length - 1) / 2 + 1;
        for(let i = 0; i < selectedObjects[k].path.positions.length ; i++) {
            let localPos = selectedObjects[k].path.positions[i].clone();
            localPos.applyAxisAngle(selectedObjects[k].restAxis, randomOffset );
            selectedObjects[k].path.positions[i] = localPos;
        }

        // Update path display
        let globalPos = fromLocalToGlobal(selectedObjects[k].path.positions, selectedObjects[k].bones[0]);
        selectedObjects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }
}

function targetPath(object) {
    let dt = 2 * Math.PI / 50;
    let theta = 0;
    let distances = [];
    while (theta < 2 * Math.PI) {
        let localPos = object.path.positions[Math.floor(object.path.positions.length / 2)].clone();
        localPos.applyAxisAngle(object.restAxis, theta);
        let distance = object.bones[0].localToWorld(localPos).distanceTo(object.path.target.position);
        distances.push(distance);
        theta += dt;
    }

    console.log(distances);

    const min = Math.min(...distances);
    const index = distances.indexOf(min);
    theta = index * dt;

    for(let i = 0; i < object.path.positions.length ; i++) {
        let localPos = object.path.positions[i].clone();
        localPos.applyAxisAngle(object.restAxis, theta);
        object.path.positions[i] = localPos;
    }

    // Update path display
    let globalPos = fromLocalToGlobal(object.path.positions, object.bones[0]);
    object.display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
}

export { findPosition, updatePath, pastePath, offsetTiming, offsetOrientation, targetPath }