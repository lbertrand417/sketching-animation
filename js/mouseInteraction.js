"use strict;"

// Import libraries
import * as THREE from 'three';
import { unselectAll, updateSelection, retrieveObject } from './selection.js';
import { localPos, project3D, worldPos } from './utils.js';
import { fromLocalToGlobal } from './utilsArray.js';
import { orbitControls, updateChildren, updateTimeline } from './main.js';
import { MyObject } from './myObject.js';

renderer.domElement.addEventListener('mousedown', selectObject);
renderer.domElement.addEventListener('mousemove', moveObject);
renderer.domElement.addEventListener('mouseup', unselectObject);

/* Bug: probably have to replace it with the current time in the timeline 
when it's possible. Because right now the starting time doesn't make any sense.
If you start to draw at a certain timing of another object trajectory it won't be kept afterwards. */
let refTime = new Date().getTime();


let intersectedObject = null;
let intersectedParent = null;
let intersectedTarget = null;
let posOffset = new THREE.Vector3();

let p = new THREE.Vector3(); // Point in the plane

/**
 * Initialize data when selecting an object in the scene
 * @param {MouseEvent} event - Mouse event
 */
function selectObject(event) {
    console.log('select');
    event.preventDefault();

    let rect = renderer.domElement.getBoundingClientRect();

    // Retrieve the 2D position on the window
    let pos = { x: 0, y: 0 }; // last known position
    pos.x = event.clientX - rect.left;
    pos.y = event.clientY - rect.top;

    // Retrieve the mouse position in the canvas
    let mouse = {x: 0, y: 0}; // mouse position
    mouse.x = (pos.x / renderer.domElement.width) * 2 - 1;
    mouse.y = - (pos.y/ renderer.domElement.height) * 2 + 1;
    let mouse3D = new THREE.Vector3(mouse.x, mouse.y, 0);

    // Initialize raycaster
    let raycaster =  new THREE.Raycaster();                                        
    raycaster.setFromCamera( mouse3D, camera );

    // Detect if a target has been selected
    if(targets.length != 0) {
        let meshTargets = [];
        for (let i = 0; i < targets.length; i++) {
            meshTargets.push(targets[i].mesh);
        }
        intersectedTarget = raycaster.intersectObjects(meshTargets);
    }

    // Detect if a link has been selected
    if(selectableLinks != null && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedObject = raycaster.intersectObjects(selectableLinks);
    }

    // Detect if the main body has been selected
    if(root != null && (intersectedObject == null || intersectedObject.length == 0) && (intersectedTarget == null || intersectedTarget.length == 0)) {
        intersectedParent = raycaster.intersectObject(root.mesh);
    }

    // If a link has been selected
    if (intersectedObject != null && intersectedObject.length > 0 && event.button == 0) {
        refTime = new Date().getTime() - parseInt(timeline.value);

        // Update selection
        updateSelection(intersectedObject[0].object, event);

        // Update timeline
        updateTimeline();
        
        if(selectedObjects.length > 0) {
            // Reset stroke drawing
            sketch.positions = [];
            sketch.timings = [];
            sketch.isClean = false;

            // Disable controls
            orbitControls.enabled = false;

            // Retrieve the point that must be contained in the view plane
            p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone(); // Local effector position
            p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector); // World effector position
        }
    }

    // If the main body has been selected
    if(intersectedParent != null && intersectedParent.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        p = root.mesh.position.clone(); // Mesh position

        // Project mouse position on the view plan containing p
        let pos3D = project3D(event, renderer.domElement, p); 

        // Compute offset btw 3D mouse position and body
        posOffset = pos3D.clone().sub(root.mesh.position);
    }

    // If a target has been selected
    if(intersectedTarget != null && intersectedTarget.length > 0) {
        // Disable controls
        orbitControls.enabled = false;

        p = intersectedTarget[0].object.position.clone(); // World target position
    }

    // Unselect objects if right click
    if(event.button == 2) {
        unselectAll();
        updateTimeline();
    }
}

