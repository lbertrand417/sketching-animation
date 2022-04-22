"use strict;"

// Import libraries
import * as THREE from 'three';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from '../three.js/examples/jsm/controls/TransformControls.js';
import { DragControls } from "../three.js/examples/jsm/controls/DragControls.js";
import { CCDIKSolver, CCDIKHelper } from "../three.js/examples/jsm//animation/CCDIKSolver.js";
import { Quaternion, Vector3 } from 'three';
import { loadScene, project3D, fromLocalToGlobal, updatePath, addSelectedObject } from './utils.js';


// Initalize renderer
global.renderer = new THREE.WebGLRenderer();
global.renderer.setSize(window.innerWidth, window.innerHeight);
global.renderer.shadowMap.enabled = true;
document.body.appendChild(global.renderer.domElement); // renderer.domElement creates a canvas

// Initialize camera
global.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
global.camera.position.set(0, 0, 250);
global.camera.lookAt(0, 0, 0);


loadScene(2);

// Find correspondences
function findCorrespondences() {
    if(parent != null) {
        const positionAttribute = parent.mesh.geometry.getAttribute( 'position' );

        let vertex = new THREE.Vector3();
        let skinWeight = new THREE.Vector4();
        let skinIndex = new THREE.Vector4();

        for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            vertex.fromBufferAttribute( positionAttribute, vertexIndex );
            vertex = parent.mesh.localToWorld(vertex.clone()); // World space

            skinIndex.fromBufferAttribute( parent.mesh.geometry.attributes.skinIndex, vertexIndex);
		    skinWeight.fromBufferAttribute( parent.mesh.geometry.attributes.skinWeight, vertexIndex );

            

            for (let k = 0; k < objects.length; k++) {
                let currentCor = new THREE.Vector3();
                currentCor.fromBufferAttribute(positionAttribute, objects[k].parent.index);
                currentCor = parent.mesh.localToWorld(currentCor.clone()); // World space

                
                let worldRootPos = objects[k].mesh.localToWorld(objects[k].bones[0].position.clone());
                // Equivalent to
                // let test = new THREE.Vector3();
                // test.setFromMatrixPosition(objects[k].bones[0].matrixWorld);


                let currentD = worldRootPos.clone().distanceTo(currentCor);
                let newD = worldRootPos.clone().distanceTo(vertex);
                if(newD < currentD) {
                    objects[k].parent.index = vertexIndex;
                    objects[k].parent.offsetPos = vertex.clone().sub(worldRootPos); // Global offset

                    let vertexRot = new THREE.Quaternion(0, 0, 0, 0); // World space
                    for (let i = 0; i < 4; i++) {
                        let weight = skinWeight.getComponent(i);
            
                        if(weight != 0) {
                            
                            let boneIndex = skinIndex.getComponent(i);
                            console.log('bone index', boneIndex)
                            
                            let boneQ = new THREE.Quaternion();
                            //console.log(mesh.skeleton);
                            //console.log(mesh.skeleton.bones[boneIndex]);
                            parent.skeleton.bones[boneIndex].getWorldQuaternion(boneQ);
                            boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
                            //boneQ.multiplyScalar(weight);
                            console.log('boneQ', boneQ);
                            vertexRot.set(vertexRot.x + boneQ.x, vertexRot.y + boneQ.y, vertexRot.z + boneQ.z, vertexRot.w + boneQ.w);
                        }
                    }
                    vertexRot.normalize();

                    objects[k].parent.offsetQ = vertexRot.invert().multiply(objects[k].bones[0].quaternion);
                    console.log('offsetS', objects[k].parent.offsetQ);
                }
            }
        }
    }
}
findCorrespondences();

// Controls
const orbitControls = new OrbitControls(global.camera, global.renderer.domElement);
orbitControls.update();


