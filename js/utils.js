"use strict;"

// Import libraries
import * as THREE from 'three';

let materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4 }),
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
};

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
                selectedObjects[0].mesh.material = materials.selected.clone();
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

export { materials, updatePath, project3D, getRandomInt, addSelectedObject };