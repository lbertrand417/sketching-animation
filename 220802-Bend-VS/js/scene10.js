import * as THREE from 'three';
import { MyObject } from './myObject.js'
import { createCylinder } from './init.js'
import { materials } from './materials.js';
import { localPos, worldPos } from './utils.js';

let allObjects = []; // All elements of the scene

// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
ambientLight.updateWorldMatrix(true, false);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
spotLight.updateWorldMatrix(true, false);
allObjects.push(spotLight);


let meshObjects = []; // Elements to animate

const cylinderCount = 3;
const radiusTop = 3;
const radiusBottom = 3;
const segmentCount = 20;

let height = 40;

// MESH


const bodyHeight = 75;
const bodyRadius = 25;

const bodyCylinder = createCylinder(bodyRadius, bodyRadius, bodyHeight, segmentCount, materials);
allObjects.push(bodyCylinder.cylinderSkinnedMesh);

let bones = bodyCylinder.bones;
let rootBone = bones[0];

let q = new THREE.Quaternion()
let rotationAxis = new THREE.Vector3(0, 1, 0);
q.setFromAxisAngle(rotationAxis, Math.PI / 2);
rootBone.applyQuaternion(q);

let Q = new THREE.Quaternion();
let axis = rootBone.position.clone().sub(new THREE.Vector3(0, bodyHeight, 0));
axis.normalize();
rotationAxis = new THREE.Vector3(1, 0, 0);
rotationAxis.cross(axis);
rotationAxis.normalize();
Q.setFromAxisAngle(rotationAxis, Math.PI / 4);


bodyCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);


let endPoint = new THREE.Vector3();
endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
let restAxis = bones[0].worldToLocal(endPoint);
restAxis.normalize();

let parent = new MyObject(bodyCylinder.cylinderSkinnedMesh, bodyHeight,
    bodyCylinder.bones, restAxis, null, materials);
meshObjects.push(parent);


const numberLine = 3;
for(let i = 0; i < numberLine; i++) {

    let thetaPas = 2 * Math.PI / cylinderCount;
    let theta = 0;

    for(let k = 0; k < cylinderCount; k++) {

        const detailCylinder = createCylinder(radiusTop, radiusBottom, height, segmentCount, materials);
        allObjects.push(detailCylinder.cylinderSkinnedMesh);


        // Position correctly
        let bones = detailCylinder.bones;
        let rootBone = bones[0];

        rootBone.position.set(bodyRadius * Math.cos(theta), bodyHeight / 2 - radiusBottom - (i * 35), bodyRadius * Math.sin(theta));

        //rootBone.applyQuaternion(Q);

        let q = new THREE.Quaternion();
        let axis = rootBone.position.clone().sub(new THREE.Vector3(0, height, 0));
        axis.normalize();
        let rotationAxis = new THREE.Vector3(0, 1, 0);
        rotationAxis.cross(axis);
        rotationAxis.normalize();
        q.setFromAxisAngle(rotationAxis, Math.PI / 2);
        rootBone.applyQuaternion(q);

        theta += thetaPas;


        // Update joints
        /*for(let j = 0; j < bones.length; j++) {
            bones[j].updateMatrixWorld(true);
        }*/

        detailCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

        let endPoint = new THREE.Vector3();
        console.log(bones[bones.length - 1].matrixWorld)
        endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
        let restAxis = bones[0].worldToLocal(endPoint);
        restAxis.normalize(); // Loca rest Axis

        console.log(restAxis)

        // Store object
        let object = new MyObject(detailCylinder.cylinderSkinnedMesh, height,
            detailCylinder.bones, restAxis, parent, materials)
        meshObjects.push(object);
        parent.addChild(object);

        let numberLeaf = 4; 
        let alphaPas = 2 * Math.PI / numberLeaf;
        let alpha = 0
        for (let j = 0; j < numberLeaf; j++) {
            const radiusTopLeaf = 0.2;
            const radiusBottomLeaf = 1;
            const leafHeight = 20;

            const leafCylinder = createCylinder(radiusTopLeaf, radiusBottomLeaf, leafHeight, segmentCount, materials);
            allObjects.push(leafCylinder.cylinderSkinnedMesh);

            let bones = leafCylinder.bones;
            let rootBone = bones[0];

            let leafPos = worldPos(new THREE.Vector3(radiusTop * Math.cos(alpha), 0, radiusTop * Math.sin(alpha)), object, object.restBones, object.lengthBones - 1);
            //console.log(leafPos);

            rootBone.position.copy(leafPos);
            rootBone.applyQuaternion(q);

            alpha += alphaPas;

            leafCylinder.cylinderSkinnedMesh.updateMatrixWorld(true);

            let endPoint = new THREE.Vector3();
            endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
            let restAxis = bones[0].worldToLocal(endPoint);
            restAxis.normalize(); // Local rest Axis

            // Store object
            let leaf = new MyObject(leafCylinder.cylinderSkinnedMesh, leafHeight,
                leafCylinder.bones, restAxis, object, materials)
            meshObjects.push(leaf);
            object.addChild(leaf);
        }
    }
}

export { allObjects, meshObjects };