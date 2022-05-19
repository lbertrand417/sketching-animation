import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { fromLocalToGlobal } from './utils.js'
import { isSelected } from './selection.js'

class MyObject {
    constructor(mesh, height, bones, restAxis, level, materials) {
        this._mesh = mesh;
        this._bones = bones;

        this._simulation = {
            paramaters : {
                dt : 0.016,
                K : 100.0,
                m : 1,
                mu : 20.0,
                L0 : height / (bones.length - 2)
            },
            positions : [],
            velocity : [],
            forces : []           
        }

        let restBones = [];
        for (let i = 0; i < this.bones.length; i++) {
            let vector = new THREE.Vector3(0, 0, 0);
            vector.setFromMatrixPosition(bones[i].matrixWorld);

            /*if (i == this.bones.length - 1) {
                vector.add(new Vector3(0, 20, 0));
            }*/
            this._simulation.positions.push(vector);
            this._simulation.velocity.push(new THREE.Vector3(0, 0, 0))
            this._simulation.forces.push(new THREE.Vector3(0, 0, 0))

            restBones.push(bones[i].clone())
        }

        /*if (bones.length > 5) {
            console.log('init', bones[5].clone().matrixWorld)
        }*/

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
            this._display.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
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
        }
    }
    
    updateBones(worldRotation) {
        //this.reset();

        let quaternions = [];

        //for(let i = 1; i <= this.effector; i++) {
        /*let bonescopy = [];

        bonescopy.push(this.bones[0].clone());
        bonescopy[0].position.setFromMatrixPosition(this.bones[0].matrixWorld)
        bonescopy[0].updateMatrixWorld(true);
        for (let i = 1; i < this.bones.length; i++) {
            bonescopy.push(this.bones[i].clone());
            bonescopy[i].updateMatrixWorld(true);
        }
*/

        for(let i = 1; i < this.lengthBones - 1; i++) {
            // Put axis in parent space
            //let parentBone = bonescopy[i-1];
            let parentBone = this.bones[i-1];
            let parentPos = new THREE.Vector3();
            let invParentQ = new THREE.Quaternion();
            let parentScale = new THREE.Vector3();
            parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
            invParentQ.invert(); // Why?
            let localAxis = worldRotation.axis.clone().applyQuaternion(invParentQ);
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, worldRotation.angle / this.effector);
            //bonescopy[i].applyQuaternion(q);
            quaternions.push(q);
            this.bones[i].applyQuaternion(q);
        }

        for(let i = 0; i < this.lengthBones; i++) {
            //bonescopy[i].updateMatrixWorld(true);
            this.bones[i].updateMatrixWorld(true);
        }

        /*for (let i = 0; i < this.bones.length; i++) {
            this.bones[i].quaternion.copy(bonescopy[i].quaternion);
        }*/


        for (let i = 0; i < this.effector; i++) {
        //for (let i = 0; i < this.lengthBones; i++) {
            let vector = new THREE.Vector3(0, 0, 0);
            //vector.setFromMatrixPosition(bonescopy[i].matrixWorld);
            vector.setFromMatrixPosition(this.bones[i].matrixWorld); // Tester init avec rest pose quand il y a blending

            this._simulation.positions[i].set(vector.x, vector.y, vector.z);            
        }



        //console.log('bones', this.bones[5].matrixWorld.clone());
        //console.log('rest bones', this._restPose.bones[5].matrixWorld.clone());

        console.log(quaternions);

        return quaternions;


        /*for (let i = 1; i < this.bones.length; i++) {
            this.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
        }
        this.root.position.set (this._simulation.positions[0].x, this._simulation.positions[0].y, this._simulation.positions[0].z)*/
    }

    // Mass spring
    updateForces(force) {
        //console.log("update forces");
        const mu = this._simulation.paramaters.mu;
        const K = this._simulation.paramaters.K;
        const m = this._simulation.paramaters.m / this.bones.length;
        const L0 = this._simulation.paramaters.L0;

        //console.log('L0', L0)

        //this._simulation.forces = Array(this.bones.length).fill(new Vector3(0, 0, 0));

        //console.log(this._simulation.positions);
        for (let i = 1; i < this.bones.length; i++) {
            this._simulation.forces[i].set(0,0,0);

            // Drawing force
            /*if (i == this.effector) {
                this._simulation.forces[i].add(force.clone().multiplyScalar(m));
            }*/

            // Drag
            this._simulation.forces[i].add(this._simulation.velocity[i].clone().multiplyScalar(-mu * m));
            //console.log ('drag force', this._simulation.velocity[i].clone().multiplyScalar(-mu * m));

            // Spring forces
            // i, i + 1
            if(i + 1 < this.bones.length) {
                //console.log(this._simulation.positions[i + 1])
                const u = this._simulation.positions[i + 1].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i + 1].distanceTo(this._simulation.positions[i]) - L0)));
                //console.log(this._simulation.positions[i + 1].distanceTo(this._simulation.positions[i]))
                //console.log(L0)
            }

            // i, i - 1
            if(i - 1 > 0) {
                const u = this._simulation.positions[i - 1].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i - 1].distanceTo(this._simulation.positions[i]) - L0)));
            }

            // i, i + 2
            if(i + 2 < this.bones.length) {
                const u = this._simulation.positions[i + 2].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i + 2].distanceTo(this._simulation.positions[i]) - 2 * L0)));
            }

            // i, i - 2
            if(i - 2 > 0) {
                const u = this._simulation.positions[i - 2].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i - 2].distanceTo(this._simulation.positions[i]) - 2 * L0)));
            }

            //console.log('position', this._simulation.positions[i].clone())
            //console.log('velocity', this._simulation.velocity[i].clone())
            //console.log('force', this._simulation.forces[i].clone());
        }
    }

    updatePV(constraint) {
        //console.log("update PV");

        const c = this._simulation.positions[this._simulation.positions.length - 1].clone();
        const m = this._simulation.paramaters.m / (this.bones.length - 2);
        for (let i = 1; i < this.bones.length; i++) {
            this._simulation.velocity[i].add(this._simulation.forces[i].clone().multiplyScalar(this._simulation.paramaters.dt / m));
            this._simulation.positions[i].add(this._simulation.velocity[i].clone().multiplyScalar(this._simulation.paramaters.dt));

            //this.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
        }

        //let localPos = this.bones[0].worldToLocal(this._simulation.positions);
        //this._simulation.positions[this.path.effector + 1].set(constraint.x, constraint.y, constraint.z);
        this._simulation.positions[this.path.effector + 1].setFromMatrixPosition(this.bones[this.path.effector + 1].matrixWorld);
        //this._simulation.positions[this._simulation.positions.length - 1].set(c.x, c.y, c.z);
        //this._simulation.velocity[this._simulation.positions.length - 1].set(0, 0, 0);

        this._simulation.positions[1].set(this._simulation.positions[0].x, this._simulation.positions[0].y, this._simulation.positions[0].z)
        this._simulation.velocity[1].set(0, 0, 0);

        for (let i = 1; i < this.bones.length; i++) {
            this.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
        }
        this.root.position.set (this._simulation.positions[0].x, this._simulation.positions[0].y, this._simulation.positions[0].z)

        //console.log('position', [...this._simulation.positions])
        //console.log('velocity', [...this._simulation.velocity])
    }

    updateBones2(quaternions) {
        console.log(quaternions);
        let alpha = 0;
        //for(let i = this.effector + 1; i < this.lengthBones - 1; i++) {
        for(let i = this.effector - 1; i < this.lengthBones - 1; i++) {
        //for(let i = this.effector + 1; i < this.effector + 2; i++) {
        //for(let i = 1; i < this.lengthBones - 1; i++) {
            this.bones[i].applyQuaternion(quaternions[i-1].clone().invert());
            //let q2 = this._restPose.bones[i].quaternion.clone().invert().multiply(this.bones[i].quaternion);
            //let q2 = this.bones[i].quaternion.clone().multiply(this._restPose.bones[i].quaternion.clone().invert());

            //console.log(this._simulation.positions[i]);
            this.bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            this.bones[i].updateMatrixWorld(true);


            // Retrieve current bone 
            //let currentBone = this.restBones[i];
            let currentBone = this.bones[i];
            let currentPos = new THREE.Vector3();
            let invCurrentQ = new THREE.Quaternion();
            let currentScale = new THREE.Vector3();
            currentBone.matrixWorld.decompose(currentPos, invCurrentQ, currentScale);
            invCurrentQ.invert();

            // Retrieve parent bone info
            let parentBone = this.bones[i-1];
            let parentPos = new THREE.Vector3();
            let invParentQ = new THREE.Quaternion();
            let parentScale = new THREE.Vector3();
            parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
            invParentQ.invert();
        
            //console.log('particles pos', this._simulation.positions[i + 1].clone());
            //console.log('root pos', rootPos);

            // Get world rotation vectors
            let n = this._simulation.positions[i + 1].clone().sub(currentPos);
            n.normalize();
            //console.log('n', n);

            //let t = this.bones[i].localToWorld(this.restBones[i+1].position);
            let t = new THREE.Vector3();
            t.setFromMatrixPosition(this.bones[i + 1].matrixWorld);
            t.sub(currentPos);
            t.normalize();
            //console.log('t', t)


        
            // Compute rotation axis
            let axis = new THREE.Vector3();
            axis.crossVectors(t, n);
            axis.normalize();

            //console.log('axis', axis)
        
            // Compute world rotation angle
            let angle = t.dot(n);
            angle = Math.acos(angle);

            //console.log('angle', angle * 180 / Math.PI)

            // Put axis in parent space
            let localAxis = axis.clone().applyQuaternion(invParentQ);

            /*let q1 = new THREE.Quaternion();
            q1.setFromAxisAngle(localAxis, worldRotation.angle / this.effector);*/
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, angle);
            //this.bones[i].applyQuaternion(q.slerp(q1, 0.5));
            //console.log(quaternions[i-1]);
            
            //this.bones[i].applyQuaternion(quaternions[i-1]);
            //this.bones[i].applyQuaternion(q2.slerp(q, 1));
            //this.bones[i].applyQuaternion(quaternions[i-1].clone().slerp(q, 0.2));
            if (i < this.effector + 1) {
                this.bones[i].applyQuaternion(quaternions[i-1].clone().slerp(q, 0));
                //this.bones[i].applyQuaternion(q2.clone().slerp(q, 0));
            } else {
                this.bones[i].applyQuaternion(quaternions[i-1].clone().slerp(q, 0.2));
                //this.bones[i].applyQuaternion(q2.clone().slerp(q, 0.01));
            }
            //console.log('alpha', alpha);
            alpha = i / (this.lengthBones - 1);
            //this.bones[i].applyQuaternion(q);

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
        for(let i = 0; i < this.lengthBones; i++) {
            this.bones[i].updateMatrixWorld(true);
        }

        for(let i = 0; i < this.lengthLinks; i++) {
            this.links[i].position.setFromMatrixPosition(this.bones[i+1].matrixWorld);
            this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        this.root.position.setFromMatrixPosition(this.bones[0].matrixWorld);
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