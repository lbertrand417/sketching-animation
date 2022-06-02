import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { computeAngleAxis, getLocal, fromLocalToGlobal } from './utils.js'
import { isSelected } from './selection.js'
import { Vector3 } from 'three';

class MyObject {
    constructor(mesh, height, bones, restAxis, level, materials) {
        this._mesh = mesh;
        this._bones = bones;

        this._simulation = {
            paramaters : {
                dt : 0.006,
                K : 10.0,
                K2 : 10.0,
                m : 1,
                mu : 10.0,
                L0 : height / (bones.length - 2)
            },
            positions : [],
            velocity : [],
            forces : []           
        }

        let restBones = [];
        let restBone = new THREE.Bone();
        restBone.position.setFromMatrixPosition(bones[0].matrixWorld);
        restBone.quaternion.setFromRotationMatrix(bones[0].matrixWorld)
        restBone.updateMatrixWorld(true);
        restBones.push(restBone)

        for(let i = 1; i < this.bones.length; i++) {
            restBone = bones[i].clone();
            restBones[i - 1].add(restBone);
            restBones.push(restBone);
        }

        for (let i = 0; i < this.bones.length; i++) {
            let vector = new THREE.Vector3(0, 0, 0);
            vector.setFromMatrixPosition(bones[i].matrixWorld);

            this._simulation.positions.push(vector);
            this._simulation.velocity.push(new THREE.Vector3(0, 0, 0))
            this._simulation.forces.push(new THREE.Vector3(0, 0, 0))            
        }

        this._restPose = {
            height : height,
            bones : restBones,
            axis : restAxis
        }

        this._level = level;

        this._parent = { 
            index : 0,
            offsetPos : new THREE.Vector3(),
            offsetQ : new THREE.Quaternion()
        };

        this._path = new MyPath();

        this._display = new MyDisplay(this, materials);


        for (let i = 1; i < this.bones.length; i++) {
            //this._display.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
            //this._display.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
            this._display.links[i-1].position.copy(this._simulation.positions[i]);
        }

    }

    get mesh() {
        return this._mesh;
    }

    set material(m) {
        this._mesh.material = m;
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


    get timingDisplay() {
        return this._display.timing;
    }

    distanceToRoot(point) {
        let pos = new THREE.Vector3();
    
        pos.setFromMatrixPosition(point.matrixWorld);
        this._bones[0].worldToLocal(pos);
        let distance = pos.distanceTo(new THREE.Vector3(0,0,0));
        
        return distance;
    }

    reset() {
        for (let i = 0; i < this.bones.length; i++) {
            this.bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            this.bones[i].updateMatrixWorld(true);
        }
    }
    
    bend(worldRotation) {
        let quaternions = [];

        for(let i = 1; i < this.lengthBones - 1; i++) {
            // Put axis in parent space
            let localAxis = getLocal(worldRotation.axis, this.bones[i-1])
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, 2 * worldRotation.angle / (this.effector + 1));

            quaternions.push(q);

        }

        for (let i = 1; i <= this.effector; i++) {
            console.log(this.bones[i])
            this.bones[i].applyQuaternion(quaternions[i-1]);

            this.bones[i].updateMatrixWorld(true);

            this._simulation.positions[i].setFromMatrixPosition(this.bones[i].matrixWorld);        
            this._simulation.velocity[i].set(0, 0, 0);    
        }


        return quaternions;
    }

