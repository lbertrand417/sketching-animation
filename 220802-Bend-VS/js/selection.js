"use strict;"

import * as THREE from 'three';
import { materials } from './materials.js';
import { worldPos, getRandomInt } from './utils.js';
import { updateChildren, updateTimeline } from './main.js'
import { MyTarget } from './myTarget.js'

function unselectAll() {
    for (let k = 0; k < selectedObjects.length; k++) {
        selectedObjects[k].material = materials.unselected.clone();
        if(selectedObjects[k].effector != null) {
            selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.links.clone());
        }
    }
    selectedObjects = []
}

function unselect(k) {
    for (let i = 0; i < selectedObjects.length; i++) {
        if (objects[k] === selectedObjects[i]) {
            selectedObjects[i].material = materials.unselected.clone();
            selectedObjects[i].linkMaterial(selectedObjects[i].effector, materials.links.clone());
            selectedObjects.splice(i, 1);
            if(selectedObjects.length > 0) {
                selectedObjects[0].material = materials.selected.clone();
            }
        }
    }
}

function isSelected(object) {
    for (let i = 0; i < selectedObjects.length; i++) {
        if (selectedObjects[i] === object) {
            return true;
        }
    }
    return false;
}

function select(k, effectorIndex) {
    if (isSelected(objects[k])) {
        console.log('effector', objects[k].effector)
        objects[k].linkMaterial(objects[k].effector, materials.links.clone());
    } else {
        if (selectedObjects.length == 0) {
            objects[k].material = materials.selected.clone();
        } else {
            objects[k].material = materials.selectedBis.clone();
        }
        selectedObjects.push(objects[k]);
    }
    objects[k].effector = effectorIndex;
    if (effectorIndex != null) {
        objects[k].linkMaterial(effectorIndex, materials.effector.clone());
    }

}

function updateSelection(effector, event) {
    if(event.button == 0) {
        if (!event.shiftKey) {
            unselectAll();
        }

        const indexes = retrieveObject(effector);
        const objectIndex = indexes.objectIndex;
        const effectorIndex = indexes.linkIndex;

        console.log('o', objectIndex);
        console.log('e', effectorIndex);

        if(isSelected(objects[objectIndex]) && objects[objectIndex].links[objects[objectIndex].effector] === effector) {
            unselect(objectIndex);
        } else {
            select(objectIndex, effectorIndex);
        }
    }
}

// Auto select objects of a similar shape than first selected object
function autoSelect(event) {
    console.log("auto select");
    for(let k = 0; k < objects.length; k++) {
        if(selectedObjects.length != 0 && selectedObjects[0].parent.object === objects[k].parent.object) {
            /*let scale = objects[k].height / selectedObjects[0].height; // scale
            let pos = selectedObjects[0].restBones[selectedObjects[0].effector + 1].position.clone();
            pos = worldPos(pos, selectedObjects[0], selectedObjects[0].restBones, selectedObjects[0].effector);
            let distance = selectedObjects[0].distanceToRoot(pos);
            distance = scale * distance;
            objects[k].updateEffector(distance)
            console.log(objects[k].effector);*/
            select(k, objects[k].effector);
        }
    }
}

// Given an effector, retrieve the object it's controlling
function retrieveObject(effector) {
    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            if (effector === objects[k].links[i]) {
                const objectIndex = k;
                const linkIndex = i;
                return { objectIndex, linkIndex };
            }
        }
    }
}

function randomOrientation(){
    for(let k = 0; k < selectedObjects.length; k++) {
        console.log('k', k);
        let randomOffset = Math.random() * Math.PI * 2;
        console.log('random Offset', randomOffset)
        console.log('restAxis', selectedObjects[k].restAxis);
        selectedObjects[k].path.offsetOrientation(selectedObjects[k].restAxis, randomOffset);

        // Update path display
        selectedObjects[k].display.updatePath();
    }
}


function addTarget(object) {
    let dt = 2 * Math.PI / 50;
    let theta = 0;
    let distances = [];
    while (theta < 2 * Math.PI) {
        let localPos = object.path.positions[Math.floor(object.lengthPath / 2)].clone();
        localPos.applyAxisAngle(object.restAxis, theta);

        let globalPos = worldPos(localPos, object, object.bones, 0);
        let distance = globalPos.distanceTo(object.target.VSpos);
        distances.push(distance);
        theta += dt;
    }


    const min = Math.min(...distances);
    const index = distances.indexOf(min);
    theta = index * dt;

    for(let i = 0; i < object.lengthPath ; i++) {
        let localPos = object.path.positions[i].clone();
        localPos.applyAxisAngle(object.restAxis, theta);
        object.path.positions[i] = localPos;
    }

    object.path.VSpositions = [...object.path.positions]

    // Update path display
    object.display.updatePath();
    object.display.updateTiming();
}

