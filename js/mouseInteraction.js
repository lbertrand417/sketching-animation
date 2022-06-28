"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials } from './materials.js';
import { unselectAll, updateSelection, addTarget } from './selection.js';
import { localPos, project3D, worldPos } from './utils.js';
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
        //console.log('timeline', parseInt(timeline.value))
        refTime = new Date().getTime() - parseInt(timeline.value);
        //refTime = new Date().getTime() - global.animation.currentTime;

        //console.log(intersectedObject[0].object)
        updateSelection(intersectedObject[0].object, event);
        updateTimeline();
        
        if(selectedObjects.length > 0) {
            // Reset
            //refTime = new Date().getTime();
            global.sketch.positions = [];
            global.sketch.timings = [];
            global.sketch.isClean = false;

            // Disable controls
            orbitControls.enabled = false;

            // Project on the plane in 3D space

            p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone();
            p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector);
            let pI = project3D(event, global.renderer.domElement, p);
            pI = localPos(pI, selectedObjects[0], selectedObjects[0].bones, 0);
            //selectedObjects[0].bones[0].worldToLocal(pI);

            global.sketch.positions.push(pI);
            let newT = new Date().getTime() - refTime;
            //console.log('new t', newT);
            global.sketch.timings.push(newT);
        }
    }

    if(intersectedParent != null && intersectedParent.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        console.log("intersected");
        p = parent.mesh.position.clone();
       
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
        global.animation.isAnimating = false;

        //console.log('move');
        event.preventDefault();

        let pI = project3D(event, global.renderer.domElement, p);

        let oldRootPos;
        if(selectedObjects[0].children.length != 0) {
            oldRootPos = selectedObjects[0].bones[2].position.clone();
            oldRootPos = worldPos(oldRootPos, selectedObjects[0], selectedObjects[0].bones, 1);
        }

        selectedObjects[0].bend(selectedObjects[0].bones, pI);
        //selectedObjects[0].updateVertices();

        let newRootPos;
        if(selectedObjects[0].children.length != 0) {
            newRootPos = selectedObjects[0].bones[2].position.clone();
            newRootPos = worldPos(oldRootPos, selectedObjects[0], selectedObjects[0].bones, 1);
        }

        pI = localPos(pI, selectedObjects[0], selectedObjects[0].bones, 0);
        //selectedObjects[0].bones[0].worldToLocal(pI);

        global.sketch.positions.push(pI);
        let newT = new Date().getTime() - refTime;
        //console.log('new t', newT);
        global.sketch.timings.push(newT);

        //if(selectedObjects[0].level == 0) {
        if(selectedObjects[0].children.length != 0) {
            let speed = selectedObjects[0].getSpeed(1, oldRootPos, newRootPos);
            updateChildren(selectedObjects[0], speed);
        }
    }

    if(intersectedParent != null && intersectedParent.length > 0) {
        //console.log('move');
        const pI = project3D(event, global.renderer.domElement, p);

        let axis = pI.clone().sub(parent.mesh.position.clone().add(posOffset)).normalize();
        let distance = parent.mesh.position.clone().add(posOffset).distanceTo(pI);

        console.log('1', )
        let oldRootPos = parent.bones[2].position.clone();
        oldRootPos = worldPos(oldRootPos, parent, parent.bones, 1);

        parent.mesh.translateOnAxis(axis, distance);
        parent.mesh.updateMatrixWorld(); // Important
        //parent.mesh.updateWorldMatrix(true, false);

        let newRootPos = parent.bones[2].position.clone();
        newRootPos = worldPos(oldRootPos, parent, parent.bones, 1);

        /*parent.restBones[0].position.setFromMatrixPosition(parent.bones[0].matrixWorld);
        parent.restBones[0].updateMatrixWorld(true);*/

        // TODO: Update trajectory

        // Update children TODO : Linear VS
        let speed = new THREE.Vector3();
        updateChildren(parent, speed);
    }

    if(intersectedTarget != null && intersectedTarget.length > 0) {
        const pI = project3D(event, global.renderer.domElement, p);

        intersectedTarget[0].object.position.set(pI.x, pI.y, pI.z);
        intersectedTarget[0].object.updateWorldMatrix(true, false);


        for(let k = 0; k < objects.length; k++) {
            if(objects[k].target === intersectedTarget[0].object) {
                addTarget(objects[k]);
            }
        }
    }

    // TODO : Optimize
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
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
            selectedObjects[0].display.updatePath();

            //selectedObjects[0].generateBuffers();

            // Start animation
            global.animation.isAnimating = true;
            global.animation.startTime = new Date().getTime();
        } else {
            global.sketch.positions = [...selectedObjects[0].path.positions];
            global.sketch.timings = [...selectedObjects[0].path.timings];
        }
    } 

    //console.log(global.sketch.timings);

    intersectedObject = null;
    intersectedParent = null;
    intersectedTarget = null;
}