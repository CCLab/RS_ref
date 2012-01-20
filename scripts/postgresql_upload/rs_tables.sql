---------- M E T A   T A B L E S -----------

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

DROP TABLE columns;
CREATE TABLE columns (
    endpoints       text ARRAY,
    key             varchar(50),
    label           varchar(100),
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

---------- D A T A   T A B L E S -----------

-- Budżet tradycyjny 2011
DROP TABLE data_50001;
CREATE TABLE data_50001 (
    id              integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent          integer REFERENCES data_50001 ( id ),
    type            varchar(100),
    name            varchar(1000),
    dot_sub	        integer CHECK ( dot_sub	>= 0 ),
    swiad_fiz	    integer CHECK ( swiad_fiz >= 0 ),
    wyd_jednostek	integer CHECK ( wyd_jednostek >= 0 ),
    wyd_majatk	    integer CHECK ( wyd_majatk >= 0 ),
    wyd_dlug        integer CHECK ( wyd_dlug >= 0 ),
    sw_eu	        integer CHECK ( sw_eu >= 0 ),
    wspolfin_eu     integer CHECK ( wspolfin_eu >= 0 ),
    v_total	        integer CHECK ( v_total >= 0 ),
    info            text,
    ft_search       tsvector
);

-- NFZ > zagregowane > 2011
DROP TABLE data_50002;
CREATE TABLE data_50002 (
    id                  integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent              integer REFERENCES data_50002 ( id ),
    type                varchar(100),
    name                varchar(1000),
    centrala            integer CHECK ( centrala >= 0 ),
    dolnosląskie        integer CHECK ( dolnosląskie >= 0 ),
    kujawsko_pomorskie  integer CHECK ( kujawsko_pomorskie >= 0 ),
    lubelskie           integer CHECK ( lubelskie >= 0 ),
    lubuskie            integer CHECK ( lubuskie >= 0 ),
    lodzkie             integer CHECK ( lodzkie >= 0 ),
    malopolskie         integer CHECK ( malopolskie >= 0 ),
    mazowieckie         integer CHECK ( mazowieckie >= 0 ),
    opolskie            integer CHECK ( opolskie >= 0 ),
    podkarpackie        integer CHECK ( podkarpackie >= 0 ),
    podlaskie           integer CHECK ( podlaskie >= 0 ),
    pomorskie           integer CHECK ( pomorskie >= 0 ),
    slaskie             integer CHECK ( slaskie >= 0 ),
    swietokrzyskie      integer CHECK ( swietokrzyskie >= 0 ),
    warminsko_mazurskie integer CHECK ( warminsko_mazurskie >= 0 ),
    wielkopolskie       integer CHECK ( wielkopolskie >= 0 ),
    zachodniopomorskie  integer CHECK ( zachodniopomorskie >= 0 ),
    osrodki_wojewodzkie integer CHECK ( osrodki_wojewodzkie >= 0 ),
    total               integer CHECK ( total >= 0 ),
    info                text,
    ft_search           tsvector
);

-- NFZ > ośrodków > 2011
DROP TABLE data_50003;
CREATE TABLE data_50003 (
    id                  integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent              integer REFERENCES data_50003 ( id ),
    type                varchar(100),
    name                varchar(1000),
    total               integer CHECK ( total >= 0 ),
    info                text,
    ft_search           tsvector
);

-- EFRR > gminy > 2010
DROP TABLE data_50004;
CREATE TABLE data_50004 (
    id                  integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent              integer REFERENCES data_50004 ( id ),
    type                varchar(50),
    name                text,
    numer_umowy         varchar(50),
    program_operacyjny	varchar(100),
    os_priorytetowa	    varchar(50),
    dzialanie	        varchar(30),
    poddzialanie	    varchar(30),
    wartosc_ogolem	    real,
    wydatki_kwalifik	real,
    dofinansowanie	    real,
    dofinansowanie_ue	real,
    nazwa_beneficjenta	text,
    nip_beneficjenta	varchar(25),
    kod_pocztowy	    varchar(10),
    miejscowosc	        varchar(50),
    wojewodztwo	        varchar(25),
    powiat	            varchar(75),
    temat_priorytetu	text,
    forma_prawna	    text,
    obszar_realizacji	varchar(125),
    ostatni_wniosek	    varchar(30),
    projekt_zakonczony	varchar(10),
    data_podpisania	    varchar(10),
    data_utworzenia	    varchar(10),
    ft_search           tsvector
);

-- EFRR > gminy > 2011
DROP TABLE data_50005;
CREATE TABLE data_50005 (
    id                  integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent              integer REFERENCES data_50005 ( id ),
    type                varchar(50),
    name                text,
    numer_umowy         varchar(50),
    program_operacyjny	varchar(100),
    os_priorytetowa	    varchar(50),
    dzialanie	        varchar(30),
    poddzialanie	    varchar(30),
    wartosc_ogolem	    real,
    wydatki_kwalifik	real,
    dofinansowanie	    real,
    dofinansowanie_ue	real,
    nazwa_beneficjenta	text,
    nip_beneficjenta	varchar(25),
    kod_pocztowy	    varchar(10),
    miejscowosc	        varchar(50),
    wojewodztwo	        varchar(25),
    powiat	            varchar(75),
    temat_priorytetu	text,
    forma_prawna	    text,
    obszar_realizacji	varchar(125),
    ostatni_wniosek	    varchar(30),
    projekt_zakonczony	varchar(10),
    data_podpisania	    varchar(10),
    data_utworzenia	    varchar(10),
    ft_search           tsvector
);

-- Budżet tradycyjny > sprawozdanie > 2010
DROP TABLE data_50006;
CREATE TABLE data_50006 (
    id                                  integer PRIMARY KEY, -- same as UNIQUE NOT NULL
    parent                              integer REFERENCES data_50006 ( id ),
    type                                varchar(100),
    name                                text,
    grupa_paragrafow                    text,
    rodzaj_finansowania                 text,
    plan_po_zmianach                    real,
    zaangazowanie                       real,
    wykonanie_wydatkow                  real,
    zobowiazania_ogolem                 real,
    zobowiazania_w_latach_ubieglych     real,
    zobowiazania_w_roku_biezacym        real,
    wydatki_nie_wygasle                 real,
    ft_search                           tsvector
);

