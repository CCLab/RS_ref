DROP TABLE dbtree CASCADE;
CREATE TABLE dbtree (
    id              integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent          integer REFERENCES dbtree ( id ), 
    name            varchar(100),
    label           varchar(100),
    description     text,
    max_depth       integer,
    min_depth       integer,
    endpoint        varchar(10) UNIQUE,
    visible         boolean DEFAULT FALSE
);

BEGIN;
INSERT INTO dbtree VALUES( 1000, NULL, 'Budżet centralny', NULL, 'Centralny budżet RP', 3, 2, NULL, TRUE );
INSERT INTO dbtree VALUES( 1001, 1000, 'Budżet księgowy', NULL, 'Układ tradycyjny (księgowy) budżetu', 2, 2, NULL, TRUE );
INSERT INTO dbtree VALUES( 1002, 1001, 'Ustawa budżetowa', NULL, 'Treść ustawy budżetowej', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1003, 1002, '2011', 'Budżet księgowy 2011', NULL, 0, 0, 'data_50001', TRUE );
INSERT INTO dbtree VALUES( 1004, 1001, 'Sprawozdanie', NULL, 'Sprawozdanie części wydatkowej', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1005, 1004, '2010', 'Wykonanie wydatków budżetu 2010', NULL, 0, 0, 'data_50006', TRUE );
INSERT INTO dbtree VALUES( 1006, 1000, 'Budżet zadaniowy', NULL, 'Układ zadaniowy budżetu', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1007, 1006, '2011', 'Budżet zadaniowy 2011', NULL, 0, 0, 'data_50001', TRUE );
INSERT INTO dbtree VALUES( 1008, NULL, 'NFZ', NULL, 'Dane budżetowe NFZ', 2, 2, NULL, TRUE );
INSERT INTO dbtree VALUES( 1009, 1008, 'Dane zagregowane', NULL, 'Dane centrali i ośrodków wojewódzkich', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1010, 1009, '2011', 'Budżet NFZ 2011', NULL, 0, 0, 'data_50002', TRUE );
INSERT INTO dbtree VALUES( 1011, 1008, 'Ośrodki regionalne', NULL, 'Dane ośrodków regionalnych', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1012, 1011, '2011', 'Budżet ośrodków regionalnych NFZ 2011', NULL, 0, 0, 'data_50003', TRUE );
INSERT INTO dbtree VALUES( 1013, NULL, 'EFRR', NULL, 'Projekty Europejskiego Funduszu Rozwoju Regionalnego', 2, 2, NULL, TRUE );
INSERT INTO dbtree VALUES( 1014, 1013, 'Projekty gminne', NULL, 'Projekty realizowane na szczelu gminnym', 1, 1, NULL, TRUE );
INSERT INTO dbtree VALUES( 1015, 1014, '2010', 'Projekty gminne EFRR 2010', NULL, 0, 0, 'data_50004', TRUE );
INSERT INTO dbtree VALUES( 1016, 1014, '2011', 'Projekty gminne EFRR 2011', NULL, 0, 0, 'data_50005', TRUE );
COMMIT;

