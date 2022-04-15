import * as THREE from 'three';
import { materials, getRandomInt } from './utils.js';

let allObjects = []; // All elements of the scene
let detailObjects = []; // Elements to animate


// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
allObjects.push(spotLight);


// MESH

let effectors = [];

for(let k = 0; k < cylinderCount; k++) {
    const cylinderGeometry = new THREE.CylinderGeometry(5, 5, sizing.height, 32, sizing.segmentCount);
    const cylinderMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    console.log(cylinderMesh.material);
    cylinderMesh.position.set(getRandomInt(-50, 50), 0, getRandomInt(-50, 50));
    cylinderMesh.castShadow = true;
    allObjects.push(cylinderMesh);

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
    let axesHelper = new THREE.AxesHelper( 10 );
    rootBone.add( axesHelper );

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    prevBone.position.y = 0;
    rootBone.add(prevBone);
    bones.push(prevBone);
    axesHelper = new THREE.AxesHelper( 10 );
    prevBone.add(axesHelper);

    for (let i = 1; i <= sizing.segmentCount; i++) {
        const bone = new THREE.Bone();
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
    allObjects.push(skeletonHelper);
    allObjects.push(boneContainer);

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
    allObjects.push(effector);
    effectors.push(effector);

    let bonesDisplay = [];
    for(let i = 1; i < bones.length - 1; i++) {
        let boneDisplay= new THREE.Mesh( sphereGeometry, materials.links.clone() );
        boneDisplay.position.setFromMatrixPosition(bones[i].matrixWorld);
        allObjects.push(boneDisplay);
        bonesDisplay.push(boneDisplay);
    }

    let rootDisplay = new THREE.Mesh( sphereGeometry, materials.root.clone() );
    rootDisplay.position.setFromMatrixPosition(bones[0].matrixWorld);
    allObjects.push(rootDisplay);

    let pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
    let pathDisplay= new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    allObjects.push(pathDisplay);

    const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
    const timingDisplay = new THREE.Points( timingGeometry, materials.timing.clone() );
    allObjects.push(timingDisplay);

    // Store object
    detailObjects.push({ mesh : cylinderMesh,
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

// Plane
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.translateY(-sizing.halfHeight);
plane.rotation.x = Math.PI * -.5;
plane.receiveShadow = true;
allObjects.push(plane);

export { allObjects, detailObjects, effectors };