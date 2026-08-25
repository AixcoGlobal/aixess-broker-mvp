"""Build the Project Reverance A Block as lightweight real geometry.

Otium publishes a 100-frame architectural orbit but no source BIM/GLB. This
script treats the orbit and the A Block floor plans as simultaneous multi-view
constraints. It deliberately avoids full-elevation image planes: balconies,
glazing, cladding, roof sails, planters, and foliage all have physical depth so
the browser model remains coherent from every orbit angle.
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Euler, Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "assets" / "reverance-3d"
PREVIEW_DIR = ROOT / "references" / "reverance-360"
MATERIAL_DIR = OUTPUT_DIR / "materials"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Reconstructed from the official 100-frame orbit.  One regular storey is the
# measuring unit: the broad front is 11.4F, the side is 7.3F, and the visible
# stack is a 1.8F lobby + 15 inventory floors + one amenity floor + 1.8F crown.
FLOOR_HEIGHT = 3.05
WIDTH = FLOOR_HEIGHT * 11.4
DEPTH = FLOOR_HEIGHT * 7.3
GROUND_HEIGHT = FLOOR_HEIGHT * 1.8
RESIDENTIAL_FLOORS = 15
AMENITY_FLOORS = 1
REGULAR_FLOORS = RESIDENTIAL_FLOORS + AMENITY_FLOORS
AMENITY_TOP = GROUND_HEIGHT + FLOOR_HEIGHT * REGULAR_FLOORS
CROWN_HEIGHT = FLOOR_HEIGHT * 1.8
ROOF_HEIGHT = AMENITY_TOP + CROWN_HEIGHT
FRONT_Y = -DEPTH / 2
BACK_Y = DEPTH / 2
BALCONY_EDGE_Y = FRONT_Y - FLOOR_HEIGHT * 0.62
ROOF_FIN_RISE = FLOOR_HEIGHT * 1.9
MODEL_HEIGHT = ROOF_HEIGHT + ROOF_FIN_RISE

BAY_COUNT = 8
FRONT_WIDTH = WIDTH * 0.83
BAY_WIDTH = FRONT_WIDTH / BAY_COUNT

random.seed(29)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0.0, roughness=0.45, alpha=1.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        mat.surface_render_method = "DITHERED"
    return mat


def pbr_material(
    name,
    basecolor,
    normal=None,
    roughness=None,
    metallic=0.0,
    alpha=False,
    normal_strength=0.24,
):
    """glTF-compatible image material used only on real modeled surfaces."""

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = 0.42
    base_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    base_node.image = bpy.data.images.load(str(MATERIAL_DIR / basecolor), check_existing=True)
    mat.node_tree.links.new(base_node.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha:
        mat.node_tree.links.new(base_node.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
        mat.diffuse_color = (1.0, 1.0, 1.0, 0.99)
    if normal:
        normal_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        normal_node.image = bpy.data.images.load(str(MATERIAL_DIR / normal), check_existing=True)
        normal_node.image.colorspace_settings.name = "Non-Color"
        normal_map = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value = normal_strength
        mat.node_tree.links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
        mat.node_tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    if roughness:
        rough_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        rough_node.image = bpy.data.images.load(str(MATERIAL_DIR / roughness), check_existing=True)
        rough_node.image.colorspace_settings.name = "Non-Color"
        mat.node_tree.links.new(rough_node.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


def box(name, location, dimensions, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Edge softness", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def beam_between(name, start, end, thickness, mat):
    """Rectangular beam connecting two 3D points."""

    start_vec = Vector(start)
    end_vec = Vector(end)
    direction = end_vec - start_vec
    obj = box(name, (start_vec + end_vec) / 2, (thickness, thickness, direction.length), mat, thickness * 0.16)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def roof_sail(name, x, outer_mat, inner_mat, tall):
    """Create the official rectilinear primary portal or secondary screen.

    The source's apparent front-view "spikes" are foreshortened horizontal
    returns.  The primary ribs are L-shaped portals; alternate axes are lower
    bronze privacy blades with no roof return.
    """

    # The primary portals are substantial folded plates.  Their horizontal
    # returns terminate in the common rear beam instead of stopping short as
    # floating canopy sticks.
    thickness = FLOOR_HEIGHT * (0.14 if tall else 0.105)
    y_front = FRONT_Y - 0.62
    y_rear = FRONT_Y + DEPTH * 0.84
    pieces = []
    if tall:
        front_height = MODEL_HEIGHT - AMENITY_TOP
        pieces.append(
            box(
                f"{name} primary front pier",
                (x, y_front, AMENITY_TOP + front_height / 2),
                (thickness, 1.18, front_height),
                outer_mat,
                0.065,
            )
        )
        return_depth = y_rear - y_front
        pieces.append(
            box(
                f"{name} primary top return",
                (x, y_front + return_depth / 2, MODEL_HEIGHT - 0.18),
                (thickness, return_depth, 0.78),
                outer_mat,
                0.065,
            )
        )
        pieces.append(
            box(
                f"{name} bronze soffit",
                (x, y_front + return_depth / 2, MODEL_HEIGHT - 0.625),
                (thickness * 0.66, return_depth - 0.24, 0.11),
                inner_mat,
                0.024,
            )
        )
        pieces.append(
            box(
                f"{name} bronze inner pier",
                (x, y_front - 0.005, AMENITY_TOP + front_height * 0.49),
                (thickness * 0.68, 1.205, front_height * 0.88),
                inner_mat,
                0.030,
            )
        )
    else:
        screen_top = ROOF_HEIGHT + FLOOR_HEIGHT * 0.62
        screen_height = screen_top - AMENITY_TOP
        pieces.append(
            box(
                f"{name} secondary bronze screen",
                (x, FRONT_Y - 0.27, AMENITY_TOP + screen_height / 2),
                (thickness, 1.34, screen_height),
                inner_mat,
                0.045,
            )
        )
        pieces.append(
            box(
                f"{name} secondary silver edge",
                (x, FRONT_Y - 0.94, AMENITY_TOP + screen_height / 2),
                (thickness + 0.035, 0.14, screen_height),
                outer_mat,
                0.022,
            )
        )
    return pieces


def leaf_cloud(name, center, extents, count, card_size, mat, atlas_columns, atlas_rows):
    """A genuine 3D cloud of individually oriented, alpha-cut leaf cards."""

    verts = []
    faces = []
    face_uvs = []
    for index in range(count):
        cx = center[0] + random.uniform(-extents[0], extents[0])
        cy = center[1] + random.uniform(-extents[1], extents[1])
        cz = center[2] + random.uniform(-extents[2], extents[2])
        size = card_size * random.uniform(0.72, 1.22)
        rotation = Euler(
            (
                random.uniform(-1.0, 1.0),
                random.uniform(-0.9, 0.9),
                random.uniform(0.0, math.tau),
            ),
            "XYZ",
        ).to_matrix()
        right = rotation @ Vector((size, 0.0, 0.0))
        up = rotation @ Vector((0.0, 0.0, size * 1.28))
        center_vec = Vector((cx, cy, cz))
        base = len(verts)
        verts.extend(
            (
                center_vec - right - up,
                center_vec + right - up,
                center_vec + right + up,
                center_vec - right + up,
            )
        )
        faces.append((base, base + 1, base + 2, base + 3))
        tile = index % (atlas_columns * atlas_rows)
        col = tile % atlas_columns
        row = tile // atlas_columns
        u0 = col / atlas_columns
        u1 = (col + 1) / atlas_columns
        v0 = 1.0 - (row + 1) / atlas_rows
        v1 = 1.0 - row / atlas_rows
        face_uvs.append(((u0, v0), (u1, v0), (u1, v1), (u0, v1)))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="Leaf atlas UV")
    for polygon, uvs in zip(mesh.polygons, face_uvs):
        for loop_index, uv in zip(polygon.loop_indices, uvs):
            uv_layer.data[loop_index].uv = uv
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def add_planter(objects, x, y, z, width, planter_mat, leaf_mat):
    objects.append(box("Balcony planter", (x, y, z), (width, 0.46, 0.34), planter_mat, 0.035))

    # Two independent, irregular volumes make the planted edge read as dense
    # mixed species with true parallax.  The lower layer deliberately hangs
    # below the trough, as in every official close front view.
    objects.append(
        leaf_cloud(
            "Dense balcony planter crown",
            (x, y - 0.03, z + 0.34),
            (width * 0.49, 0.29, 0.38),
            max(84, round(width * 29.0)),
            0.205,
            leaf_mat,
            3,
            2,
        )
    )
    objects.append(
        leaf_cloud(
            "Irregular hanging balcony vines",
            (x + random.uniform(-width * 0.08, width * 0.08), y - 0.12, z - 0.02),
            (width * 0.46, 0.22, 0.50),
            max(58, round(width * 21.0)),
            0.175,
            leaf_mat,
            3,
            2,
        )
    )


def add_shrub(objects, x, y, z, radius, leaf_mat):
    """Layered real-leaf shrub with true volume and randomized orientation."""

    cloud = leaf_cloud(
        "Volumetric garden shrub",
        (x, y, z + radius * 0.58),
        (radius, radius * 0.82, radius * 0.56),
        max(58, round(radius * 88)),
        radius * 0.145,
        leaf_mat,
        3,
        2,
    )
    objects.append(cloud)


def add_tree(objects, x, y, z, height, trunk_mat, leaf_mat, slender=False):
    """Barked trunk, branch hierarchy and a volumetric real-leaf canopy."""

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=height * (0.022 if slender else 0.032),
        depth=height * 0.60,
        location=(x, y, z + height * 0.30),
    )
    trunk = bpy.context.object
    trunk.name = "Garden tree barked trunk"
    trunk.data.materials.append(trunk_mat)
    objects.append(trunk)
    for branch in range(11 if slender else 15):
        angle = branch * 2.399963
        branch_start = (x, y, z + height * (0.42 + 0.032 * branch))
        branch_end = (
            x + math.cos(angle) * height * (0.10 + 0.018 * (branch % 4)),
            y + math.sin(angle) * height * (0.10 + 0.018 * ((branch + 2) % 4)),
            z + height * (0.61 + 0.035 * (branch % 5)),
        )
        objects.append(beam_between("Garden tree branch", branch_start, branch_end, height * 0.018, trunk_mat))
    crown = leaf_cloud(
        "Volumetric garden tree leaves",
        (x, y, z + height * 0.72),
        (height * (0.15 if slender else 0.20), height * (0.13 if slender else 0.18), height * 0.25),
        235 if slender else 320,
        height * 0.027,
        leaf_mat,
        3,
        3,
    )
    objects.append(crown)


def add_irregular_tree_canopy(objects, name, x, y, z, height, leaf_mat, density=520):
    """Build a multi-lobed crown so mature trees never read as leaf spheres."""

    lobes = (
        (-0.10, -0.03, 0.73, 1.02),
        (0.09, -0.06, 0.77, 0.94),
        (-0.03, 0.10, 0.83, 0.86),
        (0.12, 0.08, 0.69, 0.80),
        (-0.13, 0.09, 0.66, 0.78),
    )
    per_lobe = max(72, density // len(lobes))
    for index, (ox, oy, oz, scale) in enumerate(lobes):
        objects.append(
            leaf_cloud(
                f"{name} crown lobe {index + 1}",
                (x + height * ox, y + height * oy, z + height * oz),
                (height * 0.12 * scale, height * 0.10 * scale, height * 0.13 * scale),
                per_lobe,
                height * 0.034,
                leaf_mat,
                3,
                3,
            )
        )


def import_gltf_plant_template(relative_path, name):
    """Import and normalize one licensed real plant mesh for linked instancing."""

    source_path = ROOT / relative_path
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source_path))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if not imported:
        raise RuntimeError(f"No mesh imported from {source_path}")
    for obj in imported:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
    bpy.ops.object.select_all(action="DESELECT")
    for obj in imported:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = imported[0]
    if len(imported) > 1:
        bpy.ops.object.join()
    template = imported[0]
    template.name = name
    bpy.context.view_layer.objects.active = template
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    xs = [vertex.co.x for vertex in template.data.vertices]
    ys = [vertex.co.y for vertex in template.data.vertices]
    zs = [vertex.co.z for vertex in template.data.vertices]
    center_x = (min(xs) + max(xs)) / 2
    center_y = (min(ys) + max(ys)) / 2
    min_z = min(zs)
    for vertex in template.data.vertices:
        vertex.co.x -= center_x
        vertex.co.y -= center_y
        vertex.co.z -= min_z
    template["preserve_instance"] = True
    return template


def plant_instance(template, name, location, height, rotation_z=0.0):
    instance = template.copy()
    instance.data = template.data
    instance.name = name
    instance.location = location
    scale = height / max(template.dimensions.z, 0.001)
    instance.scale = (scale, scale, scale)
    instance.rotation_euler.z = rotation_z
    instance["preserve_instance"] = True
    bpy.context.collection.objects.link(instance)
    return instance


def join_by_material(export_objects):
    groups = {}
    preserved = []
    for obj in export_objects:
        if obj.type != "MESH" or not obj.data.materials:
            continue
        if obj.get("preserve_instance"):
            preserved.append(obj)
            continue
        groups.setdefault(obj.data.materials[0].name, []).append(obj)

    joined = []
    for name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = f"Reverance_{name.replace(' ', '_')}"
        joined.append(objects[0])
    return joined + preserved


def point_camera(obj, point):
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


clear_scene()

# Lighting creates the warm/cool shifts; no architectural photograph is baked
# onto a visible model surface.  The palette is sampled from the official
# daylight and dusk frames: champagne aluminium, cool silver slab edges,
# bronze soffits, smoked blue glass and near-black portal steel.
graphite = material("Graphite structure", (0.018, 0.025, 0.031), metallic=0.52, roughness=0.29)
charcoal = material("Charcoal standing seam", (0.105, 0.125, 0.136), metallic=0.60, roughness=0.32)
charcoal_light = material("Standing seam highlight", (0.265, 0.300, 0.305), metallic=0.64, roughness=0.29)
champagne = material("Champagne standing seam", (0.48, 0.47, 0.42), metallic=0.58, roughness=0.36)
silver = material("Architectural silver", (0.67, 0.69, 0.68), metallic=0.72, roughness=0.27)
silver_bright = material("Roof sail silver", (0.88, 0.87, 0.81), metallic=0.62, roughness=0.24)
bronze = material("Warm bronze", (0.38, 0.205, 0.090), metallic=0.61, roughness=0.34)
bronze_inner = material("Bronze soffit", (0.46, 0.245, 0.090), metallic=0.46, roughness=0.40)
concrete = material("Balcony edge", (0.74, 0.745, 0.72), metallic=0.06, roughness=0.48)
stone = material("Garden stone", (0.30, 0.295, 0.275), metallic=0.02, roughness=0.82)
soil = material("Garden soil", (0.085, 0.055, 0.030), metallic=0.0, roughness=0.96)
bark = material("Tree bark", (0.16, 0.090, 0.045), metallic=0.0, roughness=0.91)
glass = material("Smoked glazing", (0.075, 0.145, 0.175), metallic=0.15, roughness=0.075, alpha=0.25)
glass_dark = material("Deep smoked glazing", (0.028, 0.062, 0.078), metallic=0.18, roughness=0.070, alpha=0.35)
rail_glass = material("Balustrade glass", (0.22, 0.32, 0.34), metallic=0.13, roughness=0.055, alpha=0.24)
lobby_glass = material("Clear lobby glazing", (0.12, 0.19, 0.20), metallic=0.10, roughness=0.055, alpha=0.24)
warm_glass = material(
    "Warm interior glazing",
    (0.20, 0.105, 0.045),
    metallic=0.06,
    roughness=0.24,
    alpha=0.82,
    emission=(0.96, 0.34, 0.07),
    emission_strength=0.14,
)
interior_dark = material("Interior shadow", (0.025, 0.022, 0.020), metallic=0.0, roughness=0.75)
curtain = material("Warm curtain", (0.31, 0.245, 0.185), roughness=0.83)
green_a = material("Foliage deep", (0.025, 0.105, 0.040), roughness=0.88)
green_b = material("Foliage olive", (0.115, 0.205, 0.075), roughness=0.86)
green_c = material("Foliage sunlit", (0.245, 0.36, 0.11), roughness=0.84)

# Production PBR surfaces.  These are small tileable maps, never full-elevation
# photographs.  They keep the model believable under arbitrary orbit lighting.
charcoal_light = pbr_material(
    "PBR anodized silver",
    "anodized-silver-basecolor.jpg",
    "anodized-silver-normal-gl.jpg",
    "anodized-silver-roughness.jpg",
    metallic=0.36,
    normal_strength=0.18,
)
champagne = pbr_material(
    "PBR anodized champagne",
    "anodized-champagne-basecolor.jpg",
    "anodized-champagne-normal-gl.jpg",
    "anodized-champagne-roughness.jpg",
    metallic=0.32,
    normal_strength=0.17,
)
side_cladding = pbr_material(
    "PBR Reverance stone aluminium",
    "anodized-reverance-stone-basecolor.jpg",
    "anodized-champagne-normal-gl.jpg",
    "anodized-champagne-roughness.jpg",
    metallic=0.24,
    normal_strength=0.18,
)
bronze_inner = pbr_material(
    "PBR anodized bronze",
    "anodized-bronze-basecolor.jpg",
    "anodized-bronze-normal-gl.jpg",
    "anodized-bronze-roughness.jpg",
    metallic=0.58,
    normal_strength=0.19,
)
silver_bright = champagne
concrete = pbr_material(
    "PBR warm clean concrete",
    "warm-concrete-clean-basecolor.jpg",
    "warm-concrete-clean-normal-gl.jpg",
    "warm-concrete-clean-roughness.jpg",
    metallic=0.02,
    normal_strength=0.16,
)
soil = pbr_material(
    "PBR garden ground",
    "garden-ground-basecolor.jpg",
    "garden-ground-normal-gl.jpg",
    metallic=0.0,
    normal_strength=0.34,
)
bark = pbr_material(
    "PBR tree bark",
    "tree-bark-basecolor.jpg",
    "tree-bark-normal-gl.jpg",
    metallic=0.0,
    normal_strength=0.46,
)
tree_leaf = pbr_material(
    "PBR broadleaf atlas",
    "tree-leaf-atlas-rgba.png",
    "tree-leaf-atlas-normal-gl.png",
    "tree-leaf-atlas-roughness.png",
    alpha=True,
    normal_strength=0.28,
)
planter_leaf = pbr_material(
    "PBR planter leaf atlas",
    "planter-leaf-atlas-rgba.png",
    "planter-leaf-atlas-normal-gl.png",
    "planter-leaf-atlas-roughness.png",
    alpha=True,
    normal_strength=0.25,
)
planter_leaf_bsdf = planter_leaf.node_tree.nodes.get("Principled BSDF")
planter_leaf_image = next(node for node in planter_leaf.node_tree.nodes if node.type == "TEX_IMAGE" and node.image.colorspace_settings.name != "Non-Color")
planter_leaf_color = planter_leaf.node_tree.nodes.new("ShaderNodeHueSaturation")
planter_leaf_color.inputs["Saturation"].default_value = 1.12
planter_leaf_color.inputs["Value"].default_value = 1.30
for link in list(planter_leaf.node_tree.links):
    if link.to_node == planter_leaf_bsdf and link.to_socket == planter_leaf_bsdf.inputs["Base Color"]:
        planter_leaf.node_tree.links.remove(link)
planter_leaf.node_tree.links.new(planter_leaf_image.outputs["Color"], planter_leaf_color.inputs["Color"])
planter_leaf.node_tree.links.new(planter_leaf_color.outputs["Color"], planter_leaf_bsdf.inputs["Base Color"])
interior_atlas = pbr_material("Official recessed interior atlas", "interior-window-atlas-official.jpg")
interior_bsdf = interior_atlas.node_tree.nodes.get("Principled BSDF")
interior_image = next(node for node in interior_atlas.node_tree.nodes if node.type == "TEX_IMAGE")
interior_atlas.node_tree.links.new(interior_image.outputs["Color"], interior_bsdf.inputs["Emission Color"])
interior_bsdf.inputs["Emission Strength"].default_value = 0.10

lobby_wall = material("Lobby warm stone", (0.22, 0.145, 0.085), metallic=0.02, roughness=0.68)
lobby_wood = material("Lobby walnut joinery", (0.16, 0.072, 0.026), metallic=0.02, roughness=0.56)
lobby_light = material(
    "Lobby architectural light",
    (0.94, 0.56, 0.23),
    roughness=0.30,
    emission=(1.0, 0.48, 0.16),
    emission_strength=2.2,
)

objects = []

# Deep structural mass, lobby plinth and a real landscaped site base.
objects.append(box("Main structural core", (0, 1.65, ROOF_HEIGHT / 2), (WIDTH - 1.3, DEPTH - 3.50, ROOF_HEIGHT), graphite))
objects.append(box("Ground plinth", (0, 0, 0.34), (WIDTH + 0.7, DEPTH + 0.7, 0.68), charcoal, 0.05))
objects.append(box("Landscape podium", (0, 1.4, -0.12), (WIDTH + 14.0, DEPTH + 15.0, 0.40), stone, 0.16))
objects.append(box("Rear garden soil", (0, BACK_Y + 4.4, 0.14), (WIDTH + 9.0, 7.4, 0.38), soil, 0.20))
objects.append(box("Front garden left", (-WIDTH * 0.39, FRONT_Y - 4.1, 0.14), (WIDTH * 0.30, 6.0, 0.38), soil, 0.20))
objects.append(box("Front garden right", (WIDTH * 0.39, FRONT_Y - 4.1, 0.14), (WIDTH * 0.30, 6.0, 0.38), soil, 0.20))

# Truncated A-block half of the shared raised courtyard on the inner narrow side.
courtyard_width = DEPTH * 0.48
courtyard_depth = DEPTH * 0.66
courtyard_x = WIDTH / 2 + courtyard_width / 2 - 0.36
courtyard_height = FLOOR_HEIGHT * 0.98
objects.append(box("Shared courtyard podium", (courtyard_x, 1.1, courtyard_height / 2), (courtyard_width, courtyard_depth, courtyard_height), graphite, 0.10))
objects.append(box("Courtyard roof soil", (courtyard_x, 1.1, courtyard_height + 0.18), (courtyard_width - 0.55, courtyard_depth - 0.55, 0.36), soil, 0.14))
podium_face_x = WIDTH / 2 + courtyard_width - 0.34
for reveal in range(3):
    objects.append(box("Podium horizontal reveal", (podium_face_x + 0.02, 1.1, 0.72 + reveal * 0.62), (0.08, courtyard_depth - 0.55, 0.055), silver, 0.012))

# Low blue-glass garden pavilion with narrow roof strips and fluted facade.
pavilion_x = WIDTH / 2 + courtyard_width * 0.59
pavilion_y = 2.8
pavilion_w = courtyard_width * 0.54
pavilion_d = courtyard_depth * 0.36
objects.append(box("Garden pavilion core", (pavilion_x, pavilion_y, courtyard_height + 1.20), (pavilion_w, pavilion_d, 2.32), graphite, 0.06))
for strip in range(8):
    strip_y = pavilion_y - pavilion_d / 2 + pavilion_d * (strip + 0.5) / 8
    objects.append(box("Pavilion blue glass roof", (pavilion_x, strip_y, courtyard_height + 2.42), (pavilion_w - 0.16, pavilion_d / 8 - 0.045, 0.08), glass, 0.012))
for fin in range(9):
    fin_y = pavilion_y - pavilion_d / 2 + pavilion_d * fin / 8
    objects.append(box("Pavilion roof mullion", (pavilion_x, fin_y, courtyard_height + 2.47), (pavilion_w, 0.055, 0.075), charcoal, 0.010))
for fin in range(9):
    fin_y = pavilion_y - pavilion_d / 2 + pavilion_d * fin / 8
    objects.append(box("Pavilion vertical fin", (pavilion_x + pavilion_w / 2 + 0.04, fin_y, courtyard_height + 1.16), (0.08, 0.06, 2.20), silver if fin % 3 else charcoal_light, 0.010))

# Warm metal/timber X trellis across the planted court edge.
trellis_y = -courtyard_depth * 0.18
trellis_z0 = courtyard_height + 0.35
trellis_z1 = courtyard_height + 2.18
for panel in range(4):
    x0 = WIDTH / 2 + 0.50 + panel * (courtyard_width - 1.1) / 4
    x1 = WIDTH / 2 + 0.50 + (panel + 1) * (courtyard_width - 1.1) / 4
    objects.append(beam_between("Courtyard X trellis", (x0, trellis_y, trellis_z0), (x1, trellis_y, trellis_z1), 0.10, bronze_inner))
    objects.append(beam_between("Courtyard X trellis", (x0, trellis_y, trellis_z1), (x1, trellis_y, trellis_z0), 0.10, bronze_inner))

# Double-height ground lobby.  The transparent curtain wall now reveals a
# modeled, warm interior volume instead of emissive orange facade panels.
objects.append(
    box(
        "Lobby interior back wall",
        (0, FRONT_Y + 1.72, GROUND_HEIGHT / 2),
        (FRONT_WIDTH - 0.55, 0.16, GROUND_HEIGHT - 0.70),
        lobby_wall,
        0.025,
    )
)
objects.append(
    box(
        "Lobby polished floor",
        (0, FRONT_Y + 0.56, 0.26),
        (FRONT_WIDTH - 0.42, 3.05, 0.20),
        concrete,
        0.025,
    )
)
objects.append(
    box(
        "Lobby timber ceiling",
        (0, FRONT_Y + 0.54, GROUND_HEIGHT - 0.28),
        (FRONT_WIDTH - 0.46, 3.02, 0.18),
        lobby_wood,
        0.018,
    )
)
for light_row in range(4):
    light_y = FRONT_Y - 0.42 + light_row * 0.72
    objects.append(
        box(
            "Lobby recessed linear light",
            (0, light_y, GROUND_HEIGHT - 0.375),
            (FRONT_WIDTH - 1.20, 0.055, 0.035),
            lobby_light,
            0.008,
        )
    )

for bay in range(BAY_COUNT):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * (bay + 0.5)
    objects.append(box("Lobby glass", (x, FRONT_Y - 0.20, GROUND_HEIGHT / 2), (BAY_WIDTH - 0.12, 0.085, GROUND_HEIGHT - 0.34), lobby_glass, 0.018))
    if bay in (1, 6):
        objects.append(
            box(
                "Lobby walnut feature wall",
                (x, FRONT_Y + 1.61, GROUND_HEIGHT / 2),
                (BAY_WIDTH * 0.64, 0.11, GROUND_HEIGHT - 1.08),
                lobby_wood,
                0.022,
            )
        )

# Reception desk and paired central entry doors establish readable interior
# depth through the clear glass from both frontal and oblique views.
objects.append(box("Lobby reception desk", (BAY_WIDTH * 0.62, FRONT_Y + 0.82, 0.74), (BAY_WIDTH * 1.08, 0.72, 1.04), lobby_wood, 0.065))
objects.append(box("Reception light reveal", (BAY_WIDTH * 0.62, FRONT_Y + 0.43, 0.74), (BAY_WIDTH * 0.86, 0.035, 0.22), lobby_light, 0.010))
for door_side in (-1, 1):
    door_x = door_side * BAY_WIDTH * 0.34
    objects.append(box("Lobby entrance door", (door_x, FRONT_Y - 0.265, GROUND_HEIGHT * 0.38), (BAY_WIDTH * 0.58, 0.075, GROUND_HEIGHT * 0.70), lobby_glass, 0.016))
    objects.append(box("Lobby door pull", (door_x - door_side * 0.16, FRONT_Y - 0.32, GROUND_HEIGHT * 0.37), (0.035, 0.035, 0.72), silver, 0.008))
for col in range(BAY_COUNT + 1):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * col
    objects.append(box("Lobby mullion", (x, FRONT_Y - 0.23, GROUND_HEIGHT / 2), (0.14, 0.18, GROUND_HEIGHT - 0.22), graphite, 0.018))
    if col in (2, 4, 6):
        objects.append(box("Lobby interior column", (x, FRONT_Y + 1.20, GROUND_HEIGHT / 2), (0.32, 0.32, GROUND_HEIGHT - 0.44), concrete, 0.035))
for side in (-1, 1):
    side_width = (WIDTH - FRONT_WIDTH) / 2
    objects.append(box("Lobby graphite wing", (side * (FRONT_WIDTH / 2 + side_width / 2), FRONT_Y - 0.12, GROUND_HEIGHT / 2), (side_width, 0.56, GROUND_HEIGHT), graphite, 0.04))

# Sixteen physical balcony tiers: floors 2–16 plus the non-inventory amenity tier.
for level in range(REGULAR_FLOORS):
    floor_base = GROUND_HEIGHT + level * FLOOR_HEIGHT
    floor_center = floor_base + FLOOR_HEIGHT / 2
    objects.append(box("Front balcony slab", (0, FRONT_Y - 0.97, floor_base + 0.10), (FRONT_WIDTH + 0.54, 2.22, 0.28), concrete, 0.026))
    objects.append(box("Front bronze soffit", (0, FRONT_Y - 0.90, floor_base - 0.105), (FRONT_WIDTH + 0.34, 2.05, 0.16), bronze_inner, 0.016))
    objects.append(box("Official recessed interior backplane", (0, FRONT_Y + 0.17, floor_center), (FRONT_WIDTH - 0.46, 0.045, FLOOR_HEIGHT - 0.78), interior_atlas))

    for bay in range(BAY_COUNT):
        x = -FRONT_WIDTH / 2 + BAY_WIDTH * (bay + 0.5)
        pane_width = (BAY_WIDTH - 0.30) / 2
        for pane in (-1, 1):
            pane_x = x + pane * pane_width * 0.50
            objects.append(box("Apartment glazing", (pane_x, FRONT_Y + 0.03, floor_center), (pane_width - 0.06, 0.075, FLOOR_HEIGHT - 0.42), glass if (level + bay + pane) % 5 else glass_dark, 0.014))
        objects.append(box("Apartment window mullion", (x, FRONT_Y - 0.03, floor_center), (0.095, 0.12, FLOOR_HEIGHT - 0.34), graphite, 0.012))
        if (level * 3 + bay) % 5 in (0, 1, 3):
            objects.append(
                box(
                    "Apartment warm ceiling light",
                    (x, FRONT_Y + 0.105, floor_base + FLOOR_HEIGHT - 0.39),
                    (BAY_WIDTH * 0.54, 0.035, 0.045),
                    lobby_light,
                    0.008,
                )
            )
        if (level + bay) % 4 == 0:
            objects.append(box("Interior curtain", (x - BAY_WIDTH * 0.27, FRONT_Y - 0.015, floor_center), (BAY_WIDTH * 0.30, 0.035, FLOOR_HEIGHT - 0.66), curtain, 0.012))
        objects.append(box("Glass balcony rail", (x, BALCONY_EDGE_Y, floor_base + 0.78), (BAY_WIDTH - 0.16, 0.055, 1.12), rail_glass, 0.014))

        # Official imagery has near-continuous planted balcony edges, not sparse dots.
        planter_width = BAY_WIDTH * (0.68 if (level + bay) % 3 else 0.82)
        planter_x = x + (BAY_WIDTH - planter_width) * (0.14 if (level + bay) % 2 else -0.14)
        add_planter(objects, planter_x, BALCONY_EDGE_Y + 0.20, floor_base + 0.30, planter_width, bronze, planter_leaf)

        if bay < BAY_COUNT - 1:
            divider_x = -FRONT_WIDTH / 2 + BAY_WIDTH * (bay + 1)
            objects.append(box("Bronze balcony divider", (divider_x, FRONT_Y - 0.76, floor_center), (0.13, 1.54, FLOOR_HEIGHT - 0.20), bronze_inner, 0.018))

    objects.append(box("Front horizontal frame", (0, BALCONY_EDGE_Y - 0.02, floor_base + 0.13), (FRONT_WIDTH + 0.60, 0.16, 0.20), concrete, 0.018))

# The eight-bay front grid and staggered full-depth feature fins.
for col in range(BAY_COUNT + 1):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * col
    objects.append(box("Front bay mullion", (x, FRONT_Y - 1.04, (AMENITY_TOP + GROUND_HEIGHT) / 2), (0.14, 1.56, AMENITY_TOP - GROUND_HEIGHT), champagne, 0.022))

signature_columns = ((0, 0), (1, 9), (2, 6), (3, 4), (4, 8), (5, 3), (6, 7), (7, 5), (8, 0))
for col, lowest_level in signature_columns:
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * col
    z_bottom = GROUND_HEIGHT + lowest_level * FLOOR_HEIGHT
    z_top = AMENITY_TOP + 0.10
    objects.append(box("Long architectural fin", (x, FRONT_Y - 1.13, (z_bottom + z_top) / 2), (0.22 if col not in (0, 8) else 0.32, 1.80, z_top - z_bottom), silver_bright, 0.028))

for side in (-1, 1):
    objects.append(box("Front graphite blade", (side * (WIDTH / 2 - 0.55), FRONT_Y - 0.82, (AMENITY_TOP + GROUND_HEIGHT) / 2), (0.82, 1.82, AMENITY_TOP - GROUND_HEIGHT + 0.44), graphite, 0.035))

# A 1.8-floor glazed crown/penthouse band above the regular balcony stack.
crown_center_z = AMENITY_TOP + CROWN_HEIGHT / 2
for bay in range(BAY_COUNT):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * (bay + 0.5)
    objects.append(box("Crown smoked glass", (x, FRONT_Y - 0.02, crown_center_z), (BAY_WIDTH - 0.16, 0.09, CROWN_HEIGHT - 0.40), glass_dark if bay % 3 else glass, 0.016))
    objects.append(box("Crown bronze back", (x, FRONT_Y + 0.16, crown_center_z), (BAY_WIDTH - 0.54, 0.04, CROWN_HEIGHT - 0.86), bronze_inner, 0.010))
for col in range(BAY_COUNT + 1):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * col
    objects.append(box("Crown vertical fin", (x, FRONT_Y - 0.52, crown_center_z), (0.18, 1.04, CROWN_HEIGHT + 0.10), silver_bright, 0.026))
objects.append(box("Crown terrace rail", (0, FRONT_Y - 0.62, ROOF_HEIGHT - 0.68), (FRONT_WIDTH + 0.12, 0.06, 1.24), rail_glass, 0.014))
for bay in range(BAY_COUNT):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * (bay + 0.5)
    add_planter(objects, x, FRONT_Y - 0.45, AMENITY_TOP + 0.34, BAY_WIDTH * 0.72, bronze, planter_leaf)

# Side façades: fine, neutral staggered cassettes around a genuinely recessed
# stack.  Shorter vertical modules break the old full-height barcode effect.
side_slot_center = 0.45
side_slot_depth = DEPTH * 0.27
panel_count = 44
panel_step = (DEPTH - 0.72) / panel_count
side_row_count = 12
side_row_height = (ROOF_HEIGHT - GROUND_HEIGHT) / side_row_count
zone_heights = ((GROUND_HEIGHT, 8 * FLOOR_HEIGHT), (GROUND_HEIGHT + 8 * FLOOR_HEIGHT, 6 * FLOOR_HEIGHT), (GROUND_HEIGHT + 14 * FLOOR_HEIGHT, ROOF_HEIGHT - (GROUND_HEIGHT + 14 * FLOOR_HEIGHT)))
for side in (-1, 1):
    x_shell = side * (WIDTH / 2 - 0.20)
    x_skin = side * (WIDTH / 2 + 0.055)
    objects.append(box("Side backing", (x_shell, 0.0, ROOF_HEIGHT / 2), (0.48, DEPTH - 0.62, ROOF_HEIGHT), graphite))

    for panel in range(panel_count):
        y = -(DEPTH - 0.72) / 2 + panel_step * (panel + 0.5)
        if abs(y - side_slot_center) < side_slot_depth / 2:
            continue
        phase = (((panel * 5) % 7) - 3) * FLOOR_HEIGHT * 0.115
        for row in range(side_row_count + 1):
            z0 = max(GROUND_HEIGHT, GROUND_HEIGHT + row * side_row_height + phase)
            z1 = min(ROOF_HEIGHT, GROUND_HEIGHT + (row + 1) * side_row_height + phase)
            if z1 - z0 < 0.16:
                continue
            z_center = (z0 + z1) / 2
            pattern = (panel * 5 + row * 3) % 23
            shade = champagne if pattern in (0, 13) else charcoal_light if pattern == 9 else side_cladding
            projection = 0.075 + 0.025 * ((panel + row * 2) % 4)
            objects.append(
                box(
                    "Side staggered cassette",
                    (x_skin + side * projection / 2, y, z_center),
                    (projection, panel_step - 0.040, z1 - z0 - 0.075),
                    shade,
                    0.009,
                )
            )

    for panel in range(panel_count + 1):
        y = -(DEPTH - 0.72) / 2 + panel_step * panel
        if abs(y - side_slot_center) < side_slot_depth / 2:
            continue
        objects.append(box("Side seam cap", (x_skin + side * 0.145, y, (ROOF_HEIGHT + GROUND_HEIGHT) / 2), (0.035, 0.036, ROOF_HEIGHT - GROUND_HEIGHT), silver, 0.007))

    for level in range(REGULAR_FLOORS):
        floor_base = GROUND_HEIGHT + level * FLOOR_HEIGHT
        floor_center = floor_base + FLOOR_HEIGHT / 2
        objects.append(box("Side loggia glazing", (x_skin + side * 0.02, side_slot_center, floor_center), (0.075, side_slot_depth - 0.22, FLOOR_HEIGHT - 0.44), glass if level % 5 == 1 else glass_dark, 0.014))
        objects.append(box("Side loggia slab", (x_skin + side * 0.39, side_slot_center, floor_base + 0.11), (0.86, side_slot_depth, 0.22), concrete, 0.020))
        objects.append(box("Side loggia bronze soffit", (x_skin + side * 0.38, side_slot_center, floor_base - 0.055), (0.79, side_slot_depth - 0.10, 0.085), bronze_inner, 0.012))
        objects.append(box("Side loggia rail glass", (x_skin + side * 0.79, side_slot_center, floor_base + 0.72), (0.055, side_slot_depth - 0.26, 0.94), rail_glass, 0.012))
        objects.append(box("Side loggia rail edge", (x_skin + side * 0.82, side_slot_center, floor_base + 0.22), (0.085, side_slot_depth - 0.08, 0.16), concrete, 0.014))
    objects.append(box("Side crown cap", (x_skin, side_slot_center, crown_center_z), (0.14, side_slot_depth - 0.16, CROWN_HEIGHT - 0.34), glass_dark, 0.014))

# Rear façade: four-bay recessed loggia field occupying 57% of the broad face.
rear_slot_width = WIDTH * 0.57
rear_bay_width = rear_slot_width / 4
rear_skin_y = BACK_Y + 0.08
objects.append(box("Rear backing", (0, BACK_Y - 0.12, ROOF_HEIGHT / 2), (WIDTH - 0.72, 0.48, ROOF_HEIGHT), graphite))
rear_panels = 40
rear_step = (WIDTH - 0.84) / rear_panels
for zone_index, (z0, zone_height) in enumerate(zone_heights):
    z_center = z0 + zone_height / 2
    for panel in range(rear_panels):
        x = -(WIDTH - 0.84) / 2 + rear_step * (panel + 0.5)
        if abs(x) < rear_slot_width / 2:
            continue
        palette = (side_cladding, side_cladding, charcoal_light, charcoal, side_cladding, charcoal_light)
        shade = palette[(panel + zone_index) % len(palette)]
        objects.append(box("Rear fluted cassette", (x, rear_skin_y + 0.04 * ((panel + zone_index) % 3), z_center), (rear_step - 0.045, 0.13, zone_height - 0.06), shade, 0.012))

for level in range(REGULAR_FLOORS):
    floor_base = GROUND_HEIGHT + level * FLOOR_HEIGHT
    floor_center = floor_base + FLOOR_HEIGHT / 2
    objects.append(box("Rear loggia slab", (0, BACK_Y + 0.55, floor_base + 0.105), (rear_slot_width, 1.02, 0.20), concrete, 0.020))
    objects.append(box("Rear loggia bronze soffit", (0, BACK_Y + 0.48, floor_base - 0.055), (rear_slot_width - 0.12, 0.88, 0.085), bronze_inner, 0.012))
    for rear_bay in range(4):
        x = -rear_slot_width / 2 + rear_bay_width * (rear_bay + 0.5)
        objects.append(box("Rear slot glazing", (x, BACK_Y + 0.12, floor_center), (rear_bay_width - 0.18, 0.075, FLOOR_HEIGHT - 0.44), glass if (level + rear_bay) % 7 == 0 else glass_dark, 0.015))
        objects.append(box("Rear glass rail", (x, BACK_Y + 1.02, floor_base + 0.72), (rear_bay_width - 0.20, 0.055, 0.94), rail_glass, 0.014))
        objects.append(box("Rear rail edge", (x, BACK_Y + 1.055, floor_base + 0.20), (rear_bay_width - 0.12, 0.09, 0.15), concrete, 0.012))
    for rear_col in range(5):
        x = -rear_slot_width / 2 + rear_bay_width * rear_col
        objects.append(box("Rear loggia mullion", (x, BACK_Y + 0.58, floor_center), (0.13, 1.00, FLOOR_HEIGHT - 0.20), graphite, 0.016))

for side in (-1, 1):
    objects.append(box("Rear graphite blade", (side * (WIDTH / 2 - 0.68), BACK_Y - 0.08, (ROOF_HEIGHT + GROUND_HEIGHT) / 2), (0.88, 0.90, ROOF_HEIGHT - GROUND_HEIGHT + 0.38), graphite, 0.03))
objects.append(box("Rear crown glazing", (0, BACK_Y + 0.10, crown_center_z), (rear_slot_width - 0.36, 0.08, CROWN_HEIGHT - 0.40), glass_dark, 0.014))

# Four tall portal fins alternating with five lower blades across the 8-bay grid.
portal_y = FRONT_Y - 0.62 + DEPTH * 0.84
portal_beam_height = FLOOR_HEIGHT * 0.31
portal_z = MODEL_HEIGHT - portal_beam_height / 2
objects.append(box("Roof rear portal beam", (0, portal_y, portal_z), (FRONT_WIDTH + 0.76, 0.76, portal_beam_height), graphite, 0.055))
objects.append(box("Roof left rear carrier", (-FRONT_WIDTH / 2 - 0.14, portal_y, (ROOF_HEIGHT + MODEL_HEIGHT) / 2), (0.58, 0.76, MODEL_HEIGHT - ROOF_HEIGHT), graphite, 0.05))
objects.append(box("Roof right rear carrier", (FRONT_WIDTH / 2 + 0.14, portal_y, (ROOF_HEIGHT + MODEL_HEIGHT) / 2), (0.58, 0.76, MODEL_HEIGHT - ROOF_HEIGHT), graphite, 0.05))
objects.append(box("Roof service core", (0, BACK_Y - 2.30, ROOF_HEIGHT + 1.36), (6.20, 3.60, 2.72), graphite, 0.045))
for col in range(BAY_COUNT + 1):
    x = -FRONT_WIDTH / 2 + BAY_WIDTH * col
    objects.extend(roof_sail("Rooftop blade", x, silver_bright, bronze_inner, col in (1, 3, 5, 7)))

# Arrival court and volumetric planting — no photographs or flat elevation trees.
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=WIDTH * 0.19, depth=0.12, location=(0, FRONT_Y - 4.0, 0.18))
arrival = bpy.context.object
arrival.name = "Circular arrival court"
arrival.scale.y = 0.48
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
arrival.data.materials.append(concrete)
objects.append(arrival)

for side in (-1, 1):
    for index in range(5):
        x = side * (WIDTH * (0.25 + index * 0.055))
        y = FRONT_Y - 3.25 - (index % 2) * 1.10
        add_shrub(objects, x, y, 0.26, 0.75 + 0.12 * (index % 3), planter_leaf)

for row in range(2):
    for index in range(7):
        x = -WIDTH * 0.52 + index * WIDTH * 0.17
        y = BACK_Y + 2.8 + row * 3.1
        add_shrub(objects, x, y, 0.26, 0.74 + 0.10 * ((index + row) % 3), planter_leaf)
# Courtyard hedge and rooted trees sit on the raised podium soil, not the wall.
for index in range(11):
    hedge_x = WIDTH / 2 + 0.62 + index * (courtyard_width - 1.24) / 10
    add_shrub(objects, hedge_x, 1.1 - courtyard_depth * 0.40, courtyard_height + 0.34, 0.54 + 0.08 * (index % 3), planter_leaf)

# Real CC0 scanned plant meshes establish the dense tropical garden silhouette.
fern_template = import_gltf_plant_template(
    "references/reverance-360/vegetation-source/polyhaven/fern_02/fern_02_1k.gltf",
    "CC0 fern template",
)
sorrel_template = import_gltf_plant_template(
    "references/reverance-360/vegetation-source/polyhaven/shrub_sorrel_01/shrub_sorrel_01_1k.gltf",
    "CC0 sorrel shrub template",
)
anthurium_template = import_gltf_plant_template(
    "references/reverance-360/vegetation-source/polyhaven/anthurium_botany_01/anthurium_botany_01_1k.gltf",
    "CC0 tropical plant template",
)
tree_template = import_gltf_plant_template(
    "references/reverance-360/vegetation-source/polyhaven/tree_small_02/tree_small_02_web.glb",
    "CC0 broadleaf tree web LOD",
)
palm_template = import_gltf_plant_template(
    "references/reverance-360/vegetation-source/opengameart/palm_tree_v2/palm_tree_web.glb",
    "CC0 realistic palm web LOD",
)

for side in (-1, 1):
    # Dense layered entrance beds: low ferns closest to the drive, broadleaf
    # mid-storey plants behind, then taller feather palms at the outside edge.
    for index in range(24):
        lane = index % 6
        rank = index // 6
        x = side * (WIDTH * (0.215 + 0.047 * lane) + 0.16 * (rank % 2))
        y = FRONT_Y - 1.80 - rank * 1.08 - 0.28 * ((lane * 3 + rank) % 3)
        template = (fern_template, sorrel_template, anthurium_template)[(index + rank) % 3]
        objects.append(
            plant_instance(
                template,
                "Front layered tropical garden plant",
                (x, y, 0.32),
                0.82 + 0.18 * ((index * 5) % 5),
                side * 0.31 + index * 0.67,
            )
        )

    for index in range(13):
        lane = index % 7
        rank = index // 7
        x = side * (WIDTH * (0.22 + 0.048 * lane))
        y = FRONT_Y - 2.25 - rank * 1.75 - 0.34 * ((index * 3) % 4)
        objects.append(
            plant_instance(
                palm_template,
                "Front feather palm clump",
                (x, y, 0.34),
                1.35 + 0.24 * (index % 5),
                side * 0.4 + index * 0.76,
            )
        )

for index in range(28):
    x = WIDTH / 2 + 0.58 + (courtyard_width - 1.16) * ((index * 11) % 29) / 28
    y = 1.1 - courtyard_depth * 0.37 + courtyard_depth * 0.74 * ((index * 7) % 29) / 28
    template = (fern_template, sorrel_template, anthurium_template)[index % 3]
    objects.append(
        plant_instance(
            template,
            "Courtyard real plant",
            (x, y, courtyard_height + 0.37),
            0.70 + 0.15 * (index % 5),
            index * 0.73,
        )
    )

# Linked real-tree instances: high-quality bark, branch hierarchy and alpha leaves.
real_tree_positions = (
    (-WIDTH * 0.60, FRONT_Y - 5.9, 0.34, 13.8, -0.26),
    (WIDTH * 0.60, FRONT_Y - 5.5, 0.34, 12.6, 0.48),
    (-WIDTH * 0.58, BACK_Y + 4.7, 0.34, 10.8, 1.10),
    (-WIDTH * 0.20, BACK_Y + 6.3, 0.34, 8.4, -0.75),
    (WIDTH * 0.22, BACK_Y + 5.8, 0.34, 9.2, 0.31),
    (WIDTH * 0.59, BACK_Y + 4.1, 0.34, 11.4, -1.22),
)
for x, y, z, height, rotation in real_tree_positions:
    objects.append(plant_instance(tree_template, "Real mature garden tree", (x, y, z), height, rotation))
    add_irregular_tree_canopy(objects, "Dense mature tree", x, y, z, height, tree_leaf, 760)

for index, (x_fraction, y_fraction, height) in enumerate(((0.16, -0.10, 5.4), (0.40, 0.18, 6.1), (0.65, -0.01, 5.0), (0.83, 0.15, 5.7))):
    tree_x = WIDTH / 2 + courtyard_width * x_fraction
    tree_y = 1.1 + courtyard_depth * y_fraction
    objects.append(
        plant_instance(
            tree_template,
            "Real courtyard tree",
            (tree_x, tree_y, courtyard_height + 0.38),
            height,
            index * 0.84,
        )
    )
    add_irregular_tree_canopy(
        objects,
        "Dense courtyard tree",
        tree_x,
        tree_y,
        courtyard_height + 0.38,
        height,
        tree_leaf,
        480,
    )
for index, (x_fraction, y_fraction, height) in enumerate(((0.12, 0.25, 4.3), (0.31, -0.18, 5.0), (0.52, 0.22, 4.5), (0.70, -0.16, 5.2), (0.86, 0.20, 4.7))):
    objects.append(
        plant_instance(
            palm_template,
            "Courtyard palm",
            (WIDTH / 2 + courtyard_width * x_fraction, 1.1 + courtyard_depth * y_fraction, courtyard_height + 0.40),
            height,
            index * 0.92,
        )
    )

joined = join_by_material(objects)

for obj in joined:
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)

bpy.ops.object.select_all(action="DESELECT")
for obj in joined:
    obj.select_set(True)

glb_path = OUTPUT_DIR / "reverance-a.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)

# Auditable isolated renders from front, side, rear, and website hero angle.
bpy.ops.object.select_all(action="DESELECT")
box("Preview ground", (0, 0, -0.18), (70, 70, 0.30), material("Preview ground", (0.018, 0.022, 0.026), roughness=0.9), 0.03)

bpy.ops.object.camera_add(location=(0, -132, 34))
camera = bpy.context.object
bpy.context.scene.camera = camera
camera.data.lens = 62

bpy.ops.object.light_add(type="AREA", location=(-30, -34, 62))
key = bpy.context.object
key.data.energy = 5800
key.data.shape = "DISK"
key.data.size = 27
key.data.color = (1.0, 0.78, 0.58)
point_camera(key, (0, 0, 26))

bpy.ops.object.light_add(type="AREA", location=(32, -12, 34))
fill = bpy.context.object
fill.data.energy = 3600
fill.data.size = 20
fill.data.color = (0.48, 0.66, 1.0)
point_camera(fill, (0, 0, 25))

bpy.ops.object.light_add(type="AREA", location=(-12, 28, 44))
rim = bpy.context.object
rim.data.energy = 4200
rim.data.size = 18
rim.data.color = (1.0, 0.62, 0.38)
point_camera(rim, (0, 0, 29))

world = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.075, 0.105, 0.16, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.72

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.65

preview_views = (
    ("model-preview-front.png", (0, -138, 35.0), (0, 0, 32.0)),
    ("model-preview-side.png", (126, -26, 39.0), (0, 0, 32.0)),
    ("model-preview-rear.png", (0, 138, 35.0), (0, 0, 32.0)),
    ("model-preview.png", (78, -118, 45.0), (0, 0, 32.0)),
)

for filename, location, target in preview_views:
    camera.location = location
    point_camera(camera, target)
    scene.render.filepath = str(PREVIEW_DIR / filename)
    bpy.ops.render.render(write_still=True)

print(f"GLB: {glb_path} ({glb_path.stat().st_size / 1024 / 1024:.2f} MiB)")
print(f"Model height: {MODEL_HEIGHT:.2f} m")
print(f"Previews: {len(preview_views)}")
