#!/usr/bin/env python3
"""Render real GDS polygons with gdstk; no uploaded scripts or mock geometry."""
import argparse
import hashlib
import json
import math
from pathlib import Path

def render(root, output):
    import gdstk
    from PIL import Image, ImageDraw
    root = root.resolve(strict=True)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    files = sorted(root.rglob("*.gds"))
    if len(files) > 1000:
        raise ValueError("Too many GDS files")
    for filename in files:
        item = {"gdsPath": filename.relative_to(Path.cwd()).as_posix(), "status": "unavailable"}
        try:
            if filename.is_symlink() or not filename.resolve(strict=True).is_relative_to(root):
                raise ValueError("Unsafe GDS path")
            if filename.stat().st_size > 128 * 1024 * 1024:
                raise ValueError("GDS exceeds preview size budget")
            library = gdstk.read_gds(str(filename))
            polygons = []
            for cell in library.top_level():
                polygons.extend(cell.get_polygons(apply_repetitions=True, include_paths=True, depth=None))
            if not polygons or len(polygons) > 250000:
                raise ValueError("Empty geometry or polygon budget exceeded")
            points = [p.points for p in polygons]
            x0 = min(float(p[:, 0].min()) for p in points)
            x1 = max(float(p[:, 0].max()) for p in points)
            y0 = min(float(p[:, 1].min()) for p in points)
            y1 = max(float(p[:, 1].max()) for p in points)
            if not all(math.isfinite(x) for x in [x0,x1,y0,y1]) or x1 <= x0 or y1 <= y0:
                raise ValueError("Invalid GDS geometry extent")
            width, height, pad = 1400, 900, 20
            layers = sorted({p.layer for p in polygons})
            legend_layers = layers[:30]
            legend_height = 24 + 22 * math.ceil(len(legend_layers) / 10)
            area_height = height - legend_height - 2 * pad
            scale = min((width-2*pad)/(x1-x0), area_height/(y1-y0))
            offset_x = (width - (x1-x0)*scale) / 2
            offset_y = legend_height + pad + (area_height-(y1-y0)*scale) / 2
            image = Image.new("RGB", (width,height), "#101827")
            draw = ImageDraw.Draw(image, "RGBA")
            palette = [(96,165,250,120),(244,114,182,130),(52,211,153,140),(251,191,36,130),(167,139,250,140),(248,113,113,130)]
            for polygon in sorted(polygons, key=lambda p:(p.layer,p.datatype)):
                coords = [(offset_x+(float(x)-x0)*scale,offset_y+(y1-float(y))*scale) for x,y in polygon.points]
                if len(coords) >= 3:
                    color = palette[polygon.layer % len(palette)]
                    draw.polygon(coords, fill=color, outline=color[:3]+(220,))
            draw.text((pad, 5), "GDS layer IDs" + (f" (first 30 of {len(layers)})" if len(layers)>30 else ""), fill=(226,232,240,255))
            for index, layer in enumerate(legend_layers):
                left = pad + (index % 10) * 135
                top = 25 + (index // 10) * 22
                color = palette[layer % len(palette)][:3] + (255,)
                draw.rectangle((left,top,left+12,top+12), fill=color)
                draw.text((left+18,top), f"Layer {layer}", fill=(226,232,240,255))
            relative = filename.relative_to(root)
            target = output / relative.with_suffix(".png")
            target.parent.mkdir(parents=True,exist_ok=True)
            image.save(target)
            item.update(status="available",previewPath=target.resolve().relative_to(Path.cwd().resolve()).as_posix(),
                        sourceSha256=hashlib.sha256(filename.read_bytes()).hexdigest(),
                        boundsUm=[x0,y0,x1,y1],polygonCount=len(polygons),layers=sorted({p.layer for p in polygons}))
        except Exception as error:
            item["diagnostic"] = str(error)
        results.append(item)
    (output / "manifest.json").write_text(json.dumps({"schemaVersion":"acg.preview.v1","results":results},indent=2)+"\n")
    print(json.dumps({"rendered":sum(x["status"]=="available" for x in results),"total":len(results)}))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input")
    parser.add_argument("--output")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        import gdstk
        from PIL import Image
        work = Path.cwd() / "renderer-selftest"
        work.mkdir(exist_ok=True)
        library = gdstk.Library()
        library.new_cell("SELFTEST").add(gdstk.rectangle((0,0),(1,1),layer=1))
        library.write_gds(str(work / "SELFTEST.gds"))
        render(work, Path.cwd() / "renderer-output")
        return
    if not args.input or not args.output:
        parser.error("--input and --output are required")
    root = Path(args.input)
    output = Path(args.output)
    cwd = Path.cwd().resolve()
    if root.is_symlink() or not root.resolve(strict=True).is_relative_to(cwd) or not output.resolve().is_relative_to(cwd):
        parser.error("Paths must stay within job workspace")
    render(root,output)
if __name__ == "__main__":
    main()
