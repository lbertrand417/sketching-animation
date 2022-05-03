import * as THREE from 'three';
import { Quaternion, Vector3 } from 'three';
import { getRandomInt } from './utils.js';

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
    let axesHelpers = [];

    // Root
    let rootBone = new THREE.Bone();
    rootBone.name = "Root bone";
    rootBone.position.y = - height / 2; // Put it at the bottom of the cylinder (instead of middle) --> local pos wrt cylinder pos
    bones.push(rootBone);
    let axesHelper = new THREE.AxesHelper( 10 );
    rootBone.add( axesHelper );
    axesHelper.visible = false;
    axesHelpers.push(axesHelper);

    // Bones (the first bone is at the same position as the root bone)
    let prevBone = new THREE.Bone();
    prevBone.name = "Bone 0";
    prevBone.position.y = 0; // Local pos wrt root
    rootBone.add(prevBone);
    bones.push(prevBone);
    axesHelper = new THREE.AxesHelper( 10 );
    prevBone.add(axesHelper);
    axesHelper.visible = false;
    axesHelpers.push(axesHelper);

    for (let i = 1; i <= segmentCount; i++) {
        const bone = new THREE.Bone();
        bone.position.y = segmentHeight; // Local pos wrt prev bone
        bone.name = "Bone " + i;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
        axesHelper = new THREE.AxesHelper( 10 );
        bone.add(axesHelper);
        axesHelper.visible = false;
        axesHelpers.push(axesHelper);
    }


    // Create the skeleton
    const skeleton = new THREE.Skeleton(bones);

    // Skeleton helper
    let skeletonHelper = new THREE.SkeletonHelper( bones[0] );
    let boneContainer = new THREE.Group();
    boneContainer.add( bones[0] );
    skeletonHelper.visible = false;
    allObjects.push(skeletonHelper);
    allObjects.push(boneContainer);

    cylinderMesh.add(bones[0]);
    cylinderMesh.bind(skeleton);

    return { cylinderMesh, bones, axesHelpers, skeleton, skeletonHelper }
}

function createDisplay(object) {
    let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

    /*let effector = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
    effector.position.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
    effector.visible = false;
    allObjects.push(effector);
    effectors.push(effector);*/

    let bonesDisplay = [];
    for(let i = 1; i < object.bones.length; i++) {
        let boneDisplay= new THREE.Mesh( sphereGeometry, materials.links.clone() );
        boneDisplay.position.setFromMatrixPosition(object.bones[i].matrixWorld);
        boneDisplay.visible = false;
        allObjects.push(boneDisplay);
        bonesDisplay.push(boneDisplay);
    }

    let rootDisplay = new THREE.Mesh( sphereGeometry, materials.root.clone() );
    rootDisplay.position.setFromMatrixPosition(object.bones[0].matrixWorld); // From cylinder local space to world
    rootDisplay.visible = false;
    allObjects.push(rootDisplay);

    let pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
    let pathDisplay= new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    allObjects.push(pathDisplay);

    const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
    const timingDisplay = new THREE.Points( timingGeometry, materials.timing.clone() );
    allObjects.push(timingDisplay);

    //return { effector, bonesDisplay, rootDisplay, pathDisplay, timingDisplay }
    return { bonesDisplay, rootDisplay, pathDisplay, timingDisplay }
}



let meshObjects = []; // Elements to animate

const cylinderCount = 30;
const radiusTop = 0.2;
const radiusBottom = 3;
const segmentCount = 7;

let maxHeight = 40;

// MESH

//let effectors = [];

const bodyHeight = 75;
const bodyRadius = 25;

const bodyCylinder = createCylinder(bodyRadius, bodyRadius, bodyHeight, segmentCount);

bodyCylinder.cylinderMesh.position.set(0, -maxHeight / 2, 0);
bodyCylinder.cylinderMesh.updateMatrixWorld();

const bodyDisplay = createDisplay(bodyCylinder);

let bones = bodyCylinder.bones;
let rootBone = bones[0];
//let restAxis = bones[0].worldToLocal(bodyDisplay.effector.position.clone());
let restAxis = bones[0].worldToLocal(bodyDisplay.bonesDisplay[bodyDisplay.bonesDisplay.length - 1].position.clone());
restAxis.normalize();

//let parent = bodyCylinder.cylinderMesh;

meshObjects.push({ mesh : bodyCylinder.cylinderMesh,
    height : bodyHeight,
    skeleton : bodyCylinder.skeleton,
    bones : bodyCylinder.bones,
    restAxis : restAxis,
    level : 0,
    parent : null,
    path : {
        positions : [],
        timings : [],
        index : null,
        startTime : new Date().getTime(),
        effector : null
    },
    display : { 
        //effector : bodyDisplay.effector,
        links : bodyDisplay.bonesDisplay,
        root : bodyDisplay.rootDisplay,
        skeleton : bodyCylinder.skeletonHelper,
        axes : bodyCylinder.axesHelpers,
        path : bodyDisplay.pathDisplay,
        timing : bodyDisplay.timingDisplay
    }
})


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

        rootBone.position.set(r * Math.cos(theta), height / 2, r * Math.sin(theta));
        //rootBone.position.set(0, height / 2, 0);

        let q = new THREE.Quaternion();
        let axis = rootBone.position.clone().sub(new Vector3(0, height, 0));
        axis.normalize();
        let rotationAxis = new Vector3(0, 1, 0);
        rotationAxis.cross(axis);
        rotationAxis.normalize();
        q.setFromAxisAngle(rotationAxis, Math.PI / 1.7 - i * (Math.PI / 8));
        rootBone.applyQuaternion(q);

        theta += thetaPas;


        // Update joints
        for(let i = 0; i < bones.length; i++) {
            bones[i].updateMatrixWorld(true);
        }

        const detailDisplay = createDisplay(detailCylinder);        

        let restAxis = bones[0].worldToLocal(detailDisplay.bonesDisplay[detailDisplay.bonesDisplay.length - 1].position.clone());
        restAxis.normalize();

        // Store object
        meshObjects.push({ mesh : detailCylinder.cylinderMesh,
                    height : height,
                    skeleton : detailCylinder.skeleton,
                    bones : detailCylinder.bones,
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
                        effector : null
                    },
                    display : { 
                        //effector : detailDisplay.effector,
                        links : detailDisplay.bonesDisplay,
                        root : detailDisplay.rootDisplay,
                        skeleton : detailCylinder.skeletonHelper,
                        axes : detailCylinder.axesHelpers,
                        path : detailDisplay.pathDisplay,
                        timing : detailDisplay.timingDisplay
                    }
                })
    }
}

//export { materials, allObjects, meshObjects, effectors };
export { materials, allObjects, meshObjects };