/**
 * Update deformations when moving an object in the scene
 * @param {MouseEvent} event - Mouse event
 */
function moveObject(event) {
    // If a link has been selected
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey){
        // Stop animation
        animation.isAnimating = false;

        event.preventDefault();

        // Project the mouse position on the view plane containing the initial effector position
        let pI = project3D(event, renderer.domElement, p); // World position

        // Bend the object toward the 3D mouse position
        selectedObjects[0].bend(selectedObjects[0].bones, pI);
        selectedObjects[0].bend(selectedObjects[0].lbs, pI);

        pI = localPos(pI, selectedObjects[0], selectedObjects[0].bones, 0); // Local position

        // Update stroke input
        sketch.positions.push(pI);
        let newT = new Date().getTime() - refTime;
        sketch.timings.push(newT);

        // Update display of the stroke input
        let globalPos = fromLocalToGlobal(sketch.positions, selectedObjects[0], 0);
        sketch.line3D.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);


        if(selectedObjects[0].children.length != 0) {
            // Store local position of targets
            let localPosA = [];
            for (let i = 0; i < targets.length; i++) {
                let pos = targets[i].pos.clone(); // World position
                pos = localPos(pos, objects[1], objects[1].bones, 0); // Local position
                localPosA.push(pos);
            }

            // Update position/rotation (rigid transformation) of its descendance
            recursiveChildrenUpdate(selectedObjects[0])

            // Update target position
            for (let i = 0; i < targets.length; i++) {
                let newPos = worldPos(localPosA[i], objects[1], objects[1].bones, 0);
                targets[i].pos = newPos.clone();
            }
        }
    }

    // Uncomment to translate the object in the scene
    // If main body mesh has been selected, translate all the objects
    /*if(intersectedParent != null && intersectedParent.length > 0) {
        const pI = project3D(event, renderer.domElement, p);

        let axis = pI.clone().sub(root.mesh.position.clone().add(posOffset)).normalize();
        let distance = root.mesh.position.clone().add(posOffset).distanceTo(pI);

        root.mesh.translateOnAxis(axis, distance);
        root.mesh.updateMatrixWorld(); // Important

        // TODO : Add linear h-VS for translation motion
        recursiveChildrenUpdate(root)
    }*/

    // If target has been selected
    if(intersectedTarget != null && intersectedTarget.length > 0) {
        // Update target position
        const pI = project3D(event, renderer.domElement, p);
        for (let i = 0; i < targets.length; i++) {
            if (intersectedTarget[0].object === targets[i].mesh) {
                targets[i].pos =  pI;
                targets[i].targetAttraction();
            }
        }
    }

    // Update display
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
        objects[k].display.updateTiming();
    }
}

/**
 * Update info when releasing the mouse
 * @param {MouseEvent} event - Mouse event
 */
function unselectObject(event) {
    console.log("unselect");
    orbitControls.enabled = true;

    // If an object has been selected
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey) {     
        if (sketch.positions.length > 1) {
            // Retrieve info to store in the historic
            let indexes = retrieveObject(selectedObjects[0].links[selectedObjects[0].effector]);
            saveHistoric.push({"path": indexes})

            // Update the object path
            selectedObjects[0].path.update(sketch.positions, sketch.timings);

            // Display path
            selectedObjects[0].display.updatePath();

            // Reset line
            sketch.line3D.geometry = new THREE.BufferGeometry().setFromPoints([]);

            // Start animation
            animation.isAnimating = true;
            //animation.startTime = new Date().getTime(); // useful??
        } 
    } 
    
    // Reinitilize selectors
    intersectedObject = null;
    intersectedParent = null;
    intersectedTarget = null;
}

/**
 * Recursive update (rigid transform) of children throughout the hierarchy
 * @param {MyObject} root - Object whose children are updated
 */
function recursiveChildrenUpdate(root) {
    root.bones[0].updateWorldMatrix(false, true);
    updateChildren(root, new THREE.Vector3());

    for(let k = 0; k < root.children.length; k++) {
        recursiveChildrenUpdate(root.children[k]);
    }
}