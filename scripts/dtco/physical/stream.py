"""KLayout native DEF stream-out, circuit hierarchy audit and preview."""
import collections
import hashlib
import json
from pathlib import Path
import re
import pya

def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

config = json.loads(Path(physical_config).read_text(encoding="utf-8"))
runtime = config["runtime"]
folder = Path(physical_config).parent
tech_xml = Path(runtime["klayoutTechPath"]).read_text(encoding="utf-8")
def_text = (folder / "routed.def").read_text(encoding="utf-8")
units = re.search(r"UNITS DISTANCE MICRONS (\d+)\s*;", def_text)
if not units:
    raise ValueError("DEF units missing")
def_units = int(units.group(1))
dbu = 1.0 / def_units
tech_xml = re.sub(r"<dbu>.*?</dbu>", "<dbu>" + str(dbu) + "</dbu>", tech_xml)
tech_xml = re.sub(r"<lef-files>.*?</lef-files>", "", tech_xml)
tech_xml = tech_xml.replace("</lefdef>", "<lef-files>" + runtime["techLefPath"] +
    "</lef-files><lef-files>" + runtime["cellLefPath"] + "</lef-files></lefdef>")
mapping = Path(runtime["layerMapPath"]).read_text(encoding="utf-8")
(folder / "stream.map").write_text(mapping)
(folder / "stream.lyt").write_text(tech_xml)
technology = pya.Technology()
technology.load(str(folder / "stream.lyt"))
options = technology.load_layout_options
options.lefdef_config.map_file = str(folder / "stream.map")
options.lefdef_config.dbu = dbu
options.lefdef_config.produce_cell_outlines = False
layout = pya.Layout()
layout.read(str(folder / "routed.def"), options)
top = layout.cell(config["top"])
if top is None:
    raise ValueError("DEF top cell missing")
for cell in list(layout.each_cell()):
    if cell.cell_index() != top.cell_index() and not cell.name.startswith("VIA_") and not cell.name.endswith("_DEF_FILL"):
        cell.clear()
def top_geometry(cell, owner):
    return sorted((str(owner.get_info(index)), tuple(sorted(str(shape) for shape in cell.shapes(index).each())))
                  for index in owner.layer_indexes() if not cell.shapes(index).is_empty())

def placements(cell, owner):
    return sorted((owner.cell(inst.cell_index).name, str(inst.trans), inst.na, inst.nb)
                  for inst in cell.each_inst())

original_geometry = top_geometry(top, layout)
original_placements = placements(top, layout)
master_sizes = {}
for source in config["cellGdsPaths"]:
    # A GDS read changes its owning Layout.dbu without rescaling pre-existing
    # objects. Import each master in isolation and copy with physical scaling.
    library = pya.Layout()
    library.read(source)
    source_master = library.cell(Path(source).stem)
    if source_master is None:
        raise ValueError("Library GDS master identity missing")
    target_master = layout.cell(source_master.name)
    if target_master is None:
        raise ValueError("Library master absent from candidate DEF")
    target_master.copy_tree(source_master)
    a, b = source_master.dbbox(), target_master.dbbox()
    if any(abs(x - y) > 1e-9 for x, y in zip((a.left,a.bottom,a.right,a.top),(b.left,b.bottom,b.right,b.top))):
        raise ValueError("Master geometry physical scale changed")
    master_sizes[source_master.name] = [a.left,a.bottom,a.right,a.top]
    if abs(layout.dbu - dbu) > 1e-12:
        raise ValueError("Master import changed DEF coordinate scale")
if original_geometry != top_geometry(top, layout) or original_placements != placements(top, layout):
    raise ValueError("Master import changed routed DEF geometry or placement")
final = pya.Layout()
final.dbu = dbu
final_top = final.create_cell(config["top"])
final_top.copy_tree(top)
if original_geometry != top_geometry(final_top, final) or original_placements != placements(final_top, final):
    raise ValueError("GDS stream preparation changed DEF geometry or placement")
die = re.search(r"DIEAREA\s*\(\s*(-?\d+)\s+(-?\d+)\s*\)\s*\(\s*(-?\d+)\s+(-?\d+)\s*\)\s*;", def_text)
if not die:
    raise ValueError("DEF die boundary missing")
final_top.shapes(final.layer(0, 0)).insert(pya.Box(*map(int, die.groups())))
expected = collections.Counter(config["instances"].values())
actual = collections.Counter()
for inst in final_top.each_inst():
    cell = final.cell(inst.cell_index)
    if cell.name.startswith("gf180mcu_fd_sc_mcu7t5v0__"):
        actual[cell.name] += inst.na * inst.nb if inst.is_regular_array() else 1
if actual != expected:
    raise ValueError("Final GDS cell multiplicity differs from exact candidate")
empty = [cell.name for cell in final.each_cell() if cell.is_empty()]
if empty:
    raise ValueError("Empty or unresolved GDS master: " + ",".join(empty))
routing_layers = {34, 36, 42, 46, 81, 53}
top_shapes = {}
for index in final.layer_indexes():
    info = final.get_info(index)
    count = sum(1 for shape in final_top.shapes(index).each() if not shape.is_text())
    if count:
        top_shapes[str(info)] = count
routed = any(final.get_info(index).layer in routing_layers and
             not final_top.shapes(index).is_empty() for index in final.layer_indexes())
if not routed:
    raise ValueError("Final GDS has no top-level interconnect")
final.write(str(folder / "routed.gds"))
emitted = pya.Layout()
emitted.read(str(folder / "routed.gds"))
if abs(emitted.dbu - dbu) > 1e-12 or emitted.top_cell().name != config["top"]:
    raise ValueError("GDS precision or top identity changed")
emitted_top = emitted.top_cell()
# The explicit boundary adds one new top-level layer. Signal layers and every
# imported placement must survive actual stream serialization unchanged.
if original_placements != placements(emitted_top, emitted):
    raise ValueError("Emitted GDS placement differs from original DEF")
for index in layout.layer_indexes():
    info = layout.get_info(index)
    if info.layer == 0 or top.shapes(index).is_empty():
        continue
    emitted_index = emitted.find_layer(pya.LayerInfo(info.layer, info.datatype))
    if emitted_index is None:
        raise ValueError("Emitted GDS lost a routed layer")
    original_region = pya.Region(top.shapes(index))
    emitted_region = pya.Region(emitted_top.shapes(emitted_index))
    if not (original_region ^ emitted_region).is_empty():
        raise ValueError("Emitted GDS routing geometry differs from original DEF")
view = pya.LayoutView()
view.show_layout(emitted, False)
view.max_hier()
view.add_missing_layers()
view.zoom_fit()
view.save_image(str(folder / "preview.png"), 1200, 900)
write_json(folder / "stream-validation.json", {
    "missingMasters": 0, "routedGeometry": True, "gdsPlacementMatches": True,
    "defGeometryMatches": True, "masterGeometryMatches": True, "nativeMasterBoundsUm": master_sizes, "gdsTop": config["top"],
    "gdsDbuUm": emitted.dbu, "defDbuPerUm": def_units,
    "gdsFunctionalMasters": dict(actual), "topGeometryByLayer": top_shapes,
    "layerStack": "GF180 6LM_1TM_9K 7t", "outlineLayer": "0/0",
    "dieBoundaryFromDef": True, "dieAreaDbu": list(map(int, die.groups())),
    "cellGdsSha256": {source: hashlib.sha256(Path(source).read_bytes()).hexdigest()
                      for source in config["cellGdsPaths"]}})
