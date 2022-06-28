"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials } from './materials.js';
import { updateTimeline } from './main.js';
import { getVertex, getRotation, worldPos } from './utils.js';
import { allObjects as allObjects1, meshObjects as meshObjects1 } from './scene1.js';
import { allObjects as allObjects2, meshObjects as meshObjects2 } from './scene2.js';
import { allObjects as allObjects3, meshObjects as meshObjects3 } from './scene3.js';
import { allObjects as allObjects4, meshObjects as meshObjects4 } from './scene4.js';
import { allObjects as allObjects5, meshObjects as meshObjects5 } from './scene5.js';
import { allObjects as allObjects6, meshObjects as meshObjects6 } from './scene6.js';
import { allObjects as allObjects7, meshObjects as meshObjects7 } from './scene7.js';

function createCylinder(radiusTop, radiusBottom, height, segmentCount, materials) {
    let segmentHeight = height / segmentCount;

    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, segmentCount);
    const cylinderSkinnedMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    //const cylinderMesh = new THREE.Mesh(cylinderGeometry.clone(), materials.unselected.clone());
    cylinderSkinnedMesh.castShadow = true;

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

    cylinderSkinnedMesh.add(bones[0]);
    cylinderSkinnedMesh.bind(skeleton);

    return { cylinderSkinnedMesh, bones }
}

// Load a given scene
function loadScene(s) {
    // Initialize scene
    global.scene = new THREE.Scene();
    global.scene.background = new THREE.Color( 0xEEEEEE );
    let axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(30, 0, 0);
    global.scene.add( axesHelper );
    //global.scene.autoUpdate = false;

    // Deactivate animation
    global.animation.isAnimating = false;

    // Load scene elements
    switch(s) {
        case 1 :
            objects = [...meshObjects1];
            for (let i = 0; i < allObjects1.length; i++) {
                global.scene.add(allObjects1[i]);
            }
            break;
        case 2 :
            objects = [...meshObjects2];
            for (let i = 0; i < allObjects2.length; i++) {
                global.scene.add(allObjects2[i]);
            }
            break;
        case 3 :
            objects = [...meshObjects3];
            for (let i = 0; i < allObjects3.length; i++) {
                global.scene.add(allObjects3[i]);
            }
            break;
        case 4 :
            objects = [...meshObjects4];
            for (let i = 0; i < allObjects4.length; i++) {
                global.scene.add(allObjects4[i]);
            }
            break;
        case 5 :
            objects = [...meshObjects5];
            for (let i = 0; i < allObjects5.length; i++) {
                global.scene.add(allObjects5[i]);
            }
            break;
        case 6 :
            objects = [...meshObjects6];
            for (let i = 0; i < allObjects6.length; i++) {
                global.scene.add(allObjects6[i]);
            }
            break;
        case 7 :
            objects = [...meshObjects7];
            for (let i = 0; i < allObjects7.length; i++) {
                global.scene.add(allObjects7[i]);
            }
            break;
    }

    // Retrieve the parent if it exists + reset materials
    parent = null;
    for(let k = 0; k < objects.length; k++) {
        global.scene.add(objects[k].root);
        global.scene.add(objects[k].skeletonHelper);
        global.scene.add(objects[k].pathDisplay);
        global.scene.add(objects[k].timingDisplay);
        global.scene.add(objects[k].axisDisplay)
        objects[k].material = materials.unselected.clone();
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            global.scene.add(objects[k].links[i]);
            global.scene.add(objects[k].speedDisplay[i]);
            objects[k].linkMaterial(i, materials.links.clone());
        }
        if(objects[k].parent.object == null && objects[k].children.length != 0) {
            parent = objects[k];
        }
    }


    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            selectableObjects.push(objects[k].links[i]);
        }
    }

    // Retrieve targets

    // Reset selected objects
    selectedObjects = [];
    updateTimeline();
    
    findCorrespondences();
}

// Find correspondences between detail objects and the parent mesh
// ATTENTION NE FONCTIONNE PAS APRES UN CHANGEMENT DE SCENE
function findCorrespondences() {
    //console.log(parent);
    if(parent != null) {
        console.log('find correspondences')
        const positionAttribute = parent.positions;

        //console.log(parent.children.length);
        //console.log(parent.children);

        // Find closest point in parent mesh
        for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            let vertex = getVertex(parent, vertexIndex);

            // For every detail objects
            for (let k = 0; k < parent.children.length; k++) {
            //for (let k = 0; k < objects.length; k++) {
                //if(objects[k].level != 0) {
                //if(objects[k].parent != null) {
                // Retrieve current closest point in parent mesh
                let child = parent.children[k];

                //console.log(child);

                let currentCor = getVertex(parent, child.parent.anchor)

                // Retrieve root position
                let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1);
                //let worldRootPos = child.mesh.localToWorld(child.bones[0].position.clone());
                // Equivalent to
                // let test = new THREE.Vector3();
                // test.setFromMatrixPosition(objects[k].bones[0].matrixWorld);

                // Compute distances btw root and current closest point and btw root and new vertex
                let currentD = worldRootPos.clone().distanceTo(currentCor);
                let newD = worldRootPos.clone().distanceTo(vertex);

                // If new vertex is closer
                if(newD < currentD) {
                    child.parent.anchor = vertexIndex;
                }
                //}
            }
        }

        // Compute position/rotation offsets
        //for (let k = 0; k < objects.length; k++) {
        for (let k = 0; k < parent.children.length; k++) {
            //if(objects[k].level != 0) {
            let child = parent.children[k];
            //console.log(child.parent.anchor)
            let vertex = getVertex(parent, child.parent.anchor)
            let vertexRot = getRotation(parent, child.parent.anchor);

            let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1);
            //let worldRootPos = child.mesh.localToWorld(child.bones[0].position.clone());

            child.parent.offsetPos = worldRootPos.clone().sub(vertex); // Global translation offset
            child.parent.offsetPos.applyQuaternion(vertexRot.clone().invert()); // Local translation offset

            child.parent.offsetQ = vertexRot.invert().multiply(child.bones[0].quaternion); // Global rotation offset

            let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );
            let point = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
            point.position.set(vertex.x, vertex.y, vertex.z); // From cylinder local space to world
            global.scene.add(point);
            //}
        }
    }
}


export { createCylinder, loadScene, findCorrespondences }