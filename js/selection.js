"use strict;"

import { materials } from './materials.js';

/**
 * Unselect all the selected objects
 */
function unselectAll() {
    for (let k = 0; k < selectedObjects.length; k++) {
        selectedObjects[k].material = materials.unselected.clone();
        if(selectedObjects[k].effector != null) {
            selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.links.clone());
        }
    }
    selectedObjects = []
}

/**
 * Unselect the object k
 * @param {number} k - The index in the "objects" array
 */
function unselect(k) {
    for (let i = 0; i < selectedObjects.length; i++) {
        if (objects[k] === selectedObjects[i]) {
            // Remove the object from the selection
            selectedObjects[i].material = materials.unselected.clone();
            selectedObjects[i].linkMaterial(selectedObjects[i].effector, materials.links.clone());
            selectedObjects.splice(i, 1);

            // Update the material of the first selected object (in case the one we deselect is the first one)
            if(selectedObjects.length > 0) {
                selectedObjects[0].material = materials.selected.clone();
            }
        }
    }
}

/**
 * Boolean saying whether the object is selected
 * @param {MyObject} object - The object we want to check
 * @returns True if the object is selected
 */
function isSelected(object) {
    for (let i = 0; i < selectedObjects.length; i++) {
        if (selectedObjects[i] === object) {
            return true;
        }
    }
    return false;
}

/**
 * Select the k-th object. The selected joint will become the effector
 * @param {number} k - The index in the "objects" array
 * @param {number} effectorIndex - The index of the selected joint
 */
function select(k, effectorIndex) {
    // If the object was already selected, reinitialize the effector display
    if (isSelected(objects[k])) {
        objects[k].linkMaterial(objects[k].effector, materials.links.clone());
    } else {
        // Update the object display
        if (selectedObjects.length == 0) {
            objects[k].material = materials.selected.clone();
        } else {
            objects[k].material = materials.selectedBis.clone();
        }

        // Add the object to the selection
        selectedObjects.push(objects[k]);
    }

    // Update the effector
    objects[k].effector = effectorIndex;
    if (effectorIndex != null) {
        // Update effector display
        objects[k].linkMaterial(effectorIndex, materials.effector.clone());
    }

}

/**
 * Update the selection when clicking on the window
 * @param {THREE.Mesh} effector - Selected link object
 * @param {Event} event - Event
 */
function updateSelection(effector, event) {
    if(event.button == 0) {
        // If Shift is not pressed, unselect every objects
        if (!event.shiftKey) {
            unselectAll();
        }

        // Retrieve the object the effector belongs to
        const indexes = retrieveObject(effector);
        const objectIndex = indexes.objectIndex; // Index of the object in "objects" array
        const effectorIndex = indexes.linkIndex; // Index of the effector in the "links" array of the object

        // If already selected with the same effector, unselect
        if(isSelected(objects[objectIndex]) && objects[objectIndex].links[objects[objectIndex].effector] === effector) {
            unselect(objectIndex);
        } else { // Update selection
            select(objectIndex, effectorIndex);
        }
    }
}

/**
 * Select all the objects that have the same parent as the first selected object.
 * TODO: Adapt so that the selection relies on geometrical similiarities
 */
function autoSelect() {
    for(let k = 0; k < objects.length; k++) {
        if(selectedObjects.length != 0 && selectedObjects[0].parent.object === objects[k].parent.object) {
            select(k, objects[k].effector);
        }
    }
}

/**
 * Given an effector mesh, retrieve the object it is attached to
 * @param {THREE.Mesh} effector - The effector mesh
 * @returns The index of the object in the "objects" array (objectIndex), and the index of the effector (linkIndex)
 */
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


export { select, autoSelect, isSelected, unselectAll, updateSelection, retrieveObject }