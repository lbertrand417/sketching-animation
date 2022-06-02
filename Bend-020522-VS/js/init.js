"use strict;"

// Import libraries
import * as THREE from 'three';
import { updateTimeline } from './main.js';
import { allObjects as allObjects1, meshObjects as meshObjects1 } from './scene1.js';
import { allObjects as allObjects2, meshObjects as meshObjects2 } from './scene2.js';
/*import { allObjects as allObjects3, meshObjects as meshObjects3 } from './scene3.js';
import { allObjects as allObjects4, meshObjects as meshObjects4 } from './scene4.js';*/
import { allObjects as allObjects5, meshObjects as meshObjects5 } from './scene5.js';
import { allObjects as allObjects6, meshObjects as meshObjects6 } from './scene6.js';

// Load a given scene
function loadScene(s) {
    // Initialize scene
    global.scene = new THREE.Scene();
    global.scene.background = new THREE.Color( 0xEEEEEE );
    let axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(30, 0, 0);
    global.scene.add( axesHelper );

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
    }

    // Retrieve the parent if it exists + reset materials
    parent = null;
    for(let k = 0; k < objects.length; k++) {
        global.scene.add(objects[k].root);
        global.scene.add(objects[k].skeletonHelper);
        global.scene.add(objects[k].pathDisplay);
        global.scene.add(objects[k].timingDisplay);
        objects[k].material = materials.unselected.clone();
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            global.scene.add(objects[k].links[i]);
            objects[k].linkMaterial(i, materials.links.clone());
        }
        if(objects[k].isParent) {
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
    
}

// Find correspondences between detail objects and the parent mesh
function findCorrespondences() {
    if(parent != null) {
        const positionAttribute = parent.positions;

        let vertex = new THREE.Vector3();
        let skinWeight = new THREE.Vector4();
        let skinIndex = new THREE.Vector4();

        for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            vertex.fromBufferAttribute( positionAttribute, vertexIndex );
            vertex = parent.mesh.localToWorld(vertex.clone()); // World space

            skinIndex.fromBufferAttribute( parent.skinIndex, vertexIndex);
		    skinWeight.fromBufferAttribute( parent.skinWeight, vertexIndex );

            // For every detail objects
            for (let k = 0; k < objects.length; k++) {
                if(objects[k].level != 0) {
                    // Retrieve current closest point in parent mesh
                    let currentCor = new THREE.Vector3();
                    currentCor.fromBufferAttribute(positionAttribute, objects[k].parent.index);
                    currentCor = parent.mesh.localToWorld(currentCor.clone()); // World space

                    // Retrieve root position
                    let worldRootPos = objects[k].mesh.localToWorld(objects[k].bones[0].position.clone());
                    // Equivalent to
                    // let test = new THREE.Vector3();
                    // test.setFromMatrixPosition(objects[k].bones[0].matrixWorld);


                    // Compute distances btw root and current closest point and btw root and new vertex
                    let currentD = worldRootPos.clone().distanceTo(currentCor);
                    let newD = worldRootPos.clone().distanceTo(vertex);

                    // If new vertex is closer
                    if(newD < currentD) {
                        // Update correspondence info
                        objects[k].parent.index = vertexIndex;
                        objects[k].parent.offsetPos = vertex.clone().sub(worldRootPos); // Global translation offset

                        // Retrieve rotation of new vertex in world space (using skeleton of the mesh)
                        let vertexRot = new THREE.Quaternion(0, 0, 0, 0); // World space
                        for (let i = 0; i < 4; i++) {
                            let weight = skinWeight.getComponent(i);
                
                            if(weight != 0) {
                                let boneIndex = skinIndex.getComponent(i);
                                
                                let boneQ = new THREE.Quaternion();
                                parent.bones[boneIndex].getWorldQuaternion(boneQ);
                                boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
                                vertexRot.set(vertexRot.x + boneQ.x, vertexRot.y + boneQ.y, vertexRot.z + boneQ.z, vertexRot.w + boneQ.w);
                            }
                        }
                        vertexRot.normalize();

                        objects[k].parent.offsetQ = vertexRot.invert().multiply(objects[k].bones[0].quaternion); // Global rotation offset
                    }
                }
            }
        }

        /*for (let i = 1; i < objects.length; i++) {
            let index = objects[i].parent.index;

            vertex.fromBufferAttribute( positionAttribute, index );
            vertex = parent.mesh.localToWorld(vertex.clone()); // World space

            let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );
            let point = new THREE.Mesh( sphereGeometry, materials.effector.clone() );
            point.position.set(vertex.x, vertex.y, vertex.z); // From cylinder local space to world
            global.scene.add(point);
        }*/
    }
}


export { loadScene, findCorrespondences }