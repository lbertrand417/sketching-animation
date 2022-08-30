"use strict;"

import { settings } from './canvas.js';
import { interpolate, getEffectorPositions } from './utils.js'
import { findInArray, retime, filter, getCycles } from './utilsArray.js'

class MyPath {
    constructor(object) {
        // Final positions and timings
        this._positions = []; 
        this._timings = []; 

        // Original inputs
        this._rawPositions = [];
        this._rawTimings = [];

        // Positions after filtering and retiming
        this._effectorPositions = [];
        this._cleanPositions = [];
        this._cleanTimings = [];

        this._object = object;
        this._currentIndex = 0;
        this._startTime = new Date().getTime();
        this._effectorIndex = null;
        this._target = null;
    }

    get rawPositions() { return this._rawPositions; }
    get rawTimings() { return this._rawTimings; }
    get effectorPositions() { return this._effectorPositions; }
    get cleanPositions() { return this._cleanPositions; }
    get cleanTimings() { return this._cleanTimings; }

    get positions() { return this._positions; }
    set positions(p) { this._positions = p; }

    get timings() { return this._timings; }
    set timings(t) { this._timings = t; }

    get index() { return this._currentIndex; }
    set index(i) { this._currentIndex = i; }

    get currentPosition() { return this._positions[this._currentIndex].clone(); }
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
        while (i < this._positions.length) {
            if(time == this._timings[i]) {
                this._currentIndex = i;
                i = this._positions.length;
            } else {
                i++;
            }
        }
        //console.log(this._currentIndex)
    }

    // Paste the drawn path to the first selected object
    update(positions, timings) {
        if(positions.length >= 2) {
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

            if(settings.cleanPath) {
                console.log("hello")
                let cycles = getCycles(this._cleanPositions);
                console.log(cycles);
                if(cycles.length > 1) {
                    for (let i = 0; i < cycles[0].end; i++) {
                        this._cleanPositions.shift();
                        this._cleanTimings.shift();
                    }
                }
            }

            this._effectorPositions = getEffectorPositions(this._object, this._cleanPositions);

            this._positions = [...this._cleanPositions];
            this._timings = [...this._cleanTimings];
            
            

            // Create a cycle with the path
            let tempT = [...this._timings];
            for (let i = tempT.length - 2; i > 0; i--) {
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }

            console.log(this._positions);
            console.log(this._timings);
        }
    }

    // Paste path of the first selected object to the other selected objects
    paste(path, scale) {
        console.log('paste');
        //console.log(path.timings)

        // Paste information of the selected object
        this._rawPositions = [];
        this._rawTimings = [...path.rawTimings];
        for(let i = 0; i < path.rawPositions.length; i++) {
            let localPos = path.rawPositions[i].clone();
            localPos.multiplyScalar(scale);
            this._rawPositions.push(localPos);
        }

        this._cleanPositions = [];
        this._cleanTimings = [...path.cleanTimings];
        for(let i = 0; i < path.cleanPositions.length; i++) {
            let localPos = path.cleanPositions[i].clone();
            localPos.multiplyScalar(scale);
            this._cleanPositions.push(localPos);
        }

        this._positions = [];
        this._timings = [...path.timings];
        // Put positions in local space
        for(let i = 0; i < path.positions.length; i++) {
            // Retrieve local position (wrt root of original object)
            let localPos = path.positions[i].clone();
            localPos.multiplyScalar(scale); // Scale the path
            this._positions.push(localPos); 
        }

        this._startTime = path.startTime; // Bug
        this._index = path.index;
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
    }

    // Synchronize this.path with path
    synchronize(path){
        if(path.positions.length != 0) {
            // Find extremum of this path
            console.log('detail')
            let begin = 0;
            let L = Math.floor(this.timings.length / 2);
            let end = L;
            let axis = this.positions[end].clone().sub(this.positions[begin])

            console.log('parent')
            let parentBegin = 0;
            let parentEnd = Math.floor(path.timings.length / 2);
            let parentAxis = path.positions[parentEnd].clone().sub(path.positions[parentBegin]);

            console.log('before', this._positions);

            if (axis.dot(parentAxis) < 0) {
                /*begin = L;
                end = this.timings.length;*/
                for (let i = 0; i < L; i++) {
                    this.shift();
                }
            }

            console.log('after', this._positions);

            console.log('begin', begin);
            console.log('end', end);
            console.log("parent begin", parentBegin);
            console.log("parentEnd", parentEnd)

            let leftOffset = this.timings[begin] - path.timings[parentBegin];
            this.offsetTiming(-leftOffset);

            console.log(this.timings);

            let newTimings = [...this.timings];
            newTimings[begin] = path.timings[parentBegin];
            newTimings[end] = path.timings[parentEnd];
            //newTimings[end % newTimings.length] = path.timings[parentEnd];
            let parentDenom = path.timings[parentEnd] - path.timings[parentBegin];

            let detailDenom;
            detailDenom = this.timings[end] - this.timings[begin];
            /*if (end == this.timings.length) {
                detailDenom = this.timings[end - 1] + 16 - this.timings[begin];
            } else {
                detailDenom = this.timings[end] - this.timings[begin];
            }*/

            console.log('parentDenom', parentDenom);
            console.log('detailDenom', detailDenom);

            for (let i = begin + 1; i < end; i++) {
                newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
            }

            for (let i = end; i < this.timings.length; i++) {

                newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
            }

            for (let i = begin; i >= 0; i--) {
                newTimings[i] = newTimings[i+1] - (this.timings[i+1] - this.timings[i]) / detailDenom * parentDenom;
            }

            console.log("new timings 1", newTimings)

            /*if(newTimings[0] < 0) {
                let offset = (newTimings[newTimings.length - 1] + 16) - newTimings[0];
                newTimings = newTimings.map( function(value) { 
                    return value + offset; 
                } );
            }

            console.log("new timings 2", newTimings)*/

            //let retimed = retime(newTimings, this.positions)

            let tempPos = [];
            let tempT = [];
            for(let i = 0; i < path.timings.length; i++) {

                let objectTime = path.timings[i];
                while (objectTime < newTimings[0]) {
                    objectTime += path.timings.length * 16;
                }

                while (objectTime > newTimings[newTimings.length - 1]) {
                    objectTime -= path.timings.length * 16;
                }


                let info = findInArray(objectTime, newTimings);
                if(tempT.length > 0 && objectTime < tempT[0]) {
                    if(info.i + 1 < this.positions.length) {
                        tempPos.unshift(interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
                    } else {
                        console.log("coucou")
                        tempPos.unshift(this.positions[info.i]);
                    }
                    tempT.unshift(objectTime);
                } else {
                    if(info.i + 1 < this.positions.length) {
                        tempPos.push(interpolate(this.positions[info.i], this.positions[info.i + 1], info.alpha));
                    } else {
                        console.log("coucou")
                        tempPos.push(this.positions[info.i]);
                    }
                    tempT.push(objectTime);
                }
            }
        
            console.log('original', this.timings);
            console.log('new', newTimings)
            //console.log('retiming', retimed.tempT)
            console.log('retiming', tempT)
            console.log('parent', path.timings);
            
            this.positions = [...tempPos];
            this.timings = [...tempT];
        }
    }

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