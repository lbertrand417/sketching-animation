"use strict;"

// Import libraries
import * as THREE from 'three';
import { loadScene } from './init.js'
import { updateAnimation, updateTimeline } from './main.js'
import { autoSelect, randomOrientation, targetOrientation, synchronize, randomTiming, paste } from './selection.js'
import { resize, project3D, worldPos, localPos, retime } from './utils.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js'

var settings = {
    root: true,
    links: true,
    axes: false,
    speeds: false,
    path: true,
    scenes: "Flower",
    draw: false,
    autoSelect: autoSelect,
    paste: paste,
    randomOrientation: randomOrientation,
    target: targetOrientation,
    sync: synchronize,
    randomTiming: randomTiming,
    curveTiming: false,
    targetVSparam: 2,
    ownVSparam: 5,
    parentVSparam: 25
}

const gui = new GUI()
const sceneFolder = gui.addFolder('Scenes')
sceneFolder.add(settings, 'scenes', [ 'Basic', 'Orientation', 'Scale', 'Bones', 'Anemone', 'Flower', 'Pole' ] ).name("Scenes").onChange(function (value) {
    switch (value) {
        case "Basic":
            loadScene(5);
            break;
        case "Orientation":
            loadScene(1);
            break;
        case "Scale":
            loadScene(3);
            break;
        case "Bones":
            loadScene(4);
            break;
        case "Anemone":
            loadScene(2);
            break;
        case "Flower":
            loadScene(6);
            break;
        case "Pole":
            loadScene(7);
            break;
        default:
            break;
    }
});
sceneFolder.add(settings, 'draw').name("Draw").onChange(function (value) {
    if (value) {
        settings.curveTiming = false;
        updateGUI(gui);
    }
    drawingCanvas()
});
sceneFolder.add(settings, 'autoSelect').name("Auto Select")
sceneFolder.add(settings, 'paste').name("Paste")
sceneFolder.open();

const orientationFolder = gui.addFolder('Orientation');
orientationFolder.add(settings, 'randomOrientation').name("Random")
orientationFolder.add(settings, 'target').name("Target")
orientationFolder.open()

const timingFolder = gui.addFolder('Timing');
timingFolder.add(settings, 'sync').name("Synchronize")
timingFolder.add(settings, 'randomTiming').name("Random");
timingFolder.add(settings, 'curveTiming').name("Curve").onChange(function (value) {
    if (value) {
        settings.draw = false;
        updateGUI(gui);
    }
    drawingCanvas();
})
timingFolder.open();

const paramFolder = gui.addFolder("Parameters")
//paramFolder.add(settings, 'targetVSparam', 0, 10).step(0.1).name("Target VS"); 
paramFolder.add(settings, 'ownVSparam', 0, 10).step(0.1).name("Own VS"); 
paramFolder.add(settings, 'parentVSparam', 0, 50).step(0.1).name("Parent VS"); 
paramFolder.open();

const displayFolder = gui.addFolder('Display')
displayFolder.add(settings, 'root').name("Root").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].root.visible = !objects[k].root.visible ;
    }
}); 
displayFolder.add(settings, 'links').name("Links").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].links[i].visible = !objects[k].links[i].visible;
        }
    }
}); 
displayFolder.add(settings, 'axes').name("Axes helper").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthAxes; i++) {
            objects[k].axesHelpers[i].visible = !objects[k].axesHelpers[i].visible;
        }
    }
}); 
displayFolder.add(settings, 'speeds').name("Speeds").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].speedDisplay[i].visible = !objects[k].speedDisplay[i].visible;
        }
        objects[k].axisDisplay.visible = !objects[k].axisDisplay.visible;
    }
}); 
displayFolder.add(settings, 'path').name("Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].pathDisplay.visible = !objects[k].pathDisplay.visible;
        objects[k].timingDisplay.visible = !objects[k].timingDisplay.visible;
    }
}); 


function updateGUI (targetGui)
{
    for (let i in targetGui.__folders) {
        let subGui = targetGui.__folders[i];
        for (let j in subGui.__controllers) {
            subGui.__controllers[j].updateDisplay();
        }
    }
}



// SKETCH CANVAS
let refTime = new Date().getTime(); // Time when we start drawing the line
let pos = { x: 0, y: 0 }; // last known position

let canvas2D = document.getElementById('canvas'); // 2D sketch canvas
canvas2D.width = window.innerWidth;
canvas2D.height = window.innerHeight;
let ctx = canvas2D.getContext('2d');

