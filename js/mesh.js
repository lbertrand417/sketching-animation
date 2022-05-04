"use strict;"

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
                selectedObjects[i].mesh.material = materials.unselected.clone();
                console.log('effector', selectedObjects[i].path.effector);
                selectedObjects[i].display.links[selectedObjects[i].path.effector].material = materials.links.clone();
                selectedObjects[i].path.effector = null;
                selectedObjects.splice(i, 1);
                if(selectedObjects.length > 0) {
                    selectedObjects[0].mesh.material = materials.selected.clone();
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
                objects[k].mesh.material = material;
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
        for (let i = 0; i < objects[k].display.links.length; i++) {
            if (effector === objects[k].display.links[i]) {
                objects[k].path.effector = i;
                objects[k].display.links[i].material = materials.effector.clone();
                return k;
            }
        }
    }
}

export { addSelectedObject, autoSelect, retrieveObject }