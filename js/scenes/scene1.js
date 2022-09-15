import * as THREE from 'three';
import { MyObject } from '../myObject.js'
import { materials } from '../materials.js';
import { getRandomInt } from '../utils.js'
import { createCylinder } from '../init.js'

let allObjects = []; // All elements of the scene
let meshObjects = []; // Elements to animate


// --------------- LIGHTS --------------- 
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
ambientLight.updateWorldMatrix(false, false);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.updateWorldMatrix(false, false);
spotLight.castShadow = true;
allObjects.push(spotLight);

// --------------- CYLINDERS --------------- 

const cylinderCount = 5;
const segmentHeight = 50 / 7;
const segmentCount = 7;
const height = segmentHeight * segmentCount;
const halfHeight = height * 0.5;

// --------------- Root object --------------- 

// Create the skinned mesh
const bodyHeight = 70;
const bodyRadius = 75;
const bodyCylinder = createCylinder(bodyRadius, bodyRadius, bodyHeight, 5, materials);

// Set position
let bones = bodyCylinder.bones;
let rootBone = bones[0];
rootBone.position.set(0, - bodyHeight - halfHeight, 0);
bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

// Compute rest axis
let endPoint = new THREE.Vector3();
endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
let restAxis = bones[0].worldToLocal(endPoint);
restAxis.normalize();

// Store the object
let parent = new MyObject(bodyCylinder.cylinderSkinnedMesh, bodyHeight,
    bodyCylinder.bones, restAxis, null, materials)
allObjects.push(bodyCylinder.cylinderSkinnedMesh);
meshObjects.push(parent);


// --------------- Children objects --------------- 
for(let k = 0; k < cylinderCount; k++) {
    // Create the skinned mesh
    const bodyCylinder = createCylinder(5, 5, height, segmentCount, materials);
    allObjects.push(bodyCylinder.cylinderSkinnedMesh);

    // Set position
    let bones = bodyCylinder.bones;
    let rootBone = bones[0];
    const x = getRandomInt(-50, 50);
    const z = getRandomInt(-50, 50);
    rootBone.position.x = x;
    rootBone.position.z = z;
    
    // Random rotation of cylinders
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI / 2);
    rootBone.applyQuaternion(q);

    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI / 2);
    rootBone.applyQuaternion(q);

    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.random() * Math.PI / 2);
    rootBone.applyQuaternion(q);

    // Update joints
    bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

    // Compute rest axis
    let endPoint = new THREE.Vector3();
    endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
    let restAxis = bones[0].worldToLocal(endPoint);
    restAxis.normalize();

    // Store object
    let object = new MyObject(bodyCylinder.cylinderSkinnedMesh, height,
        bones, restAxis, parent, materials);
    meshObjects.push(object);
    parent.addChild(object);
}

export { allObjects, meshObjects };