function targetOrientation() {
    console.log("Select target");
    if(selectedObjects.length > 0 && selectedObjects[0].lengthPath > 0) {
        //let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        let myTarget = null;
        if (selectedObjects[0].hasTarget === false) {
            //target = new THREE.Mesh(sphereGeometry, materials.root.clone());
            let targetPos = new THREE.Vector3();
            if (selectedObjects[0].parent.object != null) {
                let parent = selectedObjects[0].parent.object;
                targetPos = parent.bones[parent.lengthBones - 1].position.clone();
                targetPos = worldPos(targetPos, parent, parent.bones, parent.lengthBones - 2)
            } else {
                let index = Math.floor(selectedObjects[0].lengthPath / 2)
                targetPos = selectedObjects[0].path.positions[index].clone();
                targetPos = worldPos(targetPos, selectedObjects[0], selectedObjects[0].bones, 0);
            }

            //target.position.set(targetPos.x, targetPos.y, targetPos.z);
            myTarget = new MyTarget(targetPos);
            //target.mesh.updateWorldMatrix(false, false);
            global.scene.add(myTarget.mesh);
            targets.push(myTarget);
        } else  {
            myTarget = selectedObjects[0].target;
        }

        // Update le tableau des targets

        for (let i = 0; i < selectedObjects.length; i++) {
            selectedObjects[i].target = myTarget;
            myTarget.targeted.push(selectedObjects[i]);
            addTarget(selectedObjects[i]);
        }
    }
}

// Sometimes doesn't work on some selected shapes?
function paste() {
    let indexesPaste = [];
    let indexes = retrieveObject(selectedObjects[0].links[selectedObjects[0].effector]);
    indexesPaste.push(indexes)
    for (let k = 1; k < selectedObjects.length; k++) {
        // Useful (because we already computed it in auto select?
        let scale = selectedObjects[k].height / selectedObjects[0].height; // scale
        let pos = selectedObjects[0].restBones[selectedObjects[0].effector + 1].position.clone();
        pos = worldPos(pos, selectedObjects[0], selectedObjects[0].restBones, selectedObjects[0].effector);
        let distance = selectedObjects[0].distanceToRoot(pos);
        distance = scale * distance;
        console.log(selectedObjects[k].effector)
        if (selectedObjects[k].effector != null) {
            selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.links.clone());
        }
        selectedObjects[k].updateEffector(distance);
        selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.effector.clone());

        console.log('effector index', selectedObjects[k].effector)

        let indexes = retrieveObject(selectedObjects[k].links[selectedObjects[k].effector]);
        indexesPaste.push(indexes)
        //console.log(indexes);

        
        selectedObjects[k].path.paste(selectedObjects[0].path, scale);

        if(selectedObjects[k].lengthPath != 0) {
            console.log("print");
            selectedObjects[k].display.updatePath();
        }
    }

    console.log(indexesPaste)
    saveHistory.push({"paste": indexesPaste});
}

function deletePath() {
    let indexesDelete = [];

    for(let k = 0; k < selectedObjects.length; k++) {
        selectedObjects[k].path.positions = [];
        selectedObjects[k].path.VSpositions = [];
        selectedObjects[k].path.timings = [];

        let indexes = retrieveObject(selectedObjects[k].links[selectedObjects[k].effector]);
        indexesDelete.push(indexes)

        for(let i = 1; i < selectedObjects[k].bones.length; i++) {
            let boneQ = selectedObjects[k].restBones[i].quaternion.clone();
            //console.log('restPose', bonePos)
            selectedObjects[k].bones[i].quaternion.copy(boneQ);
            selectedObjects[k].lbs[i].quaternion.copy(boneQ);

            selectedObjects[k].bones[i].updateWorldMatrix(false, false)
            selectedObjects[k].lbs[i].updateWorldMatrix(false, false)

            updateChildren(selectedObjects[k], new THREE.Vector3())
        }

        selectedObjects[k].display.updatePath();
        selectedObjects[k].display.updateLinks();
    }

    saveHistory.push({"delete": indexesDelete});
}

function synchronize() {
    for (let k = 0; k < selectedObjects.length; k++) {
        let parentPath = selectedObjects[k].parent.object.path;
        
        selectedObjects[k].path.synchronize(parentPath);
    }
}

function randomTiming() {
    console.log('selected', selectedObjects);
    for (let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = getRandomInt(0, selectedObjects[k].path.timings[selectedObjects[k].lengthPath - 1]);
        randomOffset = randomOffset - (randomOffset % 16);
        selectedObjects[k].path.offsetTiming(randomOffset);
        console.log(selectedObjects[k].path.timings);
    }

    // Update the timeline wrt the first selected object
    updateTimeline();
}


export { autoSelect, isSelected, unselectAll, updateSelection, retrieveObject, randomOrientation, addTarget, targetOrientation, paste, deletePath, synchronize, randomTiming }