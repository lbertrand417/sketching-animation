"use strict;"

// Import libraries
import * as THREE from 'three';
import { project3D, addSelectedObject, updatePath } from './utils.js';
import { orbitControls, computeAngleAxis, updateBones, updateChildren, updateDisplay } from './geometry.js';

global.renderer.domElement.addEventListener('mousedown', selectObject);
global.renderer.domElement.addEventListener('mousemove', moveObject);
global.renderer.domElement.addEventListener('mouseup', unselectObject);


let refTime = new Date().getTime();
let intersectedObject = null;
let intersectedParent = null;
let posOffset = new THREE.Vector3();

let p = new THREE.Vector3(); // Point in the plane

function retrieveObject(effector) {
    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].display.links.length; i++) {
            if (effector === objects[k].display.links[i]) {
            //if (effector === objects[k].display.effector) {
                objects[k].path.effector = i;
                objects[k].display.links[i].material = materials.effector.clone();
                return k;
            }
        }
    }
}

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

    //console.log("effectors", effectors);

    let selectableObjects = []
    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].display.links.length; i++) {
            selectableObjects.push(objects[k].display.links[i]);
        }
    }

    if(selectableObjects != null) {
        intersectedObject = raycaster.intersectObjects(selectableObjects);
        //intersectedObject = raycaster.intersectObjects(effectors);

        console.log('intersect', intersectedObject);
    }


    if(parent != null && (intersectedObject == null || intersectedObject.length == 0)) {
        intersectedParent = raycaster.intersectObject(parent.mesh);
    }

    if (intersectedObject != null && intersectedObject.length > 0 && event.button == 0) {
        // Change into an update function?
        if (!event.shiftKey) {
            for(let k = 0; k < objects.length; k++) {
                objects[k].mesh.material = materials.unselected.clone();
                if(objects[k].path.effector != null) {
                    objects[k].display.links[objects[k].path.effector].material = materials.links.clone();
                }
            }
            selectedObjects = [];
        }

        const objectIndex = retrieveObject(intersectedObject[0].object);
        addSelectedObject(objects[objectIndex], true);
        //---------------

        if(selectedObjects.length > 0) {
            if (selectedObjects[0].path.timings.length > 0) {
                timeline.min = selectedObjects[0].path.timings[0];
                timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
                timeline.value = selectedObjects[0].path.timings[selectedObjects[0].path.index];
            } else {
                timeline.min = 0;
                timeline.max = 0;
                timeline.value = 0;
            }

            // Reset
            refTime = new Date().getTime();
            global.sketch.positions = [];
            global.sketch.timings = [];
            global.sketch.isClean = false;

            // Disable controls
            orbitControls.enabled = false;

            // Project on the plane in 3D space
            p.setFromMatrixPosition(selectedObjects[0].display.links[selectedObjects[0].path.effector].matrixWorld); // Stay in the plane
            const pI = project3D(event, global.renderer.domElement, p);
            selectedObjects[0].bones[0].worldToLocal(pI);

            global.sketch.positions.push(pI);
            global.sketch.timings.push(new Date().getTime() - refTime);
        } else {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
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

    // Unselect objects
    if(event.button == 2) {
        if (selectedObjects.length != 0) {
            for (let i = 0; i < selectedObjects.length; i++) {
                selectedObjects[i].mesh.material = materials.unselected.clone();
            }            
        }
        selectedObjects = [];
        timeline.min = 0;
        timeline.max = 0;
    }
}

function moveObject(event) {
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey){
        console.log('move');
        event.preventDefault();

        const pI = project3D(event, global.renderer.domElement, p);

        let worldRotation = computeAngleAxis(selectedObjects[0], pI);
        updateBones(selectedObjects[0], worldRotation);

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

        updateDisplay(objects[0]);

        // TODO: Update trajectory

        // Update children
        updateChildren(parent);
    }
}


function unselectObject(event) {
    console.log("unselect");
    orbitControls.enabled = true;
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey) {
        intersectedObject = null;
        
        if (global.sketch.positions.length > 1) {
            updatePath();
        } else {
            global.sketch.positions = [...selectedObjects[0].path.positions];
            global.sketch.timings = [...selectedObjects[0].path.timings];
        }
    } 
    intersectedObject = [];

    if(intersectedParent != null && intersectedParent.length > 0) {
        intersectedParent = null;
    }

}