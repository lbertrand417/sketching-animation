import * as THREE from 'three';
import { MyObject } from './myObject.js'
import { materials } from './materials.js';
import { createCylinder } from './init.js'

let allObjects = []; // All elements of the scene
let meshObjects = []; // Elements to animate


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

const cylinderCount = 5;
const segmentCount = 7;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// MESH

const maxHeight = 50;

const bodyHeight = 70;
const bodyCylinder = createCylinder(75, 75, bodyHeight, 5, materials);

let bones = bodyCylinder.bones;
let rootBone = bones[0];

rootBone.position.set(0, - bodyHeight, 0);
bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

let endPoint = new THREE.Vector3();
endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
let restAxis = bones[0].worldToLocal(endPoint);
restAxis.normalize();

let parent = new MyObject(bodyCylinder.cylinderSkinnedMesh, bodyHeight,
    bodyCylinder.bones, restAxis, null, materials)
allObjects.push(bodyCylinder.cylinderSkinnedMesh);
meshObjects.push(parent);

let height;
for(let k = 0; k < cylinderCount; k++) {

    height = maxHeight * (k + 1) / cylinderCount;
    
    const bodyCylinder = createCylinder(5, 5, height, segmentCount, materials);
    allObjects.push(bodyCylinder.cylinderSkinnedMesh);

    let bones = bodyCylinder.bones;
    let rootBone = bones[0];

    const x = getRandomInt(-50, 50);
    const z = getRandomInt(-50, 50);
    rootBone.position.x = x;
    rootBone.position.y = 0;
    rootBone.position.z = z;

    // Update joints
    /*for(let i = 0; i < bones.length; i++) {
        bones[i].updateMatrixWorld(true);
    }*/

    bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

    let endPoint = new THREE.Vector3();
    endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
    let restAxis = bones[0].worldToLocal(endPoint);
    restAxis.normalize();

    // Store object
    let object = new MyObject(bodyCylinder.cylinderSkinnedMesh, height,
        bones, restAxis, parent, materials)
    meshObjects.push(object);
    parent.addChild(object);
}

// Plane
/*const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI * -.5;
plane.receiveShadow = true;
plane.updateWorldMatrix(false, false);
allObjects.push(plane);*/

export { allObjects, meshObjects };