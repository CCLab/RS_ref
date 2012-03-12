-------------- D B T R E E  ----------------
DELETE FROM dbtree;
BEGIN;
INSERT INTO dbtree VALUES( 1000, NULL, 'Budżet centralny', NULL, 'Centralny budżet RP', 4, 3, NULL, TRUE );
INSERT INTO dbtree VALUES( 1001, 1000, 'Budżet księgowy', NULL, 'Układ tradycyjny (księgowy) budżetu', 3, 3, NULL, TRUE );
INSERT INTO dbtree VALUES( 1002, 1001, 'Ustawa budżetowa', NULL, 'Treść ustawy budżetowej', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1003, 1002, '2011', 'Budżet księgowy 2011', NULL, 0, 0, 'data_50001', TRUE );
INSERT INTO dbtree VALUES( 1004, 1001, 'Sprawozdanie budżetowe', NULL, 'Sprawozdanie części wydatkowej', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1005, 1004, '2010', 'Wykonanie wydatków budżetu 2010', NULL, 0, 0, 'data_50006', TRUE );
COMMIT;


