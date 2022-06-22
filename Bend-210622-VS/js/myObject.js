import * as THREE from 'three';
import { materials } from './materials.js';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { computeAngleAxis, getLocal, rotate, fromLocalToGlobal, resizeCurve } from './utils.js'
import { isSelected } from './selection.js'

class MyObject {
    constructor(mesh, height, bones, restAxis, level, parent, materials) {
        this._mesh = mesh;

        this._bones = bones;
        let restBones = [];
        let parentBones = [];
        restBones.push(bones[0]);
        parentBones.push(bones[0]);
        for(let i = 1; i < this.bones.length; i++) {
            let restBone = bones[i].clone();
            restBones[i - 1].add(restBone);
            restBones.push(restBone);

            let parentBone = bones[i].clone();
            parentBones[i - 1].add(parentBone);
            parentBones.push(parentBone);
        }

        this._angularSpeed = new THREE.Vector3();


        this._restPose = {
            geometry : this._mesh.geometry.clone(),
            height : height,
            bones : restBones,
            axis : restAxis
        }

        this._level = level;

        this._parent = { 
            object : parent,
            index : 0,
            offsetPos : new THREE.Vector3(),
            offsetQ : new THREE.Quaternion(),
            speed : new THREE.Vector3(),
            motion : parentBones
        };

        this._path = new MyPath();

        this._display = new MyDisplay(this, materials);
    }

    get mesh() { return this._mesh; }

    set material(m) { this._mesh.material = m; }

    get positions() { return this._mesh.geometry.attributes.position; }
    get skinIndex() { return this._mesh.geometry.attributes.skinIndex; }
    get skinWeight() { return this._mesh.geometry.attributes.skinWeight; }

    get bones() { return this._bones; }
    get lengthBones() { return this._bones.length; }

    get speed() { return this._angularSpeed; }
    set speed(s) { this._angularSpeed = s; }

    get height() { return this._restPose.height; }
    get restBones() { return this._restPose.bones; }
    get restAxis() { return this._restPose.axis; }

    get level() { return this._level; }
    get isParent() { return this._level == 0; }
    get parent() { return this._parent; }
    get parentSpeed() { return this._parent.speed; }
    set parentSpeed(s) { this._parent.speed = s; }

    get path() { return this._path; }
    get lengthPath() { return this._path.positions.length; }
    get effector() { return this._path.effector; }
    set effector(e) { this._path.effector = e; }
    get target() { return this._path.target; }
    set target(t) { this._path.target = t; }
    get hasTarget() { return !(this._path.target == null); }

    get links() { return this._display.links; }
    get lengthLinks() { return this._display.links.length; }
    linkMaterial(i, material) { this._display.links[i].material = material; }
    get root() { return this._display.root; }
    get skeletonHelper() { return this._display.skeleton }
    get axesHelpers() { return this._display.axes; }
    get lengthAxes() { return this._display.axes.length;}
    get pathDisplay() { return this._display.path; }
    get timingDisplay() { return this._display.timing; }
    get speedDisplay() { return this._display.speeds; }
    get axisDisplay() { return this._display.axis; }

    distanceToRoot(point) {
        let pos = new THREE.Vector3();
    
        pos.setFromMatrixPosition(point.matrixWorld);
        this._bones[0].worldToLocal(pos);
        let distance = pos.distanceTo(new THREE.Vector3(0,0,0));
        
        return distance;
    }

    reset(bones) {
        for (let i = 0; i < bones.length; i++) {
            bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            bones[i].updateMatrixWorld(true);
        }
    }

    ownVS() {
        let sommeAlpha = 0;
        for (let i = this.effector + 2; i < this.lengthBones; i++) {
            let w = this._angularSpeed;
            let n = w.clone().normalize();

            let currentPos = new THREE.Vector3();
            currentPos.setFromMatrixPosition(this.bones[i].matrixWorld);
            const points = [];
            points.push(currentPos.clone());

            let origin = new THREE.Vector3();
            origin.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
            let v = w.clone().cross(currentPos.clone().sub(origin));

            let new_pos = currentPos.clone().add(v.clone().multiplyScalar(10));
            points.push(new_pos.clone());

            this._display.speeds[i - 1].geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            let theta;
            if (this.level == 0) {
                theta = - 0 * v.length(); // theta = angle objectif entre effector, old bone i et new bone i
            } else {
                theta = - param * v.length(); // theta = angle objectif entre effector, old bone i et new bone i
            }
            
            let q = new THREE.Quaternion();
            let N = this.lengthBones - (this.effector + 1) - 1;
            let alpha = 2 * N * theta / (N + 1) - sommeAlpha;
            sommeAlpha += alpha
            n.applyQuaternion(this.bones[0].quaternion.clone().invert());
            q.setFromAxisAngle(n, alpha);        

            // Here we apply q on bones[e + 1] space on bones[i - 1] which is not coherent (TO CHANGE)
            this.bones[i - 1].applyQuaternion(q);

            this.bones[i - 1].updateMatrixWorld(true);
        }

    }

