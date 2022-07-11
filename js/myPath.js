"use strict;"

import * as THREE from 'three'
import { computeAngleAxis, findInArray, fromLocalToGlobal, interpolate, worldPos } from './utils.js'

class MyPath {
    constructor() {
        this._positions = [];  
        this._VSpositions = [];      
        this._timings = [];
        this._currentIndex = 0;
        this._startTime = new Date().getTime();
        this._effectorIndex = null;
        this._target = null;
    }

    get positions() { return this._positions; }
    set positions(p) { this._positions = p; }

    get VSpositions() { return this._VSpositions; }
    set VSpositions(p) { this._VSpositions = p; }

    get timings() { return this._timings; }
    set timings(t) { this._timings = t; }

    get index() { return this._currentIndex; }
    set index(i) { this._currentIndex = i; }

    //get currentPosition() { return this._positions[this._currentIndex].clone(); }
    get currentPosition() { return this._VSpositions[this._currentIndex].clone(); }
    get currentTime() { return this._timings[this._currentIndex]; }

    get startTime() { return this._startTime; }
    set startTime(t) { this._startTime = t; }

    get effector() { return this._effectorIndex; }
    set effector(e) { this._effectorIndex = e; }

    get target() { return this._target; }
    set target(t) { this._target = t; }
    get hasTarget() { return this._target != null; }


    // Find position in the object path wrt a given timing
    updateCurrentTime(time) {
        // Find closest point in the timing array
        let i = 0;
        this._currentIndex = 0;
        while (i < this._positions.length - 1) {
            if(time == this._timings[i]) {
                this._currentIndex = i;
                i = this._positions.length;
            } else {
                i++;
            }
        }
    }

    // Paste the drawn path to the first selected object
    update(positions, timings) {
        if(positions.length >= 2) {
            // Retiming and reposition
            let tempPos = [];
            let tempT = [];

            let dt = 16;
            let t = 0;
            while (t < timings[0]) {
                t += dt;
            }

            while (t <= timings[timings.length - 1]) {
                let info = findInArray(t, timings);
                tempPos.push(interpolate(positions[info.i], positions[info.i + 1], info.alpha));

                tempT.push(t);
                t += dt;
            }

            // Find the unwanted part at the beginning of the drawing (BUG!!)
            let id = 1;

            let v1 = tempPos[id - 1].clone().sub(tempPos[id]);
            let v2 = tempPos[id].clone().sub(tempPos[id + 1]);

            while (v1.dot(v2) > 0 && id < tempPos.length - 2) {
                id++;
                v1 = tempPos[id - 1].clone().sub(tempPos[id]);
                v2 = tempPos[id].clone().sub(tempPos[id + 1]);
            }

            // Remove the unwanted part from the path
            if (id != tempPos.length - 2) {
                for(let j = 0; j < id; j++) {
                    tempPos.shift();
                    tempT.shift();
                }
            }

            // Copy the path to the first selected object
            this._positions = [...tempPos];
            this._timings = [...tempT];

            // Create a cycle with the path
            for (let i = tempT.length - 2; i >= 0; i--) {
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }

            this._VSpositions = [...this._positions];
        }
    }

    // Paste path of the first selected object to the other selected objects
    paste(path, scale) {
        console.log('paste');

        // Paste information of the selected object
        this._positions = [];
        this._timings = [...path.timings];
        this._startTime = path.startTime; // Bug
        this._index = path.index;

        // Put positions in local space
        for(let i = 0; i < path.positions.length; i++) {
            // Retrieve local position (wrt root of original object)
            let localPos = path.positions[i].clone();

            // Scale the path
            localPos.multiplyScalar(scale);
            this._positions.push(localPos); 
        }

        this._VSpositions = [...this._positions];
    }

    // Add a random timing offset to all selected objects
    offsetTiming(offset) {
        this._timings = this._timings.map( function(value) { 
            return value + offset; 
        } );
    }

    // Add a random rotation offset (around the rest pose axis) to all selected objects
    offsetOrientation(axis, offset) {
        for(let i = 0; i < this._positions.length; i++) {
            let localPos = this._positions[i].clone();
            localPos.applyAxisAngle(axis, offset);
            this._positions[i] = localPos;
        }

        this._VSpositions = [...this._positions];
    }

    findExtremum() {
        let angle = - Infinity;
        let axis;
        let leftIndex;
        let rightIndex;
        let L = Math.floor(this.VSpositions.length / 2);
        for (let i = 0; i <= L; i++) {
            for (let j = i; j <= L; j++) {
                let worldRotation = computeAngleAxis(new THREE.Vector3(), this.VSpositions[i], this.VSpositions[j]);
                if (worldRotation.angle > angle) {
                    leftIndex = i;
                    rightIndex = j;
                    angle = worldRotation.angle;
                    axis = worldRotation.axis;
                }
            }
        }

        console.log('left', leftIndex);
        console.log('right', rightIndex)
        return { leftIndex, rightIndex, angle, axis }
    }

    // Synchronize this.path with path
    synchronize(path){
        // Find extremum of this path
        console.log('detail')
        console.log(this.VSpositions)
        let info = this.findExtremum();
        let leftExt = this.VSpositions[info.leftIndex].clone();
        let leftTiming = this.timings[info.leftIndex];
        let rightExt = this.VSpositions[info.rightIndex].clone();
        let rightTiming = this.timings[info.rightIndex];
        let angle = info.angle;
        let axis = info.axis;

        console.log('parent')
        console.log(path.VSpositions)
        let parentInfo = path.findExtremum();
        let parentLeftExt = path.VSpositions[parentInfo.leftIndex].clone();
        let parentLeftTiming = path.timings[parentInfo.leftIndex];
        let parentTightExt = path.VSpositions[parentInfo.rightIndex].clone();
        let parentRightTiming = path.timings[parentInfo.rightIndex];
        let parentAngle = parentInfo.angle;
        let parentAxis = parentInfo.axis;

        /*if (axis.dot(parentAxis) < 0) {

        }*/
        let newTimings = [...this.timings];
        newTimings[info.leftIndex] = parentLeftTiming;
        newTimings[info.rightIndex] = parentRightTiming;
        let parentDenom = parentRightTiming - parentLeftTiming;
        let detailDenom = rightTiming - leftTiming;

        for (let i = info.leftIndex + 1; i < info.rightIndex; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }

        for (let i = info.rightIndex; i < this.timings.length; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }

        for (let i = info.leftIndex; i >= 0; i--) {
            newTimings[i] = newTimings[i+1] - (this.timings[i+1] - this.timings[i]) / detailDenom * parentDenom;
        }

        console.log('original', this.timings);
        console.log('new', newTimings)
        console.log('parent', path.timings);

        // Retiming and reposition
        let tempPos = [];
        let tempT = [];

        let dt = 16;
        let t = 0;
        while (t < newTimings[0]) {
            t += dt;
        }

        console.log('t', t)

        while (t <= Math.round(newTimings[newTimings.length - 1])) {
            let info = findInArray(t, newTimings);
            console.log(info)
            if(info.i + 1 < this.positions.length) {
                tempPos.push(interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
            } else {
                tempPos.push(this.positions[info.i]);
            }

            tempT.push(t);
            t += dt;
        }

        this.positions = [...tempPos];
        this.VSpositions = [...tempPos];
        this.timings = [...tempT];

        console.log('original', this.timings);
        console.log('new', newTimings)
        console.log('retiming', tempT)
        console.log('parent', path.timings);
    }
}

export { MyPath }