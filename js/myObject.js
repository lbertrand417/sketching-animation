import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { settings } from './gui.js'
import { computeAngleAxis, localDir, rotate, worldPos, localPos } from './utils.js'
import { resizeCurve } from './utilsArray.js'

/**
 * Class describing an object with all useful info (mesh, bones, path, display...)
 */
class MyObject {

    // --------------- CONSTRUCTOR ---------------

    /**
     * Instantiate a MyObject object
     * @param {THREE.SkinnedMesh} mesh - Skinned mesh representing the object at its rest pose
     * @param {number} height - Height of the object at its rest pose
     * @param {Array<THREE.Bone>} bones - Array storing the bones of the skinned mesh at its rest pose (the positions are
     * local to the parent bone)
     * @param {THREE.Vector3} restAxis - Axis formed by root and last joints at its rest pose
     * @param {MyObject} parent - Object of the parent (null if doesn't have parents)
     * @param {Object} materials - Material used to display the object (see material.js to get the right format)
     */
    constructor(mesh, height, bones, restAxis, parent, materials) {
        this._mesh = mesh;
        this._bones = bones; // Store the final deformation of the bones

        this._angularSpeed = new THREE.Vector3(); // Angular speed at effector joint
        this._alpha = 0; // Parameter for the blending between user input deformation and h-VS deformation

        // Store the intermediate deformation of the bones (rest pose, lbs, h-VS)
        this._lbs = [];
        let restBones = [];
        let parentBones = [];
        this._lbs.push(bones[0])
        restBones.push(bones[0]);
        parentBones.push(bones[0]);
        for(let i = 1; i < this.bones.length; i++) {
            // Rest pose bones
            let restBone = bones[i].clone();
            restBones[i - 1].add(restBone);
            restBones.push(restBone);

            // h-VS bones
            let parentBone = bones[i].clone();
            parentBones[i - 1].add(parentBone);
            parentBones.push(parentBone);

            // LBS bones
            let lbsBone = bones[i].clone();
            this._lbs[i - 1].add(lbsBone);
            this._lbs.push(lbsBone);
        }      

        // Initialize the rest pos info (height, axis, bones position)
        this._restPose = {
            height : height,
            bones : restBones,
            axis : restAxis
        }

        // Store parent info
        this._parent = { 
            object : parent, // Parent object
            anchor : 0, // Index of the correspondence in the parent mesh
            offsetPos : new THREE.Vector3(), // Position offset between correspondence and the root joint
            offsetQ : new THREE.Quaternion(), // Rotation offset between correspondence and the root joint
            speed : new THREE.Vector3(), // Speed of the root joint of the PARENT
            motion : parentBones // h-VS deformation of the object
        };

        // Initialize children of the object
        this._children = [];

        // Initialize the path of the object
        this._path = new MyPath(this);

        // Initialize the display of the object
        this._display = new MyDisplay(this, materials);
    }

    // --------------- GETTER/SETTER ---------------

    // Access to object elements
    get mesh() { return this._mesh; }

    set material(m) { this._mesh.material = m; }

    get positions() { return this._mesh.geometry.attributes.position; }
    get skinIndex() { return this._mesh.geometry.attributes.skinIndex; }
    get skinWeight() { return this._mesh.geometry.attributes.skinWeight; }

    get bones() { return this._bones; }
    get lengthBones() { return this._bones.length; }
    get lbs() { return this._lbs; }

    get speed() { return this._angularSpeed; }
    set speed(s) { this._angularSpeed = s; }
    get alpha() { return this._alpha; }
    set alpha(a) { this._alpha = a; }

    get height() { return this._restPose.height; }
    get restBones() { return this._restPose.bones; }
    get restAxis() { return this._restPose.axis; }

    get parent() { return this._parent; }
    get children() { return this._children; }
    addChild(o) { this._children.push(o); }

    // Access to path elements
    get path() { return this._path; }
    get lengthPath() { return this._path.positions.length; }
    get effector() { return this._path.effector; }
    set effector(e) { this._path.effector = e; }
    get target() { return this._path.target; }
    set target(t) { this._path.target = t; }
    get hasTarget() { return !(this._path.target == null); }

    // Access to display elements
    get display() { return this._display; }
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

    // --------------- FUNCTIONS ---------------

    // Point as global variable
    /**
     * Compute the distance between a point and the root joint
     * @param {THREE.Vector3} point - World position of a point
     * @returns 
     */
    distanceToRoot(point) {
        point = localPos(point, this, this.restBones, 0); // Local position
        let distance = point.distanceTo(new THREE.Vector3(0,0,0));
        
        return distance;
    }

    /**
     * Reset the bones position to the rest pose
     * @param {Array<THREE.Bone>} bones - The bones to reset
     */
    reset(bones) {
        for (let i = 0; i < bones.length; i++) {
            // Right now copy only quaternion, as there is no translation
            bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            bones[i].updateWorldMatrix(false, false); // Important
        }
    }

