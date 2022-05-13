"use strict;"

// Import libraries
import * as THREE from 'three';
import { unselectAll, updateSelection, addTarget } from './selection.js';
import { computeAngleAxis, project3D } from './utils.js';
import { orbitControls, updateChildren, updateTimeline } from './main.js';

global.renderer.domElement.addEventListener('mousedown', selectObject);
global.renderer.domElement.addEventListener('mousemove', moveObject);
global.renderer.domElement.addEventListener('mouseup', unselectObject);


let refTime = new Date().getTime();
let intersectedObject = null;
let intersectedParent = null;
let intersectedTarget = null;
let posOffset = new THREE.Vector3();

let p = new THREE.Vector3(); // Point in the plane

function selectObject(event) {
    console.log('select');
    event.preventDefault();

    let rect = global.renderer.domElement.getBoundingClientRect();

    let pos = { x: 0, y: 0 }; // last known position
    pos.x = event.clientX - rect.left;
    pos.y = event.clientY - rect.top;

    let mouse = {x: 0, y: 0}; // mouse position
    mouse.x = (pos.x / global.renderer.domElement.width) * 2 - 1;
    mouse.y = - (pos.y/ global.renderer.domElement.height) * 2 + 1;
    let mouse3D = new THREE.Vector3(mouse.x, mouse.y, 0);

    let raycaster =  new THREE.Raycaster();                                        
    raycaster.setFromCamera( mouse3D, global.camera );

    if(targets.length != 0) {
        intersectedTarget = raycaster.intersectObjects(targets);
    }

    if(selectableObjects != null && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedObject = raycaster.intersectObjects(selectableObjects);
    }

    if(parent != null && (intersectedObject == null || intersectedObject.length == 0) && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedParent = raycaster.intersectObject(parent.mesh);
    }


    if (intersectedObject != null && intersectedObject.length > 0 && event.button == 0) {
        updateSelection(intersectedObject[0].object, event);
        updateTimeline();
        
        if(selectedObjects.length > 0) {
            // Reset
            refTime = new Date().getTime();
            global.sketch.positions = [];
            global.sketch.timings = [];
            global.sketch.isClean = false;

            // Disable controls
            orbitControls.enabled = false;

            // Project on the plane in 3D space
            p.setFromMatrixPosition(selectedObjects[0].links[selectedObjects[0].effector].matrixWorld); // Stay in the plane
            const pI = project3D(event, global.renderer.domElement, p);
            selectedObjects[0].bones[0].worldToLocal(pI);

            global.sketch.positions.push(pI);
            global.sketch.timings.push(new Date().getTime() - refTime);
        }
    }

    if(intersectedParent != null && intersectedParent.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        console.log("intersected");
        p.setFromMatrixPosition(parent.mesh.matrixWorld);
        let pos3D = project3D(event, global.renderer.domElement, p);

        posOffset = pos3D.clone().sub(parent.mesh.position);
    }

    if(intersectedTarget != null && intersectedTarget.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        p = intersectedTarget[0].object.position.clone();
    }

    // Unselect objects
    if(event.button == 2) {
        unselectAll();
        updateTimeline();
    }
}

function moveObject(event) {
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey){
        console.log('move');
        event.preventDefault();

        const pI = project3D(event, global.renderer.domElement, p);

        let worldRotation = computeAngleAxis(selectedObjects[0], pI);
        selectedObjects[0].updateBones(worldRotation);

        selectedObjects[0].bones[0].worldToLocal(pI);

        global.sketch.positions.push(pI);
        global.sketch.timings.push(new Date().getTime() - refTime);

        if(selectedObjects[0].level == 0) {
            updateChildren(selectedObjects[0]);
        }
    }

    if(intersectedParent != null && intersectedParent.length > 0) {
        console.log('move');
        const pI = project3D(event, global.renderer.domElement, p);

        let axis = pI.clone().sub(parent.mesh.position.clone().add(posOffset)).normalize();
        let distance = parent.mesh.position.clone().add(posOffset).distanceTo(pI);

        parent.mesh.translateOnAxis(axis, distance);
        parent.mesh.updateMatrixWorld();

        // TODO: Update trajectory

        // Update children
        updateChildren(parent);
    }

    if(intersectedTarget != null && intersectedTarget.length > 0) {
        const pI = project3D(event, global.renderer.domElement, p);

        intersectedTarget[0].object.position.set(pI.x, pI.y, pI.z);


        for(let k = 0; k < objects.length; k++) {
            if(objects[k].target === intersectedTarget[0].object) {
                addTarget(objects[k]);
            }
        }
    }

    for(let k = 0; k < objects.length; k++) {
        objects[k].updateLinksDisplay();
        objects[k].updatePathDisplay();
    }
}


function unselectObject(event) {
    console.log("unselect");
    orbitControls.enabled = true;
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey) {
        intersectedObject = null;
        
        if (global.sketch.positions.length > 1) {
            selectedObjects[0].path.update(global.sketch.positions, global.sketch.timings);

            // Display path
            selectedObjects[0].updatePathDisplay();

            // Start animation
            global.animation.isAnimating = true;
            global.animation.startTime = new Date().getTime();
        } else {
            global.sketch.positions = [...selectedObjects[0].path.positions];
            global.sketch.timings = [...selectedObjects[0].path.timings];
        }
    } 

    intersectedObject = null;
    intersectedParent = null;
    intersectedTarget = null;
}