    // Mass spring
    updateForces() {
        //console.log("update forces");

        // Mass-spring parameters
        const mu = this._simulation.paramaters.mu;
        const K = this._simulation.paramaters.K;
        const K2 = this._simulation.paramaters.K2;
        const m = this._simulation.paramaters.m / this.bones.length;
        const L0 = this._simulation.paramaters.L0;

        // Current simulation
        let positions = this._simulation.positions;
        let velocity = this._simulation.velocity;
        let forces = this._simulation.forces;

        for (let i = 1; i < this.bones.length; i++) {
            forces[i].set(0,0,0);

            // Drag
            forces[i].add(velocity[i].clone().multiplyScalar(-mu * m));

            let bonePos = new Vector3();
            bonePos.setFromMatrixPosition(this.bones[i].matrixWorld);
            let u = bonePos.clone().sub(positions[i]);
            let d = u.length();
            u.normalize();
            forces[i].add(u.clone().multiplyScalar(K2 * d));
            
            
            /*let u;
            let d;
            if (i - 2 >= 0) {
                const target = new THREE.Vector3();
                target.setFromMatrixPosition(this.bones[i].matrixWorld);
                let worldRotation = computeAngleAxis(this.bones[i - 1], positions[i], target)
                let localAxis = getLocal(worldRotation.axis, this.bones[i - 1]);
                let w = localAxis.clone().multiplyScalar(worldRotation.angle).length();

                let origin = new THREE.Vector3();
                origin.setFromMatrixPosition(this.bones[i - 1].matrixWorld)
                u = positions[i].clone().sub(origin)
                let r = u.length() - L0;
                u.normalize();
                //let v = w.clone().multiplyScalar(r);
                let F = m * w * w * r;
                let dir = target.clone().sub(positions[i]);
                //dir.normalize()
                forces[i].add(dir.clone().multiplyScalar(F));

                if (i==2) {
                    console.log("angle", worldRotation.angle * 180 / Math.PI);
                    console.log('w', w);
                    console.log('F', F)
                }
            }*/

            // Spring forces
            // i, i + 1
            if(i + 1 < this.bones.length) {
                u = positions[i + 1].clone().sub(positions[i]);
                d = u.length();
                u.normalize();
                forces[i].add(u.clone().multiplyScalar(K * (d - L0)));
                if (i==2) {
                    console.log("f2", K * (d - L0))
                }
            }

            // i, i - 1
            if(i - 1 >= 0) {
                u = positions[i - 1].clone().sub(positions[i]);
                d = u.length();
                u.normalize();
                forces[i].add(u.clone().multiplyScalar(K * (d - L0)));
            }

            // i, i + 2
            if(i + 2 < this.bones.length) {
                u = positions[i + 2].clone().sub(positions[i]);
                d = u.length();
                u.normalize();
                forces[i].add(u.clone().multiplyScalar(K * (d - 2 * L0)));
            }

            // i, i - 2
            if(i - 2 >= 0) {
                u = positions[i - 2].clone().sub(positions[i]);
                d = u.length();
                u.normalize();
                forces[i].add(u.clone().multiplyScalar(K * (d - 2 * L0)));
            }
        }
    }

    updatePV() {
        //console.log("update PV");
        const m = this._simulation.paramaters.m / (this.bones.length - 2);
        for (let i = 1; i < this.bones.length; i++) {
            this._simulation.velocity[i].add(this._simulation.forces[i].clone().multiplyScalar(this._simulation.paramaters.dt / m));
            this._simulation.positions[i].add(this._simulation.velocity[i].clone().multiplyScalar(this._simulation.paramaters.dt));
        }

        //this._simulation.positions[this.path.effector + 1].setFromMatrixPosition(this.bones[this.path.effector + 1].matrixWorld);
        this._simulation.positions[0].setFromMatrixPosition(this.bones[0].matrixWorld)
        this._simulation.positions[1].set(this._simulation.positions[0].x, this._simulation.positions[0].y, this._simulation.positions[0].z)
        this._simulation.velocity[1].set(0, 0, 0);
    }

    blendMS(quaternions) {
        let alpha = 0;
        for(let i = this.effector + 1; i < this.lengthBones - 1; i++) {
        //for(let i = 1; i < this.lengthBones - 1; i++) {
            this.bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            this.bones[i].updateMatrixWorld(true);

            let effector = new THREE.Vector3();
            effector.setFromMatrixPosition(this.bones[i + 1].matrixWorld);
            let worldRotation = computeAngleAxis(this.bones[i], effector, this._simulation.positions[i + 1])

            // Put axis in parent space
            let localAxis = getLocal(worldRotation.axis, this.bones[i-1])
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, worldRotation.angle);

            if(quaternions[i-1] == undefined) {
                this.bones[i].applyQuaternion(q);
            } else {
                this.bones[i].applyQuaternion(quaternions[i-1].clone().slerp(q, param));
                //this.bones[i].applyQuaternion(quaternions[i-1].clone().slerp(q, alpha));
            }
            
            alpha += param

            this.bones[i].updateMatrixWorld(true);
        }
    }

    updateBones(target) {
        this.reset();
        const effector = new THREE.Vector3();
        effector.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
        let worldRotation = computeAngleAxis(this.bones[0], effector, target);
        let quaternions = this.bend(worldRotation);
        
        this.updateForces();
        this.updatePV();
        this.blendMS(quaternions);
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
        for(let i = 0; i < this.lengthBones; i++) {
            this.bones[i].updateMatrixWorld(true);
            this.restBones[i].updateMatrixWorld(true);
        }

        for(let i = 0; i < this.lengthLinks; i++) {
            //this.links[i].position.setFromMatrixPosition(this.bones[i+1].matrixWorld);
            //this.links[i].position.setFromMatrixPosition(this.restBones[i+1].matrixWorld);
            this.links[i].position.copy(this._simulation.positions[i+1]);
            this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        this.root.position.setFromMatrixPosition(this.bones[0].matrixWorld);
        //this.root.position.setFromMatrixPosition(this.restBones[0].matrixWorld);
        this.root.position.copy(this._simulation.positions[0])
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