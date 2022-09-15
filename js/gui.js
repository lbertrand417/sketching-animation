import { loadScene } from './init.js'
import { autoSelect } from './selection.js'
import { synchronize, randomTiming } from './timingTools.js';
import { randomOrientation, createTarget } from './orientationTools.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js'
import { loadFromTXT, saveToTXT, next } from './fileReader.js';
import { originalPath, paste, deletePath, cycleWithInput, cycleWithEffector } from './inputProcessing.js';

// GUI parameters
var settings = {
    // Display/Undisplay buttons
    root: false,
    links: true,
    axes: false,
    speeds: false,
    rawPath: false,
    cleanedPath: false,
    effectorPath: false,
    path: true,

    scenes: "Test1",     // Current scene 

    // Input processing
    cleanPath: false, // if true, remove the first curve in drawn stroke
    originalPath: originalPath, // Use original path (that has been filtered beforehand)
    autoGenerate: cycleWithInput, // Use cycle generated using originalPath
    autoGenerate2: cycleWithEffector, // Use cycle generated using effector path 

    autoSelect: autoSelect, // Select objects at the same level in hierarchy
    paste: paste, // Paste path to selected objects
    delete: deletePath, // Delete path of selected objects

    // Orientation tools
    randomOrientation: randomOrientation,
    target: createTarget,

    // Timing tools
    sync: synchronize, // Synchronize the selected objects wrt its parent
    randomTiming: randomTiming,
    gradient: false, // Activate the canvas to draw the gradient curve

    // Parameters
    ownVSparam: 2, // Parameter of VS of one object
    alpha: true, // alpha and theta are the angle choices used in VS (don't know which one should be used)
    theta: false,
    parentVS: false, // Activate/deactivate hierarchical VS
    parentVSparam: 25, // Parameter of hierarchical VS (rn same parameter for the entire hierarchy)

    // Files info
    name: "Default",
    save: saveToTXT,
    load: loadFromTXT,
    next: next
}

const gui = new GUI()

// --------------- SCENE FOLDER --------------- 
const sceneFolder = gui.addFolder('Scenes')
sceneFolder.add(settings, 'scenes', [ 'Basic', 'Orientation', 'Scale', 'Bones', 'Anemone', 'Flower', 'Pole', 'Test1', 'Test2', 'Levels' ] )
    .name("Scenes").onChange(function (value) {
    loadScene(value);
});
sceneFolder.add(settings, 'autoSelect').name("Auto Select")
sceneFolder.add(settings, 'paste').name("Paste")
sceneFolder.add(settings, 'delete').name("Delete")
sceneFolder.open();

// --------------- PATH FOLDER --------------- 

const pathFolder = gui.addFolder('Path');
pathFolder.add(settings, 'cleanPath').name("Clean Path")
pathFolder.add(settings, 'originalPath').name("Original Path")
pathFolder.add(settings, 'autoGenerate').name("Cycle using input")
pathFolder.add(settings, 'autoGenerate2').name("Cycle using effector")
pathFolder.open()

// --------------- ORIENTATION FOLDER --------------- 

const orientationFolder = gui.addFolder('Orientation');
orientationFolder.add(settings, 'randomOrientation').name("Random")
orientationFolder.add(settings, 'target').name("Target")
//orientationFolder.open()

// --------------- TIMING FOLDER --------------- 

const timingFolder = gui.addFolder('Timing');
timingFolder.add(settings, 'sync').name("Synchronize")
timingFolder.add(settings, 'randomTiming').name("Random");
timingFolder.add(settings, 'gradient').name("Gradient").onChange(function (value) {
    // Display/Undisplay the 2D canvas when the gradient button in Timings is activated
    let canvas2D = document.getElementById('canvas'); 
    if(value) {
        canvas2D.style.display = "block";
    } else {
        canvas2D.style.display = "none";
    }
})
//timingFolder.open();

// --------------- PARAMETER FOLDER --------------- 

const paramFolder = gui.addFolder("Parameters")
paramFolder.add(settings, 'ownVSparam', 0, 10).step(0.1).name("Own VS"); 
paramFolder.add(settings, 'alpha').name("Alpha").onChange(function (value) {
        settings.theta = !value;
        updateGUI(gui);
});
paramFolder.add(settings, 'theta').name("Theta").onChange(function (value) {
    settings.alpha = !value;
    updateGUI(gui);
}); 
paramFolder.add(settings, 'parentVS').name("Activate parent VS").onChange(function (value) {
    if(!value) {
        // Reinitialize position
        for (let k = 0; k < objects.length; k++) {
            for(let i = 0; i < objects[k].bones.length; i++) {
                objects[k].bones[i].quaternion.copy(objects[k].lbs[i].quaternion)
            }
        }
    }
}); 
paramFolder.add(settings, 'parentVSparam', 0, 50).step(0.1).name("Parent VS"); 
//paramFolder.open();

// --------------- DISPLAY FOLDER --------------- 

const displayFolder = gui.addFolder('Display')
displayFolder.add(settings, 'root').name("Root").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].root.visible = value;
    }
}); 
displayFolder.add(settings, 'links').name("Links").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        let visible = Math.ceil(objects[k].links.length / 5);
        for(let i = objects[k].links.length - 1; i >= 0; i-= visible) {
            objects[k].links[i].visible = value;
        }
    }
}); 
displayFolder.add(settings, 'axes').name("Axes helper").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthAxes; i++) {
            objects[k].axesHelpers[i].visible = value;
        }
    }
}); 
displayFolder.add(settings, 'speeds').name("Speeds").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].speedDisplay[i].visible = value;
        }
        objects[k].axisDisplay.visible = value;
    }
}); 
displayFolder.add(settings, 'rawPath').name("Raw Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.rawPath.visible = value;
    }
}); 
displayFolder.add(settings, 'cleanedPath').name("Clean Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.cleanPath.visible = value;
    }
}); 
displayFolder.add(settings, 'effectorPath').name("Raw Effector Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.effectorPath.visible = value;
    }
}); 
displayFolder.add(settings, 'path').name("Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].pathDisplay.visible = value;
        objects[k].timingDisplay.visible = value;
    }
}); 

// --------------- DOWNLOAD FOLDER --------------- 

const downloadFolder = gui.addFolder('File');
downloadFolder.add(settings, 'name').name("Name")
downloadFolder.add(settings, 'save').name("Download");
downloadFolder.add(settings, "load").name("Load");
downloadFolder.add(settings, "next").name("Next");
downloadFolder.open();

// --------------------------------------------- 

// Update the GUI
/**
 * Update the GUI
 * @param {GUI} targetGui - The gui to update
 */
function updateGUI (targetGui)
{
    for (let i in targetGui.__folders) {
        let subGui = targetGui.__folders[i];
        for (let j in subGui.__controllers) {
            subGui.__controllers[j].updateDisplay();
        }
    }
}

export { settings }