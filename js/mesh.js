"use strict;"

import * as THREE from 'three';

// Add/Remove an object from the selection (to adapt)
function addSelectedObject(selection, removable) {
    console.log(selection);
    // Check if not in the selection already
    let isSelected = false;
    console.log('selectedObjects', selectedObjects);
    console.log('selection', selection);
    for(let i = 0; i < selectedObjects.length; i++) {
        if (selectedObjects[i] === selection) {
            isSelected = true;
            if(removable) {
                selectedObjects[i].meshMaterial = materials.unselected.clone();
                console.log('effector', selectedObjects[i].effector);
                selectedObjects[i].setLinkMaterial(selectedObjects[i].effector, materials.links.clone());
                selectedObjects[i].effector = null;
                selectedObjects.splice(i, 1);
                if(selectedObjects.length > 0) {
                    selectedObjects[0].meshMaterial = materials.selected.clone();
                }
            }
        }
    }

    if(!isSelected) {
        let material;
        if (selectedObjects.length == 0) {
            material = materials.selected.clone();
        } else {
            material = materials.selectedBis.clone();
        }
        for (let k = 0; k < objects.length; k++) {
            if (objects[k] === selection) {
                selectedObjects.push(objects[k]);
                objects[k].meshMaterial = material;
            }
        }
    }

    console.log('selectedObjects2', selectedObjects);
}

// Auto select objects of a similar shape than first selected object
function autoSelect(event) {
    console.log("auto select");
    for(let k = 0; k < objects.length; k++) {
        if(selectedObjects.length != 0 && objects[k].level == selectedObjects[0].level) {
            addSelectedObject(objects[k], false);
        }
    }
}

// Given an effector, retrieve the object it's controlling
function retrieveObject(effector) {
    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            if (effector === objects[k].links[i]) {
                objects[k].effector = i;
                objects[k].setLinkMaterial(i, materials.effector.clone());
                return k;
            }
        }
    }
}

function findEffector(object, scale) {
    // compute length btw effector and root of the active object
    // find the link that has the closest length
    // Take into account the scale factor btw the 2 shapes
    let effectorPos = new THREE.Vector3();

    effectorPos.setFromMatrixPosition(selectedObjects[0].display.links[selectedObjects[0].path.effector].matrixWorld);
    selectedObjects[0].bones[0].worldToLocal(effectorPos);
    let distance = scale * effectorPos.distanceTo(new THREE.Vector3(0,0,0));
    console.log('effector', selectedObjects[0].path.effector);


    let res = 0;
    let linkPos = new THREE.Vector3();
    linkPos.setFromMatrixPosition(object.display.links[0].matrixWorld);
    object.bones[0].worldToLocal(linkPos);
    let current_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));
    for (let i = 1; i < object.display.links.length; i++) {
        linkPos.setFromMatrixPosition(object.display.links[i].matrixWorld);
        object.bones[0].worldToLocal(linkPos);
        let new_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));

        if (Math.abs(new_d - distance) < Math.abs(current_d - distance)) {
            res = i;
            current_d = new_d;
        }
    }

    console.log('res', res);
    return res;
}

export { addSelectedObject, autoSelect, retrieveObject, findEffector }