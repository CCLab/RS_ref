DELETE FROM permalinks;
BEGIN;
INSERT INTO permalinks VALUES( 75001, 'data_50001', '{"Arkusz A","Arkusz B","Arkusz C"}', '[{"type": 0, "data": [1000000017, 1000000032, 1000000027], "columns": ["type", "name", "v_total", "dot_sub"], "label": "Arkusz A"}, {"type": 0, "data": [1000000029, 1000000068], "columns": ["type", "name", "dot_sub"], "label": "Arkusz B"}, {"type": 0, "data": [1000001096, 1000001054], "columns": ["type", "name", "sw_eu", "v_total", "dot_sub"], "label": "Arkusz C"}]' );
INSERT INTO permalinks VALUES( 75001, 'data_50006', '{"Arkusz D","Arkusz E"}', '[{"data": [1000027627, 1000027664], "type": 0, "columns": ["type", "name", "plan_po_zmianach", "wykonanie_wydatkow"], "label": "Arkusz D"}, {"data": [1000001257], "type": 0, "columns": ["type", "name", "wykonanie_wydatkow"], "label": "Arkusz E"}]' );
COMMIT;
