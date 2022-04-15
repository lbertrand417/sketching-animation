"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials as materials1, allObjects as allObjects1, detailObjects as detailObjects1, effectors as effectors1 } from './scene1.js';
import { materials as materials2, allObjects as allObjects2, detailObjects as detailObjects2, effectors as effectors2 } from './scene2.js';
import { materials as materials3, allObjects as allObjects3, detailObjects as detailObjects3, effectors as effectors3 } from './scene3.js';


function loadScene(s) {
    // Initialize scene
    global.scene = new THREE.Scene();
    global.scene.background = new THREE.Color( 0xEEEEEE );
    let axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(30, 0, 0);
    global.scene.add( axesHelper );

    global.animation.isAnimating = false;

    switch(s) {
        case 1 :
            objects = [...detailObjects1];
            for (let i = 0; i < allObjects1.length; i++) {
                global.scene.add(allObjects1[i]);
            }
            effectors = [...effectors1];
            materials = {...materials1};
            break;
        case 2 :
            objects = [...detailObjects2];
            for (let i = 0; i < allObjects2.length; i++) {
                global.scene.add(allObjects2[i]);
            }
            effectors = [...effectors2];
            materials = {...materials2};
            break;
        case 3 :
            objects = [...detailObjects3];
            for (let i = 0; i < allObjects3.length; i++) {
                global.scene.add(allObjects3[i]);
            }
            effectors = [...effectors3];
            materials = {...materials3};
            break;
    }

    for(let k = 0; k < objects.length; k++) {
        objects[k].mesh.material = materials.unselected.clone();
    }
    selectedObjects = [];

}


function updatePath() {
    selectedObjects[0].path.positions = [...global.sketch.positions];
    selectedObjects[0].path.timings = [...global.sketch.timings];

    for (let i = global.sketch.timings.length - 2; i >= 0; i--) {
        selectedObjects[0].path.positions.push(selectedObjects[0].path.positions[i]);
        selectedObjects[0].path.timings.push(selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1] + (global.sketch.timings[i + 1] - global.sketch.timings[i]));
    }

    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();
    selectedObjects[0].display.path.geometry = new THREE.BufferGeometry().setFromPoints(selectedObjects[0].path.positions);

    timeline.min = selectedObjects[0].path.timings[0];
    timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
}

function project3D(e, canvas, p) {
    let pos = { x: 0, y: 0 }; // last known position
    let mouse = {x: 0, y: 0}; // mouse position

    let rect = canvas.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;

    e.preventDefault();
    mouse.x = (pos.x / canvas.width) * 2 - 1;
    mouse.y = - (pos.y/ canvas.height) * 2 + 1;

    let vector = new THREE.Vector3(mouse.x, mouse.y, 0); // In camera space
    vector.unproject( global.camera );

    // Direction to point
    let dir = vector.sub( global.camera.position )
    dir.normalize();

    const p0 = global.camera.position; // Global camera position

    const n = new THREE.Vector3(0,0,0);
    global.camera.getWorldDirection(n);  // normale au plan

    const tI = ((p.clone().sub(p0)).dot(n) ) / ( dir.dot(n) );
    const pI = (dir.clone().multiplyScalar(tI)).add(p0); // le point d'intersection

    return pI;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function addSelectedObject(selection, removable) {
    // Check if not in the selection already
    let isSelected = false;
    for(let i = 0; i < selectedObjects.length; i++) {
        if (JSON.stringify(selectedObjects[i].display.effector) == JSON.stringify(selection)) {
            isSelected = true;
            if(removable) {
                selectedObjects[i].mesh.material = materials.unselected.clone();
                selectedObjects.splice(i, 1);
                if(selectedObjects.length > 0) {
                    selectedObjects[0].mesh.material = materials.selected.clone();
                }
            }
        }
    }

    if(!isSelected) {
        let material;
        if (selectedObjects.length == 0) {
            material = materials.selected.clone();
        } else {
            console.log("coucou");
            material = materials.selectedBis.clone();
        }
        for (let k = 0; k < objects.length; k++) {
            if (JSON.stringify(objects[k].display.effector) == JSON.stringify(selection)) {
                selectedObjects.push(objects[k]);
                objects[k].mesh.material = material;
            }
        }
    }
}

export { loadScene, updatePath, project3D, getRandomInt, addSelectedObject };