DELETE FROM permalinks;
BEGIN;
INSERT INTO permalinks VALUES( 75001, 'data_50001', '
{"Arkusz A","Arkusz B","Arkusz C"}', '[ {"type": 0, "data": { "ids": [1000000017, 1000000032, 1000000027], "sort_query": {} }, "columns": ["type", "name", "v_total", "dot_sub"], "label": "Arkusz A"}, {"type": 0, "data": { "ids": [1000000029, 1000000068], "sort_query": {} }, "columns": ["type", "name", "dot_sub"], "label": "Arkusz B"}, {"type": 0, "data": { "ids": [1000001096, 1000001054], "sort_query": {}}, "columns": ["type", "name", "sw_eu", "v_total", "dot_sub"], "label": "Arkusz C"}]' );
INSERT INTO permalinks VALUES( 75001, 'data_50006', '{"Arkusz D","Arkusz E"}', '[{"data": { "ids": [1000027627, 1000027664], "sort_query": {} }, "type": 0, "columns": ["type", "name", "plan_po_zmianach", "wykonanie_wydatkow"], "label": "Arkusz D"}, {"data": { "ids": [1000001257], "sort_query": {}}, "type": 0, "columns": ["type", "name", "wykonanie_wydatkow"], "label": "Arkusz E"}]' );
COMMIT;
