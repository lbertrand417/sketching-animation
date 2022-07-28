"use strict;"

// Import libraries
import * as THREE from 'three';
import { unselectAll, updateSelection, addTarget, retrieveObject } from './selection.js';
import { localPos, project3D, worldPos, fromLocalToGlobal } from './utils.js';
import { orbitControls, updateChildren, updateTimeline } from './main.js';
import { materials } from './materials.js';

global.renderer.domElement.addEventListener('mousedown', selectObject);
global.renderer.domElement.addEventListener('mousemove', moveObject);
global.renderer.domElement.addEventListener('mouseup', unselectObject);


let refTime = new Date().getTime();
let intersectedObject = null;
let intersectedParent = null;
let intersectedTarget = null;
let posOffset = new THREE.Vector3();

let p = new THREE.Vector3(); // Point in the plane
let lineGeometry = new THREE.BufferGeometry().setFromPoints([]);
let drawingLine = new THREE.Line(lineGeometry, materials.unselectedpath.clone());
drawingLine.geometry.dynamic = true;
global.scene.add(drawingLine);

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
        let meshTargets = [];
        for (let i = 0; i < targets.length; i++) {
            meshTargets.push(targets[i].mesh);
        }
        
        console.log(meshTargets);
        intersectedTarget = raycaster.intersectObjects(meshTargets);
    }

    if(selectableObjects != null && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedObject = raycaster.intersectObjects(selectableObjects);
    }

    if(root != null && (intersectedObject == null || intersectedObject.length == 0) && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedParent = raycaster.intersectObject(root.mesh);
    }


    if (intersectedObject != null && intersectedObject.length > 0 && event.button == 0) {
        refTime = new Date().getTime() - parseInt(timeline.value);

        updateSelection(intersectedObject[0].object, event);
        updateTimeline();
        
        if(selectedObjects.length > 0) {
            //let newT = new Date().getTime() - refTime;

            // Reset
            global.sketch.positions = [];
            global.sketch.timings = [];
            global.sketch.isClean = false;

            // Disable controls
            orbitControls.enabled = false;

            // Project on the plane in 3D space
            p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone();
            p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector);
        }
    }

    if(intersectedParent != null && intersectedParent.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        console.log("intersected");
        p = root.mesh.position.clone();
       
        let pos3D = project3D(event, global.renderer.domElement, p);

        posOffset = pos3D.clone().sub(root.mesh.position);
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

        event.preventDefault();

        let pI = project3D(event, global.renderer.domElement, p);

        let oldRootPos;
        if(selectedObjects[0].children.length != 0) {
            oldRootPos = selectedObjects[0].bones[2].position.clone();
            oldRootPos = worldPos(oldRootPos, selectedObjects[0], selectedObjects[0].bones, 1);
        }

        selectedObjects[0].bend(selectedObjects[0].bones, pI);
        // BEND LBS??

        let newRootPos;
        if(selectedObjects[0].children.length != 0) {
            newRootPos = selectedObjects[0].bones[2].position.clone();
            newRootPos = worldPos(newRootPos, selectedObjects[0], selectedObjects[0].bones, 1);
        }

        pI = localPos(pI, selectedObjects[0], selectedObjects[0].bones, 0);

        global.sketch.positions.push(pI);
        let newT = new Date().getTime() - refTime;
        global.sketch.timings.push(newT);

        let globalPos = fromLocalToGlobal(global.sketch.positions, selectedObjects[0], 0);
        drawingLine.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);


        if(selectedObjects[0].children.length != 0) {
            let speed = selectedObjects[0].getSpeed(1, oldRootPos, newRootPos);
            //console.log('speed', speed.length())
            updateChildren(selectedObjects[0], speed);
        }
    }

    /*if(intersectedParent != null && intersectedParent.length > 0) {
        const pI = project3D(event, global.renderer.domElement, p);

        let axis = pI.clone().sub(root.mesh.position.clone().add(posOffset)).normalize();
        let distance = root.mesh.position.clone().add(posOffset).distanceTo(pI);

        let oldRootPos = root.bones[2].position.clone();
        oldRootPos = worldPos(oldRootPos, root, root.bones, 1);

        root.mesh.translateOnAxis(axis, distance);
        root.mesh.updateMatrixWorld(); // Important

        let newRootPos = root.bones[2].position.clone();
        newRootPos = worldPos(oldRootPos, root, root.bones, 1);

        // Update children TODO : Linear VS
        let speed = new THREE.Vector3();
        updateChildren(root, speed);
    }*/

    if(intersectedTarget != null && intersectedTarget.length > 0) {
        const pI = project3D(event, global.renderer.domElement, p);

        intersectedTarget[0].object.position.set(pI.x, pI.y, pI.z);
        intersectedTarget[0].object.updateWorldMatrix(false, false);

        for (let i = 0; i < targets.length; i++) {
            if (intersectedTarget[0].object === targets[i].mesh) {
                console.log('cc')
                targets[i].pos = intersectedTarget[0].object.position.clone();
            }
        }

        for(let k = 0; k < objects.length; k++) {
            if(objects[k].hasTarget && objects[k].target.mesh === intersectedTarget[0].object) {
                console.log('ok');
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
            let indexes = retrieveObject(selectedObjects[0].links[selectedObjects[0].effector]);
            saveHistory.push({"path": indexes})
            selectedObjects[0].path.update(global.sketch.positions, global.sketch.timings);

            // Display path
            selectedObjects[0].display.updatePath();

            drawingLine.geometry = new THREE.BufferGeometry().setFromPoints([]);

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