    parentVS() {
        let speed = this._parent.speed;

        //console.log('vs2')
        let bones = this._parent.motion;
        //let bones = this.bones;
        this.reset(bones);

        let newPosArray = [];
        let speeds = [];

        let rootPos = new THREE.Vector3();
        rootPos.setFromMatrixPosition(this._restPose.bones[0].matrixWorld); // Root of the detail
        let origin = new THREE.Vector3();
        origin.setFromMatrixPosition(parent.bones[0].matrixWorld); // Origin of the motion in parent mesh


        this.links[0].position.copy(rootPos);
        for (let i = 2; i < this.lengthBones; i++) {
            let w = speed.clone();
            let n = w.clone().normalize();


            let currentPos = new THREE.Vector3();
            currentPos.setFromMatrixPosition(this._restPose.bones[i].matrixWorld);


            let detailDiff =  currentPos.clone().sub(rootPos);
            let parentDiff = currentPos.clone().sub(origin);

            // Retrieve main bone of the correspondant vertex in parent mesh
            let corIndex = this._parent.index;
            let skinWeight = new THREE.Vector4();
            let skinIndex = new THREE.Vector4();
            skinIndex.fromBufferAttribute( parent.skinIndex, corIndex );
            skinWeight.fromBufferAttribute( parent.skinWeight, corIndex );

            let arrayMaxIndex = function(array) {
                return array.indexOf(Math.max.apply(null, array));
            };
            

            let skinWeightArray = [];
            skinWeight.toArray(skinWeightArray);
            let weightMaxIndex = arrayMaxIndex(skinWeightArray);
            let boneIndex = skinIndex.getComponent(weightMaxIndex);

            // Compute speed of the detail bone
            let v = w.clone().cross(parentDiff).multiplyScalar(boneIndex * detailDiff.length());
            speeds.push(v);

            let theta = - param * v.length();

            let R4 = new THREE.Matrix4();
            R4.makeRotationAxis(n, theta);
            let R = new THREE.Matrix3();
            R.setFromMatrix4(R4);

            // Compute displacement
            let d = parentDiff.clone().applyMatrix3(R);
            d.sub(parentDiff);

            // Compute new position
            let newPos = currentPos.clone().add(d);
            newPosArray.push(newPos);


            //this.links[i - 1].position.copy(newPos);
        }

        // Rescale the curve for volume conservation
        let segmentSize = this._restPose.height / (this.lengthBones - 2);
        resizeCurve(newPosArray, segmentSize);


        // Bend each bone so that it follow the curve
        for (let i = 2; i < this.lengthBones; i++) {
            this.links[i - 1].position.copy(newPosArray[i - 2]);

            let effector = new THREE.Vector3();
            effector.setFromMatrixPosition(bones[i].matrixWorld);
            let worldRotation = computeAngleAxis(bones[i-1], effector, newPosArray[i-2]);
            let localAxis = getLocal(worldRotation.axis, bones[i-2]);
            rotate(localAxis, worldRotation.angle, bones[i-1])

            const points = [];
            //points.push(newPosArray[i - 2].clone());
            effector.setFromMatrixPosition(bones[i].matrixWorld);
            points.push(effector.clone());
            points.push(effector.clone().add(speeds[i - 2].clone().divideScalar(10)));

            this._display.speeds[i - 1].geometry = new THREE.BufferGeometry().setFromPoints(points);
        }
    }

