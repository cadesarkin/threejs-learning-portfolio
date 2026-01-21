import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#87ceeb');    
gradient.addColorStop(0.3, '#a8d8f0');  
gradient.addColorStop(0.7, '#c9e4f6');  
gradient.addColorStop(1, '#e8f4fc');    
skyCtx.fillStyle = gradient;
skyCtx.fillRect(0, 0, 2, 512);
const skyTexture = new THREE.CanvasTexture(skyCanvas);
scene.background = skyTexture;

const canvas = document.getElementById("experience-canvas");
const raycaster = new THREE.Raycaster();
const collisionRaycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const collisionMeshes = [];
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

let character = {
    instance: null,
    moveDistance: 5,
    jumpHeight: 2,
    isMoving: false,
    moveDuration: 0.2
}

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3

const modalContent = {
    "Project_1": {
        title: "Project One",
        content: "this is project one. hello world",
        link: "https://cadesarkin.com"         
    },
    "Project_2": {
        title: "Project Two",
        content: "this is project two. hello world",
        link: "https://cadesarkin.com"
    },
    "Project_3": {
        title: "Project Three",
        content: "this is project three. hello world",
        link: "https://cadesarkin.com"
    }
}

const modal = document.querySelector(".modal");
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(".modal-project-description");
const modalExitButton = document.querySelector(".modal-exit-button");
const modalVisitButton = document.querySelector(".modal-visit-button");

function showModal(id) {
    const content = modalContent[id];
    if (content) {
        modalTitle.textContent = content.title;
        modalProjectDescription.textContent = content.content;

        if (content.link) {
            modalVisitButton.href = content.link;
            modalVisitButton.classList.remove("hidden");
        }
        else {
            modalVisitButton.classList.add("hidden");
        }

        modal.classList.toggle("hidden");
    }
}
function hideModal() {
    modal.classList.toggle("hidden");
}

let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
    "Project_1",
    "Project_2",
    "Project_3"
]

const loader = new GLTFLoader();

