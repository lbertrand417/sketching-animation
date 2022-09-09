"use strict;"

import * as THREE from 'three';
import { settings } from './canvas.js';
import { interpolate, getEffectorPositions } from './utils.js'
import { findInArray, retime, filter, extractCurves } from './utilsArray.js'

class MyPath {
    constructor(object) {
        // Original inputs
        this._rawPositions = [];
        this._rawTimings = [];

        // Positions after filtering and retiming
        this._effectorPositions = [];
        this._cleanPositions = [];
        this._cleanTimings = [];

        // Timings of final positions but unsync
        //this._unsyncPositions = [];
        this._unsyncTimings = []

        // Sync info to keep correspondence between before and after sync
        /* curve = { beginning: beginning index in unsync array,
                    end: end index in unsync array,
                    unsyncPos, unsyncT, syncPod, syncT }*/
        this._curves = [];
        this._curveIndex = null;

        // Final positions and timings
        this._positions = []; 
        this._timings = [];         

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

    get unsyncTimings() { return this._unsyncTimings; } // TODO: update unsync timings in timing offsets 
    get timings() { return this._timings; }
    set timings(t) { this._timings = t; }

    get curves() { return this._curves; }

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
                let cycles = extractCurves(this._cleanPositions, this.cleanTimings);
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
            /*let tempT = [...this._timings];
            for (let i = tempT.length - 2; i > 0; i--) {
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }*/

            this._unsyncTimings = [...this._timings];

            this._curves = extractCurves(this._positions, this._timings);
            this._curveIndex = null;
            console.log(this._curves);

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

        this._effectorPositions = getEffectorPositions(this._object, this._cleanPositions);

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
            console.log(this._curves)
            let currentCurve = this._curves.findIndex(value => 
                (value.syncT[0] <= this.currentTime) && (value.syncT[value.syncT.length - 1]>= this.currentTime));
            //console.log('detail curves', this._curves)
            console.log('curve', currentCurve);

        
            let currentParentCurve = path.curves.filter(value => 
                (value.syncT[0] <= path.currentTime) && (value.syncT[value.syncT.length - 1]>= path.currentTime))[0];
            console.log("parent curves", path.curves);
            console.log("parent Index", path.curves.findIndex(value => 
                (value.syncT[0] <= path.currentTime) && (value.syncT[value.syncT.length - 1]>= path.currentTime)))
            
            if(this._curves[currentCurve].syncT[0] != currentParentCurve.syncT[0] || 
                        this._curves[currentCurve].syncT[this._curves[currentCurve].syncT.length - 1] != currentParentCurve.syncT[currentParentCurve.syncT.length - 1]) { // TODO or if parent curve change cur donc je dois tester les extremums aussi
                console.log("change curve");
                this._curveIndex = currentCurve;

                let parentDenom = currentParentCurve.syncT[currentParentCurve.syncT.length - 1] - currentParentCurve.syncT[0];

                let detailDenom = this._curves[currentCurve].unsyncT[this._curves[currentCurve].unsyncT.length - 1] - this._curves[currentCurve].unsyncT[0];

                console.log('parentDenom', parentDenom);
                console.log('detailDenom', detailDenom);

                // Synchronize THE curve
                let theCurve = this._curves[currentCurve];
                theCurve.syncT = [...theCurve.unsyncT];
                theCurve.syncT[0] = currentParentCurve.syncT[0];
                for (let i = 1; i < theCurve.unsyncT.length; i++) {
                    theCurve.syncT[i] = (theCurve.unsyncT[i] - theCurve.unsyncT[i-1]) / detailDenom * parentDenom + theCurve.syncT[i-1];
                }

                for (let l = currentCurve + 1; l < this._curves.length; l++) {
                    this._curves[l].syncT = [...this._curves[l].unsyncT];
                    this._curves[l].syncT[0] = (this._curves[l].unsyncT[0] - this._curves[l-1].unsyncT[this._curves[l-1].unsyncT.length - 1]) 
                                            / detailDenom * parentDenom + this._curves[l-1].syncT[this._curves[l-1].syncT.length - 1];
                    for (let i = 1; i < this._curves[l].syncT.length; i++) {
                        this._curves[l].syncT[i] = (this._curves[l].unsyncT[i] - this._curves[l].unsyncT[i-1]) / detailDenom * parentDenom + this._curves[l].syncT[i-1];
                    }
                }

                for (let l = currentCurve - 1; l >= 0; l--) {
                    this._curves[l].syncT = [...this._curves[l].unsyncT];
                    this._curves[l].syncT[this._curves[l].syncT.length - 1] = this._curves[l+1].syncT[0] 
                                                                        - (this._curves[l+1].unsyncT[0] - this._curves[l].unsyncT[this._curves[l].syncT.length - 1]) 
                                                                        / detailDenom * parentDenom;
                    for (let i = this._curves[l].syncT.length - 2; i >= 0; i--) {
                        this._curves[l].syncT[i] = this._curves[l].syncT[i+1] - (this._curves[l].unsyncT[i+1] - this._curves[l].unsyncT[i]) / detailDenom * parentDenom;
                    }
                }

                this.positions = [];
                this.timings = [];
                for(let l = 0; l < this._curves.length; l++) {
                    this._curves[l].syncT = this._curves[l].syncT.map( function(value) { 
                        return Math.round((value + Number.EPSILON) * 100) / 100; 
                    } );

                    console.log('round', this._curves[l].syncT);
    
                    let retimed = retime(this._curves[l].syncT, this._curves[l].syncPos);

                    this._curves[l].syncT = [...retimed.tempT];
                    this._curves[l].syncPos = [...retimed.tempPos]

                    console.log('retimed', this._curves[l].syncT);

                    if (l != currentCurve && l > 0) {
                        this._curves[l].syncT.unshift(this._curves[l].syncT[0] - 16);
                        this._curves[l].syncPos.unshift(interpolate(this._curves[l-1].syncPos[this._curves[l-1].syncPos.length - 1], this._curves[l].syncPos[0], 0.5))
                    } 
                    if (l == currentCurve && l > 0) {
                        this._curves[l-1].syncT.push(this._curves[l].syncT[0] - 16);
                        this._curves[l-1].syncPos.push(interpolate(this._curves[l-1].syncPos[this._curves[l-1].syncPos.length - 1], this._curves[l].syncPos[0], 0.5))
                    }

                    this.positions = this.positions.concat(retimed.tempPos);
                    this.timings = this.timings.concat(retimed.tempT)
                }

                /*let retimed = retime(this.timings, this.positions);

                this.positions = [...retimed.tempPos];
                this.timings = [...retimed.tempT];*/
            }
        }

        console.log('positions', this.positions);
        console.log('timings', this.timings);
        console.log('parent timings', path.timings)
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