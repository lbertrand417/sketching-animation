"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials as materials1, allObjects as allObjects1, meshObjects as meshObjects1 } from './scene1.js';
import { materials as materials2, allObjects as allObjects2, meshObjects as meshObjects2, tests as tests2} from './scene2.js';
import { materials as materials3, allObjects as allObjects3, meshObjects as meshObjects3 } from './scene3.js';
import { materials as materials4, allObjects as allObjects4, meshObjects as meshObjects4 } from './scene4.js';
import { materials as materials5, allObjects as allObjects5, meshObjects as meshObjects5 } from './scene5.js';

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
            materials = {...materials1};
            break;
        case 2 :
            objects = [...tests2];
            for (let i = 0; i < allObjects2.length; i++) {
                global.scene.add(allObjects2[i]);
            }
            materials = {...materials2};
            break;
        case 3 :
            objects = [...meshObjects3];
            for (let i = 0; i < allObjects3.length; i++) {
                global.scene.add(allObjects3[i]);
            }
            materials = {...materials3};
            break;
        case 4 :
            objects = [...meshObjects4];
            for (let i = 0; i < allObjects4.length; i++) {
                global.scene.add(allObjects4[i]);
            }
            materials = {...materials4};
            break;
        case 5 :
            objects = [...meshObjects5];
            for (let i = 0; i < allObjects5.length; i++) {
                global.scene.add(allObjects5[i]);
            }
            materials = {...materials5};
            break;
    }

    // Retrieve the parent if it exists + reset materials
    parent = null;
    for(let k = 0; k < objects.length; k++) {
        objects[k].meshMaterial = materials.unselected.clone();
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].setLinkMaterial(i, materials.links.clone());
        }
        if(objects[k].isParent) {
            parent = objects[k];
        }
    }

    // Reset selected objects
    selectedObjects = [];
}

// Find correspondences between detail objects and the parent mesh
function findCorrespondences() {
    if(parent != null) {
        const positionAttribute = parent.meshPosition;

        console.log(positionAttribute)

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
                    currentCor.fromBufferAttribute(positionAttribute, objects[k].parentIndex);
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
                        objects[k].parentIndex = vertexIndex;
                        objects[k].offsetPos = vertex.clone().sub(worldRootPos); // Global translation offset

                        // Retrieve rotation of new vertex in world space (using skeleton of the mesh)
                        let vertexRot = new THREE.Quaternion(0, 0, 0, 0); // World space
                        for (let i = 0; i < 4; i++) {
                            let weight = skinWeight.getComponent(i);
                
                            if(weight != 0) {
                                let boneIndex = skinIndex.getComponent(i);
                                
                                let boneQ = new THREE.Quaternion();
                                //parent.skeleton.bones[boneIndex].getWorldQuaternion(boneQ);
                                parent.bones[boneIndex].getWorldQuaternion(boneQ);
                                boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
                                vertexRot.set(vertexRot.x + boneQ.x, vertexRot.y + boneQ.y, vertexRot.z + boneQ.z, vertexRot.w + boneQ.w);
                            }
                        }
                        vertexRot.normalize();

                        objects[k].offsetQ = vertexRot.invert().multiply(objects[k].bones[0].quaternion); // Global rotation offset
                    }
                }
            }
        }
    }
}


export { loadScene, findCorrespondences }