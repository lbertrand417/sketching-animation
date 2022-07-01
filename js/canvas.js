"use strict;"

// Import libraries
import * as THREE from 'three';
import { loadScene } from './init.js'
import { materials } from './materials.js'
import { updateAnimation, updateTimeline } from './main.js'
import { addTarget, autoSelect } from './selection.js'
import { getRandomInt, resize, project3D, worldPos, localPos } from './utils.js';

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
    global.animation.currentTime = parseInt(this.value); // Faux: ajouter à current time la diff entre previous et next timeline??
    updateAnimation(parseInt(this.value));

    for (let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
        objects[k].display.updateTiming();
    }
} 

var paramSlider = document.getElementById("param");
paramSlider.oninput = function() {
    param = parseFloat(this.value);
} 

var alphaSlider = document.getElementById("alpha");
alphaSlider.oninput = function() {
    a = parseFloat(this.value);
} 

// COMMANDS
const drawButton = document.getElementById("draw");
drawButton.addEventListener("click", drawingCanvas);

const targetButton = document.getElementById("target");
targetButton.addEventListener("click", () => {
        console.log("Select target");
        if(selectedObjects.length > 0 && selectedObjects[0].lengthPath > 0) {
            let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

            let target = null;
            if (selectedObjects[0].hasTarget === false) {
                target = new THREE.Mesh(sphereGeometry, materials.root.clone());
                let targetPos = new THREE.Vector3();
                console.log(parent);
                if (selectedObjects[0].parent.object != null) {
                    targetPos = parent.bones[parent.lengthBones - 1].position.clone();
                    targetPos = worldPos(targetPos, parent, parent.bones, parent.lengthBones - 2)
                } else {
                    let index = Math.floor(selectedObjects[0].lengthPath / 2)
                    targetPos = selectedObjects[0].path.positions[index].clone();
                    targetPos = worldPos(targetPos, selectedObjects[0], selectedObjects[0].bones, 0);
                }

                target.position.set(targetPos.x, targetPos.y, targetPos.z);
                target.updateWorldMatrix(false, false);
                global.scene.add(target);
                targets.push(target);
            } else  {
                target = selectedObjects[0].target;
            }

            // Update le tableau des targets

            for (let i = 0; i < selectedObjects.length; i++) {
                selectedObjects[i].target = target;
                addTarget(selectedObjects[i]);
            }
        }
});

const pasteButton = document.getElementById("paste");
pasteButton.addEventListener("click", () => {
    for (let k = 1; k < selectedObjects.length; k++) {
        let scale = selectedObjects[k].height / selectedObjects[0].height; // scale
        let pos = selectedObjects[0].bones[selectedObjects[0].effector + 1].position.clone();
        pos = worldPos(pos, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].effector);
        let distance = selectedObjects[0].distanceToRoot(pos);
        distance = scale * distance;
        selectedObjects[k].updateEffector(distance);
        selectedObjects[k].path.paste(selectedObjects[0].path, scale);

        if(selectedObjects[k].lengthPath != 0) {
            console.log("print");
            selectedObjects[k].display.updatePath();
        }
    }
});

const timingButton = document.getElementById("timingoffset");
timingButton.addEventListener("click", () => {
    console.log('selected', selectedObjects);
    for (let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = getRandomInt(0, selectedObjects[k].path.timings[selectedObjects[k].lengthPath - 1]);
        randomOffset = randomOffset - (randomOffset % 16);
        selectedObjects[k].path.offsetTiming(randomOffset);
        console.log(selectedObjects[k].path.timings);
    }

    // Update the timeline wrt the first selected object
    updateTimeline();
});

const orientationButton = document.getElementById("orientationoffset");
orientationButton.addEventListener("click", () => {
    for(let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = Math.random() * Math.PI * 2;
        selectedObjects[k].path.offsetOrientation(selectedObjects[k].restAxis, randomOffset);

        // Update path display
        selectedObjects[k].updatePathDisplay();
    }
});

const selectButton = document.getElementById("select");
selectButton.addEventListener("click", autoSelect);

// Display/Undisplay the 2D canvas when clicking on the Draw button
function drawingCanvas(e) {
    if(selectedObjects.length > 0) {
        console.log("drawing Canvas");
        if(canvas.style.display == "none") {
            canvas2D.style.display = "block";
            drawButton.innerText = "Move camera";
        } else {
            canvas2D.style.display = "none";
            drawButton.innerText = "Draw";
        }
    }
}

// DISPLAY
const rootButton = document.getElementById("root");
rootButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].root.visible = !objects[k].root.visible ;
    }
});

const linksButton = document.getElementById("links");
linksButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].links[i].visible = !objects[k].links[i].visible;
        }
    }
});

const bonesButton = document.getElementById("bones");
bonesButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].skeletonHelper.visible = !objects[k].skeletonHelper.visible;
    }
});

const axesHelperButton = document.getElementById("axes");
axesHelperButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthAxes; i++) {
            objects[k].axesHelpers[i].visible = !objects[k].axesHelpers[i].visible;
        }
    }
});

const speedButton = document.getElementById("speed");
speedButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].speedDisplay[i].visible = !objects[k].speedDisplay[i].visible;
        }
        objects[k].axisDisplay.visible = !objects[k].axisDisplay.visible;
    }
});

const pathButton = document.getElementById("path");
pathButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].pathDisplay.visible = !objects[k].pathDisplay.visible;
        objects[k].timingDisplay.visible = !objects[k].timingDisplay.visible;
    }
});

// SCENES
const scene1Button = document.getElementById("scene1");
scene1Button.addEventListener("click", () => {
    console.log("Scene 1");
    loadScene(1);
});

const scene2Button = document.getElementById("scene2");
scene2Button.addEventListener("click", () => {
    console.log("Scene 2");
    loadScene(2);
});

const scene3Button = document.getElementById("scene3");
scene3Button.addEventListener("click", () => {
    console.log("Scene 3");
    loadScene(3);
});

const scene4Button = document.getElementById("scene4");
scene4Button.addEventListener("click", () => {
    console.log("Scene 4");
    loadScene(4);
});

const scene5Button = document.getElementById("scene5");
scene5Button.addEventListener("click", () => {
    console.log("Scene 5");
    loadScene(5);
});

const scene6Button = document.getElementById("scene6");
scene6Button.addEventListener("click", () => {
    console.log("Scene 6");
    loadScene(6);
});

const scene7Button = document.getElementById("scene7");
scene7Button.addEventListener("click", () => {
    console.log("Scene 7");
    loadScene(7);
});


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
        for (let k = 0; k < objects.length; k++) {
            objects[k].pathIndex = null;
        }

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

    let p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone();
    p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector);
    let pI = project3D(e, canvas2D, p);
    pI = localPos(pI.clone(), selectedObjects[0], selectedObjects[0].bones, 0);

    global.sketch.positions.push(pI);
    global.sketch.timings.push(new Date().getTime() - refTime);
}

function updateScene(e) {
    global.sketch.isClean = false;
    
    selectedObjects[0].path.update(global.sketch.positions, global.sketch.timings);

    // Display path
    selectedObjects[0].display.updatePath();

    // Update timeline 
    updateTimeline();

    // Start animation
    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();

    // find closest effector

    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
}

