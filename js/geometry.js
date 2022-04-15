"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from '../three.js/examples/jsm/controls/TransformControls.js';
import { DragControls } from "../three.js/examples/jsm/controls/DragControls.js";
import { CCDIKSolver, CCDIKHelper } from "../three.js/examples/jsm//animation/CCDIKSolver.js";
import { Quaternion, Vector3 } from 'three';
import { materials, project3D, updatePath, addSelectedObject } from './utils.js';
import { allObjects, detailObjects, effectors } from './scene1.js';


// Initalize renderer
global.renderer = new THREE.WebGLRenderer();
global.renderer.setSize(window.innerWidth, window.innerHeight);
global.renderer.shadowMap.enabled = true;
document.body.appendChild(global.renderer.domElement); // renderer.domElement creates a canvas

// Initialize camera
global.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
global.camera.position.set(0, 0, 250);
global.camera.lookAt(0, 0, 0);


function loadScene(s) {
    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xEEEEEE );
    let axesHelper = new THREE.AxesHelper( 10 );
    scene.add( axesHelper );

    if(s == 1) {
        objects = [...detailObjects];
        for (let i = 0; i < allObjects.length; i++) {
            scene.add(allObjects[i]);
        }
    }

    return scene;
}

let scene = loadScene(1);


// Controls
const orbitControls = new OrbitControls(global.camera, global.renderer.domElement);
orbitControls.update();

function animate() {
    // Animation
    if(global.animation.isAnimating) {
        let currentTime = new Date().getTime() - global.animation.startTime;
        // TODO: restart startTime when attaining max timing
        //console.log('currentTime', currentTime);

        if(selectedObjects.length == 0) {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
        } else {
            let timelineValue = currentTime;
            while (timelineValue < parseInt(timeline.min)) {
                timelineValue += parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }
            while (timelineValue > parseInt(timeline.max)) {
                timelineValue -= parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }

            timeline.value = timelineValue;
        }

        updateAnimation(currentTime);
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    global.renderer.render(scene, global.camera);
}
animate();

function updateAnimation(currentTime) {
    for(let k = 0; k < objects.length; k++) {
        if(objects[k].path.timings.length != 0) { 

            let objectTime =  currentTime;
            while (objectTime < objects[k].path.timings[0]) {
                objectTime += objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            while (objectTime > objects[k].path.timings[objects[k].path.timings.length - 1]) {
                objectTime -= objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            let new_pos = findPosition(objects[k], objectTime);

            // Display target
            objects[k].display.timing.geometry = new THREE.BufferGeometry().setFromPoints([new_pos]);

            // Update bones
            let worldRotation = computeAngleAxis(objects[k], new_pos);
            updateBones(objects[k], worldRotation);
        }
    }
}

function findPosition(object, time) {
    // Find closests points in the line
    let i = 0;
    object.path.index = 0;
    while (i < object.path.timings.length - 1) {
        if(time >= object.path.timings[i] && time <= object.path.timings[i + 1]) {
            object.path.index = i;
            i = object.path.timings.length;
        } else {
            i++;
        }
    }

    // Interpolate
    let index = object.path.index;
    console.log('index', index)
    let alpha = (time - object.path.timings[index]) / (object.path.timings[index + 1] - object.path.timings[index]);
    let position = object.path.positions[index].clone().multiplyScalar(1 - alpha).add(object.path.positions[index + 1].clone().multiplyScalar(alpha));
    
    return position;
}

function computeAngleAxis(object, target) {
   // Retrieve root bone info
   let rootBone = object.bones[0];
   let rootPos = new THREE.Vector3();
   let invRootQ = new THREE.Quaternion();
   let rootScale = new THREE.Vector3();
   rootBone.matrixWorld.decompose(rootPos, invRootQ, rootScale);
   invRootQ.invert();

   // Get world rotation vectors
   let n = target.clone().sub(rootPos);
   n.normalize();
   let t = new THREE.Vector3();
   t.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
   t.sub(rootPos);
   t.normalize();

   // Compute rotation axis
   let axis = new THREE.Vector3();
   axis.crossVectors(t, n);
   axis.normalize();


   // Compute world rotation angle
   let angle = t.dot(n);
   angle = Math.acos(angle);

   return { angle, axis };
}

function updateBones(object, worldRotation) {

    for(let i = 1; i <= object.bones.length - 1; i++) {

        // Put axis in parent space
        let parentBone = object.bones[i-1];
        let parentPos = new THREE.Vector3();
        let invParentQ = new THREE.Quaternion();
        let parentScale = new THREE.Vector3();
        parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
        invParentQ.invert();
        let localAxis = worldRotation.axis.clone().applyQuaternion(invParentQ);

        // Compute quaternion
        // On peut parametrer les angles mais il faut que sum(theta_i) = theta
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(localAxis, worldRotation.angle / sizing.segmentCount);
        object.bones[i].applyQuaternion(q);

        
        if (i == object.bones.length - 1) {
            object.display.effector.position.setFromMatrixPosition(object.bones[i].matrixWorld);
        } else {
            object.display.links[i-1].position.setFromMatrixPosition(object.bones[i].matrixWorld);
        }
    }

    // Update joints
    for(let i = 0; i < object.bones.length; i++) {
        object.bones[i].updateMatrixWorld(true);
    }

    // Update joints display
    object.display.effector.position.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
    for(let i = 0; i < object.display.links.length; i++) {
        object.display.links[i].position.setFromMatrixPosition(object.bones[i+1].matrixWorld);
    }
    object.display.root.position.setFromMatrixPosition(object.bones[0].matrixWorld);
}





global.renderer.domElement.addEventListener('mousedown', selectObject);
global.renderer.domElement.addEventListener('mousemove', moveObject);
global.renderer.domElement.addEventListener('mouseup', unselectObject);


let refTime = new Date().getTime();
let intersectedObject = null;
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
    intersectedObject = raycaster.intersectObjects(effectors);

    if (intersectedObject.length > 0 && event.button == 0) {
        if (!event.shiftKey) {
            for(let k = 0; k < objects.length; k++) {
                objects[k].mesh.material = materials.unselected.clone();
            }
            selectedObjects = [];
        }
        intersectedObject[0].object.material.color.setHex( Math.random() * 0xffffff ); // CHANGE

        addSelectedObject(intersectedObject[0].object, true);

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
        p.setFromMatrixPosition(selectedObjects[0].bones[selectedObjects[0].bones.length - 1].matrixWorld); // Stay in the plane
        const pI = project3D(event, global.renderer.domElement, p);

        global.sketch.positions.push(pI);
        global.sketch.timings.push(new Date().getTime() - refTime);
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
        console.log("move");
        event.preventDefault();

        const pI = project3D(event, global.renderer.domElement, p);

        global.sketch.positions.push(pI);
        global.sketch.timings.push(new Date().getTime() - refTime);

        let worldRotation = computeAngleAxis(selectedObjects[0], pI);
        updateBones(selectedObjects[0], worldRotation);
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
}


var timeline = document.getElementById("timeline");
timeline.oninput = function() {
    updateAnimation(parseInt(this.value));
} 

