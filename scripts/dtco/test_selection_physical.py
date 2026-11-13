import importlib.util
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("selection_physical", Path(__file__).with_name("selection_physical.py"))
physical = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(physical)

MAPPED = """module demo(a,unused,y);
input a,unused;
output y;
gf180mcu_fd_sc_mcu7t5v0__inv_1 u0 (.I(a),.ZN(y));
endmodule
"""
REPORT = """port\ta\t1
port\ty\t1
port\tunused\t1
drc\t0
instance\tu0\tgf180mcu_fd_sc_mcu7t5v0__inv_1
net\ta\t1\t0\tu0/I\ta
net\ty\t1\t0\tu0/ZN\ty
net\tunused\t0\t0\t\tunused
net\tVDD\t0\t0\tu0/VDD\tVDD
net\tVSS\t0\t0\tu0/VSS\tVSS
"""

class PhysicalValidationTest(unittest.TestCase):
    def audit(self, text):
        _, instances, nets = physical.parse_mapped(MAPPED)
        with tempfile.TemporaryDirectory() as folder:
            report = Path(folder) / "database.tsv"
            report.write_text(text)
            return physical.audit_database(report, instances, nets)

    def test_exact_candidate_and_unused_primary_input(self):
        top, instances, nets = physical.parse_mapped(MAPPED)
        self.assertEqual(top, "demo")
        self.assertEqual(nets["unused"], {"pins": set(), "ports": {"unused"}})
        checks = self.audit(REPORT)
        self.assertTrue(checks["routeComplete"])
        self.assertEqual(checks["unroutedNets"], 0)
        self.assertEqual(checks["addedFunctionalInstances"], 0)

    def test_resizing_or_added_functional_cell_rejected(self):
        for altered in [REPORT.replace("__inv_1", "__inv_2"),
                        REPORT + "instance\tu1\tgf180mcu_fd_sc_mcu7t5v0__inv_1\n"]:
            with self.subTest(altered=altered):
                with self.assertRaisesRegex(ValueError, "assignment"):
                    self.audit(altered)

    def test_changed_pin_binding_or_missing_supply_rejected(self):
        for altered in [REPORT.replace("u0/I", "u0/ZN"), REPORT.replace("u0/VDD", "")]:
            with self.subTest(altered=altered):
                with self.assertRaises(ValueError):
                    self.audit(altered)

    def test_unrouted_disconnected_or_drc_rejected(self):
        for altered in [REPORT.replace("net\ta\t1", "net\ta\t0"),
                        REPORT.replace("net\ta\t1\t0", "net\ta\t1\t1"),
                        REPORT.replace("drc\t0", "drc\t1")]:
            with self.subTest(altered=altered):
                with self.assertRaisesRegex(ValueError, "Routing"):
                    self.audit(altered)

    def test_missing_physical_primary_pin_rejected(self):
        with self.assertRaisesRegex(ValueError, "pin geometry"):
            self.audit(REPORT.replace("port\tunused\t1", "port\tunused\t0"))

    def test_paths_cannot_escape_workspace_or_be_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            with self.assertRaises(ValueError):
                physical.safe(root, "../outside")
            (root / "alias").symlink_to(root / "target")
            with self.assertRaises(ValueError):
                physical.safe(root, "alias")

if __name__ == "__main__":
    unittest.main()
