"use strict;"

// Import libraries
import * as THREE from 'three';
import { settings } from './canvas.js';
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
import { allObjects as allObjects8, meshObjects as meshObjects8 } from './scene8.js';
import { allObjects as allObjects9, meshObjects as meshObjects9 } from './scene9.js';
import { allObjects as allObjects10, meshObjects as meshObjects10 } from './scene10.js';

function createCylinder(radiusTop, radiusBottom, height, segmentCount, materials) {
    let segmentHeight = height / segmentCount;

    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, segmentCount);
    const cylinderSkinnedMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
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
    savePathPositions = [];
    savePathTimings = [];
    saveHistory = [];
    indexHistory = 0;
    indexPath = 0;

    // Initialize scene
    global.scene = new THREE.Scene();
    global.scene.background = new THREE.Color( 0xEEEEEE );
    let axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(30, 0, 0);
    axesHelper.updateWorldMatrix(false, false)
    global.scene.add( axesHelper );

    let lineGeometry = new THREE.BufferGeometry().setFromPoints([]);
    drawingLine = new THREE.Line(lineGeometry, materials.unselectedpath.clone());
    drawingLine.geometry.dynamic = true;
    global.scene.add(drawingLine);
    global.scene.autoUpdate = false;

    // Deactivate animation
    global.animation.isAnimating = false;

    // Load scene elements
    switch(s) {
        case "Orientation" :
            objects = [...meshObjects1];
            for (let i = 0; i < allObjects1.length; i++) {
                global.scene.add(allObjects1[i]);
            }
            break;
        case "Anemone" :
            objects = [...meshObjects2];
            for (let i = 0; i < allObjects2.length; i++) {
                global.scene.add(allObjects2[i]);
            }
            break;
        case "Scale" :
            objects = [...meshObjects3];
            for (let i = 0; i < allObjects3.length; i++) {
                global.scene.add(allObjects3[i]);
            }
            break;
        case "Bones" :
            objects = [...meshObjects4];
            for (let i = 0; i < allObjects4.length; i++) {
                global.scene.add(allObjects4[i]);
            }
            break;
        case "Basic" :
            objects = [...meshObjects5];
            for (let i = 0; i < allObjects5.length; i++) {
                global.scene.add(allObjects5[i]);
            }
            break;
        case "Flower" :
            objects = [...meshObjects6];
            for (let i = 0; i < allObjects6.length; i++) {
                global.scene.add(allObjects6[i]);
            }
            break;
        case "Pole" :
            objects = [...meshObjects7];
            for (let i = 0; i < allObjects7.length; i++) {
                global.scene.add(allObjects7[i]);
            }
            break;
        case "Test1" :
            objects = [...meshObjects8];
            for (let i = 0; i < allObjects8.length; i++) {
                global.scene.add(allObjects8[i]);
            }
            break;
        case "Test2" :
            objects = [...meshObjects9];
            for (let i = 0; i < allObjects9.length; i++) {
                global.scene.add(allObjects9[i]);
            }
            break;
        case "Levels" :
            objects = [...meshObjects10];
            for (let i = 0; i < allObjects10.length; i++) {
                global.scene.add(allObjects10[i]);
            }
            break;
    }

    // Retrieve the parent if it exists + reset materials
    root = null;
    for(let k = 0; k < objects.length; k++) {
        global.scene.add(objects[k].root);
        objects[k].root.visible = settings.root;
        //global.scene.add(objects[k].skeletonHelper);
        global.scene.add(objects[k].display.rawPath);
        objects[k].display.rawPath.visible = settings.rawPath;
        global.scene.add(objects[k].display.cleanPath);
        objects[k].display.cleanPath.visible = settings.cleanPath;
        global.scene.add(objects[k].display.effectorPath);
        objects[k].display.effectorPath.visible = settings.effectorPath;
        global.scene.add(objects[k].pathDisplay);
        objects[k].pathDisplay.visible = settings.path;
        global.scene.add(objects[k].timingDisplay);
        objects[k].timingDisplay.visible = settings.path;
        global.scene.add(objects[k].axisDisplay)
        objects[k].axisDisplay.visible = settings.speeds;

        //objects[k].material = materials.unselected.clone();
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            global.scene.add(objects[k].links[i]);
            
            global.scene.add(objects[k].speedDisplay[i]);
            objects[k].linkMaterial(i, materials.links.clone());
        }
        let visible = Math.ceil(objects[k].lengthLinks / 5);
        for(let i = objects[k].lengthLinks - 1; i >= 0; i-= visible) {
            objects[k].links[i].visible = settings.links;
            objects[k].axesHelpers[i].visible = settings.axes;
            objects[k].speedDisplay[i].visible = settings.speeds;
        }

        if(objects[k].parent.object == null && objects[k].children.length != 0) {
            root = objects[k];
        }
    }

    console.log(root.mesh.material);

    selectableObjects = [];
    for (let k = 0; k < objects.length; k++) {
        let selectable = Math.ceil(objects[k].lengthLinks / 5);
        for(let i = objects[k].lengthLinks - 1; i >= 0; i-= selectable) {
            selectableObjects.push(objects[k].links[i]);
        }
    }

    // Retrieve targets
    //for (let i = 0; i <)

    // Reset selected objects
    selectedObjects = [];
    updateTimeline();
    
    findCorrespondences(root);
}

// Find correspondences between detail objects and the parent mesh
// ATTENTION NE FONCTIONNE PAS APRES UN CHANGEMENT DE SCENE
function findCorrespondences(root) {
    //console.log(parent);
    if(root != null) {
        console.log('find correspondences')
        const positionAttribute = root.positions;

        // Find closest point in parent mesh
        for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            let vertex = getVertex(root, vertexIndex);

            // For every detail objects
            for (let k = 0; k < root.children.length; k++) {
                // Retrieve current closest point in parent mesh
                let child = root.children[k];

                let currentCor = getVertex(root, child.parent.anchor)

                // Retrieve root position
                let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1);
                // Equivalent to
                // let test = new THREE.Vector3();
                // test.setFromMatrixPosition(objects[k].bones[0].matrixWorld);

                // Compute distances btw root and current closest point and btw root and new vertex
                let currentD = worldRootPos.clone().distanceTo(currentCor);
                let newD = worldRootPos.clone().distanceTo(vertex);

                if(newD < currentD) {
                    child.parent.anchor = vertexIndex;
                }
            }
        }

        // Compute position/rotation offsets
        for (let k = 0; k < root.children.length; k++) {
            let child = root.children[k];
            let vertex = getVertex(root, child.parent.anchor)
            let vertexRot = getRotation(root, child.parent.anchor);

            let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1);

            child.parent.offsetPos = worldRootPos.clone().sub(vertex); // Global translation offset
            child.parent.offsetPos.applyQuaternion(vertexRot.clone().invert()); // Local translation offset

            child.parent.offsetQ = vertexRot.invert().multiply(child.bones[0].quaternion); // Global rotation offset

            /*let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );
            let point = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
            point.position.set(vertex.x, vertex.y, vertex.z); // From cylinder local space to world
            global.scene.add(point);*/

            findCorrespondences(root.children[k]);
        }
    }
}


export { createCylinder, loadScene, findCorrespondences }