"use strict;"

import * as THREE from 'three'
import { computeAngleAxis, retime } from './utils.js'

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
            let retimed = retime(timings, positions)
            let tempPos = retimed.tempPos
            let tempT = retimed.tempT

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
            //for (let i = tempT.length - 2; i >= 0; i--) {
            for (let i = tempT.length - 2; i > 0; i--) {
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
        return { leftIndex, rightIndex, axis }
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
        this.VSpositions = [...tempPos]
    }

    synchronize(path) {
        // PUT MAX BEND IN SAME DIRECTION
        // Find extremum of this path
        console.log('detail')
        console.log(this.timings)
        console.log(this.VSpositions)
        let info = this.findExtremum();
        let axis = info.axis;

        console.log('parent')
        console.log(path.timings)
        console.log(path.VSpositions)
        let parentInfo = path.findExtremum();
        let parentAxis = parentInfo.axis;

        let newTimings = [...this.timings];
        let newPositions = [...this.positions];
        if (axis.dot(parentAxis) < 0) {
            console.log('if')
            console.log('axis', axis);
            console.log('parentAxis', parentAxis)
            console.log(axis.dot(parentAxis))
            let maxTiming = Math.floor(this.VSpositions.length / 2);

            for(let i = 0; i < maxTiming; i++) {
                console.log('shift');
                this.shift();
            }


            console.log('reverse timings', this.timings)
            console.log('reverse pos', this.VSpositions)
        }

        // RETRIEVE 4 MAX 
        // TODO : Vérifier que c'est bien toujours un copier coller de l'aller retour (si oui récupérer les 4 index ici et garder ceux-là tout du long)
        // Recompute info
        console.log('detail')
        info = this.findExtremum();
        let firstExt = info.leftIndex;
        let secondExt = info.rightIndex;
        let thirdExt = (this.timings.length - info.rightIndex) % this.timings.length;
        let fourthExt = (this.timings.length - info.leftIndex) % this.timings.length;

        console.log('1st', firstExt);
        console.log('2nd', secondExt);
        console.log('3rd', thirdExt);
        console.log('4th', fourthExt);

        console.log('parent')
        parentInfo = path.findExtremum();
        let parentFirstExt = parentInfo.leftIndex;
        let parentSecondExt = parentInfo.rightIndex;
        let parentThirdExt = (path.timings.length - parentInfo.rightIndex) % path.timings.length;
        let parentFourthExt = (path.timings.length - parentInfo.leftIndex) % path.timings.length;

        console.log('1st', parentFirstExt);
        console.log('2nd', parentSecondExt);
        console.log('3rd', parentThirdExt);
        console.log('4th', parentFourthExt);


        // PUT THE FIRST MAX AT PLACE 0 (SHIFT THE 4 MAX)


        // Align the left variable
        for(let i = 0; i < info.leftIndex; i++) {
            console.log('shift');
            this.shift();
            info.rightIndex -= 1;
        }
        info.leftIndex = 0;

        console.log('shift timings', this.timings);
        console.log('shift positions', this.positions);

        // PUT SAME TIMINGS
        // Synchronize left part
        let leftOffset = this.timings[0] - path.timings[0];
        this.offsetTiming(-leftOffset);

        // Synchronize right part
        let parentDenom = path.timings[path.timings.length - 1] - path.timings[0];
        let detailDenom = this.timings[this.timings.length - 1] - this.timings[0];

        newTimings = [...this.timings];
        for (let i = 1; i < this.timings.length; i++) {
            newTimings[i] = (this.timings[i] - this.timings[i-1]) / detailDenom * parentDenom + newTimings[i-1];
        }


        let retimed = retime(newTimings, this.positions)

        //console.log('new', newTimings)
        console.log('retiming', retimed.tempT)
        console.log('repos', retimed.tempPos)
        //console.log('parent', path.timings);

        this.positions = [...retimed.tempPos];
        this.VSpositions = [...retimed.tempPos];
        this.timings = [...retimed.tempT];

        console.log('detail')
        info = this.findExtremum();
        firstExt = info.leftIndex;
        secondExt = info.rightIndex;
        thirdExt = (this.timings.length - info.rightIndex) % this.timings.length;
        fourthExt = (this.timings.length - info.leftIndex) % this.timings.length;

        console.log('1st', firstExt);
        console.log('2nd', secondExt);
        console.log('3rd', thirdExt);
        console.log('4th', fourthExt);

        console.log('parent')
        parentInfo = path.findExtremum();
        parentFirstExt = parentInfo.leftIndex;
        parentSecondExt = parentInfo.rightIndex;
        parentThirdExt = (path.timings.length - parentInfo.rightIndex) % path.timings.length;
        parentFourthExt = (path.timings.length - parentInfo.leftIndex) % path.timings.length;



        /*let leftTiming = this.timings[info.leftIndex];
        let rightTiming = this.timings[info.rightIndex];

        let parentLeftTiming = path.timings[parentInfo.leftIndex];
        let parentRightTiming = path.timings[parentInfo.rightIndex];*/

    }
}

export { MyPath }