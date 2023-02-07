import * as THREE from "three";
import { ARButton } from "./libs/ARButton";
import { CanvasUI } from "./libs/CanvasUI";

class App {
  constructor() {
    const canvas = document.querySelector("canvas.webgl");

    this.scene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
    this.camera.position.z = 3;
    this.scene.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(sizes.width, sizes.height);
    canvas.appendChild(this.renderer.domElement);

    this.innitScene();
    this.setupXR();
  }

  innitScene() {
    this.reticle = new THREE.Mesh(
      new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );

    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    this.createUI();
  }

  createUI() {
    const config = {
      panelSize: { width: 0.15, height: 0.038 },
      height: 128,
      info: { type: "text" },
    };
    const content = {
      info: "Debug info",
    };

    const ui = new CanvasUI(content, config);

    this.ui = ui;

    console.log("canvasUI", this.ui);
  }

  setupXR() {
    this.renderer.xr.enabled = true;

    const self = this;
    let controller;

    function onSelect() {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      self.mesh = new THREE.Mesh(geometry, material);

      self.mesh.position.set(0, 0, -3);
      self.mesh.visible = false;
      self.scene.add(self.mesh);

      if (self.reticle.visible) {
        if (self.mesh.visible) {
          self.workingVec3.setFromMatrixPosition(self.reticle.matrix);
          self.mesh.newPath(self.workingVec3);
        } else {
          self.mesh.position.setFromMatrixPosition(self.reticle.matrix);
          self.mesh.visible = true;
        }
      }
    }

    function onSessionStart() {
      self.ui.mesh.position.set(0, -0.15, -0.2);
      self.camera.add(self.ui.mesh);
    }

    function onSessionEnd() {
      self.camera.remove(self.ui.mesh);
    }

    const btn = new ARButton(this.renderer, {
      onSessionStart,
      onSessionEnd,
      sessionInit: {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body },
      },
    });
    controller = this.renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    this.scene.add(controller);

    this.renderer.setAnimationLoop(this.render.bind(this));
    this.hitTestSourceRequested = false;
    this.hitTestSource = null;
  }

  requestHitTestSource() {
    const self = this;

    const session = this.renderer.xr.getSession();

    console.log("session", session);
    session.requestReferenceSpace("viewer").then(function (referenceSpace) {
      session
        .requestHitTestSource({ space: referenceSpace })
        .then(function (source) {
          self.hitTestSource = source;
        });
    });

    session.addEventListener("end", function () {
      self.hitTestSourceRequested = false;
      self.hitTestSource = null;
      self.referenceSpace = null;
    });

    this.hitTestSourceRequested = true;
  }

  getHitTestResults(frame) {
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length) {
      const referenceSpace = this.renderer.xr.getReferenceSpace();
      const hit = hitTestResults[0];
      const pose = hit.getPose(referenceSpace);

      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      this.reticle.visible = false;
    }
  }

  render(timestamp, frame) {
    if (frame) {
      if (this.hitTestSourceRequested === false) this.requestHitTestSource();

      if (this.hitTestSource) this.getHitTestResults(frame);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
