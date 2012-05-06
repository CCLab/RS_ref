1. Co jest potrzebne do uploadowania danych?

Potrzebny jest plik z danymi oraz plik opisujący te dane(metadane + hierarchia).

2. W jakim formacie muszą być dostarczone dane?

Format pliku z danymi:
- plik CSV
- separatory są średnikami
- brak cytowania napisów
- kodowanie UTF-8

3. W jakim formacie musi być opis kolekcji?

Format pliku z opisem danych:
- plik w formacie JSON
- kodowanie UTF-8

Wymagane pola:
    name - skrótowa nazwa kolekcji
    description - opis kolekcji
    label - pełna nazwa kolekcji
    parents - opis kolekcji-przodków w drzewie kolekcji
    columns - opis kolumn w pliku
    hierarchy - opis hierarchii

    3.1. Format parents.
    Parents jest listą elementów zawierającą parametry opisujące przodków
    uploadowanej kolekcji. Każdy z przodków opisany jest parametrami:
    name, description oraz label.
    Kolejność przodków na liście musi być od najstarszego do najmłodszego,
    tzn. poprzedni jest bezpośrednim przodkiem następnego.

    3.2. Format columns.
    Columns jest listą obiektów opisujących kolejne kolumny w pliku z danymi.
    Kolejność na liście musi być taka sama jak w pliku CSV. Każda z kolumn jest
    opisana następującymi paramtrami (niektóre są opcjonalne):
    key - nazwa pod którą kolumna będzie reprezentowana w bazie danych
    label - nazwa kolumny widoczna dla użytkownika
    format - format, w jakim zapisane są dane w kolumnie (np. "# ##0" dla l. całkowitych)
    type - typ danych (napis - "string" lub dane liczbowe - "number")
    basic* - czy kolumna jest podstawowa
    processable* - czy kolumna może być kluczem sortowania/filtrowania
    searchable* - czy zawartość kolumny może być kluczem wyszukiwania

    * - parametry opcjonalne.
    W przypadku kolumn reprezentujących hierarchię można podać jedynie
    wartości kolumn label oraz type, pozostałym polom przypisując null, gdyż nie zostaną
    wykorzystane.

    3.3. Format hierarchy.
    Hierarchy jest listą obiektów opisujących hierarchię w danych. Pierwsze kolumny
    na liście reprezentują najwyższy poziom hierarchii, kolejne coraz niższe.
    Każdy z obiektów ma pola:
    label - nazwa kolumny
    aux - czy kolumna ma kolumnę pomocniczą
    aux_label - nazwa kolumny pomocniczej, niewymagana kiedy brak kolumny pomocniczej.

    Możliwa jest sytuacja, że kilka kolumna ma taką samą nazwę i tworzą hierarchię.
    Zostaną one brane po kolei, tzn. pierwsza napotkana w pliku będzie reprezentować
    wyższy poziom hierarchii niż następna.

4. Jak uploadować dane?

- należy wywołać skrypt poleceniem:
upload.py <plik_z_danymi> <plik_z_opisem_danych> <plik_uploadujący_do_PSQL>

Plik z danymi oraz plik z opisem danych to są pliki dostarczane przez użytkownika.
Plik uploadujący dane do PSQL jest tworzony przez skrypt, trzeba podać gdzie ma
zostać stworzony.

5. Jakie błędy są wykrywane?

    5.1. Liczniki
    Na początku sprawdzane są liczniki w bazie danych. Jeśli pojawi się niezgodność, np.
    kolumny przyporządkowane do nieistniejącego endpointu, to użytkownik będzie miał
    możliwość zdecydowania o ich usunięciu bądź pozostawieniu.

    5.2. Drzewo kolekcji
    Sprawdzane jest, czy wszystkie wymagane pola są obecne w pliku z opisem danych.

    5.3. Kolumny
    Sprawdzane jest, czy kolumny mają wymagane pola oraz czy ich typy są akceptowane.

    5.4. Hierarchia
    Sprawdzane jest, czy wszystkie kolumny z opisu hierarchii znajdują się w opisie kolumn.

6. Jakie warunki muszą spełniać dane?

a) Przede wszystkim muszą być zgodne z opisem w pliku:
   - właściwa liczba pól w każdym wierszu
   - zgodne typy danych w komórkach
b) Możliwe są puste poziomy w hierarchii, tzn. mogą być wiersze posiadające
   hierarchię A - B - C (przy hierarchii trójpoziomowej), ale także A - B - (Pusty), A - (Pusty) - C.
c) Nie mogą występować jednocześnie wiersze mające identyczne wartości w kolumnach hierarchicznych.
d) Nie mogą występować jednocześnie wiersze mające identyczne wartości w kolumnach
   hierarchicznych na wyższych poziomach z takimi, które mają identyczną hierarchię do
   pewnego poziomu, a potem puste poziomy, np.
   takie kombinacje są zbronione (1 i 2 ma wspólne A1 - B1 - C1, 1 i 3: A1 - B1)
   1) A1 - B1 - C1 - D1
   2) A1 - B1 - C1 - (Pusty)
   3) A1 - B1 - (Pusty) - (Pusty)
   ale takie są poprawne:
   1) A1 - B1 - C1 - D1
   2) A1 - B2 - C1 - (Pusty)
   3) A1 - B3 - (Pusty) - (Pusty)
   4) A1 - B1 - C2 - (Pusty)
e) Plik z danymi musi mieć na początku 1 linię nagłówku.

7. Przykładowe pliki.

Przykładowe pliki:
- new/data_show.csv
- hier/hier_show.json

Uruchomienie skryptu: upload.py new/data_show.csv hier/hier_show.json output.csv
Wygenerowany plik CSV w postaci gotowej do uploadu do PSQL będzie miał nazwę output.csv
(skrypt uploaduje te dane, zostaną one wygenerowane jako backup).

W kolekcji tej występują puste poziomy hierarchii w pewnych wierszach.

