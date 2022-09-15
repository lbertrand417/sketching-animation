"use strict;"

// Import libraries
import * as THREE from 'three';
import { settings } from './gui.js';
import { materials } from './materials.js';
import { updateTimeline } from './main.js';
import { getVertex, getRotation, worldPos } from './utils.js';
import { allObjects as allObjects1, meshObjects as meshObjects1 } from './scenes/scene1.js';
import { allObjects as allObjects2, meshObjects as meshObjects2 } from './scenes/scene2.js';
import { allObjects as allObjects3, meshObjects as meshObjects3 } from './scenes/scene3.js';
import { allObjects as allObjects4, meshObjects as meshObjects4 } from './scenes/scene4.js';
import { allObjects as allObjects5, meshObjects as meshObjects5 } from './scenes/scene5.js';
import { allObjects as allObjects6, meshObjects as meshObjects6 } from './scenes/scene6.js';
import { allObjects as allObjects7, meshObjects as meshObjects7 } from './scenes/scene7.js';
import { allObjects as allObjects8, meshObjects as meshObjects8 } from './scenes/scene8.js';
import { allObjects as allObjects9, meshObjects as meshObjects9 } from './scenes/scene9.js';
import { allObjects as allObjects10, meshObjects as meshObjects10 } from './scenes/scene10.js';
import { MyObject } from './myObject.js';

/**
 * Create a skinned cyclinder mesh.
 * @param {number} radiusTop - Radius of the upper part of the cylinder
 * @param {number} radiusBottom - Radius of the lower part of the cylinder
 * @param {number} height - Height of the cylinder
 * @param {number} segmentCount - Number of rows of faces along the height of the cyclinder
 * @param {Object} materials 
 * @returns The skinned mesh cylinder (cylinderSkinnedMesh) and its bones array (bones)
 */
function createCylinder(radiusTop, radiusBottom, height, segmentCount, materials) {
    let segmentHeight = height / segmentCount;

    // Create the cylinder mesh
    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, segmentCount);
    const cylinderSkinnedMesh = new THREE.SkinnedMesh(cylinderGeometry, materials.unselected.clone());
    cylinderSkinnedMesh.castShadow = true;

    // --------------- Initialize weights for skeleton binding ---------------
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


    // --------------- Create bones ---------------
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


    // --------------- Create the skeleton ---------------
    const skeleton = new THREE.Skeleton(bones);

    cylinderSkinnedMesh.add(bones[0]);
    cylinderSkinnedMesh.bind(skeleton);

    return { cylinderSkinnedMesh, bones }
}

/**
 * Load a scene
 * @param {string} s - The name of the scene
 */
