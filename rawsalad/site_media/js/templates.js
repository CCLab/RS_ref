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
    that.app_table_header =
        '<div id="app-tb-save-sheet" class="blue button left">Kopiuj do arkusza</div>' +
        '<ul id="app-tb-sheets">' +
            '{{#sheets}}' +
                '<li id="snap-{{sheet_id}}" data-end-point="{{end_id}}" data-group="{{group_id}}" class="sheet tab button' +
//                    '{{#active}}' + //TODO remove = not neaded
//                        ' active' +
//                    '{{/active}}' +
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
        '<ul class="left pl-tree-list">' +
        '</ul>';
    
    that.tree_node=
        '<li>' +
            '<div data-node="{{id}}" class="pl-tree-node-unchecked pl-tree-node">' + //TODO change classes names
            '</div>' +
            '<section class="pl-tree">' +
                '<img src="/site_media/img/corner.png" class="pl-tree-pointer" style="display: none; ">' +
                '<img src="/site_media/img/triangle.png" alt="triangle" class="pl-tree-arrow" data-node="{{id}}">' +
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
    that.app_table_tools =
        '<section>' +
            '<h3 id="app-tb-tl-title" class="left">{{name}}</h3>' +
            '<form id="app-tb-tl-rename-form" style="display: none;" class="left" >' +
                '<input type="text" class="input-text" id="app-tb-tl-rename-input" />' +
            '</form>' +
            '{{#old_name}}' +
                '<div id="app-tb-tl-old-title" class="left"> {{old_name}} </div>' +
            '{{/old_name}}' +
            '{{^old_name}}'+
                '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '{{/old_name}}' +
            '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '<div id="app-tb-tl-rename-button" class="button left">Zmień nazwę</div>' +
            '<div id="app-tb-tl-bt-container" class="right">' +
                '<div id="app-tb-tl-clear-button" class="button left">Wyczyść tabelę</div>' +
                '<div id="app-tb-tl-sort-button" class="button left">Sortuj</div>' +
                '<div id="app-tb-tl-filter-button" class="button left">Filtruj</div>' +
            '</div>' +
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
        
    that.sort_key = //TODO test it ( key_num! )
        '<tr id="sort-key-{{keys_num}}">' +
            '<td>' +
                '<select name="app-tb-tl-sort-form-columns" class="input-text key-{{keys_num}}">' +
                    '<option value="null" class="column-key-{{keys_num}}" ></option>' + 
                    '{{#columns}}' +
                        '<option value="{{column_key}}" class="column-key-{{keys_num}}"> {{column_label}} </option>' +
                    '{{/columns}}' +
                '</select>' +
            '</td>' +
            '<td>' +
                '<select name="name="app-tb-tl-sort-order" class="input-text key-{{keys_num}}">' +
                    '<option value="null" class="order-key-{{keys_num}}" ></option>' + 
                    '<option value="-1" class="order-key-{{keys_num}}" >Rosnąco</option>' + 
                    '<option value="1" class="order-key-{{keys_num}}" >Malejąco</option>' + 
                '</select>' +
            '</td>' +
         '</tr>'; 

    that.close_sheet_button = '<div class="close-sheet-button button">x</div>';


    // T A B L E
    that.standard_rows = 
        '{{#rows}}' + //TODO add info panel
          '<tr id="{{_id}}" data_open="{{is_open}}" ' +
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
    
    


    // return public interface
    return that;

})();
