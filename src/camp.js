const SCALE = 1;   // ขยาย/ย่อโมเดลทั้งหมด
const SPREAD = 1;  // ขยาย/ย่อระยะห่าง

export async function buildCamp(scene, parent = null) {
  const layout = await (await fetch("assets/world/camp/camp-layout.json")).json();
  const campRoot = new BABYLON.TransformNode("camp", scene);
  if (parent) campRoot.parent = parent;

  const containers = {};
  const names = [...new Set(layout.items.map(i => i.model))];
  await Promise.all(names.map(async n => {
    containers[n] = await BABYLON.SceneLoader.LoadAssetContainerAsync(layout.assetRoot, n, scene);
  }));

  for (const it of layout.items) {
    const inst = containers[it.model].instantiateModelsToScene(n => `${it.id}_${n}`, false);
    const holder = new BABYLON.TransformNode(it.id, scene);
    holder.parent = campRoot;
    inst.rootNodes.forEach(r => (r.parent = holder));
    holder.position.set(it.pos[0] * SPREAD, it.pos[1], -it.pos[2] * SPREAD);
    holder.rotation.y = -BABYLON.Tools.ToRadians(it.rotY);
    holder.scaling.setAll(it.scale * SCALE);
  }
  return campRoot;
}
