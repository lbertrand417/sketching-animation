"use strict;"

// Import libraries
import * as THREE from 'three';
import { updateAnimation } from './main.js'
import { resize, project3D, worldPos } from './utils.js';
import { retime } from './utilsArray.js';

// --------------- TIMELINE ---------------

// Click on the play icon (starts the animation)
const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
    animation.isAnimating = true;
    if(animation.stop) {
        animation.currentTime = parseInt(timeline.min);
    } 
});

// Click on the pause icon (pause the animation)
const pauseButton = document.getElementById("pause");
pauseButton.addEventListener("click", () => {
    animation.isAnimating = false;
    animation.stop = false;
});

// Click on the stop icon (stop the animation)
const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
    animation.isAnimating = false;
    animation.stop = true;
});

// Update animation when moving on the timeline
var timeline = document.getElementById("timeline");
timeline.oninput = function() {
    console.log('timeline', this.value)
    /* Bug: The timeline allows the user to go through the stored cycle only. 
    However it might be at another cycle and coming back to the first cycle
    create jumps in other object animation. 
    One solution could be to update the timeline min/max so that the user actually go through the
    CURRENT cycle, and not the stored one.*/
    animation.currentTime = parseInt(this.value); 
    updateAnimation(parseInt(this.value), root);

    // Update displays
    for (let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
        objects[k].display.updateTiming();
    }
} 

// --------------- SKETCH CANVAS ---------------
// Used to draw the gradient curve

let refTime = new Date().getTime(); // Time when we start drawing the line
let pos = { x: 0, y: 0 }; // last known position in the 2D canvas

// 2D sketch canvas
let canvas2D = document.getElementById('canvas'); 
canvas2D.width = window.innerWidth;
canvas2D.height = window.innerHeight;
let ctx = canvas2D.getContext('2d');

// CANVAS
window.addEventListener('resize', resize);
canvas2D.addEventListener('mousemove', draw);
canvas2D.addEventListener('mousedown', setPosition);
canvas2D.addEventListener('mouseup', updateScene);
canvas2D.style.display = "none";

/**
 * Draw a line in the 2D canvas
 * @param {MouseEvent} e - Mouse event
 */
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

/**
 * Initialize sketch info when clicking on the canvas
 * @param {MouseEvent} e - Mouse event
 */
function setPosition(e) {
    if(e.type == "mousedown") {
        refTime = new Date().getTime();
        animation.isAnimating = false;

        // Retrieve 2D position of the mouse on the canvas
        let rect = canvas2D.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }

    // Clear the canvas in case it's not clean
    if (!sketch.isClean) {
        ctx.clearRect(0, 0, canvas2D.width, canvas2D.height);
        sketch.positions = [];
        sketch.timings = [];
        sketch.isClean = true;
    }

    // Project the 2D position in the 3D frame (on the view plane going through the vector (0, 0, 0))
    let pI = project3D(e, canvas2D, new THREE.Vector3());
    
    sketch.positions.push(pI); // Store position
    sketch.timings.push(new Date().getTime() - refTime); // Store timing
}

/**
 * Update in real-time the scene by drawing the 2D line on the canvas when moving the mouse
 * @param {MouseEvent} e - Mouse event
 */
function updateScene(e) {
    sketch.isClean = false;

    // Retime the drawn line
    let retimed = retime(sketch.timings, sketch.positions);

    /* For every selected object, find the point on the curve closest to its effector. 
    The timing value will give the timing offset of its path.*/
    for (let k = 0; k < selectedObjects.length; k++) {
        let effector = selectedObjects[k].bones[selectedObjects[k].path.effector + 1].position.clone(); // Local effector position
        effector = worldPos(effector, selectedObjects[k], selectedObjects[k].bones, selectedObjects[k].path.effector); // Global effector position
        let d = Infinity; // Distance to effector
        let closestId = 0; // Index of the closest point in the gradient curve
        for(let i = 0; i < retimed.tempPos.length; i++) {
            let new_d = effector.distanceTo(retimed.tempPos[i]);
            if (new_d < d) {
                closestId = i;
                d = new_d;
            }
        }

        let timingoffset = retimed.tempT[closestId]; // Retrieve the offset
        selectedObjects[k].path.offsetTiming(timingoffset); // Offset the timings of the path
    }

    // Start animation
    animation.isAnimating = true;

    // Clear the 2D canvas
    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); 
}