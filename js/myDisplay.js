import * as THREE from 'three';
import { fromLocalToGlobal, worldPos } from './utils.js'
import { isSelected } from './selection.js'

class MyDisplay {
    constructor(object, materials) {
        this._object = object;
        this._materials = materials;

        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        this._links = [];
        this._speeds = [];
        
        for(let i = 1; i < object.bones.length; i++) {
            let link = new THREE.Mesh( sphereGeometry, materials.links.clone() );

            let pos = object.bones[i].position.clone();
            pos = worldPos(pos, object, object.bones, i-1);
            link.position.set(pos.x, pos.y, pos.z);
            link.visible = true;
            link.updateWorldMatrix(false, false);
            this._links.push(link);

            const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000 } );
            const geometry = new THREE.BufferGeometry().setFromPoints([]);
            const line = new THREE.Line( geometry, lineMaterial );
            line.visible = false;
            this._speeds.push(line)        
        }

        const lineMaterial2 = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        const geometry2 = new THREE.BufferGeometry().setFromPoints([]);
        this._axis = new THREE.Line( geometry2, lineMaterial2 );
    
        this._root = new THREE.Mesh( sphereGeometry, materials.root.clone() );

        let pos = object.bones[0].position.clone();
        pos = worldPos(pos, object, object.bones, -1);
        this._root.position.set(pos.x, pos.y, pos.z);
        this._root.visible = true;
        this._root.updateWorldMatrix(false, false);

        // Skeleton ne fonctionne pas
        this._skeleton = new THREE.SkeletonHelper( object.bones[1]);
        this._skeleton.bones[0].updateMatrixWorld(true);
        this._skeleton.updateMatrixWorld();
        this._skeleton.visible = false;
        this._axes = [];
        for (let i = 0; i < object.lengthBones; i++) {
            let axesHelper = new THREE.AxesHelper( 10 );
            object.bones[i].add(axesHelper);
            axesHelper.updateWorldMatrix(false, false);
            axesHelper.visible = false;
            this._axes.push(axesHelper);
        }

        const pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._path = new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    
        const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._timing = new THREE.Points( timingGeometry, materials.timing.clone() );

    }

    get materials() { return this._materials; }
    get links() { return this._links; }
    get root() { return this._root; }
    get skeleton() { return this._skeleton; }
    get axes() { return this._axes; }

    get path() { return this._path; }
    get timing() { return this._timing; }
    get speeds() { return this._speeds; }
    get axis() { return this._axis; }

    // Display functions
    updateLinks() {
        for(let i = 0; i < this.links.length; i++) {
            /*let pos = this._object.bones[i+1].position.clone();
            pos = worldPos(pos, this._object, this._object.bones, i);
            this.links[i].position.set(pos.x, pos.y, pos.z);
            this.links[i].updateWorldMatrix(true, false);
            this.links[i].updateWorldMatrix(false, false);*/

            let pos = this._object.lbs[i+1].position.clone();
            pos = worldPos(pos, this._object, this._object.lbs, i);
            this.links[i].position.set(pos.x, pos.y, pos.z);
            //this.links[i].updateWorldMatrix(true, false);
            this.links[i].updateWorldMatrix(false, false);

            /*let pos = this._object.parent.motion[i+1].position.clone();
            pos = worldPos(pos, this._object, this._object.parent.motion, i);
            this.links[i].position.set(pos.x, pos.y, pos.z);
            this.links[i].updateWorldMatrix(true, false);
            this.links[i].updateWorldMatrix(false, false);*/
        }
        if (this._object.effector != null && isSelected(this)) {
            //this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        let pos = this._object.bones[0].position.clone();
        pos = worldPos(pos, this._object, this._object.bones, -1);
        this.root.position.set(pos.x, pos.y, pos.z);
        this._root.updateWorldMatrix(false, false);
    }

    updatePath() {
        let globalPos = fromLocalToGlobal(this._object.path.positions, this._object, 0);
        this.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }

    updateTiming() {
        if (this._object.lengthPath != 0) {
            let globalPos = this._object.path.currentPosition.clone();
            globalPos = worldPos(globalPos, this._object, this._object.bones, 0);
            this.timing.geometry = new THREE.BufferGeometry().setFromPoints([globalPos]);
        } else {
            this.timing.geometry = new THREE.BufferGeometry().setFromPoints([]);
        }
    }
}

export { MyDisplay }