import * as THREE from 'three';
import { materials } from './materials.js'
import { worldPos, localPos, computeAngleAxis, localDir } from './utils.js'
import { settings } from './canvas.js'

class MyTarget {
    constructor(pos, parent) {
        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );
        this._mesh = new THREE.Mesh(sphereGeometry, materials.root.clone());
        this._mesh.position.set(pos.x, pos.y, pos.z);
        this._mesh.updateWorldMatrix(false, false);
        this._pos = pos;
        this._speed = new THREE.Vector3();
        this._VSpos = pos;
        this._parent = parent;
        this._targeted = [];
    }

    get mesh() { return this._mesh; }
    get pos() { return this._pos; }
    set pos(p) { 
        this._pos = p;
        this.VSpos = p; }
    get speed() { return this._speed; }
    set speed(s) { this._speed = s; }
    get VSpos() {return this._VSpos; }
    set VSpos(p) { 
        this._VSpos = p; 
        this._mesh.position.set(p.x, p.y, p.z);
        this._mesh.updateWorldMatrix(false, false);
    }
    get targeted() { return this._targeted; } // must have the same parent so create a new target if it's not same parent

    parentVS() {
        //console.log(this.targeted[0]);
        //console.log(this.targeted[0].parent);
        let parent = this.targeted[0].parent.object;

        //console.log(parent.bones[0]);
        let boneIndex = parent.lengthBones - 1;

        let rootPos = parent.bones[boneIndex].position.clone();
        rootPos = worldPos(rootPos, parent, parent.bones, boneIndex - 1);
        let origin = parent.bones[0].position.clone();
        origin = worldPos(origin, parent, parent.bones, -1);

        let w = this.speed.clone();
        let n = w.clone().normalize();

        let detailDiff =  this.pos.clone().sub(rootPos);
        let parentDiff = this.pos.clone().sub(origin);

       

        // Compute speed of the detail bone
        let v = w.clone().cross(parentDiff).multiplyScalar(boneIndex * detailDiff.length());

        let param = settings.targetVSparam / 10000;
        let theta = - param* v.length();

        let R4 = new THREE.Matrix4();
        R4.makeRotationAxis(n, theta);
        let R = new THREE.Matrix3();
        R.setFromMatrix4(R4);

        // Compute displacement
        let d = parentDiff.clone().applyMatrix3(R);
        d.sub(parentDiff);

        // Compute new position
        this.VSpos = this.pos.clone().add(d);

        let worldRotation = computeAngleAxis(parent.bones[boneIndex].position, this.pos, this.VSpos);
        //console.log('angle', worldRotation.angle);
        for (let i = 0; i < this.targeted.length; i++) {
            let pathPos = this.targeted[i].path.positions;
            let newPos = [];
            for (let j = 0; j < pathPos.length; j++) {
                let locPos = pathPos[j].clone();
                let globalPos = worldPos(locPos, this.targeted[i], this.targeted[i].bones, 0);
                //globalPos.add(d);
                locPos = localPos(globalPos, parent, parent.bones, boneIndex);
                let localAxis = localDir(worldRotation.axis, parent.bones, boneIndex)
                locPos.applyAxisAngle(localAxis, worldRotation.angle);
                globalPos = worldPos(locPos, parent, parent.bones, boneIndex);
                locPos = localPos(globalPos, this.targeted[i], this.targeted[i].bones, 0);
                newPos.push(locPos);
            }
            this.targeted[i].path.VSpositions = newPos;
        }
    }
}

export { MyTarget }