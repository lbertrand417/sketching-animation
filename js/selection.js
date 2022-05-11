"use strict;"

// Add/Remove an object from the selection (to adapt)
function addSelectedObject(selection, removable) {
    // Check if not in the selection already
    let isSelected = false;
    for(let i = 0; i < selectedObjects.length; i++) {
        if (selectedObjects[i] === selection) {
            isSelected = true;
            if(removable) {
                selectedObjects[i].material = materials.unselected.clone();
                selectedObjects[i].linkMaterial(selectedObjects[i].effector, materials.links.clone());
                //selectedObjects[i].effector = null;
                selectedObjects.splice(i, 1);
                if(selectedObjects.length > 0) {
                    selectedObjects[0].material = materials.selected.clone();
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
                objects[k].material = material;
            }
        }
    }
}

function unselectAll() {
    for (let k = 0; k < selectedObjects.length; k++) {
        selectedObjects[k].material = materials.unselected.clone();
        selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.links.clone());
    }
    selectedObjects = []
    timeline.min = 0;
    timeline.max = 0; 
}

function unselect(i) {
    selectedObjects[i].material = materials.unselected.clone();
    selectedObjects[i].linkMaterial(selectedObjects[i].effector, materials.links.clone());
    //selectedObjects[i].effector = null;
    selectedObjects.splice(i, 1);
    if(selectedObjects.length > 0) {
        selectedObjects[0].material = materials.selected.clone();
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

function select(k) {
    if (isSelected(objects[i])) {
        for (let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].linkMaterial(i, material.links.clone());
        }
    } else {
        if (selectedObjects.length == 0) {
            objects[i].material = materials.selected.clone();
        } else {
            objects[i].material = materials.selectedBis.clone();
        }
        selectedObjects.push(objects[i]);
    }
    objects[k].linkMaterial(objects[k].effector, material.effector.clone());

}

function updateSelection(effector, event) {
    if (event.button == 2) {
        unselectAll();
    } else {
        if(objects.length > 0) {
            if (!event.shiftKey) {
                unselectAll();
            }

            const objectIndex = retrieveObject(effector);

            if(objects[objectIndex].effector == effector) {
                //unselect();
            } else {
                select(objects[objectIndex]);
            }
        }
    }
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
                objects[k].linkMaterial(i, materials.effector.clone());
                return k;
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

        let distance = object.bones[0].localToWorld(localPos).distanceTo(object.target.position);
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
    object.updatePathDisplay();
}

export { addSelectedObject, autoSelect, retrieveObject, addTarget }