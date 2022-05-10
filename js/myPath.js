class MyPath {
    constructor() {
        this._positions = [];
        this._timings = [];
        this._currentIndex = null;
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
}

export { MyPath }