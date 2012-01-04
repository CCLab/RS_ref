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
INSERT INTO dbtree VALUES( 1008, NULL, 'EFRR', 'Projekty Europejskiego Funduszu Rozwoju Regionalnego', 2, 2, NULL, NULL );
INSERT INTO dbtree VALUES( 1009, 1008, 'Projekty gminne', 'Projekty realizowane na szczelu gminnym', 1, 1, NULL, NULL );
INSERT INTO dbtree VALUES( 1010, 1009, '2010', NULL, 0, 0, 'data_50004', TRUE );
INSERT INTO dbtree VALUES( 1011, 1009, '2011', NULL, 0, 0, 'data_50005', TRUE );
INSERT INTO dbtree VALUES( 1012, 1000, 'Sprawozdanie', 'Sprawozdanie części wydatkowej', 1, 1, NULL, NULL );
INSERT INTO dbtree VALUES( 1013, 1012, '2010', NULL, 0, 0, 'data_50006', TRUE );
COMMIT;

------------- C O U N T E R S --------------
BEGIN;
INSERT INTO counters VALUES( 'dbtree', 1013 );
INSERT INTO counters VALUES( 'endpoints', 50006 );
INSERT INTO counters VALUES( 'data', 1000025966 );
INSERT INTO counters VALUES( 'permalinks', 75000 );
COMMIT;

