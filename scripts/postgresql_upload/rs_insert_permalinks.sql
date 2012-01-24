DELETE FROM permalinks;
BEGIN;
INSERT INTO permalinks VALUES( 75001, 'data_50001', '{"Arkusz A","Arkusz B","Arkusz C"}', '[{"type": 0, "data": [1000000016, 1000000018, 1000000021], "columns": ["type", "name", "v_total", "dot_sub"], "label": "Arkusz A"}, {"type": 0, "data": [1000000021, 1000000022], "columns": ["type", "name", "dot_sub"], "label": "Arkusz B"}, {"type": 0, "data": [1000001116, 1000001009], "columns": ["type", "name", "sw_eu", "v_total", "dot_sub"], "label": "Arkusz C"}]' );
INSERT INTO permalinks VALUES( 75001, 'data_50006', '{"Arkusz D","Arkusz E"}', '[{"data": [1000040589, 1000040596], "type": 0, "columns": ["type", "name", "plan_po_zmianach", "wykonanie_wydatkow"], "label": "Arkusz D"}, {"data": [1000040610], "type": 0, "columns": ["type", "name", "wykonanie_wydatkow"], "label": "Arkusz E"}]' );
COMMIT;
