"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from '../three.js/examples/jsm/controls/TransformControls.js';
import { DragControls } from "../three.js/examples/jsm/controls/DragControls.js";
import { CCDIKSolver, CCDIKHelper } from "../three.js/examples/jsm//animation/CCDIKSolver.js";
import { Quaternion, Vector3 } from 'three';
import { project3D, updatePath } from './utils.js';

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


// Initialize scene
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xEEEEEE );
let axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

// Initialize camera
global.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
global.camera.position.set(0, 0, 100);
global.camera.lookAt(0, 0, 0);

// Initalize renderer
global.renderer = new THREE.WebGLRenderer();
global.renderer.setSize(window.innerWidth, window.innerHeight);
global.renderer.shadowMap.enabled = true;
document.body.appendChild(global.renderer.domElement); // renderer.domElement creates a canvas
//console.log(global.renderer);

// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
scene.add(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
scene.add( spotLight );



// MESH
const cylinderCount = 5;
const segmentHeight = 50 / 7;
const segmentCount = 7;
const height = segmentHeight * segmentCount;
const halfHeight = height * 0.5;

const sizing = {
    segmentHeight,
    segmentCount,
    height,
    halfHeight
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

let effectors = [];

for(let k = 0; k < cylinderCount; k++) {
    const cylinderGeometry = new THREE.CylinderGeometry(5, 5, sizing.height, 32, sizing.segmentCount);
    const cylinderMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    console.log(cylinderMesh.material);
    cylinderMesh.position.set(getRandomInt(-50, 50), 0, getRandomInt(-50, 50));
    //cylinderMesh.updateMatrixWorld( true );
    cylinderMesh.castShadow = true;
    scene.add(cylinderMesh);

    // Initialize weights for skeleton binding
    const skinIndices = [];
    const skinWeights = [];

    let cylinderPosition = cylinderGeometry.getAttribute('position');
    const cylinderVertex = new THREE.Vector3();
    for (let i = 0; i < cylinderPosition.count; i++) {
        cylinderVertex.fromBufferAttribute(cylinderPosition, i);

        const y = cylinderVertex.y + sizing.halfHeight;

        const skinIndex = Math.floor(y / sizing.segmentHeight);
        const skinWeight = (y % sizing.segmentHeight) / sizing.segmentHeight;

        skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    cylinderGeometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
    cylinderGeometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(skinWeights, 4));

    // SKELETON
    let bones = [];

    // Root
    let rootBone = new THREE.Bone();
    rootBone.name = "Root bone";
    //console.log(rootBone.position);
    rootBone.position.y = -sizing.halfHeight;
    bones.push(rootBone);
    axesHelper = new THREE.AxesHelper( 10 );
    rootBone.add( axesHelper );

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    /*if (k != 0) {
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
        prevBone.applyQuaternion(q);
    }*/
    prevBone.position.y = 0;
    rootBone.add(prevBone);
    bones.push(prevBone);
    axesHelper = new THREE.AxesHelper( 10 );
    prevBone.add(axesHelper);

    for (let i = 1; i <= sizing.segmentCount; i++) {
        const bone = new THREE.Bone();
        /*if (k != 0) {
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
            bone.applyQuaternion(q);
        }*/
        bone.position.y = sizing.segmentHeight;
        bone.name = "Bone " + i;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
        axesHelper = new THREE.AxesHelper( 10 );
        bone.add(axesHelper);
    }


    // Create the skeleton
    const skeleton = new THREE.Skeleton(bones);

    // Skeleton helper
    let skeletonHelper = new THREE.SkeletonHelper( bones[0] );
    let boneContainer = new THREE.Group();
    boneContainer.add( bones[0] );
    scene.add( skeletonHelper );
    scene.add( boneContainer );

    cylinderMesh.add(bones[0]);
    cylinderMesh.bind(skeleton);
    
    // Random rotation of cylinders
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2);
    rootBone.applyQuaternion(q);

    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    rootBone.applyQuaternion(q);

    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.random() * Math.PI * 2);
    rootBone.applyQuaternion(q);

    // Update joints
    for(let i = 0; i < bones.length; i++) {
        bones[i].updateMatrixWorld(true);
    }

    let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

    let effector = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
    effector.position.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
    scene.add(effector);
    effectors.push(effector);

    let bonesDisplay = [];
    for(let i = 1; i < bones.length - 1; i++) {
        let boneDisplay= new THREE.Mesh( sphereGeometry, materials.links.clone() );
        boneDisplay.position.setFromMatrixPosition(bones[i].matrixWorld);
        scene.add(boneDisplay);
        bonesDisplay.push(boneDisplay);
    }

    let rootDisplay = new THREE.Mesh( sphereGeometry, materials.root.clone() );
    rootDisplay.position.setFromMatrixPosition(bones[0].matrixWorld);
    scene.add(rootDisplay);

    let pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
    let pathDisplay= new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    scene.add(pathDisplay);

    const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
    const timingDisplay = new THREE.Points( timingGeometry, materials.timing.clone() );
    scene.add(timingDisplay);

    // Store object
    objects.push({ mesh : cylinderMesh,
                skeleton : skeleton,
                bones : bones,
                path : {
                    positions : [],
                    timings : [],
                    index : null,
                    startTime : new Date().getTime(),
                },
                display : { 
                    effector : effector,
                    links : bonesDisplay,
                    root : rootDisplay,
                    path : pathDisplay,
                    timing : timingDisplay
                }
            })
}