------------- C O L U M N S  ---------------
BEGIN;
-- Obligatory columns for all endpoints
INSERT INTO columns VALUES( NULL, 'type', 'Typ', '@', TRUE, 'string', FALSE, FALSE );
INSERT INTO columns VALUES( NULL, 'name', 'Nazwa', '@', TRUE, 'string', TRUE, TRUE );
-- Budżet centralny > tradycyjny > 2011
INSERT INTO columns VALUES( '{"data_50001"}', 'dot_sub', 'Dotacje i subwencje', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'swiad_fiz', 'Świadczenia na rzecz osób fizycznych', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'wyd_jednostek', 'Wydatki bieżące jednostek budżetowych', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'wyd_majatk', 'Wydatki majątkowe', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'wyd_dlug', 'Wydatki na obsługę długu Skarbu Państwa', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'wspolfin_eu', 'Współfinansowanie projektów z udziałem środków Unii Europejskiej', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'sw_eu', 'Środki własne Unii Europejskiej', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50001"}', 'v_total', 'Ogółem (w tys. zł.)', '# ##0', TRUE, 'number', TRUE, FALSE );
-- NFZ > Dane zagregowane > 2011
INSERT INTO columns VALUES( '{"data_50002"}', 'centrala', 'Centrala', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'dolnosląskie', 'Dolnośląskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'kujawsko_pomorskie', 'Kujawsko-pomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'lubelskie', 'Lubelskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'lubuskie', 'Lubuskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'lodzkie', 'Łódzkie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'malopolskie', 'Małopolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'mazowieckie', 'Mazowieckie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'opolskie', 'Opolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'podkarpackie', 'Podkarpackie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'podlaskie', 'Podlaskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'pomorskie', 'Pomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'slaskie', 'Śląskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'swietokrzyskie', 'Świętokrzyskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'warminsko_mazurskie', 'Warmińsko-mazurskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'wielkopolskie', 'Wielkopolskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'zachodniopomorskie', 'Zachodniopomorskie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002"}', 'osrodki_wojewodzkie', 'Ośrodki Wojewódzkie', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50002", "data_50003"}', 'total', 'Ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
-- NFZ > Dane ośrodków regionalnych > 2011
-- INSERT INTO columns VALUES( 'data_50003', 'total', 'Ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
-- EFRR > Dane gminne > 2010
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'numer_umowy', 'Numer umowy/decyzji', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'program_operacyjny', 'Program Operacyjny <Nazwa>', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'os_priorytetowa', 'Oś priorytetowa <Kod>', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'dzialanie','Działanie <Kod>', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'poddzialanie','Poddziałanie <Kod>', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'wartosc_ogolem','Wartość ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'wydatki_kwalifik','Wydatki kwalifikowalne', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'dofinansowanie','Dofinansowanie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'dofinansowanie_ue','Dofinansowanie UE', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'nazwa_beneficjenta','Nazwa beneficjenta', '@', TRUE, 'string', TRUE, TRUE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'nip_beneficjenta','NIP beneficjenta', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'kod_pocztowy','Kod pocztowy', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'miejscowosc','Miejscowość', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'wojewodztwo','Województwo', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'powiat', 'Powiat', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'temat_priorytetu', 'Temat priorytetu', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'forma_prawna', 'Forma prawna', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'obszar_realizacji', 'Obszar realizacji', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'ostatni_wniosek', 'Ostatni Wniosek o płatność dla najbardziej aktualnej Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'projekt_zakonczony', 'Projekt zakończony (Wniosek o płatność końcową)', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'data_podpisania', 'Data podpisania Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50004", "data_50005"}', 'data_utworzenia', 'Data utworzenia w KSI SIMIK 07-13 Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
-- EFRR > Dane gminne > 2011
--INSERT INTO columns VALUES( 'data_50005', 'numer_umowy', 'Numer umowy/decyzji', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'program_operacyjny', 'Program Operacyjny <Nazwa>', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'os_priorytetowa', 'Oś priorytetowa <Kod>', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'dzialanie','Działanie <Kod>', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'poddzialanie','Poddziałanie <Kod>', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'wartosc_ogolem','Wartość ogółem', '# ##0', TRUE, 'number', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'wydatki_kwalifik','Wydatki kwalifikowalne', '# ##0', FALSE, 'number', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'dofinansowanie','Dofinansowanie', '# ##0', FALSE, 'number', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'dofinansowanie_ue','Dofinansowanie UE', '# ##0', FALSE, 'number', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'nazwa_beneficjenta','Nazwa beneficjenta', '@', TRUE, 'string', TRUE, TRUE );
--INSERT INTO columns VALUES( 'data_50005', 'nip_beneficjenta','NIP beneficjenta', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'kod_pocztowy','Kod pocztowy', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'miejscowosc','Miejscowość', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'wojewodztwo','Województwo', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'powiat', 'Powiat', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'temat_priorytetu', 'Temat priorytetu', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'forma_prawna', 'Forma prawna', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'obszar_realizacji', 'Obszar realizacji', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'ostatni_wniosek', 'Ostatni Wniosek o płatność dla najbardziej aktualnej Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'projekt_zakonczony', 'Projekt zakończony (Wniosek o płatność końcową)', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'data_podpisania', 'Data podpisania Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
--INSERT INTO columns VALUES( 'data_50005', 'data_utworzenia', 'Data utworzenia w KSI SIMIK 07-13 Umowy/Aneksu', '@', FALSE, 'string', TRUE, FALSE );
-- Budżet centralny > sprawozdanie > 2010
INSERT INTO columns VALUES( '{"data_50006"}', 'grupa_paragrafow', 'Grupa paragrafów', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'rodzaj_finansowania', 'Rodzaj finansowania wydatków', '@', FALSE, 'string', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'plan_po_zmianach', 'Plan po zmianach', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'zaangazowanie', 'Zaangażowanie', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'wykonanie_wydatkow', 'Wykonanie wydatków', '# ##0', TRUE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'zobowiazania_ogolem', 'Zobowiązania ogółem', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'zobowiazania_w_latach_ubieglych', 'Zobowiązania wymagalne powstałe w latach ubiegłych', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'zobowiazania_w_roku_biezacym', 'Zobowiązania wymagalne powstałe w roku bieżącym', '# ##0', FALSE, 'number', TRUE, FALSE );
INSERT INTO columns VALUES( '{"data_50006"}', 'wydatki_nie_wygasle', 'Wydatki które nie wygasły z upływem bieżącego roku budżetowego', '# ##0', FALSE, 'number', TRUE, FALSE );
COMMIT;
