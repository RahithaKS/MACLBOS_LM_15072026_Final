import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd


PYTHON_BACKEND = Path(__file__).resolve().parents[1]
if str(PYTHON_BACKEND) not in sys.path:
    sys.path.insert(0, str(PYTHON_BACKEND))

from services import semantic_sql_service as semantic_module
from services.semantic_sql_service import SemanticSQLService


class FakeCursor:
    def __init__(self):
        self.executed = []
        self.inserted = []
        self.closed = False

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_value = cursor
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.cursor_value

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class SupplementalEntityPnlCfIngestionTests(unittest.TestCase):
    def setUp(self):
        self.cursor = FakeCursor()
        self.connection = FakeConnection(self.cursor)
        self.service = SemanticSQLService()
        self.service.validate_cube_exists = lambda cube_id: cube_id == "cube-1"
        self.service.get_db_connection = lambda: self.connection
        self.service._store_cost_categories = lambda cube_id, categories: None
        self.service.update_ingestion_job = lambda *args, **kwargs: None
        self.original_execute_values = semantic_module.execute_values
        semantic_module.execute_values = self.capture_insert

    def tearDown(self):
        semantic_module.execute_values = self.original_execute_values

    def capture_insert(self, cursor, query, records, **kwargs):
        cursor.inserted.extend(records)

    def test_wide_cf_workbook_becomes_all_entity_fact_rows(self):
        source = pd.DataFrame(
            [
                {
                    "FiscalYear": 2025,
                    "Month": 6,
                    "Category": "Revenue",
                    "Sub_Category": "Services",
                    "CF02": 4,
                    "CF05": 5,
                    "CF09": None,
                },
                {
                    "FiscalYear": 2025,
                    "Month": 7,
                    "Category": "Revenue",
                    "Sub_Category": "Services",
                    "CF02": 10,
                    "CF05": 20,
                    "CF09": None,
                },
                {
                    "FiscalYear": 2025,
                    "Month": 7,
                    "Category": "Employee Benefit",
                    "Sub_Category": "Salary",
                    "CF02": None,
                    "CF05": 5,
                    "CF09": None,
                },
                {
                    "FiscalYear": 2025,
                    "Month": 7,
                    "Category": "End Capacity",
                    "Sub_Category": "Total",
                    "CF02": 100,
                    "CF05": 120,
                    "CF09": None,
                },
                {
                    "FiscalYear": 2025,
                    "Month": 7,
                    "Category": "Average Capacity",
                    "Sub_Category": "Average",
                    "CF02": 90,
                    "CF05": 110,
                    "CF09": None,
                },
            ]
        )

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as workbook:
            workbook_path = workbook.name
        try:
            source.to_excel(workbook_path, index=False)
            result = self.service.ingest_supplemental_entity_pnl_cf(
                workbook_path,
                "cube-1",
                source_document_id="document-1",
                source_file="supplemental.xlsx",
            )
        finally:
            os.unlink(workbook_path)

        self.assertTrue(result["success"])
        self.assertEqual(result["rows_inserted"], 7)
        self.assertTrue(self.connection.committed)
        self.assertTrue(
            any("DELETE FROM cube_fact_data" in query for query, _ in self.cursor.executed)
        )

        for record in self.cursor.inserted:
            self.assertEqual(record[0], "cube-1")
            self.assertEqual(record[1], 2025)
            self.assertIn(record[2], {6, 7})
            self.assertIsNone(record[3])
            self.assertIn(record[6], {"CF02", "CF05"})
            self.assertEqual(json.loads(record[10])["entity_scope"], "all_entities")

        revenue_cf05 = next(
            record
            for record in self.cursor.inserted
            if record[2] == 7 and record[4] == "Revenue Summary" and record[6] == "CF05"
        )
        self.assertEqual(revenue_cf05[7], 25.0)
        self.assertIsNone(revenue_cf05[8])
        self.assertEqual(
            json.loads(revenue_cf05[10])["value_semantics"],
            "cumulative_ytd_snapshot",
        )

        capacity_cf05 = next(
            record
            for record in self.cursor.inserted
            if record[4] == "GB Wise END Capacity" and record[6] == "CF05"
        )
        self.assertIsNone(capacity_cf05[7])
        self.assertEqual(capacity_cf05[8], 120.0)
        self.assertEqual(
            json.loads(capacity_cf05[10])["value_semantics"],
            "point_in_time",
        )

        self.assertFalse(
            any(record[5] == "Average Capacity" for record in self.cursor.inserted)
        )


if __name__ == "__main__":
    unittest.main()