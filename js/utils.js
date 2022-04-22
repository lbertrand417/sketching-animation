"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials as materials1, allObjects as allObjects1, detailObjects as detailObjects1, effectors as effectors1 } from './scene1.js';
import { materials as materials2, allObjects as allObjects2, meshObjects as detailObjects2, effectors as effectors2 } from './scene2.js';
import { materials as materials3, allObjects as allObjects3, detailObjects as detailObjects3, effectors as effectors3 } from './scene3.js';
import { materials as materials4, allObjects as allObjects4, detailObjects as detailObjects4, effectors as effectors4 } from './scene4.js';


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
        case 4 :
            objects = [...detailObjects4];
            for (let i = 0; i < allObjects4.length; i++) {
                global.scene.add(allObjects4[i]);
            }
            effectors = [...effectors4];
            materials = {...materials4};
            break;
    }

    for(let k = 0; k < objects.length; k++) {
        objects[k].mesh.material = materials.unselected.clone();
        if(objects[k].level == 0) {
            parent = objects[k];
        }
    }
    selectedObjects = [];

}


function updatePath() {
    let id = 1;

    /*let v1 = selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id - 1].clone()).sub(selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id].clone()));
    let v2 = selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id].clone()).sub(selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id + 1].clone()));

    //console.log(v1.dot(v2));

    while (v1.dot(v2) > 0 && id < global.sketch.positions.length - 2) {
        id++;
        v1 = selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id - 1].clone()).sub(selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id].clone()));
        v2 = selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id].clone()).sub(selectedObjects[0].bones[0].worldToLocal(global.sketch.positions[id + 1].clone()));

        //console.log('i', id);
        //console.log(v1.dot(v2));
    }

    //console.log(id);
    //console.log(global.sketch.positions.length);

    if (id != global.sketch.positions.length - 2) {
        for(let j = 0; j < id; j++) {
            global.sketch.positions.shift();
            global.sketch.timings.shift();
        }
    }*/

    selectedObjects[0].path.positions = [...global.sketch.positions];
    selectedObjects[0].path.timings = [...global.sketch.timings];

    for (let i = global.sketch.timings.length - 2; i >= 0; i--) {
        selectedObjects[0].path.positions.push(selectedObjects[0].path.positions[i].clone());
        selectedObjects[0].path.timings.push(selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1] + (global.sketch.timings[i + 1] - global.sketch.timings[i]));
    }

    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();

    let globalPos = fromLocalToGlobal(selectedObjects[0].path.positions, selectedObjects[0].bones[0]);
    selectedObjects[0].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);

    timeline.min = selectedObjects[0].path.timings[0];
    timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
}

function fromLocalToGlobal(positions, space) {
    let globalPos = [];
    for(let i = 0; i < positions.length; i++) {
        let p = positions[i].clone();
        globalPos.push(space.localToWorld(p));
    }
    return globalPos;
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

export { loadScene, updatePath, fromLocalToGlobal, project3D, getRandomInt, addSelectedObject };