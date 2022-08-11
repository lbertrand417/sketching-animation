"use strict;"

import * as THREE from 'three'
import { settings } from './canvas.js';
import { compareNombres, computeAngleAxis, retime, filter, cleanPath, getCycles, computeCycle, getEffectorPositions } from './utils.js'

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
        this._extremums = Array(4).fill(0);
    }

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

    get extremums() { return this._extremums; }

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

            this._effectorPositions = getEffectorPositions(this._object, this._cleanPositions);

            // Post-processing
            if(settings.autoGenerate) {
                let cycles = getCycles(this._cleanPositions, 1);
                console.log(cycles);
                let cycle = computeCycle(this._cleanPositions, this._cleanTimings, cycles);
                this._positions = cycle.pos;
                this._timings = cycle.t;
            } else if (settings.autoGenerate2) {
                let cycles = getCycles(this._effectorPositions, 1);
                console.log('cycle', cycles);
                let cycle = computeCycle(this._effectorPositions, this._cleanTimings, cycles);
                this._positions = cycle.pos;
                this._timings = cycle.t;
            } else {
                this._positions = [...this._cleanPositions];
                this._timings = [...this._cleanTimings];
            }
            
            console.log(this._positions);
            console.log(this._timings);

            // Create a cycle with the path
            let tempT = [...this._timings];
            for (let i = tempT.length - 2; i > 0; i--) {
                console.log(i)
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }

            //this.findExtremum();
            //this.align(this._extremums[0]);
        }
    }

    // Paste the drawn path to the first selected object
    /*update(positions, timings) {
        if(positions.length >= 2) {
            savePathPositions.push(positions);
            savePathTimings.push(timings);

            console.log(positions);

            if(settings.autoGenerate) {
                let cycles = getCycles(positions, 1);
                console.log(cycles);
                let cycle = computeCycle(positions, timings, cycles);
                positions = cycle.pos;
                timings = cycle.t;
            }

            console.log(positions)
            //let filtered = filter(positions, timings, 1);
            //let filtered = filter(cycle.pos, cycle.t, 1);
            //console.log(filtered.positions)

            //let cycles = getCycles(filtered.positions, 1);
            //console.log(cycles);

            //let cycle = computeCycle(filtered.positions, filtered.timings, cycles);

            //let retimed = retime(filtered.timings, filtered.positions)
            let retimed = retime(timings, positions)
            //let retimed = retime(cycle.t, cycle.pos)
            let tempPos = retimed.tempPos
            let tempT = retimed.tempT

            console.log(tempPos);

            if(settings.cleanPath) {
                cleanPath(tempPos, tempT);
            }

            // Copy the path to the first selected object
            this._positions = [...tempPos];
            this._timings = [...tempT];

            // Create a cycle with the path
            //for (let i = tempT.length - 2; i >= 0; i--) {
            for (let i = tempT.length - 2; i > 0; i--) {
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }


            /*savePathPositions.push(this._positions);
            savePathTimings.push(this._timings);

            console.log(this._timings)
            this.findExtremum();

            //console.log('old', this.extremums);

            this.align(this._extremums[0]);

            //console.log('aligned', this.extremums);

            //this.saveToJSON();
        }
    }*/

    // Paste path of the first selected object to the other selected objects
    paste(path, scale) {
        console.log('paste');
        //console.log(path.timings)

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

        this._extremums = [...path.extremums];
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

    findExtremum() {
        let angle = - Infinity;
        let axis;
        let leftIndex;
        let rightIndex;
        let L = Math.floor(this.positions.length / 2);
        for (let i = 0; i <= L; i++) {
            for (let j = i; j <= L; j++) {
                let worldRotation = computeAngleAxis(new THREE.Vector3(), this.positions[i], this.positions[j]);
                if (worldRotation.angle > angle) {
                    leftIndex = i;
                    rightIndex = j;
                    angle = worldRotation.angle;
                    axis = worldRotation.axis;
                }
            }
        }

        this._extremums[0] = leftIndex;
        this._extremums[1] = rightIndex;
        this._extremums[2] = this.timings.length - rightIndex;
        this._extremums[3] = this.timings.length - leftIndex

        //console.log('left', leftIndex);
        //console.log('right', rightIndex)
        //console.log('extremums', this._extremums)
        //return { leftIndex, rightIndex, axis }
    }

    // Synchronize this.path with path
    /*synchronize(path){
        // Find extremum of this path
        console.log('detail')
        console.log(this.VSpositions)
        let info = this.findExtremum();
        let leftTiming = this.timings[info.leftIndex];
        let rightTiming = this.timings[info.rightIndex];

        console.log('parent')
        console.log(path.VSpositions)
        let parentInfo = path.findExtremum();
        let parentLeftTiming = path.timings[parentInfo.leftIndex];
        let parentRightTiming = path.timings[parentInfo.rightIndex];

        /*if (axis.dot(parentAxis) < 0) {

        }
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

        let retimed = retime(newTimings, this.positions)

        console.log('original', this.timings);
        console.log('new', newTimings)
        console.log('retiming', retimed.tempT)
        console.log('parent', path.timings);
        
        this.positions = [...retimed.tempPos];
        this.VSpositions = [...retimed.tempPos];
        this.timings = [...retimed.tempT];
    }*/

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

    align(index) {
        //let gap = this._extremums[index]
        for(let i = 0; i < index; i++) {
            //console.log('shift');
            this.shift();
            for (let j = 0; j < this._extremums.length; j++) {
                if (this._extremums[j] == 0) {
                    this._extremums[j] = this.timings.length - 1;
                } else {
                    this._extremums[j] -= 1; 
                }
            }
        }

        /*console.log('extremums', this.extremums)
        console.log('timings', this.timings);
        console.log('positions', this.VSpositions)*/

    }

    // Ne fonctionne pas correctement
    reverse() {
        // Put the other extremum at the start
        /*let maxTiming = Math.floor(this.VSpositions.length / 2);

        for(let i = 0; i < maxTiming; i++) {
            console.log('shift');
            this.shift();
        }

        console.log('detail')
        this.findExtremum();
        this.align();
        // TODO: shift 0

        console.log('new extremums', this._extremums)

        console.log('reverse timings', this.timings)
        console.log('reverse pos', this.VSpositions)*/

        this.align(this._extremums[1]);
        this._extremums[2] = this.timings.length;
        this._extremums.sort(compareNombres);

        console.log('sorted extremums', this.extremums)
    }

    synchronize(path) {
        // PUT MAX BEND IN SAME DIRECTION
        // Find extremum of this path
        //console.log('detail')
        //console.log(this.timings)
        //console.log('extremums', this.extremums)
        let info = computeAngleAxis(new THREE.Vector3(), this.positions[this._extremums[0]], this.positions[this._extremums[1]]);
        let axis = info.axis;

        //console.log('parent')
        //console.log(path.timings)
        //console.log(path.VSpositions)
        let parentInfo = computeAngleAxis(new THREE.Vector3(), path.positions[path.extremums[0]], path.positions[path.extremums[1]]);
        let parentAxis = parentInfo.axis;

        let newTimings = [...this.timings];
        if (axis.dot(parentAxis) < 0) {
            /*console.log('if')
            console.log('axis', axis);
            console.log('parentAxis', parentAxis)
            console.log(axis.dot(parentAxis))*/
            this.reverse()
        }


        /*console.log('parent')
        console.log('parent extremums', path.extremums)


        console.log('shift timings', this.timings);
        console.log('shift positions', this.positions);*/

        // PUT SAME TIMINGS
        // Synchronize left part
        let leftOffset = this.timings[0] - path.timings[0];
        this.offsetTiming(-leftOffset);

        newTimings = [...this.timings];

        // Synchronize secondExt
        let parentDenom = path.timings[path.extremums[1]] - path.timings[0];
        let detailDenom = this.timings[this.extremums[1]] - this.timings[0];


        for (let i = 1; i <= this.extremums[1]; i++) {
            //console.log('old timings', newTimings[i])
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
            //console.log('new timings', newTimings[i])
        }

        // Synchronize thirdExt
        parentDenom = path.timings[path.extremums[2]] - path.timings[path.extremums[1]];
        detailDenom = this.timings[this.extremums[2]] - this.timings[this.extremums[1]];

        for (let i = this.extremums[1] + 1; i <= this.extremums[2]; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }


        if (path.extremums[3] == path.timings.length) {
            path.extremums[3] -= 1;
        } 
        parentDenom = path.timings[path.extremums[3]] - path.timings[path.extremums[2]];

        if (this.extremums[3] == this.timings.length) {
            this.extremums[3] -= 1;
            
        } 
        detailDenom = this.timings[this.extremums[3]] - this.timings[this.extremums[2]];
        
    
        for (let i = this.extremums[2] + 1; i <= this.extremums[3]; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }

        // Synchronize the rest
        parentDenom = path.timings[path.timings.length - 1] - path.timings[path.extremums[3]];
        detailDenom = this.timings[this.timings.length - 1] - this.timings[this.extremums[3]];

        for (let i = this.extremums[3] + 1; i < this.timings.length; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }

        //console.log('max aligned', newTimings)



        let retimed = retime(newTimings, this.positions)

        //console.log('new', newTimings)
        //console.log('retiming', retimed.tempT)
        //console.log('repos', retimed.tempPos)
        //console.log('parent', path.timings);

        this.positions = [...retimed.tempPos];
        this.timings = [...retimed.tempT];

        this.findExtremum();
    }
}

export { MyPath }