    /**
     * Add VS to the object based on the velocity of the effector joint. 
     * 
     * Note that VS is applied only on the joints higher to the effector one 
     * in the hierarchy.
     */
    ownVS() {
        let sommeAlpha = 0;
        for (let i = this.effector + 2; i < this.lengthBones; i++) {
            let w = this._angularSpeed;
            let n = w.clone().normalize();

            // Retrieve position of the bone i
            let currentPos = this.bones[i].position.clone(); // Local position
            currentPos = worldPos(currentPos, this, this.bones, i - 1); // World position

            // Retrieve position of the origin of the VS (the effector)
            let origin = this.bones[this.effector + 1].position.clone(); // Local position
            origin = worldPos(origin, this, this.bones, this.effector); // World position

            // Compute speed
            let v = w.clone().cross(currentPos.clone().sub(origin));
            
            // Compute angle
            let param = settings.ownVSparam / 10;
            let theta = - param * v.length();
            
            /* Here there is two possibility:
            1) Directly use the angle theta of the VS
            2) Compute an angle alpha based on the same technique as the bending to keep the logic of the bending*/
            let q = new THREE.Quaternion();
            let N = this.lengthBones - (this.effector + 1) - 1;
            let alpha = 2 * N * theta / (N + 1) - sommeAlpha;
            sommeAlpha += alpha

            // Apply the rotation on the joint
            n.applyQuaternion(this.bones[0].quaternion.clone().invert());
            if(settings.alpha) {
                q.setFromAxisAngle(n, alpha); 
            } else {
                q.setFromAxisAngle(n, theta);  
            }      
            this.bones[i - 1].applyQuaternion(q);
            this.bones[i - 1].updateWorldMatrix(false, false);
        }
    }

    /**
     * Create the h-VS deformation based on the velocity the parent object.
     */
    parentVS() {
        let parent = this._parent.object;
        let speed = this._parent.speed; // Speed at the root joint of the parent

        // Reset bones position
        let bones = this._parent.motion;
        this.reset(bones);

        let newPosArray = []; // Store the new positions of the joints before resizing
        let speeds = []; // Store the speeds for the display

        // Retrieve the position of the root joint of the object
        let rootPos = this._restPose.bones[0].position.clone(); // Local position
        rootPos = worldPos(rootPos, this, this._restPose.bones, -1); // World position

        // Retrieve the position of the root joint of the parent
        let origin = parent.bones[0].position.clone(); // Local position
        origin = worldPos(origin, parent, parent.bones, -1); // World position

        /* If the parent doesn't have any trajectory input and moves only with h-VS
        then we take the speed of the parent of the parent (and so on)*/
        let rootObject = parent;
        while (rootObject.parent.object != null && rootObject.lengthPath == 0) {
            this._parent.speed = rootObject.parent.speed;
            rootObject = rootObject.parent.object;
        }

        // --------------- Aplly h-VS to the joints of the object ---------------
        // The current formula for h-VS extends a lot the skeleton so we need to resize it afterwards

        for (let i = 2; i < this.lengthBones; i++) {
            let w = speed.clone();
            let n = w.clone().normalize();

            // Retrieve the position of the joint
            let currentPos = this._restPose.bones[i].position.clone(); // Local position
            currentPos = worldPos(currentPos, this, this._restPose.bones, i-1); // World position

            let detailDiff =  currentPos.clone().sub(rootPos); // Axis btw bone-object root
            let parentDiff = currentPos.clone().sub(origin); // Axis btw bone-parent root

            /* Retrieve the index of the bone in the parent mesh that the more impact on the correspondence
            i.e. the vertex whose object root is attached to*/
            let corIndex = this._parent.anchor;

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

            // Compute speed
            let v = w.clone().cross(parentDiff).multiplyScalar(boneIndex * detailDiff.length());
            speeds.push(v);

            // Compute angle
            let param = settings.parentVSparam / 10000
            let theta = - param * v.length();

            // Compute rotation matrix
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
        }

        // --------------- Rescale the curve for volume conservation ---------------

        let segmentSize = this._restPose.height / (this.lengthBones - 2);
        resizeCurve(newPosArray, segmentSize);


        // --------------- Bend each bone so that it follows the new target position ---------------
        /* The main idea is to apply the bending logic to all joints, using the optimal new position (newPosArray) of the bone
        as the target position*/

        for (let i = 2; i < this.lengthBones; i++) {
            this.links[i - 1].position.copy(newPosArray[i - 2]);

            // Retrieve the position of the bone i (which is considered as the effector in the bending pov)
            let effector = bones[i].position.clone(); // Local position
            effector = worldPos(effector, this, bones, i-1); // World position

            // Retrieve the previous bone position (which is considered as the origin in the bending pov)
            let origin = bones[i-1].position.clone(); // Local position
            origin = worldPos(origin, this, bones, i-2); // World position

            // Compute angle and axis (global) for the rotation
            let worldRotation = computeAngleAxis(origin, effector, newPosArray[i-2]);
            let localAxis = localDir(worldRotation.axis, bones, i-2); // Local axis of rotation

            // Rotate
            rotate(localAxis, worldRotation.angle, bones[i-1])

            // Update the speed of the h-VS at joint i
            const points = [];
            effector = bones[i].position.clone(); // New local position of joint i
            effector = worldPos(effector, this, bones, i-1); // World position
            points.push(effector.clone());
            points.push(effector.clone().add(speeds[i - 2].clone().divideScalar(10)));

            this._display.speeds[i - 1].geometry = new THREE.BufferGeometry().setFromPoints(points);
        }
    }

