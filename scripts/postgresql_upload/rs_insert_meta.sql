-------------- D B T R E E  ----------------
BEGIN;
INSERT INTO dbtree VALUES( 1000, NULL, 'Budżet centralny', 'Centralny budżet RP', 2, 2, NULL, NULL );
INSERT INTO dbtree VALUES( 1001, 1000, 'Budżet księgowy', 'Układ tradycyjny (księgowy) budżetu', 1, 1, NULL, NULL );
INSERT INTO dbtree VALUES( 1002, 1001, '2011', NULL, 0, 0, 'data_50001', TRUE );
INSERT INTO dbtree VALUES( 1003, NULL, 'NFZ', 'Dane budżetowe NFZ', 2, 2, NULL, NULL );
INSERT INTO dbtree VALUES( 1004, 1003, 'Dane zagregowane', 'Dane centrali i ośrodków wojewódzkich', 1, 1, NULL, NULL );
INSERT INTO dbtree VALUES( 1005, 1004, '2011', NULL, 0, 0, 'data_50002', TRUE );
INSERT INTO dbtree VALUES( 1006, 1003, 'Ośrodki regionalne', 'Dane ośrodków regionalnych', 1, 1, NULL, NULL );
INSERT INTO dbtree VALUES( 1007, 1006, '2011', NULL, 0, 0, 'data_50003', TRUE );
COMMIT;

------------- C O U N T E R S --------------
BEGIN;
INSERT INTO counters VALUES( 'dbtree', 1007 );
INSERT INTO counters VALUES( 'endpoints', 50003 );
INSERT INTO counters VALUES( 'data', 1000002068 );
INSERT INTO counters VALUES( 'permalinks', 75000 );
COMMIT;

------------- C O L U M N S  ---------------
BEGIN;
-- Obligatory columns for all endpoints
INSERT INTO columns VALUES( NULL, 'type', 'Typ', '@', TRUE, 'string', FALSE, FALSE );
INSERT INTO columns VALUES( NULL, 'name', 'Nazwa', '@', TRUE, 'string', TRUE, TRUE );
-- Budżet centralny > tradycyjny > 2011
INSERT INTO columns VALUES( 'data_50001', 'dot_sub', 'Dotacje i subwencje', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'swiad_fiz', 'Świadczenia na rzecz osób fizycznych', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'wyd_jednostek', 'Wydatki bieżące jednostek budżetowych', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'wyd_majatk', 'Wydatki majątkowe', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'wyd_dlug', 'Wydatki na obsługę długu Skarbu Państwa', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'wspolfin_eu', 'Współfinansowanie projektów z udziałem środków Unii Europejskiej', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'sw_eu', 'Środki własne Unii Europejskiej', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50001', 'v_total', 'Ogółem (w tys. zł.)', '# ##0', TRUE, 'number', TRUE, FALSE );
-- NFZ > Dane zagregowane > 2011
INSERT INTO columns VALUES( 'data_50002', 'centrala', 'Centrala', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'dolnosląskie', 'Dolnośląskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'kujawsko-pomorskie', 'Kujawsko-pomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'lubelskie', 'Lubelskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'lubuskie', 'Lubuskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'lodzkie', 'Łódzkie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'malopolskie', 'Małopolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'mazowieckie', 'Mazowieckie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'opolskie', 'Opolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'podkarpackie', 'Podkarpackie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'podlaskie', 'Podlaskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'pomorskie', 'Pomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'slaskie', 'Śląskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'swietokrzyskie', 'Świętokrzyskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'warminsko-mazurskie', 'Warmińsko-mazurskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'wielkopolskie', 'Wielkopolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'zachodniopomorskie', 'Zachodniopomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'osrodki_wojewodzkie', 'Ośrodki Wojewódzkie', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( 'data_50002', 'total', 'Ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
-- NFZ > Dane ośrodków regionalnych > 2011
INSERT INTO columns VALUES( 'data_50003', 'total', 'Ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
COMMIT;
