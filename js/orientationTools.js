import * as THREE from 'three';
import { worldPos } from './utils.js';
import { MyTarget } from './myTarget.js'

/**
 * Add a random rotation to the path of all selected objects around their rest axis 
 */
function randomOrientation(){
    for(let k = 0; k < selectedObjects.length; k++) {
        // Apply a random rotation
        let randomOffset = Math.random() * Math.PI * 2;
        selectedObjects[k].path.offsetOrientation(selectedObjects[k].restAxis, randomOffset);

        // Update path display
        selectedObjects[k].display.updatePath();
    }
}

/**
 * Create a target on the scene (if necesseray)
 * If the first selected object already has a target, all other selected objects
 * will be attached to this target
 * TODO: Have to be improved so that objects can be attached to different targets
 */
function createTarget() {
    console.log("Select target");
    if(selectedObjects.length > 0 && selectedObjects[0].lengthPath > 0) {
        let myTarget = null;
        // If the first selected object doesn't have target, create a new one
        if (selectedObjects[0].hasTarget === false) {
            // Find the position of the target
            let targetPos = new THREE.Vector3();
            // By default the target appear at the leaf joint of the parent of the first selected object
            if (selectedObjects[0].parent.object != null) {
                let parent = selectedObjects[0].parent.object;
                targetPos = parent.bones[parent.lengthBones - 1].position.clone(); // Local position
                targetPos = worldPos(targetPos, parent, parent.bones, parent.lengthBones - 2) // World position
            // If there is no parent, it appears at the end of the path of the first selected object
            } else {
                let index = Math.floor(selectedObjects[0].lengthPath / 2)
                targetPos = selectedObjects[0].path.positions[index].clone(); // Local position
                targetPos = worldPos(targetPos, selectedObjects[0], selectedObjects[0].bones, 0); // World position
            }

            // Initialize the target
            myTarget = new MyTarget(targetPos);
            scene.add(myTarget.mesh);
            targets.push(myTarget);
        // Else reuse the target of the first selected object
        } else  {
            myTarget = selectedObjects[0].target;
        }

        // Update le tableau des targets
        // TODO: have to be improved bc rn there is duplication of objects in the array
        for (let i = 0; i < selectedObjects.length; i++) {
            selectedObjects[i].target = myTarget;
            myTarget.targeted.push(selectedObjects[i]);
        }

        myTarget.targetAttraction();
    }
}

export { randomOrientation, createTarget }