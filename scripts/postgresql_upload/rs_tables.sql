---------- C R E A T E   U S E R -----------

DROP USER readonly;
CREATE USER readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

---------- M E T A   T A B L E S -----------

DROP TABLE dbtree CASCADE;
CREATE TABLE dbtree (
    id              integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent          integer REFERENCES dbtree ( id ), 
    name            varchar(1024),
    label           varchar(1024),
    description     text,
    max_depth       integer,
    min_depth       integer,
    endpoint        varchar(10) UNIQUE,
    visible         boolean DEFAULT FALSE
);

DROP TABLE columns;
CREATE TABLE columns (
    endpoints       text ARRAY,
    key             TEXT,
    label           varchar(1024),
    format          varchar(25),
    basic           boolean,
    type            varchar(25), -- should be enum/reference to types table
    processable     boolean,
    searchable      boolean
);

DROP TABLE counters;
CREATE TABLE counters (
    key             varchar(50),
    value           integer CHECK ( value >= 0 )
);

DROP TABLE p_tree;
CREATE TABLE p_tree(
    id      int unique not null,
    parents int[]
);

DROP TABLE permalinks;
CREATE TABLE permalinks(
    id       int not null,
    endpoint varchar(10),
    labels   text[],
    data     text
);

DROP TABLE users;
CREATE TABLE users(
    login       varchar(50),
    hash        varchar(50),
    collections int[]
);

---------- D A T A   T A B L E S -----------

-- Budżet tradycyjny 2011
DROP TABLE data_50001;
CREATE TABLE data_50001 (
    id              INT UNIQUE NOT NULL,
    parent          INT REFERENCES data_50001(id),
    type            TEXT,
    name            TEXT,
    v_total         BIGINT,
    leaf            BOOLEAN,
    sw_eu           BIGINT,
    swiad_fiz       BIGINT,
    wspolfin_eu     BIGINT,
    wyd_dlug        BIGINT,
    wyd_jednostek   BIGINT,
    dot_sub         BIGINT,
    info            TEXT,
    wyd_majatk      BIGINT
);

DROP TABLE data_50006;
CREATE TABLE data_50006 (
    id                  INT UNIQUE NOT NULL,
    parent              INT REFERENCES data_50006(id),
    type                TEXT,
    name                TEXT,
    plan_po_zmianach	BIGINT,
    wykonanie_wydatkow	BIGINT,
    leaf	            BOOLEAN,
    grupa_paragrafow	TEXT,
    rodzaj_finansowania_wydatkow	TEXT,
    wydatki_ktore_nie_wygasly_z_uplywem_biezacego_roku_budzetowego	BIGINT,
    zaangazowanie	    BIGINT,
    zobowiazania_ogolem	BIGINT,
    zobowiazania_wymagalne_powstale_w_latach_ubieglych	BIGINT,
    zobowiazania_wymagalne_powstale_w_roku_biezacym     BIGINT
);

