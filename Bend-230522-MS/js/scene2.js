import * as THREE from 'three';
import { MyObject } from './myObject.js'

let materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034, transparent : true, opacity : 0.8 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4, transparent : true, opacity : 0.8 }),
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


let allObjects = []; // All elements of the scene

// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
allObjects.push(spotLight);


function createCylinder(radiusTop, radiusBottom, height, segmentCount) {
    let segmentHeight = height / segmentCount;

    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, segmentCount);
    const cylinderMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    cylinderMesh.castShadow = true;
    allObjects.push(cylinderMesh);

    // Initialize weights for skeleton binding
    const skinIndices = [];
    const skinWeights = [];

    let cylinderPosition = cylinderGeometry.getAttribute('position');
    const cylinderVertex = new THREE.Vector3();
    for (let i = 0; i < cylinderPosition.count; i++) {
        cylinderVertex.fromBufferAttribute(cylinderPosition, i);

        const y = cylinderVertex.y + height / 2;

        const skinIndex = Math.floor(y / segmentHeight);
        const skinWeight = (y % segmentHeight) / segmentHeight;

        skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    cylinderGeometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
    cylinderGeometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(skinWeights, 4));

    let bones = [];

    // Root
    let rootBone = new THREE.Bone();
    rootBone.name = "Root bone";
    rootBone.position.y = - height / 2; // Put it at the bottom of the cylinder (instead of middle) --> local pos wrt cylinder pos
    bones.push(rootBone);

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    prevBone.position.y = 0; // Local pos wrt root
    rootBone.add(prevBone);
    bones.push(prevBone);


    for (let i = 1; i <= segmentCount; i++) {
        const bone = new THREE.Bone();
        bone.position.y = segmentHeight; // Local pos wrt prev bone
        bone.name = "Bone " + i;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
    }


    // Create the skeleton
    const skeleton = new THREE.Skeleton(bones);

    cylinderMesh.add(bones[0]);
    cylinderMesh.bind(skeleton);

    return { cylinderMesh, bones }
}



let meshObjects = []; // Elements to animate

const cylinderCount = 30;
const radiusTop = 0.2;
const radiusBottom = 3;
const segmentCount = 20;

let maxHeight = 40;

// MESH


const bodyHeight = 75;
const bodyRadius = 25;

const bodyCylinder = createCylinder(bodyRadius, bodyRadius, bodyHeight, segmentCount);

// Update joints
for(let i = 0; i < bodyCylinder.bones.length; i++) {
    bodyCylinder.bones[i].updateMatrixWorld(true);
}

bodyCylinder.cylinderMesh.updateMatrixWorld();


let bones = bodyCylinder.bones;
let endPoint = new THREE.Vector3();
endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
let restAxis = bones[0].worldToLocal(endPoint);
restAxis.normalize();

meshObjects.push(new MyObject(bodyCylinder.cylinderMesh, bodyHeight,
    bodyCylinder.bones, restAxis, 0, materials));


const numberLine = 5;
let height;
for(let i = 0; i < numberLine; i++) {

    let numberElement = cylinderCount / (i + 1);
    let r = bodyRadius - i * 2;
    let thetaPas = 2 * Math.PI / numberElement;
    let theta = 0;

    height = maxHeight  - (numberLine - i) * 3;
    let segmentHeight = height / segmentCount;

    for(let k = 0; k < numberElement; k++) {

        const detailCylinder = createCylinder(radiusTop, radiusBottom, height, segmentCount);
        
        // Position correctly
        let bones = detailCylinder.bones;
        let rootBone = bones[0];

        rootBone.position.set(r * Math.cos(theta), bodyHeight / 2, r * Math.sin(theta));

        let q = new THREE.Quaternion();
        let axis = rootBone.position.clone().sub(new THREE.Vector3(0, height, 0));
        axis.normalize();
        let rotationAxis = new THREE.Vector3(0, 1, 0);
        rotationAxis.cross(axis);
        rotationAxis.normalize();
        q.setFromAxisAngle(rotationAxis, Math.PI / 1.7 - i * (Math.PI / 8));
        rootBone.applyQuaternion(q);

        theta += thetaPas;


        // Update joints
        for(let j = 0; j < bones.length; j++) {
            bones[j].updateMatrixWorld(true);
        }

        let endPoint = new THREE.Vector3();
        endPoint.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
        let restAxis = bones[0].worldToLocal(endPoint);
        restAxis.normalize();

        // Store object
        meshObjects.push(new MyObject(detailCylinder.cylinderMesh, height,
            detailCylinder.bones, restAxis, 1, materials));
    }
}

export { allObjects, meshObjects };