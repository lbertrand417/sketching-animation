import * as THREE from 'three';
import { Vector3 } from 'three';
import { getRandomInt } from './utils.js';

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
let detailObjects = []; // Elements to animate

const cylinderCount = 30;
const radiusTop = 0.2;
const radiusBottom = 3;
const segmentCount = 7;

let maxHeight = 40;


// Lights
const ambientColor = 0xFFFFFF;
const ambientIntensity = 0.2;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
allObjects.push(ambientLight);

let spotLight = new THREE.SpotLight( 0xffffff, 0.7 );
spotLight.position.set( 0, 60, 40 );
spotLight.castShadow = true;
allObjects.push(spotLight);

const bodyHeight = 75;
const bodyRadius = 25;
const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 32, segmentCount);
const bodyMesh = new THREE.Mesh(bodyGeometry, materials.unselected.clone());
bodyMesh.position.set(0, -maxHeight / 2, 0);
bodyMesh.castShadow = true;
allObjects.push(bodyMesh);


// MESH

let effectors = [];


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
        const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, segmentCount);
        const cylinderMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
        cylinderMesh.position.set(r * Math.cos(theta), height, r * Math.sin(theta));
        theta += thetaPas;
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
        rootBone.position.y = - height / 2;
        bones.push(rootBone);
        let axesHelper = new THREE.AxesHelper( 10 );
        rootBone.add( axesHelper );
        axesHelper.visible = false;
        axesHelpers.push(axesHelper);

        // Bones (the first bone is at the same position as the root bone)
        let prevBone = new THREE.Bone();
        prevBone.name = "Bone 0";
        prevBone.position.y = 0;
        rootBone.add(prevBone);
        bones.push(prevBone);
        axesHelper = new THREE.AxesHelper( 10 );
        prevBone.add(axesHelper);
        axesHelper.visible = false;
        axesHelpers.push(axesHelper);

        for (let i = 1; i <= segmentCount; i++) {
            const bone = new THREE.Bone();
            bone.position.y = segmentHeight;
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
        //let boneContainer = new THREE.Group();
        //boneContainer.add( bones[0] );
        skeletonHelper.visible = false;
        allObjects.push(skeletonHelper);
        //allObjects.push(boneContainer);

        cylinderMesh.add(bones[0]);
        cylinderMesh.bind(skeleton);
        
        // Random rotation of cylinders
        let q = new THREE.Quaternion();
        let axis = cylinderMesh.position.clone().sub(new Vector3(0, height, 0));
        axis.normalize();
        let rotationAxis = new Vector3(0, 1, 0);
        rotationAxis.cross(axis);
        rotationAxis.normalize();
        q.setFromAxisAngle(rotationAxis, Math.PI / 1.7 - i * (Math.PI / 8));
        rootBone.applyQuaternion(q);


        // Update joints
        for(let i = 0; i < bones.length; i++) {
            bones[i].updateMatrixWorld(true);
        }

        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        let effector = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
        effector.position.setFromMatrixPosition(bones[bones.length - 1].matrixWorld);
        effector.visible = false;
        allObjects.push(effector);
        effectors.push(effector);

        let bonesDisplay = [];
        for(let i = 1; i < bones.length - 1; i++) {
            let boneDisplay= new THREE.Mesh( sphereGeometry, materials.links.clone() );
            boneDisplay.position.setFromMatrixPosition(bones[i].matrixWorld);
            boneDisplay.visible = false;
            allObjects.push(boneDisplay);
            bonesDisplay.push(boneDisplay);
        }

        let rootDisplay = new THREE.Mesh( sphereGeometry, materials.root.clone() );
        rootDisplay.position.setFromMatrixPosition(bones[0].matrixWorld);
        rootDisplay.visible = false;
        allObjects.push(rootDisplay);

        let pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        let pathDisplay= new THREE.Line(pathGeometry, materials.unselectedpath.clone());
        allObjects.push(pathDisplay);

        const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
        const timingDisplay = new THREE.Points( timingGeometry, materials.timing.clone() );
        allObjects.push(timingDisplay);

        // Store object
        detailObjects.push({ mesh : cylinderMesh,
                    height : height,
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
                        skeleton : skeletonHelper,
                        axes : axesHelpers,
                        path : pathDisplay,
                        timing : timingDisplay
                    }
                })
    }
}

export { materials, allObjects, detailObjects, effectors };