function animate() {
    // Animation
    if(global.animation.isAnimating) {
        let currentTime = new Date().getTime() - global.animation.startTime;
        // TODO: restart startTime when attaining max timing
        //console.log('currentTime', currentTime);

        if(selectedObjects.length == 0) {
            timeline.min = 0;
            timeline.max = 0;
            timeline.value = 0;
        } else {
            let timelineValue = currentTime;
            while (timelineValue < parseInt(timeline.min)) {
                timelineValue += parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }
            while (timelineValue > parseInt(timeline.max)) {
                timelineValue -= parseInt(timeline.max) - parseInt(timeline.min) + 1;
            }

            timeline.value = timelineValue;
        }

        updateAnimation(currentTime);
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    global.renderer.render(global.scene, global.camera);
}
animate();


function updateAnimation(currentTime) {    
    for(let k = 0; k < objects.length; k++) {
        if(objects[k].path.timings.length != 0) { 

            let objectTime =  currentTime;
            while (objectTime < objects[k].path.timings[0]) {
                objectTime += objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            while (objectTime > objects[k].path.timings[objects[k].path.timings.length - 1]) {
                objectTime -= objects[k].path.timings[objects[k].path.timings.length - 1] - objects[k].path.timings[0] + 1;
            }

            let new_pos = findPosition(objects[k], objectTime);

            // Display target
            objects[k].display.timing.geometry = new THREE.BufferGeometry().setFromPoints([new_pos]);

            // Update bones
            let worldRotation = computeAngleAxis(objects[k], new_pos);
            updateBones(objects[k], worldRotation);

            if(objects[k].level == 0) {
                updateChildren(objects[k]);
            }
        }
    }
}

function findPosition(object, time) {
    // Find closests points in the line
    let i = 0;
    object.path.index = 0;
    while (i < object.path.timings.length - 1) {
        if(time >= object.path.timings[i] && time <= object.path.timings[i + 1]) {
            object.path.index = i;
            i = object.path.timings.length;
        } else {
            i++;
        }
    }

    // Interpolate
    let index = object.path.index;
    let alpha = (time - object.path.timings[index]) / (object.path.timings[index + 1] - object.path.timings[index]);
    let position = object.path.positions[index].clone().multiplyScalar(1 - alpha).add(object.path.positions[index + 1].clone().multiplyScalar(alpha)); // Local position
    object.bones[0].localToWorld(position); // Global position
    
    return position;
}

function computeAngleAxis(object, target) {
   // Retrieve root bone info
   let rootBone = object.bones[0];
   let rootPos = new THREE.Vector3();
   let invRootQ = new THREE.Quaternion();
   let rootScale = new THREE.Vector3();
   rootBone.matrixWorld.decompose(rootPos, invRootQ, rootScale);
   invRootQ.invert();

   // Get world rotation vectors
   let n = target.clone().sub(rootPos);
   n.normalize();
   let t = new THREE.Vector3();
   t.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
   t.sub(rootPos);
   t.normalize();

   // Compute rotation axis
   let axis = new THREE.Vector3();
   axis.crossVectors(t, n);
   axis.normalize();


   // Compute world rotation angle
   let angle = t.dot(n);
   angle = Math.acos(angle);

   return { angle, axis };
}

function updateDisplay(object) {
    // Update joints
    for(let i = 0; i < object.bones.length; i++) {
        object.bones[i].updateMatrixWorld(true);
    }
    
    // Update joints display
    object.display.effector.position.setFromMatrixPosition(object.bones[object.bones.length - 1].matrixWorld);
    for(let i = 0; i < object.display.links.length; i++) {
        object.display.links[i].position.setFromMatrixPosition(object.bones[i+1].matrixWorld);
    }
    object.display.root.position.setFromMatrixPosition(object.bones[0].matrixWorld);
}

function updateBones(object, worldRotation) {

    for(let i = 1; i <= object.bones.length - 1; i++) {
        // Put axis in parent space
        let parentBone = object.bones[i-1];
        let parentPos = new THREE.Vector3();
        let invParentQ = new THREE.Quaternion();
        let parentScale = new THREE.Vector3();
        parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
        invParentQ.invert();
        let localAxis = worldRotation.axis.clone().applyQuaternion(invParentQ);

        // Compute quaternion
        // On peut parametrer les angles mais il faut que sum(theta_i) = theta
        let q = new THREE.Quaternion();
        q.setFromAxisAngle(localAxis, worldRotation.angle / object.display.links.length);
        object.bones[i].applyQuaternion(q);
    }

    updateDisplay(object);
}


function updateChildren(object) { // TODO: Changer mesh par object pour pouvoir etudier level
    const positionAttribute = object.mesh.geometry.getAttribute( 'position' );
    let vertex = new THREE.Vector3();
    let skinWeight = new THREE.Vector4();
    let skinIndex = new THREE.Vector4();

    for(let k = 0; k < objects.length; k++) { // TODO: Adapt
        if(objects[k].level == object.level + 1) {

            vertex.fromBufferAttribute(positionAttribute, objects[k].parent.index); // Rest pose local position

            skinIndex.fromBufferAttribute( object.mesh.geometry.attributes.skinIndex, objects[k].parent.index );
            skinWeight.fromBufferAttribute( object.mesh.geometry.attributes.skinWeight, objects[k].parent.index );

            let newRot = new THREE.Quaternion(0, 0, 0, 0); // World space
            for (let i = 0; i < 4; i++) {
                let weight = skinWeight.getComponent(i);

                if(weight != 0) {
                    
                    let boneIndex = skinIndex.getComponent(i);
                    
                    let boneQ = new THREE.Quaternion();
                    object.mesh.skeleton.bones[boneIndex].getWorldQuaternion(boneQ);
                    boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
                    newRot.set(newRot.x + boneQ.x, newRot.y + boneQ.y, newRot.z + boneQ.z, newRot.w + boneQ.w);
                }
            }
            newRot.normalize();

            object.mesh.boneTransform(objects[k].parent.index, vertex) // Find actual local position of the vertex (skinning) 
            vertex = object.mesh.localToWorld(vertex.clone()); // World space

            // Rotate the translation offset
            let rotatedOffset = objects[k].parent.offsetPos.clone();
            rotatedOffset.applyQuaternion(newRot);

            let newPos = vertex.clone().sub(rotatedOffset); // Global space
            objects[k].mesh.worldToLocal(newPos); // Local space

            objects[k].bones[0].position.set(newPos.x, newPos.y, newPos.z); 
            newRot.multiply(objects[k].parent.offsetQ);
            objects[k].bones[0].setRotationFromQuaternion(newRot);
                
            updateDisplay(objects[k]);

            let globalPos = fromLocalToGlobal(objects[k].path.positions, objects[k].bones[0]);
            objects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
        }
    }
}


var timeline = document.getElementById("timeline");
timeline.oninput = function() {
    updateAnimation(parseInt(this.value));
} 

export { orbitControls, computeAngleAxis, updateDisplay, updateBones, updateChildren };