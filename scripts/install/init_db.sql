/*

This file initiates database. Creates all needed tables, except for tables with data
which will be created after uploading data. Then some of them are initiated with
obligatory values:
* columns type and name
* counters with start values
* admin user with default password: 'admin' (change it!)

In the end, readonly user is created.
*/

DROP TABLE IF EXISTS dbtree CASCADE;
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

DROP TABLE IF EXISTS columns;
CREATE TABLE columns (
    endpoints       text ARRAY,
    key             TEXT,
    label           varchar(100),
    format          varchar(25),
    basic           boolean,
    type            varchar(25), -- should be enum/reference to types table
    processable     boolean,
    searchable      boolean
);

DROP TABLE IF EXISTS hierarchy CASCADE;
CREATE TABLE hierarchy (
    endpoint        varchar(20),
    nr              integer,
    label           varchar(100),
    aux             boolean DEFAULT FALSE,
    aux_label       varchar(100),
    PRIMARY KEY (endpoint, nr)
);

DROP TABLE IF EXISTS counters;
CREATE TABLE counters (
    key             varchar(50),
    value           integer CHECK ( value >= 0 )
);

DROP TABLE IF EXISTS p_tree;
CREATE TABLE p_tree(
    id      int unique not null,
    parents int[]
);

DROP TABLE IF EXISTS permalinks;
CREATE TABLE permalinks(
    id       int not null,
    endpoint varchar(10),
    labels   text[],
    data     text
);

DROP TABLE IF EXISTS users;
CREATE TABLE users(
    login       varchar(50),
    hash        varchar(50),
    collections int[]
);

-- INIT TABLES

BEGIN;
-- Obligatory columns for all endpoints
INSERT INTO columns VALUES( NULL, 'type', 'Typ', '@', TRUE, 'string', FALSE, FALSE );
INSERT INTO columns VALUES( NULL, 'name', 'Nazwa', '@', TRUE, 'string', TRUE, TRUE );
COMMIT;

BEGIN;
INSERT INTO counters VALUES( 'dbtree', 1000 );
INSERT INTO counters VALUES( 'endpoints', 50000 );
INSERT INTO counters VALUES( 'data', 1000000000 );
INSERT INTO counters VALUES( 'permalinks', 75000 );
COMMIT;

REVOKE ALL PRIVILEGES ON TABLE p_tree,counters,hierarchy,columns,dbtree,users,data_50001,permalinks FROM "readonly";
DROP USER IF EXISTS readonly;
CREATE USER readonly WITH PASSWORD 'readonly';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