loader.load( './Portfolio_3.glb', function ( glb ) {


    scene.add( glb.scene );
    glb.scene.traverse( ( child ) => {
        if (intersectObjectsNames.includes(child.name)) {
            intersectObjects.push(child);
        }
        
        const isCollisionObject = child.parent?.name === "Collision" || child.name === "Collision";
        
        if ( child.isMesh ) {
            if (isCollisionObject) {
                child.visible = false;
                collisionMeshes.push(child);
            } else {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        }

        if (child.name === "Character") {
            character.instance = child;
        }
    });
}, undefined, function ( error ) {

  console.error( error );

} );

const sun = new THREE.DirectionalLight( 0xFFFFFF );
sun.castShadow = true;
sun.position.set( -264, 800, -262 );
sun.shadow.mapSize.set( 4096, 4096 );
sun.shadow.camera.left = -300;
sun.shadow.camera.right = 300;
sun.shadow.camera.top = 300;
sun.shadow.camera.bottom = -300;
sun.shadow.camera.far = 1100;
sun.shadow.normalBias = 1;
scene.add( sun );

const color = 0xFFFFFF;
const intensity = 2;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

const aspectRatio = sizes.width / sizes.height;
const camera = new THREE.OrthographicCamera( -aspectRatio * 50, aspectRatio * 50, 50, -50, 0.1, 2000 );
scene.add( camera );

camera.position.x = 252;
camera.position.y = 175;
camera.position.z = 381;

// Offset from target to camera (maintains original viewing angle)
const cameraOffset = new THREE.Vector3(154, 207, 374);

camera.zoom = 0.75;
camera.updateProjectionMatrix();

const controls = new OrbitControls( camera, canvas );
controls.target.set(98, -32, 7); // Set where the camera looks at (adjust these values)
controls.update();

function onResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    const aspectRatio = sizes.width / sizes.height;
    camera.left = -aspectRatio * 50;
    camera.right = aspectRatio * 50;
    camera.top = 50;
    camera.bottom = -50;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onClick() {
    if (intersectObject !== "") {
        showModal(intersectObject);
    }
}

function onPointerMove( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function normalizeRotation(current, target) {
    // Calculate the shortest path between two angles
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta;
}

function canMoveTo(targetPosition) {
    // First check for collision objects blocking the path
    if (character.instance && collisionMeshes.length > 0) {
        const charPos = character.instance.position;
        const direction = new THREE.Vector3(
            targetPosition.x - charPos.x,
            0,
            targetPosition.z - charPos.z
        ).normalize();
        
        // Cast rays at multiple heights to catch walls of different sizes
        const rayHeights = [1, 3, 5, 10];
        
        for (const height of rayHeights) {
            const rayOrigin = new THREE.Vector3(charPos.x, charPos.y + height, charPos.z);
            collisionRaycaster.set(rayOrigin, direction);
            
            const collisionHits = collisionRaycaster.intersectObjects(collisionMeshes);
            
            // If we hit a collision object within move distance, block movement
            if (collisionHits.length > 0 && collisionHits[0].distance < character.moveDistance + 1) {
                return false;
            }
        }
    }
    
    return true;
}

function moveCharacter(targetPosition, targetRotation) {

    character.isMoving = true;
    const t1 = gsap.timeline({
        onComplete: () => {
            character.isMoving = false;
        }
    });

    // Calculate shortest rotation path
    const shortestRotation = normalizeRotation(character.instance.rotation.y, targetRotation);

    t1.to(character.instance.position, {
        x: targetPosition.x,
        z: targetPosition.z,
        duration: character.moveDuration,
    });

    t1.to(character.instance.rotation, {
        y: shortestRotation,
        duration: character.moveDuration,
    }, 0);

    t1.to(character.instance.position, {
        y: character.instance.position.y + character.jumpHeight,

        duration: character.moveDuration / 2,
        yoyo: true,
        repeat: 1,
    }, 0);

}

function onKeyDown(event) {
    if (character.isMoving) return;
    if (!character.instance) return;

    const targetPosition = new THREE.Vector3().copy(character.instance.position);
    let targetRotation = character.instance.rotation.y; // Keep current rotation by default

    switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            targetPosition.z -= character.moveDistance;
            targetRotation = 0
            break;
        case 's':
        case 'arrowdown':
            targetPosition.z += character.moveDistance;
            targetRotation = Math.PI
            break;
        case 'a':
        case 'arrowleft':
            targetPosition.x -= character.moveDistance;
            targetRotation = -Math.PI / 2;
            break;
        case 'd':
        case 'arrowright':
            targetPosition.x += character.moveDistance;
            targetRotation = Math.PI / 2;
            break;
        case 'escape':
            hideModal();
            return; // Don't try to move on escape
        default:
            return; // Don't move on unrecognized keys
    }
    
    // Only move if there's valid ground at target position
    if (canMoveTo(targetPosition)) {
        moveCharacter(targetPosition, targetRotation);
    }
}

modalExitButton.addEventListener("click", hideModal);
window.addEventListener('resize', onResize);
window.addEventListener('click', onClick);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('keydown', onKeyDown);

// Mobile D-Pad Controls
const dpadButtons = document.querySelectorAll('.dpad-btn');

function handleDpadInput(direction) {
    if (character.isMoving) return;
    if (!character.instance) return;

    const targetPosition = new THREE.Vector3().copy(character.instance.position);
    let targetRotation = character.instance.rotation.y;

    switch (direction) {
        case 'up':
            targetPosition.z -= character.moveDistance;
            targetRotation = 0;
            break;
        case 'down':
            targetPosition.z += character.moveDistance;
            targetRotation = Math.PI;
            break;
        case 'left':
            targetPosition.x -= character.moveDistance;
            targetRotation = -Math.PI / 2;
            break;
        case 'right':
            targetPosition.x += character.moveDistance;
            targetRotation = Math.PI / 2;
            break;
        default:
            return;
    }
    
    if (canMoveTo(targetPosition)) {
        moveCharacter(targetPosition, targetRotation);
    }
}

dpadButtons.forEach(btn => {
    const direction = btn.dataset.direction;
    
    // Touch events for mobile
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        handleDpadInput(direction);
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
    }, { passive: false });
    
    // Mouse events for testing on desktop
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        handleDpadInput(direction);
    });
    
    btn.addEventListener('mouseup', () => {
        btn.classList.remove('pressed');
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.classList.remove('pressed');
    });
});

function animate() {

    if (character.instance) {
        // Camera follows character with fixed offset
        camera.position.x = character.instance.position.x + cameraOffset.x;
        camera.position.y = cameraOffset.y; // Fixed Y - don't follow jump
        camera.position.z = character.instance.position.z + cameraOffset.z;
        
        // Look at the character (same relative angle as before)
        controls.target.set(
            character.instance.position.x,
            0, // Fixed Y for target
            character.instance.position.z
        );
        controls.update();
    }

    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( intersectObjects );

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
        intersectObject = "";
    }

    for (let i = 0; i < intersects.length; i++) {
        intersectObject = intersects[i].object.parent.name;
    }

    renderer.render( scene, camera );
  }

  renderer.setAnimationLoop( animate );