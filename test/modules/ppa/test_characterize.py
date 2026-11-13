"""Security and source semantics for the native PPA wrapper; no EDA binaries needed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import importlib.util

spec = importlib.util.spec_from_file_location("ppa_characterize", Path(__file__).resolve().parents[3] / "scripts/ppa/characterize.py")
ppa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ppa)

class SourceValidation(unittest.TestCase):
    def test_native_inline_comment_is_preserved_as_model_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / "model.sp"
            text = ".param slope=0.006 ; All devices\n.model n NMOS level=1\n"
            model.write_text(text)
            self.assertEqual(ppa.inspect_spice(model, root, {model}), text)
            self.assertEqual(model.read_text(), text)

    def test_uploaded_executable_spice_is_rejected(self):
        for text in (".control\nshell touch bad\n.endc\n", ".include /tmp/unfrozen.sp\n", ".param bad=`shell`\n", ".shell touch bad\n"):
            with self.subTest(text=text), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                model = root / "model.sp"
                model.write_text(text)
                with self.assertRaises(ValueError):
                    ppa.inspect_spice(model, root, {model})

    def test_frozen_relative_model_include_must_exist_in_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / "model.sp"
            child = root / "child.sp"
            model.write_text('.include "child.sp"\n')
            child.write_text(".model n NMOS level=1\n")
            self.assertTrue(ppa.inspect_spice(model, root, {model, child}))
            with self.assertRaises(ValueError):
                ppa.inspect_spice(model, root, {model})

    def test_nonzero_reference_does_not_silently_leave_body_at_absolute_ground(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cell = root / "cell.sp"
            cell.write_text(".subckt inv A Y VDD VSS\nM1 Y A VSS 0 n W=1u L=.3u\n.ends\n")
            with self.assertRaises(ValueError):
                ppa.inspect_spice(cell, root, set(), True, {"vssVolts": 1})

@unittest.skipUnless(importlib.util.find_spec("gdstk"), "Requires native GDS Python")
class BoundaryGeometry(unittest.TestCase):
    def test_selected_top_union_includes_references_and_avoids_overlap_double_count(self):
        import gdstk
        with tempfile.TemporaryDirectory() as tmp:
            lib=gdstk.Library(); child=lib.new_cell("child")
            child.add(gdstk.rectangle((0,0),(2,2),layer=63,datatype=0))
            top=lib.new_cell("top")
            top.add(gdstk.Reference(child),gdstk.rectangle((1,0),(3,2),layer=63,datatype=0),gdstk.rectangle((-1,-1),(4,3),layer=1))
            other=lib.new_cell("unrelated"); other.add(gdstk.rectangle((0,0),(100,100),layer=63))
            path=Path(tmp)/"cell.gds"; lib.write_gds(path)
            result=ppa.geometry(path,"top",{"layer":63,"datatype":0})
            self.assertEqual(result["areaUm2"],20)
            self.assertEqual(result["boundary"]["areaUm2"],6)
            with self.assertRaises(ValueError): ppa.geometry(path,"top",{"layer":99,"datatype":0})
            with self.assertRaises(ValueError): ppa.geometry(path,"top",{"layer":True,"datatype":0})

if __name__ == "__main__":
    unittest.main()
