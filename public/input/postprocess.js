// no imports—passes are on THREE namespace:
const composer   = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0, 0.4, 0.85
);
composer.addPass(bloomPass);