// 3D Sketch line
const sketchGeometry = new THREE.BufferGeometry().setFromPoints(global.sketch.positions);
const sketchMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff });
global.sketch.mesh = new THREE.Line(sketchGeometry, sketchMaterial);
scene.add(global.sketch.mesh);

// Plane
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.translateY(-sizing.halfHeight);
plane.rotation.x = Math.PI * -.5;
plane.receiveShadow = true;
scene.add(plane);

// Controls
const orbitControls = new OrbitControls(global.camera, global.renderer.domElement);
orbitControls.update();

/*const dragControls = new DragControls(effector, global.camera, global.renderer.domElement);
dragControls.transformGroup = true;
dragControls.addEventListener( 'dragstart', function () { orbitControls.enabled = false; } );
dragControls.addEventListener( 'dragend', function () { orbitControls.enabled = true; } );*/

/*const transformControls = new TransformControls(global.camera, global.renderer.domElement);
transformControls.attach(objects[0].display.effector);
scene.add(transformControls);*/

//updateBones(new THREE.Vector3(1, 1, 0));

const particlesGeometry = new THREE.BufferGeometry().setFromPoints([]);
const particlesMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 2 });
const particles = new THREE.Points( particlesGeometry, particlesMaterial );
scene.add( particles );

global.animation.isAnimating = false;
function animate() {
    // Animation
    if(global.animation.isAnimating) {
        let currentTime = new Date().getTime() - global.animation.startTime;
        // TODO: restart startTime when attaining max timing
        console.log('currentTime', currentTime);

        if(selectedObjects.length == 0) {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
        } else {
            let timelineValue = currentTime;
            while (timelineValue < parseInt(timeline.min)) {
                //console.log("1");
                timelineValue += parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }

            //console.log('value', timeline.value);
            //console.log('max', timeline.max);
            while (timelineValue > parseInt(timeline.max)) {
                //console.log("2");
                //console.log('value', timeline.value);
                timelineValue -= parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }

            timeline.value = timelineValue;
        }

        updateAnimation(currentTime);

        //console.log('timelineValue', timelineValue);

        //timeline.value = currentTime % parseInt(timeline.max) + parseInt(timeline.min);
        console.log('value', timeline.value);
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    global.renderer.render(scene, global.camera);
}
animate();

function findPosition(object, time) {
    // Find closests points in the line
    //console.log(global.sketch.positions.length);
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

    //console.log(global.sketch.positions.length);
    

    // Interpolate
    let index = object.path.index;
    console.log('index', index)
    let alpha = (time - object.path.timings[index]) / (object.path.timings[index + 1] - object.path.timings[index]);
    let position = object.path.positions[index].clone().multiplyScalar(1 - alpha).add(object.path.positions[index + 1].clone().multiplyScalar(alpha));
    //let tangent = global.sketch.tangents[index].clone().multiplyScalar(1 - alpha).add(global.sketch.tangents[index + 1].clone().multiplyScalar(alpha));
    //return { position, tangent };
    return position

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
   //let t = global.animation.effectorPos.clone().sub(rootPos);
   let t = new THREE.Vector3();
   t.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
   t.sub(rootPos);
   t.normalize();

   // Compute rotation axis
   let axis = new THREE.Vector3();
   axis.crossVectors(t, n);
   axis.normalize();

   //console.log('axis', axis);

   // Compute world rotation angle
   let angle = t.dot(n);
   angle = Math.acos(angle);
   //console.log('angle', angle);

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

        // Find parameterization (WORKS ONLY FOR CONSTANT BONE HEIGHT)
        //let alpha = i * sizing.segmentHeight / (sizing.height * sizing.segmentCount);
        //console.log(alpha);

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
}

global.renderer.domElement.addEventListener('mousedown', selectObject);
global.renderer.domElement.addEventListener('mousemove', moveObject);
global.renderer.domElement.addEventListener('mouseup', unselectObject);


function addSelectedObject(selection) {

    // Check if not in the selection already
    let isSelected = false;
    for(let i = 0; i < selectedObjects.length; i++) {
        if (JSON.stringify(selectedObjects[i].display.effector) == JSON.stringify(selection)) {
            isSelected = true;
            selectedObjects[i].mesh.material = materials.unselected.clone();
            selectedObjects.splice(i, 1);
            selectedObjects[0].mesh.material = materials.selected.clone();
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
                //objects[k].mesh.material = materials.selected.clone();
                objects[k].mesh.material = material;
            }
        }
    }

    //console.log('selection', selectedObjects);
}

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

        addSelectedObject(intersectedObject[0].object);

        if (selectedObjects[0].path.timings.length > 0) {
            timeline.min = selectedObjects[0].path.timings[0];
            timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
            timeline.value = selectedObjects[0].path.timings[selectedObjects[0].path.index];
        } else {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
        }

        // TODO: Retrieve path of the selected object and put it as the current sketch stroke

        // Reset
        refTime = new Date().getTime();
        global.sketch.positions = [];
        //global.sketch.tangents = [];
        global.sketch.timings = [];
        global.sketch.isClean = false;

        // Disabled controls
        orbitControls.enabled = false;

        p.setFromMatrixPosition(selectedObjects[0].bones[selectedObjects[0].bones.length - 1].matrixWorld); // Stay in the plane
        const pI = project3D(event, global.renderer.domElement, p);

        global.sketch.positions.push(pI);
        global.sketch.timings.push(new Date().getTime() - refTime);
        //global.sketch.tangents.push(pI); // wrong but don't care
    }
    
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
        //global.sketch.tangents.push(pI); // wrong but don't care

        let worldRotation = computeAngleAxis(selectedObjects[0], pI);
        updateBones(selectedObjects[0], worldRotation);

        // Update joints
        for(let i = 0; i < selectedObjects[0].bones.length; i++) {
            selectedObjects[0].bones[i].updateMatrixWorld(true);
        }

        // Update joints display
        selectedObjects[0].display.effector.position.setFromMatrixPosition(selectedObjects[0].bones[selectedObjects[0].bones.length - 1].matrixWorld);
        for(let i = 0; i < selectedObjects[0].display.links.length; i++) {
            selectedObjects[0].display.links[i].position.setFromMatrixPosition(selectedObjects[0].bones[i+1].matrixWorld);
        }
        selectedObjects[0].display.root.position.setFromMatrixPosition(selectedObjects[0].bones[0].matrixWorld);
    }
}