function loadScene(s) {
    // Reitinialize the historic
    savePathPositions = [];
    savePathTimings = [];
    saveHistoric = [];
    indexHistoric = 0;
    indexPath = 0;

    // --------------- LOAD SCENE ELEMENTS ---------------

    // Initialize the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xEEEEEE );
    //scene.autoUpdate = false; // When false, matrix are not updated during renderer and has to be done manually (doing it manually improves performance)
    let axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(30, 0, 0);
    axesHelper.updateWorldMatrix(false, false)
    scene.add( axesHelper );

    // Initialize the 3D line (displayed in real-time when the user draws a new trajectory)
    let lineGeometry = new THREE.BufferGeometry().setFromPoints([]);
    sketch.line3D = new THREE.Line(lineGeometry, materials.path.clone());
    sketch.line3D.geometry.dynamic = true;
    scene.add(sketch.line3D);
    
    // Deactivate animation
    animation.isAnimating = false;

    // Load scene elements
    switch(s) {
        case "Orientation" :
            objects = [...meshObjects1];
            for (let i = 0; i < allObjects1.length; i++) {
                scene.add(allObjects1[i]);
            }
            break;
        case "Anemone" :
            objects = [...meshObjects2];
            for (let i = 0; i < allObjects2.length; i++) {
                scene.add(allObjects2[i]);
            }
            break;
        case "Scale" :
            objects = [...meshObjects3];
            for (let i = 0; i < allObjects3.length; i++) {
                scene.add(allObjects3[i]);
            }
            break;
        case "Bones" :
            objects = [...meshObjects4];
            for (let i = 0; i < allObjects4.length; i++) {
                scene.add(allObjects4[i]);
            }
            break;
        case "Basic" :
            objects = [...meshObjects5];
            for (let i = 0; i < allObjects5.length; i++) {
                scene.add(allObjects5[i]);
            }
            break;
        case "Flower" :
            objects = [...meshObjects6];
            for (let i = 0; i < allObjects6.length; i++) {
                scene.add(allObjects6[i]);
            }
            break;
        case "Pole" :
            objects = [...meshObjects7];
            for (let i = 0; i < allObjects7.length; i++) {
                scene.add(allObjects7[i]);
            }
            break;
        case "Test1" :
            objects = [...meshObjects8];
            for (let i = 0; i < allObjects8.length; i++) {
                scene.add(allObjects8[i]);
            }
            break;
        case "Test2" :
            objects = [...meshObjects9];
            for (let i = 0; i < allObjects9.length; i++) {
                scene.add(allObjects9[i]);
            }
            break;
        case "Levels" :
            objects = [...meshObjects10];
            for (let i = 0; i < allObjects10.length; i++) {
                scene.add(allObjects10[i]);
            }
            break;
    }

    // --------------- LOAD HELPERS (LINKS, AXES, PATHS,...) ---------------
    
    // Reset variable
    selectedObjects = [];
    root = null;
    selectableLinks = [];
    for(let k = 0; k < objects.length; k++) {
        scene.add(objects[k].root);
        objects[k].root.visible = settings.root;

        scene.add(objects[k].display.rawPath);
        objects[k].display.rawPath.visible = settings.rawPath;

        scene.add(objects[k].display.cleanPath);
        objects[k].display.cleanPath.visible = settings.cleanPath;

        scene.add(objects[k].display.effectorPath);
        objects[k].display.effectorPath.visible = settings.effectorPath;

        scene.add(objects[k].pathDisplay);
        objects[k].pathDisplay.visible = settings.path;

        scene.add(objects[k].timingDisplay);
        objects[k].timingDisplay.visible = settings.path;

        scene.add(objects[k].axisDisplay)
        objects[k].axisDisplay.visible = settings.speeds;

        // Reinit materials (deselect all)
        objects[k].material = materials.unselected.clone(); 
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            scene.add(objects[k].links[i]);
            scene.add(objects[k].speedDisplay[i]);
            objects[k].linkMaterial(i, materials.links.clone());
        }

        // Reduce the number of visible links
        let visible = Math.ceil(objects[k].lengthLinks / 5);
        for(let i = objects[k].lengthLinks - 1; i >= 0; i-= visible) {
            objects[k].links[i].visible = settings.links;
            selectableLinks.push(objects[k].links[i]);

            objects[k].axesHelpers[i].visible = settings.axes;
            objects[k].speedDisplay[i].visible = settings.speeds;
        }

        // Find the root object of the hierarchy
        if(objects[k].parent.object == null && objects[k].children.length != 0) {
            root = objects[k];
        }
    }

    // TODO: Retrieve targets. targets disappear when switching scenes

    // ---------------------------------------------

    // Update timeline
    updateTimeline();
    
    // Find correspondences between attached objects
    findCorrespondences(root);
}

/**
 * Recursive function that finds attached point between an object and its child for all the object in the hierarchy.
 * The correspondence (i.e, attached point) is part of the parent mesh.
 * @param {MyObject} root - Parent object where we search the correspondences
 */
function findCorrespondences(root) {
    if(root != null) {
        console.log('find correspondences')

        // --------------- Find correspondence (closest point) in parent mesh ---------------
        const positionAttribute = root.positions;
        // For each vertex in parent mesh
        for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            // Retrieve the vertex
            let vertex = getVertex(root, vertexIndex);

            // For each child
            for (let k = 0; k < root.children.length; k++) {
                let child = root.children[k];

                // Retrieve the current correspondence
                let currentCor = getVertex(root, child.parent.anchor)

                // Retrieve root position of the child object
                let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1); // World pos

                // Compute distances btw root and current closest point and btw root and new vertex
                let currentD = worldRootPos.clone().distanceTo(currentCor);
                let newD = worldRootPos.clone().distanceTo(vertex);

                // If new vertex is closer, update the correspondence
                if(newD < currentD) {
                    child.parent.anchor = vertexIndex;
                }
            }
        }

        // --------------- Compute position/rotation offsets btw correspondence and child root ---------------

        for (let k = 0; k < root.children.length; k++) {
            let child = root.children[k];
            let vertex = getVertex(root, child.parent.anchor); // World position of the correspondence
            let vertexRot = getRotation(root, child.parent.anchor); // World rotation of the correspondence

            let worldRootPos = worldPos(child.bones[0].position.clone(), child, child.bones, -1); // World  root position

            child.parent.offsetPos = worldRootPos.clone().sub(vertex); // World translation offset
            child.parent.offsetPos.applyQuaternion(vertexRot.clone().invert()); // Local translation offset

            child.parent.offsetQ = vertexRot.invert().multiply(child.bones[0].quaternion); // World rotation offset

            // Recurse on children
            findCorrespondences(root.children[k]);
        }
    }
}


export { createCylinder, loadScene, findCorrespondences }