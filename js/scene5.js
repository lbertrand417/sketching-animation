import * as THREE from 'three';

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


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// MESH

for(let k = 0; k < cylinderCount; k++) {
    const cylinderGeometry = new THREE.CylinderGeometry(5, 5, sizing.height, 32, sizing.segmentCount);
    const cylinderMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
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
    let axesHelpers = [];

    // Root
    let rootBone = new THREE.Bone();
    rootBone.name = "Root bone";
    rootBone.position.y = -sizing.halfHeight;
    bones.push(rootBone);
    let axesHelper = new THREE.AxesHelper( 10 );
    rootBone.add(axesHelper);
    axesHelpers.push(axesHelper);

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    prevBone.position.y = 0;
    rootBone.add(prevBone);
    bones.push(prevBone);
    axesHelper = new THREE.AxesHelper( 10 );
    prevBone.add(axesHelper);
    axesHelpers.push(axesHelper);

    for (let i = 1; i <= sizing.segmentCount; i++) {
        const bone = new THREE.Bone();
        bone.position.y = sizing.segmentHeight;
        bone.name = "Bone " + i;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
        axesHelper = new THREE.AxesHelper( 10 );
        bone.add(axesHelper);
        axesHelpers.push(axesHelper);
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

    // Update joints
    for(let i = 0; i < bones.length; i++) {
        bones[i].updateMatrixWorld(true);
    }

    let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

    let bonesDisplay = [];
    for(let i = 1; i < bones.length; i++) {
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

    let restAxis = bones[0].worldToLocal(bonesDisplay[bonesDisplay.length - 1].position.clone());
    //let restAxis = bones[0].worldToLocal(effector.position.clone());
    restAxis.normalize();
    

    // Store object
    meshObjects.push({ mesh : cylinderMesh,
                height : sizing.height,
                skeleton : skeleton,
                bones : bones,
                restAxis : restAxis,
                level : 1,
                parent : { 
                    index : 0,
                    offsetPos : new THREE.Vector3(),
                    offsetQ : new THREE.Quaternion()
                },
                path : {
                    positions : [],
                    timings : [],
                    index : null,
                    startTime : new Date().getTime(),
                    effector : null,
                    target: null
                },
                display : { 
                    links : bonesDisplay,
                    root : rootDisplay,
                    skeleton : skeletonHelper,
                    axes : axesHelpers,
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

export { materials, allObjects, meshObjects };