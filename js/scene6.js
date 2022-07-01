import * as THREE from 'three';
import { Vector3 } from 'three';
import { MyObject } from './myObject.js'
import { materials } from './materials.js';
import { createCylinder } from './init.js'


let allObjects = []; // All elements of the scene

// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
ambientLight.updateWorldMatrix(false, false);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
spotLight.updateWorldMatrix(false, false);
allObjects.push(spotLight);

let meshObjects = []; // Elements to animate

const cylinderCount = 10;
const radiusTop = 0.2;
const radiusBottom = 3;
const segmentCount = 5;

let height = 40;

// MESH


const bodyHeight = 75;
const bodyRadius = 5;

const bodyCylinder = createCylinder(bodyRadius, bodyRadius, bodyHeight, segmentCount, materials);
allObjects.push(bodyCylinder.cylinderSkinnedMesh);

let rootBone = bodyCylinder.bones[0];

let q1 = new THREE.Quaternion()
let rotationAxis = new THREE.Vector3(0, 1, 0);
q1.setFromAxisAngle(rotationAxis, Math.PI / 2);
rootBone.applyQuaternion(q1);

// Update joints
/*for(let i = 0; i < bodyCylinder.bones.length; i++) {
    bodyCylinder.bones[i].updateMatrixWorld(true);
}*/

bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);


let bones = bodyCylinder.bones;
let endPoint = new THREE.Vector3();
endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
let restAxis = bones[0].worldToLocal(endPoint);
restAxis.normalize();

let parent = new MyObject(bodyCylinder.cylinderSkinnedMesh, bodyHeight,
    bodyCylinder.bones, restAxis, null, materials)
meshObjects.push(parent);



let r = bodyRadius;
let thetaPas = 2 * Math.PI / cylinderCount;
let theta = 0;

for(let k = 0; k < cylinderCount; k++) {

    const detailCylinder = createCylinder(radiusTop, radiusBottom, height, segmentCount, materials);
    allObjects.push(detailCylinder.cylinderSkinnedMesh);
   
    
    // Position correctly
    let bones = detailCylinder.bones;
    let rootBone = bones[0];


    rootBone.position.set(r * Math.cos(theta), bodyHeight / 2, r * Math.sin(theta));

    let q = new THREE.Quaternion()
    let axis = rootBone.position.clone().sub(new THREE.Vector3(0, height, 0));
    axis.normalize();
    let rotationAxis = new THREE.Vector3(0, 1, 0);
    rotationAxis.cross(axis);
    rotationAxis.normalize();
    q.setFromAxisAngle(rotationAxis, Math.PI / 8);
    rootBone.applyQuaternion(q);

    theta += thetaPas;

    let endPos = new THREE.Vector3();
    endPos.setFromMatrixPosition(bones[bones.length - 1].matrixWorld)
    axis = rootBone.position.clone().sub(endPos);
    axis.normalize();
    q.setFromAxisAngle(axis, Math.PI / 4)
    rootBone.applyQuaternion(q);


    // Update joints
    /*for(let j = 0; j < bones.length; j++) {
        bones[j].updateMatrixWorld(true);
    }*/

    detailCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

    let endPoint = new THREE.Vector3();
    endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
    let restAxis = bones[0].worldToLocal(endPoint);
    restAxis.normalize();

    // Store object
    let object = new MyObject(detailCylinder.cylinderSkinnedMesh, height,
        detailCylinder.bones, restAxis, parent, materials);
    meshObjects.push(object);
    parent.addChild(object);
}

export { allObjects, meshObjects };