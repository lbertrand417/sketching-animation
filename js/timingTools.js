
import { getRandomInt } from './utils.js';
import { updateTimeline } from './main.js'

/**
 * Synchronize all the selected objects with the path of their parent
 */
function synchronize() {
    for (let k = 0; k < selectedObjects.length; k++) {
        if(selectedObjects[k].parent.object != null) {
            // Retrieve the path of its parent
            let parentPath = selectedObjects[k].parent.object.path;
            
            // Synchronize
            selectedObjects[k].path.synchronize(parentPath);
        }
    }
}

/**
 * Add a random offset to the path of each selected object
 */
function randomTiming() {
    for (let k = 0; k < selectedObjects.length; k++) {
        // Get a random value
        let randomOffset = getRandomInt(0, selectedObjects[k].path.timings[selectedObjects[k].lengthPath - 1]);
        randomOffset = randomOffset - (randomOffset % 16);

        // Offset the timings
        selectedObjects[k].path.offsetTiming(randomOffset);
    }

    // Update the timeline wrt the first selected object
    updateTimeline();
}

export { synchronize, randomTiming }