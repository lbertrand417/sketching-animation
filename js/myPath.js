"use strict;"

import * as THREE from 'three';
import { settings } from './gui.js';
import { interpolate, getEffectorPositions } from './utils.js'
import { findInArray, retime, createCycle } from './utilsArray.js'
import { filter, extractCurves } from './inputProcessing.js'
import { updateChildren } from './main.js'

/**
 * Class describing a path drawn by the user
 */
class MyPath {

    // --------------- CONSTRUCTOR ---------------

    /**
     * Instantiate a MyPath object
     * @param {MyObject} object - Object the path is attached to
     */
    constructor(object) {
        // Original inputs (without any processing)
        this._rawPositions = [];
        this._rawTimings = [];

        // Positions after filtering and retiming
        this._cleanPositions = [];
        this._cleanTimings = [];

        // Final positions and timings
        this._positions = []; 
        this._timings = [];         

        this._effectorPositions = []; // Effector position when following the trajectory

        this._object = object; // Object attached to the path
        this._currentIndex = 0; // Index of the current position in the path
        this._effectorIndex = null; // Index of the selected bone (TODO: would be better if part of MyObject)
        this._target = null; // Not null if the path follows a target point
    }

    // --------------- GETTER/SETTER ---------------

    get rawPositions() { return this._rawPositions; }
    get rawTimings() { return this._rawTimings; }
    get cleanPositions() { return this._cleanPositions; }
    get cleanTimings() { return this._cleanTimings; }
    get positions() { return this._positions; }
    set positions(p) { this._positions = p; }
    get timings() { return this._timings; }
    set timings(t) { this._timings = t; }
    get effectorPositions() { return this._effectorPositions; }

    get index() { return this._currentIndex; }
    set index(i) { this._currentIndex = i; }

    get currentPosition() { return this._positions[this._currentIndex].clone(); }
    get currentTime() { return this._timings[this._currentIndex]; }

    get effector() { return this._effectorIndex; }
    set effector(e) { this._effectorIndex = e; }

    get target() { return this._target; }
    set target(t) { this._target = t; }
    get hasTarget() { return this._target != null; }

    // --------------- FUNCTIONS ---------------

    // Find position in the object path wrt a given timing
    /**
     * Find the position at time "time" in the final path
     * @param {number} time The timing
     */
    updateCurrentTime(time) {
        let i = 0;
        this._currentIndex = 0;
        while (i < this._positions.length) {
            if(time == this._timings[i]) {
                this._currentIndex = i;
                i = this._positions.length;
            } else {
                i++;
            }
        }
    }

    // Paste the drawn path to the first selected object
    /**
     * Update the path positions and timings from the user input
     * @param {Array<THREE.Vector3>} positions Raw positions 
     * @param {Array<number>} timings - Raw timings
     */
    update(positions, timings) {
        if(positions.length >= 2) {
            // Store in the historic
            savePathPositions.push(positions);
            savePathTimings.push(timings);

            // Save raw positions and timings
            this._rawPositions = [...positions];
            this._rawTimings = [...timings];

            // Filter and retime to clean the path
            let filtered = filter(positions, timings, 1);
            let retimed = retime(filtered.timings, filtered.positions)

            this._cleanPositions = retimed.tempPos;
            this._cleanTimings = retimed.tempT;

            // If true, remove the excess amount of path, i.e. the first extracted curve in the input
            if(settings.cleanPath) {
                // Extract curves from the clean input
                let cycles = extractCurves(this._cleanPositions, this.cleanTimings);

                // Remove the first exctracted curve if necessary
                if(cycles.length > 1) {
                    for (let i = 0; i < cycles[0].end; i++) {
                        this._cleanPositions.shift();
                        this._cleanTimings.shift();
                    }
                }
            }

            // Retrieve the effector path when following the clean input
            this._effectorPositions = getEffectorPositions(this._object, this._cleanPositions);

            this._positions = [...this._cleanPositions];
            this._timings = [...this._cleanTimings];
            
            // Create a cycle with the path
            createCycle(this._positions, this._timings);
        }
    }

    /**
     * Paste the input path, by scaling it according to the object height ratio.
     * @param {MyPath} path - The copied path
     * @param {number} scale - Ratio btw the size of the object attached to the copied path and the object of this path
     */
    paste(path, scale) {
        // Paste raw positions and timings
        this._rawPositions = [];
        this._rawTimings = [...path.rawTimings];
        for(let i = 0; i < path.rawPositions.length; i++) {
            let localPos = path.rawPositions[i].clone(); // Local position
            localPos.multiplyScalar(scale); // Rescale
            this._rawPositions.push(localPos);
        }

        // Paste clean positions and timings
        this._cleanPositions = [];
        this._cleanTimings = [...path.cleanTimings];
        for(let i = 0; i < path.cleanPositions.length; i++) {
            let localPos = path.cleanPositions[i].clone(); // Local position
            localPos.multiplyScalar(scale); // Rescale
            this._cleanPositions.push(localPos);
        }

        // Retrieve effector positions when folloqing the cleaned path
        this._effectorPositions = getEffectorPositions(this._object, this._cleanPositions);

        // Paste final positions and timings
        this._positions = [];
        this._timings = [...path.timings];
        for(let i = 0; i < path.positions.length; i++) {
            let localPos = path.positions[i].clone(); // Lcal position
            localPos.multiplyScalar(scale); // Rescale
            this._positions.push(localPos); 
        }

        // Paste the current position index
        this._index = path.index;
    }