// TIMELINE
const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
    global.animation.isAnimating = true;
    if(global.animation.stop) {
        global.animation.currentTime = parseInt(timeline.min);
    } 
});

const pauseButton = document.getElementById("pause");
pauseButton.addEventListener("click", () => {
    global.animation.isAnimating = false;
    global.animation.stop = false;
});

const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
    global.animation.isAnimating = false;
    global.animation.stop = true;
});

// Update animation when moving the timeline
var timeline = document.getElementById("timeline");
timeline.oninput = function() {
    console.log('timeline', this.value)
    global.animation.currentTime = parseInt(this.value); // Faux: ajouter à current time la diff entre previous et next timeline??
    updateAnimation(parseInt(this.value));

    for (let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
        objects[k].display.updateTiming();
    }
} 

/*var paramSlider = document.getElementById("param");
paramSlider.oninput = function() {
    param = parseFloat(this.value);
} */


// Display/Undisplay the 2D canvas when clicking on the Draw button
function drawingCanvas(e) {
    //if(selectedObjects.length > 0) {
        console.log("drawing Canvas");
        if(settings.draw || settings.curveTiming) {
            canvas2D.style.display = "block";
        } else {
            canvas2D.style.display = "none";
        }
    //}
}



// CANVAS
window.addEventListener('resize', resize);
canvas2D.addEventListener('mousemove', draw);
canvas2D.addEventListener('mousedown', setPosition);
canvas2D.addEventListener('mouseup', updateScene);
canvas2D.style.display = "none";

// Draw a line in 2D canvas
function draw(e) {
    // mouse left button must be pressed
    if (e.buttons !== 1) return;

    ctx.beginPath(); // begin

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c0392b';

    ctx.moveTo(pos.x, pos.y); // from
    setPosition(e);

    let rect = canvas2D.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;
    ctx.lineTo(pos.x, pos.y); // to

    ctx.stroke(); // draw it!
}

function setPosition(e) {
    if(e.type == "mousedown") {
        refTime = new Date().getTime();
        global.animation.isAnimating = false;

        let rect = canvas2D.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }
    if (!global.sketch.isClean) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        global.sketch.positions = [];
        global.sketch.timings = [];
        global.sketch.isClean = true;
    }

    let pI;
    if(settings.curveTiming || selectedObjects.length == 0) {
        pI = project3D(e, canvas2D, new THREE.Vector3());
    } else {
        let p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone();
        p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector);
        pI = project3D(e, canvas2D, p);
        pI = localPos(pI.clone(), selectedObjects[0], selectedObjects[0].bones, 0);
    }
    

    global.sketch.positions.push(pI);
    global.sketch.timings.push(new Date().getTime() - refTime);
}

function updateScene(e) {
    global.sketch.isClean = false;
    
    if(settings.curveTiming) {
        let retimed = retime(global.sketch.timings, global.sketch.positions);

        //const pathGeometry = new THREE.BufferGeometry().setFromPoints(global.sketch.positions);
        //let path = new THREE.Line(pathGeometry, materials.unselectedpath.clone());
        //global.scene.add(path)
        //console.log('offset',tempT)
        for (let k = 0; k < selectedObjects.length; k++) {
            let effector = selectedObjects[k].bones[selectedObjects[k].path.effector + 1].position.clone();
            effector = worldPos(effector, selectedObjects[k], selectedObjects[k].bones, selectedObjects[k].path.effector);
            let d = Infinity;
            let closestId = 0;
            for(let i = 0; i < retimed.tempPos.length; i++) {
                let new_d = effector.distanceTo(retimed.tempPos[i]);
                if (new_d < d) {
                    closestId = i;
                    d = new_d;
                }
            }
            console.log('id', closestId)
            let timingoffset = retimed.tempT[closestId];

            console.log('old timings', selectedObjects[k].path.timings)
            selectedObjects[k].path.offsetTiming(timingoffset);
            console.log('new timings', selectedObjects[k].path.timings)

            drawingCanvas();
        }
    } else {
        if (selectedObjects.length > 0) {
            selectedObjects[0].path.update(global.sketch.positions, global.sketch.timings);

            // Display path
            selectedObjects[0].display.updatePath(); 
        }
    }

    // Update timeline 
    updateTimeline();

    // Start animation
    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();

    // find closest effector

    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
}

export { settings }