    /**
     * Compute the angular speed of a joint
     * @param {number} origin Index of the parent joint
     * @param {THREE.Vector3} oldPos Position of the joint at time t - 1
     * @param {THREE.Vector3} newPos Position of the joint at time t
     * @returns The angular speed of the joint
     */
    getSpeed(origin, oldPos, newPos) {
        // Retrieve origin position
        let originPos = this.bones[origin].position.clone(); // Local position
        originPos = worldPos(originPos, this, this.bones, origin - 1); // World position

        // Compute the angle and the axis of rotation (world space)
        let worldRotation = computeAngleAxis(originPos, oldPos, newPos);

        // Display the axis of rotation
        let points = [];
        points.push(originPos.clone());
        points.push(originPos.clone().add(worldRotation.axis.clone().multiplyScalar(10)));
        this._display.axis.geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Compute speed
        let speed = new THREE.Vector3(0,0,0);
        if (!isNaN(worldRotation.angle)) {
            speed = worldRotation.axis.clone().multiplyScalar(worldRotation.angle);
        }

        return speed;
    }

    /**
     * Bend the skeleton. The main idea is to bend the object so that
     * the axis root-effector is align with the axis root-target (target being the point we want to reach, 
     * for instance a point on the user input)
     * 
     * Bending done with constant angle. Each joint is rotated by an angle
     * 
     * alpha = 2 * theta / (this.effector + 1)
     * 
     * theta being the angle between root-effector and root-target axes.
     * @param {Array<THREE.Bone>} bones - The bones to bend
     * @param {THREE.Vector3} target - The target (in world space) we want to reach
     */
    bend(bones, target) {
        // Reset the bones position
        this.reset(bones);

        // Retrieve effector position
        let effector = bones[this.effector + 1].position.clone(); // Local position
        effector = worldPos(effector, this, bones, this.effector); // World position

        // Retrieve root position
        let origin = bones[0].position.clone(); // Local position
        origin = worldPos(origin, this, bones, -1); // World position

        // Compute angle and axis of rotation (world) btw the 2 axes
        let worldRotation = computeAngleAxis(origin, effector, target);

        // Apply iteratively the rotation on each joint
        for(let i = 1; i < this.lengthBones - 1; i++) {
            let localAxis = localDir(worldRotation.axis, bones, i-1)
            let angle = 2 * worldRotation.angle / (this.effector + 1)
            rotate(localAxis, angle, bones[i]);
        }
    } 
    
    /**
     * Blend the LBS + VS deformation and the h-VS deformation
     */
    blend() {
        for (let i = 0; i < this.lengthBones; i++) {
            // Blend the quaternions of the 2 deformations
            let q1 = this.bones[i].quaternion.clone();
            let q2 = this._parent.motion[i].quaternion.clone();
            let q = q1.clone().slerp(q2, this.alpha);

            // Update the bone rotation
            this.bones[i].quaternion.copy(q);
            this.bones[i].updateWorldMatrix(false, false);
        }
    }

    /**
     * Retrieve and update the effector depending on the distance we want it to be
     * from the root.
     * The effector will be the link whose distance from the root is the closest
     * to the expected one.
     * TODO: Modify it so that the effector is part of the VISIBLE links
     * @param {number} distance - Wanted distance of the effector from the root
     */
    updateEffector(distance) {
        let res = 0; // Current effector index

        // Initialize distance
        let bonePos = this.bones[0].position.clone();
        let current_d = bonePos.distanceTo(new THREE.Vector3(0,0,0));
        for (let i = 1; i < this.lengthLinks; i++) {
            bonePos = this.restBones[i+1].position.clone(); // Local position (wrt bone i)
            bonePos = worldPos(bonePos, this, this.restBones, i); // World position
            bonePos = localPos(bonePos, this, this.restBones, 0); // Local position (wrt to bone 0)

            // Update effector if necessary
            let new_d = bonePos.distanceTo(new THREE.Vector3(0,0,0));
            if (Math.abs(new_d - distance) < Math.abs(current_d - distance)) {
                res = i;
                current_d = new_d;
            }
        }

        // Retrieve the optimal effector
        this.effector = res;

        // Update display
        this.display.updateLinks();
    }

}

export { MyObject }