var timeline = document.getElementById("timeline");

function unselectObject(event) {
    console.log("unselect");
    orbitControls.enabled = true;
    if(intersectedObject != null && intersectedObject.length > 0 && !event.shiftKey) {
        //intersectedObject[0].object.material.color.setHex( 0x88ff88 );
        intersectedObject = null;
        

        if (global.sketch.positions.length > 1) {
            updatePath();
        } else {
            global.sketch.positions = [...selectedObjects[0].path.positions];
            global.sketch.timings = [...selectedObjects[0].path.timings];
        }
    } 
    intersectedObject = [];

    // Print max timing
    /*for (let k = 0; k < objects.length; k++) {
        console.log(objects[k].path.timings[objects[k].path.timings.length - 1]);
    }*/
}

function updateAnimation(currentTime) {
    for(let k = 0; k < objects.length; k++) {
        if(objects[k].path.timings.length != 0) { 
            //console.log(objects[k].path.timings);
            // Find target point in the stroke
            //let objectTime =  this.value % objects[k].path.timings[objects[k].path.timings.length - 1];

            let objectTime =  currentTime;
            while (objectTime < objects[k].path.timings[0]) {
                objectTime += objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            while (objectTime > objects[k].path.timings[objects[k].path.timings.length - 1]) {
                objectTime -= objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            //console.log('k', k);
            //console.log('objectTime', objectTime);
            //console.log('timings', objects[k].path.timings); //pas mis à jour

            let new_pos = findPosition(objects[k], objectTime);

            // Display target
            objects[k].display.timing.geometry = new THREE.BufferGeometry().setFromPoints([new_pos]);

            // Update bones
            let worldRotation = computeAngleAxis(objects[k], new_pos);
            updateBones(objects[k], worldRotation);

            // Update joints
            for(let i = 0; i < objects[k].bones.length; i++) {
                objects[k].bones[i].updateMatrixWorld(true);
            }

            // Update joints display
            objects[k].display.effector.position.setFromMatrixPosition(objects[k].bones[objects[k].bones.length - 1].matrixWorld);
            for(let i = 0; i < objects[k].display.links.length; i++) {
                objects[k].display.links[i].position.setFromMatrixPosition(objects[k].bones[i+1].matrixWorld);
            }
            objects[k].display.root.position.setFromMatrixPosition(objects[k].bones[0].matrixWorld);
        }
    }
}

timeline.oninput = function() {
    console.log(this.value);
    updateAnimation(parseInt(this.value));
} 

