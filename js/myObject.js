import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'

class MyObject {
    //constructor(mesh, height, skeleton, bones, restAxis, level, display, helpers) {
    constructor(mesh, height, skeleton, bones, restAxis, level, materials) {
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

        this._path = new MyPath();

        /*this._display = { 
            links : display.bonesDisplay,
            root : display.rootDisplay,
            skeleton : helpers.skeletonHelper,
            axes : helpers.axesHelpers,
            path : display.pathDisplay,
            timing : display.timingDisplay
        };*/

        console.log(materials);
        this._display = new MyDisplay(this, materials);
    }

    get mesh() {
        return this._mesh;
    }

    set material(material) {
        this._mesh.material = material;
    }

    get positions() {
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
        return this._restPose.height;
    }

    get restBones() {
        return this._restPose.bones;
    }

    get restAxis() {
        return this._restPose.axis;
    }

    get level() {
        return this._level;
    }

    get isParent() {
        return this._level == 0;
    }

    get parent() {
        return this._parent;
    }

    get path() {
        return this._path;
    }

    get lengthPath() {
        return this._path.positions.length;
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

    get hasTarget() {
        return !(this._path.target == null);
    }

    get links() {
        return this._display.links;
    }

    get lengthLinks() {
        return this._display.links.length;
    }

    linkMaterial(i, material) {
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

    get lengthAxes() {
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