    delete() {
        this._rawPositions = [];
        this._rawTimings = [];
        this._cleanPositions = [];
        this._cleanTimings = [];
        this._positions = [];
        this._timings = [];
        this._effectorPositions = [];

        // Put back to rest pose
        for(let i = 1; i < this._object.bones.length; i++) {
            let boneQ = this._object.restBones[i].quaternion.clone();
            this._object.bones[i].quaternion.copy(boneQ);
            this._object.lbs[i].quaternion.copy(boneQ);

            this._object.bones[i].updateWorldMatrix(false, false)
            this._object.lbs[i].updateWorldMatrix(false, false)

            updateChildren(this._object, new THREE.Vector3())
        }

        // Update display
        this._object.display.updatePath();
        this._object.display.updateLinks();
        this._object.display.updateTiming();
    }

    /**
     * Add a timing offset to the timings
     * @param {number} offset - The offset
     */
    offsetTiming(offset) {
        this._timings = this._timings.map( function(value) { 
            return value + offset; 
        } );
    }

    /**
     * Add a rotation offset (around the rest pose axis) to the positions
     * @param {THREE.Vector3} axis - The axis of rotation
     * @param {number} offset - The angle for the rotation
     */
    offsetOrientation(axis, offset) {
        for(let i = 0; i < this._positions.length; i++) {
            let localPos = this._positions[i].clone(); // Local position
            localPos.applyAxisAngle(axis, offset);
            this._positions[i] = localPos;
        }
    }

    
    // Synchronize this.path with path
    /**
     * Synchronize the path to the given path "path"
     * TODO: Rn works only with one forward + one backward. Have to adapt it to work for an arbitrary amount of curves
     * (Started in another project but it doesn't work and it requires to change a lot of things about timing processing)
     * @param {MyPath} path - The path (base path) we want our path to be synchronized with 
     */
    synchronize(path){
        if(path.positions.length != 0) {

            // --------------- Find the curves to synchronize ---------------

            // Retrieve the first curve of the path 
            // TODO: Generalize with a generic amount of curves
            let begin = 0;
            let L = Math.floor(this.timings.length / 2);
            let end = L;
            let axis = this.positions[end].clone().sub(this.positions[begin])

            // Retrieve the first curve of the base path
            let parentBegin = 0;
            let parentEnd = Math.floor(path.timings.length / 2);
            let parentAxis = path.positions[parentEnd].clone().sub(path.positions[parentBegin]);

            /* If the orientation of both are different (a forward and a backward curve), switch the 2 curves of the path
            so that they have the same direction*/
            if (axis.dot(parentAxis) < 0) {
                for (let i = 0; i < L; i++) {
                    this.shift();
                }
            }

            // Offset the path so that it starts at the same time at the base path
            let leftOffset = this.timings[begin] - path.timings[parentBegin];
            this.offsetTiming(-leftOffset);

            // --------------- Rescale ---------------

            /* Rescale the 2 curves so that extremums of each curves of each path are reached at the same time,
            i.e. the forward (resp backward) curves happen at the same time.*/
            let newTimings = [...this.timings];
            newTimings[begin] = path.timings[parentBegin];
            newTimings[end] = path.timings[parentEnd];
            let parentDenom = path.timings[parentEnd] - path.timings[parentBegin];
            let detailDenom = this.timings[end] - this.timings[begin];

            for (let i = begin + 1; i < end; i++) {
                newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
            }

            for (let i = end; i < this.timings.length; i++) {

                newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
            }

            for (let i = begin; i >= 0; i--) {
                newTimings[i] = newTimings[i+1] - (this.timings[i+1] - this.timings[i]) / detailDenom * parentDenom;
            }

            // --------------- Retime ---------------

            // Retime the newly computed timings
            /* Note: have a better implementation in the code where I'm trying to generalize the synchronization to
            a random amount of curves.*/
            let tempPos = [];
            let tempT = [];
            for(let i = 0; i < path.timings.length; i++) {

                // Retrieve timing inside the stored cycle
                let objectTime = path.timings[i];
                while (objectTime < newTimings[0]) {
                    objectTime += path.timings.length * 16;
                }

                while (objectTime > newTimings[newTimings.length - 1]) {
                    objectTime -= path.timings.length * 16;
                }

                // Find the position of the wanted timing in the new timings array
                let info = findInArray(objectTime, newTimings);

                // If the timing happens before the stored timings, add position and timing at the beginning
                if(tempT.length > 0 && objectTime < tempT[0]) { 
                    if(info.i + 1 < this.positions.length) {
                        tempPos.unshift(interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
                    } else {
                        tempPos.unshift(this.positions[info.i]);
                    }
                    tempT.unshift(objectTime);
                // If the timing happens after the stored timings, add position and timing at the end
                } else if (tempT.length > 0 && objectTime > tempT[tempT.length - 1]) {
                    if(info.i + 1 < this.positions.length) {
                        tempPos.push(interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
                    } else {
                        tempPos.push(this.positions[info.i]);
                    }
                    tempT.push(objectTime);
                // Else add the position and timing at the right place inside the array
                } else {
                    let index = findInArray(objectTime, tempT);
                    tempT.splice(index, 0, objectTime);
                    if(info.i + 1 < this.positions.length) {
                        tempPos.splice(index + 1, 0, interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
                    } else {
                        tempPos.splice(index + 1, 0, this.positions[info.i]);
                    }
                }
            }
        
            // Update positions and timings of the path
            this.positions = [...tempPos];
            this.timings = [...tempT];
        }
    }

    /**
     * Shift the cycle from one position. The first point of the path goes at the end.
     */
    shift() {
        let tempT = [];
        let tempPos = [];
        for(let i = 1; i < this.timings.length; i++) {
            tempT.push(this.timings[i]);
            tempPos.push(this.positions[i].clone());
        }
        tempT.push(this.timings[this.timings.length - 1] + 16)
        tempPos.push(this.positions[0].clone());
        this.timings = [...tempT];
        this.positions = [...tempPos];
    }
}

export { MyPath }