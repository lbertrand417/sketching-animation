import { findInArray, interpolate } from './utils.js'

class MyPath {
    constructor() {
        this._positions = [];        
        this._timings = [];
        this._currentIndex = 0;
        this._alpha = 0;
        this._startTime = new Date().getTime();
        this._effectorIndex = null;
        this._target = null;
    }

    get positions() {
        return this._positions;
    }

    set positions(p) {
        this._positions = p;
    }

    get timings() {
        return this._timings;
    }

    set timings(t) {
        this._timings = t;
    }

    get index() {
        return this._currentIndex;
    }

    set index(i) {
        this._currentIndex = i;
    }

    get alpha () {
        return this._alpha;
    }

    get currentPosition() {
        let index = this._currentIndex;
        let p = this._positions[index].clone().multiplyScalar(1 - this._alpha).add(this._positions[index + 1].clone().multiplyScalar(this._alpha))
        return p; // Local position
    }

    get currentTime() {
        let index = this._currentIndex;
        return (1 - this.alpha) * this.timings[index] + this.alpha * this.timings[index + 1];
    }

    // Compute acceleration btw pi-1 and pi
    /*get currentAcceleration() {
        let index = this._currentIndex;

        if (index != 0 && index != (this.timings.length - 1)) {
            let dt = this.timings[index] - this.timings[index - 1];
            let v_start_sq = this.positions[index].clone().sub(this.positions[index - 1]).multiplyScalar(1 / dt);
            //v_start_sq.multiply(v_start_sq);

            dt = this.timings[index + 1] - this.timings[index];
            let v_end_sq = this.positions[index + 1].clone().sub(this.positions[index]).multiplyScalar(1 / dt);
            //v_end_sq.multiply(v_end_sq);

            let d = this.positions[index].distanceTo(this.positions[index - 1]);

            if (d == 0) {
                return new Vector3(0, 0, 0);
            }

            //let a = v_end_sq.sub(v_start_sq).multiplyScalar(1 / (2 * d));
            dt = this.timings[index] - this.timings[index - 1];
            let a = v_end_sq.sub(v_start_sq).multiplyScalar(dt);
            return a;
        } else {
            return new Vector3(0, 0, 0);
        }
    }*/

    get startTime() {
        return this._startTime;
    }

    set startTime(t) {
        this._startTime = t;
    }

    get effector() {
        return this._effectorIndex;
    }

    set effector(e) {
        this._effectorIndex = e;
    }

    get target() {
        return this._target;
    }

    set target(t) {
        this._target = t;
    }

    get hasTarget() {
        return this._target != null;
    }


    // Find position in the object path wrt a given timing
    updateCurrentState(time) {
        // Find closest point in the timing array
        let i = 0;
        this._currentIndex = 0;
        while (i < this._positions.length - 1) {
            if(time >= this._timings[i] && time <= this._timings[i + 1]) {
                this._currentIndex = i;
                i = this._positions.length;
            } else {
                i++;
            }
        }

        // Interpolate
        let index = this._currentIndex;
        this._alpha = (time - this._timings[index]) / (this._timings[index + 1] - this._timings[index]);        
    }

    // Paste the drawn path to the first selected object
    update(positions, timings) {
        if(positions.length >= 2) {
            // Retiming and reposition
            let tempPos = [];
            let tempT = [];

            //let dt = 1 / 60 * Math.pow(10, 3);
            let dt = 16;
            let t = 0;
            while (t < timings[0]) {
                t += dt;
            }

            while (t <= timings[timings.length - 1]) {
                //console.log('t', t)
                //console.log('timings', timings)
                let info = findInArray(t, timings);
                //console.log('i', info.i);
                //console.log('alpha', info.alpha);
                tempPos.push(interpolate(positions[info.i], positions[info.i + 1], info.alpha));
                tempT.push(interpolate(timings[info.i], timings[info.i + 1], info.alpha));
                t += dt;
            }

            //console.log(tempPos);
            //console.log(tempT);

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

            //console.log(tempPos);
            //console.log(tempT);



            // Copy the path to the first selected object
            this._positions = [...tempPos];
            this._timings = [...tempT];

            // Create a cycle with the path
            for (let i = tempT.length - 2; i >= 0; i--) {
                this._timings.push(this._timings[this._timings.length - 1] + (tempT[i + 1] - tempT[i]));
                this._positions.push(this._positions[i].clone());
            }

            console.log('p', this._positions);
            console.log('t', this._timings);

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
}

export { MyPath }