    getSpeed(t, b, origin) {
        let oldTime;
        if (t - 16 >= this.path.timings[0]) {
            oldTime = t - 16;
        } else {
            oldTime = t + 16;
        }  

        // Retrieve old objective
        this.path.updateCurrentTime(oldTime); // Adapt
        let oldTarget = this.path.currentPosition;
        this.bones[0].localToWorld(oldTarget);   
        this.updateBones(oldTarget);
        let oldPos = new THREE.Vector3();
        oldPos.setFromMatrixPosition(b.matrixWorld)

        // Retrieve new objective
        this.path.updateCurrentTime(t);
        let newTarget = this.path.currentPosition;
        this.bones[0].localToWorld(newTarget); 
        this.updateBones(newTarget);
        let newPos = new THREE.Vector3();
        newPos.setFromMatrixPosition(b.matrixWorld)

        let worldRotation = computeAngleAxis(origin, oldPos, newPos);

        //console.log('world axis', worldRotation.axis);

        let points = [];
        let originPos = new THREE.Vector3();
        originPos.setFromMatrixPosition(origin.matrixWorld)
        points.push(originPos.clone());
        points.push(originPos.clone().add(worldRotation.axis.clone().multiplyScalar(10)));
        this._display.axis.geometry = new THREE.BufferGeometry().setFromPoints(points);

        //let localAxis = getLocal(worldRotation.axis, origin);
        let speed = new THREE.Vector3(0,0,0);

        if (!isNaN(worldRotation.angle)) {
            //speed = localAxis.clone().multiplyScalar(worldRotation.angle);
            speed = worldRotation.axis.clone().multiplyScalar(worldRotation.angle);
        }

        //this.reset(this.bones);

        return speed;
    }

    updateBones(target) {
        this.reset(this.bones);
        const effector = new THREE.Vector3();
        effector.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
        let worldRotation = computeAngleAxis(this.bones[0], effector, target);
        for(let i = 1; i < this.lengthBones - 1; i++) {
            let localAxis = getLocal(worldRotation.axis, this.bones[i-1])
            let angle = 2 * worldRotation.angle / (this.effector + 1)
            rotate(localAxis, angle, this.bones[i]);
        }
    } 
    
    blend(alpha) {
        console.log('blend')
        for (let i = 0; i < this.lengthBones; i++) {
            let q1 = this.bones[i].quaternion.clone();
            let q2 = this._parent.motion[i].quaternion.clone();

            console.log('i', i)
            console.log('q1', q1.clone());
            console.log('q2', q2.clone())

            //let q = q1.clone().multiplyScalar(alpha).add(q2.clone().multiplyScalar(1 - alpha));
            let q = q1.clone().slerp(q2, alpha);

            console.log('q', q.clone())

            this.bones[i].quaternion.copy(q);

            this.bones[i].updateMatrixWorld(true);
        }
    }

    updateEffector(distance) {
        // compute length btw effector and root of the active object
        // find the link that has the closest length
        // Take into account the scale factor btw the 2 shapes
        let res = 0;
        let linkPos = new THREE.Vector3();
        linkPos.setFromMatrixPosition(this.links[0].matrixWorld);
        this.bones[0].worldToLocal(linkPos);
        let current_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));
        for (let i = 1; i < this.lengthLinks; i++) {
            linkPos.setFromMatrixPosition(this.links[i].matrixWorld);
            this.bones[0].worldToLocal(linkPos);
            let new_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));
    
            if (Math.abs(new_d - distance) < Math.abs(current_d - distance)) {
                res = i;
                current_d = new_d;
            }
        }
        this.effector = res;

        this.updateLinksDisplay();
    }

    // Display functions
    updateLinksDisplay() {
        // Update bones
        /*for(let i = 0; i < this.lengthBones; i++) {
            this.bones[i].updateMatrixWorld(true);
            this.restBones[i].updateMatrixWorld(true);
        }*/

        for(let i = 0; i < this.lengthLinks; i++) {
            //this.links[i].position.setFromMatrixPosition(this.bones[i+1].matrixWorld);
            //this.links[i].position.setFromMatrixPosition(this.restBones[i+1].matrixWorld);
            this.links[i].position.setFromMatrixPosition(this._parent.motion[i+1].matrixWorld);
            //console.log(this.links[i].position)
            //this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            //this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        //this.root.position.setFromMatrixPosition(this.bones[0].matrixWorld);
        //this.root.position.setFromMatrixPosition(this.restBones[0].matrixWorld);
        this.root.position.setFromMatrixPosition(this._parent.motion[0].matrixWorld);
    }

    updatePathDisplay() {
        let globalPos = fromLocalToGlobal(this.path.positions, this.bones[0]);
        this._display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }

    updateTimingDisplay() {
        if (this.lengthPath != 0) {
            let globalPos = this.bones[0].localToWorld(this.path.currentPosition);
            this._display.timing.geometry = new THREE.BufferGeometry().setFromPoints([globalPos]);
        } else {
            this._display.timing.geometry = new THREE.BufferGeometry().setFromPoints([]);
        }
    }

}

export { MyObject }