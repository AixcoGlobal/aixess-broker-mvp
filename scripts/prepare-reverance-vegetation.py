"""Prepare a browser-sized CC0 Poly Haven tree for the Reverance explorer."""

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "references"
    / "reverance-360"
    / "vegetation-source"
    / "polyhaven"
    / "tree_small_02"
    / "tree_small_02_1k.gltf"
)
OUTPUT = SOURCE.with_name("tree_small_02_web.glb")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))

tree = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
before = len(tree.data.polygons)
modifier = tree.modifiers.new("Web LOD", "DECIMATE")
modifier.ratio = 0.024
modifier.use_collapse_triangulate = True
bpy.context.view_layer.objects.active = tree
bpy.ops.object.modifier_apply(modifier=modifier.name)
after = len(tree.data.polygons)

bpy.ops.object.select_all(action="DESELECT")
tree.select_set(True)
bpy.context.view_layer.objects.active = tree
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
)

print(f"Tree polygons: {before:,} -> {after:,}")
print(f"Output: {OUTPUT} ({OUTPUT.stat().st_size / 1024 / 1024:.2f} MiB)")

# Convert the CC0 palm into a self-contained browser GLB with its real alpha
# foliage, normal map, and trunk texture.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
palm_dir = ROOT / "references" / "reverance-360" / "vegetation-source" / "opengameart" / "palm_tree_v2"
bpy.ops.import_scene.fbx(filepath=str(palm_dir / "palm_tree.FBX"))
palm = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
palm.name = "CC0 realistic palm"

palm_material = bpy.data.materials.new("CC0 palm bark and foliage")
palm_material.use_nodes = True
palm_material.surface_render_method = "DITHERED"
palm_material.use_transparency_overlap = False
nodes = palm_material.node_tree.nodes
links = palm_material.node_tree.links
bsdf = nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.48
diffuse = nodes.new("ShaderNodeTexImage")
diffuse.image = bpy.data.images.load(str(palm_dir / "diffus.tga"), check_existing=True)
links.new(diffuse.outputs["Color"], bsdf.inputs["Base Color"])
links.new(diffuse.outputs["Alpha"], bsdf.inputs["Alpha"])
normal_texture = nodes.new("ShaderNodeTexImage")
normal_texture.image = bpy.data.images.load(str(palm_dir / "normal.tga"), check_existing=True)
normal_texture.image.colorspace_settings.name = "Non-Color"
normal_map = nodes.new("ShaderNodeNormalMap")
normal_map.inputs["Strength"].default_value = 0.52
links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
palm.data.materials.clear()
palm.data.materials.append(palm_material)

palm_output = palm_dir / "palm_tree_web.glb"
bpy.ops.object.select_all(action="DESELECT")
palm.select_set(True)
bpy.context.view_layer.objects.active = palm
bpy.ops.export_scene.gltf(
    filepath=str(palm_output),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
)
print(f"Palm polygons: {len(palm.data.polygons):,}")
print(f"Output: {palm_output} ({palm_output.stat().st_size / 1024 / 1024:.2f} MiB)")
