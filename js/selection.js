"use strict;"

import { materials } from './materials.js';
import { worldPos } from './utils.js';

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
        const objectIndex = indexes.k;
        const effectorIndex = indexes.i;

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
        console.log()
        if(selectedObjects.length != 0 && selectedObjects[0].parent.object === objects[k].parent.object) {
            let pos = selectedObjects[0].bones[selectedObjects[0].effector + 1].position.clone();
            pos = worldPos(pos, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].effector);
            let distance = selectedObjects[0].distanceToRoot(pos);
            objects[k].updateEffector(distance)
            select(k, objects[k].effector);
        }
    }
}

// Given an effector, retrieve the object it's controlling
function retrieveObject(effector) {
    for (let k = 0; k < objects.length; k++) {
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            if (effector === objects[k].links[i]) {
                return { k, i };
            }
        }
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
        let distance = globalPos.distanceTo(object.target.position);
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

    // Update path display
    object.display.updatePath();
    object.display.updateTiming();
}

export { autoSelect, isSelected, unselectAll, updateSelection, retrieveObject, addTarget }