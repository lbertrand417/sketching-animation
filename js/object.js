import * as THREE from 'three';

class MyObject {
    constructor(mesh, height, skeleton, bones, restAxis, level, display, helpers) {
        this._mesh = mesh;
        this._skeleton = skeleton;
        this._bones = bones;

        this._restPose = {
            height : height,
            bones : bones,
            axis : restAxis
        }

        this._level = level;

        this._parent = { 
            index : 0,
            offsetPos : new THREE.Vector3(),
            offsetQ : new THREE.Quaternion()
        };

        this._path = {
            positions : [],
            timings : [],
            index : null,
            startTime : new Date().getTime(),
            effector : null,
            target: null
        };

        this._display = { 
            links : display.bonesDisplay,
            root : display.rootDisplay,
            skeleton : helpers.skeletonHelper,
            axes : helpers.axesHelpers,
            path : display.pathDisplay,
            timing : display.timingDisplay
        };
    }

    get mesh() {
        return this._mesh;
    }

    set meshMaterial(material) {
        this._mesh.material = material;
    }

    get meshPosition() {
        return this._mesh.geometry.attributes.position;
    }

    get skinIndex() {
        return this._mesh.geometry.attributes.skinIndex;
    }

    get skinWeight() {
        return this._mesh.geometry.attributes.skinWeight;
    }

    get bones() {
        return this._bones;
    }

    get lengthBones() {
        return this._bones.length;
    }

    get height() {
        return this._height;
    }

    get restBones() {
        return this._restPose.bones;
    }

    get restAxis() {
        return this._restPose.restAxis;
    }

    get level() {
        return this._level;
    }

    get isParent() {
        return this._level == 0;
    }

    get parentIndex() {
        return this._parent.index;
    }

    set parentIndex(index) {
        this._parent.index = index;
    }

    get offsetPos() {
        return this._parent.offsetPos;
    }

    set offsetPos(p) {
        this._parent.offsetPos = p;
    }

    get offsetQ() {
        return this._parent.offsetQ;
    }

    set offsetQ(q) {
        return this._parent.offsetQ;
    }

    get pathPos() {
        return this._path.positions;
    }

    set pathPos(p) {
        this._path.positions = p;
    }

    get lengthPath() {
        return this._path.positions.length;
    }

    get pathTimings() {
        return this._path.timings;
    }

    set pathTimings(t) {
        this._path.timings = t;
    }

    get pathIndex() {
        return this._path.index;
    }

    set pathIndex(i) {
        this._path.index = i;
    }

    get pathStart() {
        return this._path.startTime;
    }

    get effector() {
        return this._path.effector;
    }

    set effector(e) {
        this._path.effector = e;
    }

    get target() {
        return this._path.target;
    }

    set target(t) {
        this._path.target = t;
    }

    hasTarget() {
        return !(this._path.target == null);
    }

    get links() {
        return this._display.links;
    }

    get lengthLinks() {
        return this._display.links.length;
    }

    setLinkMaterial(i, material) {
        this._display.links[i].material = material;
    }

    get root() {
        return this._display.root;
    }

    get skeletonHelper() {
        return this._display.skeleton;
    }

    get axesHelpers() {
        return this._display.axes;
    }

    lengthAxes() {
        return this._display.axes.length;
    }

    get pathDisplay() {
        return this._display.path;
    }

    updatePathDisplay() {

    }

    get timingDisplay() {
        return this._display.timing;
    }

    updateTimingDisplay() {
        
    }
}

export { MyObject }