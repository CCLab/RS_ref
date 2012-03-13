DROP TABLE hierarchy CASCADE;
CREATE TABLE hierarchy (
    endpoint        varchar(20),
    nr              integer,
    label           varchar(100),
    aux             boolean DEFAULT FALSE,
    aux_label       varchar(100),
    PRIMARY KEY (endpoint, nr)
);

DELETE FROM hierarchy;
BEGIN;
INSERT INTO hierarchy VALUES( 'data_50001', 1,  'Część', TRUE, 'Numer części');
INSERT INTO hierarchy VALUES( 'data_50001', 2,  'Część', TRUE, 'Numer części');
INSERT INTO hierarchy VALUES( 'data_50001', 3,  'Dział', TRUE, 'Numer działu');
INSERT INTO hierarchy VALUES( 'data_50001', 4,  'Rozdział', TRUE, 'Numer rozdziału');
COMMIT;
