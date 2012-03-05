// Copyright (c) 2011, Centrum Cyfrowe
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
//   * Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//   * Neither the name of the Centrum Cyfrowe nor the names of its contributors
//     may be used to endorse or promote products derived from this software
//     without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
// GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
// OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

var _templates = (function () {

// P U B L I C   I N T E R F A C E
    var that = {};

// T E M P L A T E S
    // A P P   H E A D E R
    // TODO change name to more connected with tabs
    that.app_table_header =
        '<div id="app-tb-save-sheet" class="blue button left">Kopiuj do arkusza</div>' +
        '<ul id="app-tb-sheets">' +
            '{{#sheets}}' +
                '<li id="snap-{{sheet_id}}" data-end-point="{{end_id}}" data-group="{{group_id}}" class="sheet tab button' +
                    '{{#blocked}}' +
                        'ready' +
                    '{{/blocked}}' +
                '" title="{{name}}">' +
                    '<p>' +
                    '{{name}}' +
                    '</p>' +
                    '{{#close}}' +
                        '<div class="close-sheet-button button">x</div>' +
                    '{{/close}}' +
                '</li>' +
            '{{/sheets}}' +
        '</ul>';

    // D B   T R E E
    that.tree_list =
        '<ul class="left pl-tree-list' +
            '{{#even}}' +
                ' pl-tree-list-even' +
            '{{/even}}' +
        '">' +
        '</ul><br />' +
        '{{#button}}' +
            '<div id="pl-ch-submit" class="clear blue button">{{button_name}}</div>' +
        '{{/button}}';


    that.tree_node=
        '<li>' +
            '<div data-node="{{id}}" class="pl-tree-node-unchecked pl-tree-node">' + //TODO change classes names
            '</div>' +
            '<section class="pl-tree">' +
                '<div class="pl-tree-pointer" style="display: none;"></div>' +
                '<div class="pl-tree-arrow" data-node="{{id}}"></div>' +
                '<section class="pl-tree-node-info">' +
                    '<header>' +
                        '<h3>{{name}}</h3>' +
                    '</header>' +
                    '<section class="pl-tree-node-des" style="display: block; ">' +
                        '<p>{{description}}</p>' +
                    '</section>' +
                '</section>' +
                '<section class="pl-tree-end-det" style="display: none; ">' +
                '</section>' +
            '</section>' +
        '</li>';

    that.double_end =
        '<table>' +
            '<thead>' +
                '<tr>' +
                    '<th></th>' +
                    '{{#end_names}}' +
                        '<th>{{name}}</th>' +
                    '{{/end_names}}' +
                '</tr>' +
            '</thead>' +
            '<tbody>' +
                '{{#nodes}}' +
                    '<tr>' +
                        '<td>{{name}}</td>' +
                        '{{#children}}' +
                            '<td>' +
                                '{{#end}}' +
                                    '<div data-endpoint="{{endpoint}}" class="pl-tree-end-unchecked pl-tree-end-checkbox"> </div>' +
                                '{{/end}}' +
                                '{{^end}}' +
                                    '<div class="pl-tree-end-nocheck pl-tree-end-checkbox"> </div>' +
                                '{{/end}}' +
                            '</td>' +
                        '{{/children}}' +
                    '</tr>' +
                '{{/nodes}}' +
            '</tbody>' +
        '</table>';




    // T O O L S
    // TODO split for two different placeholders and templates
    that.app_table_tools =
        '<section>' +
            '<h3 id="app-tb-tl-title" class="left">{{label}}</h3>' +
            '<form id="app-tb-tl-rename-form" style="display: none;" class="left" >' +
                '<input type="text" class="input-text" id="app-tb-tl-rename-input" />' +
            '</form>' +
            '{{#changed_label}}' +
                '<div id="app-tb-tl-old-title" class="left"> {{original_label}} </div>' +
            '{{/changed_label}}' +
            '{{^changed_label}}'+
                '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '{{/changed_label}}' +
            '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '<div id="app-tb-tl-rename-button" class="button left">Zmień nazwę</div>' +
            '<div id="app-tb-tl-bt-container" class="right">' +
                // TODO check how it works with different types of tables
                '<div id="app-tb-tl-clear-button" class="button left">Wyczyść tabelę</div>' +
                '<div id="app-tb-tl-sort-button" class="button left">Sortuj</div>' +
                '<div id="app-tb-tl-filter-button" class="button left">Filtruj</div>' +
            '</div>' +
        '</section>' +
        '<section id="app-tb-tl-srft-forms">' +
        '</section>' +
        '<section>' +
            '<div id="app-tb-tl-columns-button" class="button right">Dodaj/Usuń kolumny</div>' +
            '<br class="clear"/>' +
            '<div id="app-tb-tl-columns-list" class="right"></div>' +
        '</section>';

    that.columns_form =
        '<form id="app-tb-tl-columns-form" style="display: none;">' +
            '<div id="app-tb-tl-lt-select" class="grey button left">Zaznacz wszystkie</div>' +
            '<div id="app-tb-tl-lt-unselect" class="grey button left">Odznacz wszystkie</div>' +
            '<div id="app-tb-tl-lt-submit" class="blue button left">Dodaj/Usuń</div>' +
            '<br class="clear" />' +
            '<table>' +
                '<tbody>' +
                    '{{#columns}}' +
                        '<tr>' +
                            '<td class="columns">' +
                                '<input type="checkbox" name="app-tb-tl-columns" value="{{key}}" id="column-id-{{key}}"' +
                                    '{{#selected}}' +
                                        'checked' +
                                    '{{/selected}}' +
                                '>' +
                            '</td>' +
                            '<td class="columns">' +
                                '<label for="column-id-{{key}}">' +
                                    '{{label}}' +
                                '</label>' +
                            '</td>' +
                        '</tr>' +
                    '{{/columns}}' +
                '</tbody>' +
            '</table>' +
        '</form>';

    that.sort_form =
        '<form id="app-tb-tl-sort-form" class="sort-filter-form left">' +
            '<table>' +
                '<thead>' +
                    '<tr>' +
                        '<th>Wybierz kolumnę</th>' +
                        '<th>Wybierz porządek</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' +
                '</tbody>' +
            '</table>' +
            '<div id="app-tb-tl-sort-add" class="grey button">Dodaj kolejny klucz</div>' +
            '<div id="app-tb-tl-sort-submit" class="blue button">Sortuj</div>' +
        '</form>';

    that.sort_key =
        '<tr id="sort-key-{{keys_num}}">' +
            '<td>' +
                '<select name="app-tb-tl-sort-form-columns" class="input-text key-{{keys_num}}">' +
                    '<option value="null" class="column-key-{{keys_num}}" ></option>' +
                    '{{#columns}}' +
                        '<option value="{{key}}" class="column-key-{{keys_num}}"> {{label}} </option>' +
                    '{{/columns}}' +
                '</select>' +
            '</td>' +
            '<td>' +
                '<select name="app-tb-tl-sort-order" class="input-text key-{{keys_num}}">' +
                    '<option value="null" class="order-key-{{keys_num}}" ></option>' +
                    '<option value="gt" class="order-key-{{keys_num}}" >Rosnąco</option>' +
                    '<option value="lt" class="order-key-{{keys_num}}" >Malejąco</option>' +
                '</select>' +
            '</td>' +
         '</tr>';
     
    that.filter_form =
        '<form id="app-tb-tl-filter-form" class="sort-filter-form left">' +
            '<table>' +
                '<thead>' +
                    '<tr>' +
                        '<th>Wybierz kolumnę</th>' +
                        '<th>Wybierz operację</th>' +
                        '<th>Wpisz treść filtra</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' +
                '</tbody>' +
            '</table>' +
            '<div id="app-tb-tl-filter-add" class="grey button">Dodaj kolejny klucz</div>' +
            '<div id="app-tb-tl-filter-submit" class="blue button">Filtruj</div>' +
        '</form>';
    
    that.filter_key =
        '<tr id="filter-key-{{keys_num}}">' +
            '<td>' +
                '<select name="app-tb-tl-filter-form-columns" class="input-text key-{{keys_num}}" ' +
                 'id="filter-{{keys_num}}-columns">' +
                    '<option value="null" class="filter-column-{{keys_num}}" ></option>' +
                    '{{#columns}}' +
                        '<option value="{{key}}" class="filter-column-{{keys_num}}"> {{label}} </option>' +
                    '{{/columns}}' +
                '</select>' +
            '</td>' +
            '<td>' +
                '<select id="filter-{{keys_num}}-operations" name="null-operation" class="input-text" disabled>' +
                '</select>' +
            '</td>' +
            '<td>' +
                '<input type="text" name="query" id="filter-{{keys_num}}-query" class="input_text">'
            '</td>' +
         '</tr>';
     
    that.string_operations = 
        '<select id="filter-{{keys_num}}-operations" name="string-operation" class="input-text">' +
            '<option value="null" class="filter-operation-{{keys_num}}" selected></option>' +
            '<option value="cnt" class="filter-operation-{{keys_num}}">Zawiera</option>' +
            '<option value="st" class="filter-operation-{{keys_num}}">Zaczyna się od</option>' +
            '<option value="ncnt" class="filter-operation-{{keys_num}}">Nie zawiera</option>' +
            '<option value="nst" class="filter-operation-{{keys_num}}">Nie zaczyna się od</option>' +
        '</select>';
    
    that.number_operations = 
        '<select id="filter-{{keys_num}}-operations" name="number-operation" class="input-text">' +
            '<option value="null" class="filter-operation-{{keys_num}}" selected></option>' +
            '<option value="gt" class="filter-operation-{{keys_num}}">&gt;</option>' +
            '<option value="eq" class="filter-operation-{{keys_num}}">=</option>' +
            '<option value="lt" class="filter-operation-{{keys_num}}">&lt;</option>' +
        '</select>';
    
    that.null_operations = 
        '<select id="filter-{{keys_num}}-operations" name="null-operation" class="input-text" disabled>' +
        '</select>';

    that.close_sheet_button = '<div class="close-sheet-button button">x</div>';


    // T A B L E
    that.standard_rows =
        '{{#rows}}' + //TODO add info panel
          '<tr id="{{id}}" data-open="{{is_open}}" ' +
          'data-parent="{{parent}}" ' +
          'class="{{selected}} {{top_level}}">' +
            '{{#data}}' +
              '<td class="{{column_key}} {{column_type}} {{click}}"' +
                '{{#padding}}' +
                  'style="padding-left: {{value}}px;" ' +
                '{{/padding}} '+
              '>' +
                '{{content}}' +
              '</td>' +
            '{{/data}}' +
          '</tr>' +
        '{{/rows}}';


    that.standard_total_row =
        '<tr>' +
            '{{#total}}' +
                '<td class="{{column_key}} {{column_type}}">' +
                    '{{data}}' +
                '</td>' +
            '{{/total}}' +
        '</tr>';


    that.standard_head_row =
        '<tr>' +
            '{{#columns}}' +
                '<td class="{{key}} {{type}}">' +
                    '{{label}}' +
                '</td>' +
            '{{/columns}}' +
        '</tr>';


    that.filter_box =
        '<tr>' +
        '<td style="padding-top: 15px; background-color: #eee;" colspan="3">' +
            '{{breadcrumb}}' +
        '</td>' +
        '</tr>' +
        '{{#rows}}' +
            '<tr id="{{id}}">' +
                '{{#data}}' +
                    '<td class="{{column_key}} {{column_type}}">{{content}}</td>' +
                '{{/data}}' +
            '</tr>' +
        '{{/rows}}' +
        '</tr>';


    that.search_box =
        '<tr>' +
        '<td style="padding-top: 15px; background-color: #eee;" colspan="3">' +
            '{{breadcrumb}}' +
        '</td>' +
        '</tr>' +
        '{{#rows}}' +
            '<tr id="{{id}}">' +
                '{{#data}}' +
                    '<td style="{{#hit}} background-color: #ddddaa;{{/hit}}">{{content}}</td>' +
                '{{/data}}' +
            '</tr>' +
        '{{/rows}}' +
        '<tr>' +
            '<td>' +
                '<button id="show-breadcrumb-{{box_id}}" type="button">Pokaż rodziców</button>' +
            '</td>' +
            '<td>' +
                '<button id="show-context-{{box_id}}" type="button">Pokaż kontekst</button>' +
            '</td>' +
        '</tr>';


    that.search_box_breadcrumbed =
        '{{#breadcrumb}}' +
            '<tr>' +
                '{{#data}}' +
                    '<td>{{content}}</td>' +
                '{{/data}}' +
            '</tr>' +
        '{{/breadcrumb}}' +
        '{{#rows}}' +
            '<tr id="{{id}}">' +
                '{{#data}}' +
                    '<td style="{{#hit}} background-color: #ddddaa;{{/hit}}">{{content}}</td>' +
                '{{/data}}' +
            '</tr>' +
        '{{/rows}}' +
        '<button id="show-breadcrumb-{{box_id}}" type="button">Pokaż breadcrumb</button>' +
        '<button id="show-context-{{box_id}}" type="button">Pokaż kontekst</button>';
    
    // return public interface
    return that;

})();
