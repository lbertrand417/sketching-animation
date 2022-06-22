import * as THREE from 'three';
import { materials } from './materials.js';

class MyDisplay {
    constructor(object, materials) {
        this._materials = materials;

        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        this._links = [];
        this._speeds = [];
        
        for(let i = 1; i < object.bones.length; i++) {
            let link = new THREE.Mesh( sphereGeometry, materials.links.clone() );
            link.position.setFromMatrixPosition(object.bones[i].matrixWorld);
            link.visible = true;
            this._links.push(link);

            const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000 } );
            const geometry = new THREE.BufferGeometry().setFromPoints([]);
            const line = new THREE.Line( geometry, lineMaterial );
            this._speeds.push(line)        
        }

        const lineMaterial2 = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        const geometry2 = new THREE.BufferGeometry().setFromPoints([]);
        this._axis = new THREE.Line( geometry2, lineMaterial2 );
    
        this._root = new THREE.Mesh( sphereGeometry, materials.root.clone() );
        this._root.position.setFromMatrixPosition(object.bones[0].matrixWorld); // From cylinder local space to world
        this._root.visible = true;

        this._skeleton = new THREE.SkeletonHelper( object.bones[0] );
        this._skeleton.visible = false;
        this._axes = [];
        for (let i = 0; i < object.lengthBones; i++) {
            let axesHelper = new THREE.AxesHelper( 10 );
            object.bones[i].add(axesHelper);
            axesHelper.visible = false;
            this._axes.push(axesHelper);
        }

        const pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._path = new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    
        const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._timing = new THREE.Points( timingGeometry, materials.timing.clone() );

    }

    get materials() {
        return this._materials;
    }

    get links() {
        return this._links;
    }

    get root() {
        return this._root;
    }

    get skeleton() {
        return this._skeleton;
    }

    get axes() {
        return this._axes;
    }

    get path() {
        return this._path;
    }

    get timing() {
        return this._timing;
    }

    get speeds() {
        return this._speeds;
    }

    get axis() {
        return this._axis;
    }
}

export { MyDisplay }