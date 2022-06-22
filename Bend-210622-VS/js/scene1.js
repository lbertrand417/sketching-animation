import * as THREE from 'three';
import { MyObject } from './myObject.js'
import { materials } from './materials.js';
import { getRandomInt } from './utils.js'
import { createCylinder } from './init.js'

let allObjects = []; // All elements of the scene
let meshObjects = []; // Elements to animate


// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
allObjects.push(spotLight);

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

// MESH
for(let k = 0; k < cylinderCount; k++) {
    const bodyCylinder = createCylinder(5, 5, sizing.height, sizing.segmentCount, materials);
    allObjects.push(bodyCylinder.cylinderSkinnedMesh);

    /*const cylinderGeometry = new THREE.CylinderGeometry(5, 5, sizing.height, 32, sizing.segmentCount);
    const cylinderSkinnedMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    cylinderSkinnedMesh.castShadow = true;
    allObjects.push(cylinderSkinnedMesh);

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
    rootBone.position.y = -sizing.halfHeight;
    bones.push(rootBone);

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    prevBone.position.y = 0;
    rootBone.add(prevBone);
    bones.push(prevBone);

    for (let i = 1; i <= sizing.segmentCount; i++) {
        const bone = new THREE.Bone();
        bone.position.y = sizing.segmentHeight;
        bone.name = "Bone " + i;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
    }


    // Create the skeleton
    const skeleton = new THREE.Skeleton(bones);

    cylinderSkinnedMesh.add(bones[0]);
    cylinderSkinnedMesh.bind(skeleton);*/

    let bones = bodyCylinder.bones;
    let rootBone = bones[0];

    const x = getRandomInt(-50, 50);
    const z = getRandomInt(-50, 50);
    rootBone.position.x = x;
    rootBone.position.z = z;
    
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

    let endPoint = new THREE.Vector3();
    endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
    let restAxis = bones[0].worldToLocal(endPoint);
    restAxis.normalize();
    

    // Store object
    meshObjects.push(new MyObject(bodyCylinder.cylinderSkinnedMesh, sizing.height,
        bones, restAxis, 1, null, materials));
}

// Plane
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.translateY(-sizing.halfHeight);
plane.rotation.x = Math.PI * -.5;
plane.receiveShadow = true;
allObjects.push(plane);

export { allObjects, meshObjects };