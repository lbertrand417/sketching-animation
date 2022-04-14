"use strict;"

// Import libraries
import * as THREE from 'three';

function updatePath() {
    selectedObjects[0].path.positions = [...global.sketch.positions];
    selectedObjects[0].path.timings = [...global.sketch.timings];

    //console.log(selectedObjects[0].path.timings);

    for (let i = global.sketch.timings.length - 2; i >= 0; i--) {
        selectedObjects[0].path.positions.push(selectedObjects[0].path.positions[i]);
        selectedObjects[0].path.timings.push(selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1] + (global.sketch.timings[i + 1] - global.sketch.timings[i]));
    }
    //console.log(selectedObjects[0].path.timings);

    //selectedObjects[0].path.startTime = new Date().getTime();
    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();
    //global.sketch.mesh.geometry = new THREE.BufferGeometry().setFromPoints(global.sketch.positions);
    selectedObjects[0].display.path.geometry = new THREE.BufferGeometry().setFromPoints(selectedObjects[0].path.positions);

    timeline.min = selectedObjects[0].path.timings[0];
    timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];

    /*let maxTimings = [];
    Object.keys(objects).forEach((key) => {
        let t = objects[key].path.timings[objects[key].path.timings.length - 1];
        if (t != undefined) {
            maxTimings.push(t);
        }
    });
    console.log(maxTimings);
    console.log('max', Math.max(...maxTimings));
    timeline.max = Math.max(...maxTimings);*/
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

    //console.log('dir', dir);


    const p0 = global.camera.position; // Global camera position

    const n = new THREE.Vector3(0,0,0);
    global.camera.getWorldDirection(n);  // normale au plan

    const tI = ((p.clone().sub(p0)).dot(n) ) / ( dir.dot(n) );
    const pI = (dir.clone().multiplyScalar(tI)).add(p0); // le point d'intersection

    return pI;
}

export { updatePath, project3D };