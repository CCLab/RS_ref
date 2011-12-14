/*

Monkey is a very simple library used for creating and traversing tree,
like an agile monkey.

Form of created tree:
-- creates new root node without value
-- all tree nodes are objects
-- children nodes are in a 'children' parameter
-- parent node is in 'parent' parameter
-- id is in 'id' parameter
-- is filtered is in 'filtered' parameter
-- data in node is in other parameters
-- fields 'filtered' and 'children' cannot be used as nodes parameters

*/

(function(global) {
    var __version = 0.2;
    var monkey = {};
    
    ///////////////////////////////////////////////////////////////////////////
    //                           TREE CREATION                               //
    ///////////////////////////////////////////////////////////////////////////
    
    // Creates a new tree and copies data in it. Initial data is not changed.
    // Uses idColumn to define hierarchy.
    // Returns new tree.
    monkey.createTree = function(data, idColumn, parentColumn) {
        var newTree;
        
        assertList(data, 'createTree');
        assertString(idColumn, 'createTree');
        
        newTree = new Tree(idColumn, parentColumn);
        
        data.forEach(function (newNode) {
            newTree.insertNode(newNode);
        });
        
        return newTree;
    };
    
    // Creates new tree. IdColumn is name of attribute with id of node,
    // parentColumn is optional, it is name of attribute specifying parent node.
    var Tree = function(idColumn, parentColumn) {
        var root = function() {
            return rootNode;
        };
        var isRoot = function(elem) {
            var id;
            
            if (!elem) return false;
            id = (isIdType(elem)) ? elem : elem.id;
            
            return id === root().id;
        };
        var rootNode;
        var rootData = {};
        var idColumn = idColumn || 'id';
        var idMap = {};
        
        rootData = {};
        rootData[idColumn] = '__root__';
        rootNode = new Node(rootData, undefined, idMap, idColumn, parentColumn);
        
        return {
            // Inserts value into this tree. Finds direct parent of a new node
            // by comparing id. If such node is not in tree, does not insert node.
            // If new node should be inserted in place where exists removed node,
            // then removed node is replaced with the new node.
            // Returns tree after operation.
            insertNode: function(value, isFiltered) {
                var id = value[idColumn];
                var parentId;
                var parentNode;
                var newNode;
                var isFiltered = isFiltered || false;
                
                parentId = (!!parentColumn) ? value[parentColumn] : getParentId(id);
                if (parentId === '')    parentId = '__root__';
                parentNode = this.getNode(parentId);
                if (!parentNode) return this;        
                
                newNode = new Node(value, parentNode, idMap, idColumn, parentColumn, isFiltered);
                parentNode.children.add(newNode, idMap);
                
                return this;
            },
            
            // Removes node and all his descendants from this tree. Will not remove the root node.
            // Returns tree after node removal.
            removeNode: function(elem) {
                var parentNode;
                var childNodes;
                var node;
                
                isIdType(elem) ? assertId(elem, 'removeNode') : assertNodeInTree(this, this.nodeId(elem), false, 'removeNode');
                
                parentNode = this.parent(elem);
                if (!parentNode) return this;
                
                node = isIdType(elem) ? this.getNode(elem) : elem;
                parentNode.children.remove(node.id);
                
                return this;
            },
            
            // Finds node with specified id and returns it.
            // If copy is set to false(default value), reference is returned, otherwise
            // returns copy of parent without tree hierarchy info(parent and children).
            // If node is not in the tree, undefined will be returned.
            getNode: function(id, copy) {    
                var node;
                var realId;
                var copy = copy || false;

                assertId(id, 'getNode');
                
                if (id === '__root__') return root();
                
                realId = idMap[id];
                if (!realId) return undefined;
                
                node = root();
                while (!!node && node.id !== id) {
                    node = getChild(node, realId, idMap);
                }
                
                if (!!node)
                    return (copy) ? this.value(node) : node;
                else
                    return undefined;
            },
            
            // Returns parent node of element which is a node or a node's id.
            // If copy is set to false(default value), reference is returned, otherwise
            // returns copy of parent without tree hierarchy info(parent and children).
            parent: function(elem, copy) {
                var node;
                var copy = copy || false;
                
                if (isIdType(elem)) {
                    assertId(elem, 'parent');
                    
                    node = this.getNode(elem);
                } else {
                    assertNode(elem);
                    
                    node = elem;
                }
                
                if (!!node)
                    return (copy) ? this.value(node.parent) : node.parent;
                else
                    return undefined;
            },
            
            // Returns the root node of this tree.
            root: function() {
                return rootNode;
            },
            
            // Checks if elem(node or node's id) specifies the root node of this tree.
            isRoot: function(elem) {
                var id = (isIdType(elem)) ? elem : this.nodeId(elem);
                
                return id === this.nodeId( root() );
            },
            
            // Returns true if node didn't pass filtration, otherwise false.
            isNodeFiltered: function(elem) {
                var node;
                
                isIdType(elem) ? assertId(elem, 'isNodeFiltered') :
                                 assertNode(elem, idColumn, 'isNodeFiltered');
                
                node = isIdType(elem) ? this.getNode(elem, false) : elem;
                
                return (!!node) ? node['filtered'] : false;
            },
            
            // Checks if ancestorNode is an ancestor of childNode.
            // Returns true if yes, otherwise false.
            isAncestor: function(ancestorNode, childNode) {
                var parentNode;
                
                assertNode(ancestorNode, idColumn, 'isAncestor');
                assertNode(childNode, idColumn, 'isAncestor');
                
                if (isRoot(ancestorNode)) {
                    return !isRoot(childNode);
                }
                else if (isRoot(childNode)) {
                    return false;
                }
                
                parentNode = this.parent(childNode);
                while (!isRoot(parentNode)) {
                    if (this.nodeId(ancestorNode) === this.nodeId(parentNode)) return true;
                    parentNode = this.parent(parentNode);
                }
                
                return false;
            },
            
            // Returns left sibling of node specified by elem(node or its id).
            // If the node has no left sibling, return undefined.
            // If copy is set to false(default value), reference is returned, otherwise
            // returns copy of left sibling node without tree hierarchy info(parent and children).
            leftSibling: function(elem, copy) {
                var siblingsNodes;
                var i;
                var last;
                var id;
                var copy = copy || false;
                
                isIdType(elem) ? assertId(elem, 'leftSibling') : assertNodeInTree(this, this.nodeId(elem), false, 'leftSibling');
                
                if (isRoot(elem)) return undefined;
                
                id = isIdType(elem) ? elem : this.nodeId(elem);
                parentNode = this.parent(elem);
                if (!parentNode) return undefined;
                
                siblingsNodes = this.children(parentNode);
                last = siblingsNodes.length;
                for (i = 1; i < last; ++i) {
                    if (this.nodeId(siblingsNodes[i]) === id) {
                        if (copy) {
                            return this.value(siblingsNodes[i - 1]);
                        } else {
                            return siblingsNodes[i - 1];
                        }
                    }
                }
                
                return undefined;
            },
            
            // Returns right sibling of node specified by elem(node or its id).
            // If the node has no right sibling, return undefined.
            // If copy is set to false(default value), reference is returned, otherwise
            // returns copy of right sibling node without tree hierarchy info(parent and children).
            rightSibling: function(elem, copy) {
                var parentNode;
                var siblingsNodes;
                var i;
                var nextToLast;
                var id;
                var copy = copy || false;
                
                isIdType(elem) ? assertId(elem, 'leftSibling') : assertNodeInTree(this, this.nodeId(elem), false, 'leftSibling');
                
                if ( isRoot(elem) ) return undefined;
                
                id = isIdType(elem) ? elem : this.nodeId(elem);
                parentNode = this.parent(elem);
                if (!parentNode) return undefined;
                
                siblingsNodes = this.children(parentNode);
                nextToLast = siblingsNodes.length - 1;
                for (i = 0; i < nextToLast; ++i) {
                    if (this.nodeId(siblingsNodes[i]) === id) {
                        if (copy) {
                            return this.value(siblingsNodes[i + 1]);
                        } else {
                            return siblingsNodes[i + 1];
                        }
                    }
                }
                
                return undefined;
            },
            
            // Returns sibling of node specified by elem(node or its id),
            // sibling is specified by number which is number of it on
            // his parent's list. If such a node can not be found, returns undefined.
            // If copy is set to false(default value), reference is returned, otherwise
            // returns copy of sibling node without tree hierarchy info(parent and children).
            sibling: function(elem, siblingNr, copy) {
                var siblingsNodes;
                var copy = copy || false;
                var parentNode;
                
                isIdType(elem) ? assertId(elem, 'sibling') : assertNodeInTree(this, this.nodeId(elem), false, 'sibling');
                assertNumber(siblingNr, 'sibling');
                
                if ( isRoot(elem) ) return (siblingNr === 0) ? root() : undefined;
                
                parentNode = this.parent(elem);
                if (!parentNode) return undefined;
                
                siblingsNodes = this.children(this.parent(elem));
                
                if (0 <= siblingNr && siblingNr < siblingsNodes.length) {
                    if (copy) {
                        return this.value(siblingsNodes[siblingNr]);
                    } else {
                        return siblingsNodes[siblingNr];
                    }
                } else {
                    return undefined;
                }
            },
            
            // Returns children nodes of a node specified by elem(node or its id).
            // If copy is set to false(default value), references are returned, otherwise
            // returns copies of nodes, each copy without tree hierarchy info(parent and children).
            children: function(elem, copy) {
                var node;
                var copy = !!copy || false;
                
                isIdType(elem) ? assertId(elem, 'children') : assertNode(this, this.nodeId(elem), false, 'children');
                
                node = isIdType(elem) ? this.getNode(elem) : elem;
                
                if (copy) {
                    return (!!node) ? node.children.get().map(function(childNode) {
                                          return deepCopy(childNode, idColumn, parentColumn);
                                      }) : [];
                } else {
                    return (!!node) ? node.children.get() : [];
                }
            },
            
            // Return subtree which root is node specified by elem(node or its id).
            // If copy is set to false(default value), reference is returned, otherwise
            // returns new tree with nodes from subtree and changed ids.
            subtree: function(elem, copy) {
                var copySubtree = function(srcTree, dstTree, node) {
                    dstTree.insertNode(srcTree.value(node), node['filtered']);
                    
                    srcTree.children(node).forEach( function(childNode) {
                        copySubtree(srcTree, dstTree, childNode);
                    });
                    
                    // must be done after inserting his children
                    if (srcTree.isNodeFiltered(node)) {
                        node.filtered = true;
                    }
                };
                
                var copy = copy || false;
                var newTree;
                var subtreeNode;
                
                isIdType(elem) ? assertId(elem, 'subtree') : assertNodeInTree(this, this.nodeId(elem), false, 'subtree');
                subtreeNode = isIdType(elem) ? this.getNode(elem) : elem;
                
                if (!subtreeNode) return undefined;
                
                if (!copy) {
                    return subtreeNode;
                } else {
                    newTree = new Tree(idColumn, parentColumn);
                    copySubtree(this, newTree, subtreeNode);
                    
                    return newTree;
                }
            },
            
            // Returns value of node specified by elem(node or its id).
            value: function(elem) {
                var valueCopy;
                var node;
                
                isIdType(elem) ? assertId(elem, 'value') : assertNodeInTree(this, this.nodeId(elem), false, 'value');
                
                node = isIdType(elem) ? this.getNode(elem) : elem;
                
                if (!node) return undefined;

                valueCopy = deepCopy(node, idColumn, parentColumn);
                
                return valueCopy;
            },
            
            // Returns next node of node specified by elem(node or its id). Next node is chosen
            // according to parent-left-right traversing direction. If it is the last node,
            // returns undefined. 
            next: function(elem) {
                var getNextNode = function(tree, elem) {
                    var childNodes;
                    var rightSiblingNode;
                    var ancestorNode;
                    
                    childNodes = tree.children(elem);
                    if (childNodes.length) return childNodes[0];
                    
                    rightSiblingNode = tree.rightSibling(elem);
                    if ( !!rightSiblingNode ) return rightSiblingNode;
                    
                    if ( isRoot(elem) ) return undefined;
                    
                    ancestorNode = tree.parent(elem);
                    while ( !!ancestorNode && !isRoot(ancestorNode) ) {
                        rightSiblingNode = tree.rightSibling(ancestorNode);
                        if ( !!rightSiblingNode ) return rightSiblingNode;
                        ancestorNode = tree.parent(ancestorNode);
                    }
                    
                    return undefined;
                };
                var nextNode;
                
                isIdType(elem) ? assertId(elem, 'next') : assertNode(this, this.nodeId(elem), false, 'next');
                
                nextNode = getNextNode(this, elem);
                
                return nextNode;
            },
            
            // Iterates this tree and calls fun function for each node,
            // function gets one argument: actual node. Returns the tree.
            forEach: function(fun) {
                var nextNode = this.next(root());
                var copiedNode;
                
                while (!!nextNode) {
                    fun(nextNode);
                    nextNode = this.next(nextNode);
                }
                
                return this;
            },
            
            // Equivalent of map for lists. Creates new tree and inserts into it nodes
            // that are results of passed function fun, which gets actual node as argument.
            // Returns new tree.
            map: function(fun) {
                var nextNode = this.next(root());
                var copiedNode;
                var modifiedNode;
                var copiedTree = new Tree(idColumn, parentColumn);
                
                while (!!nextNode) {
                    copiedNode = deepCopy(nextNode, idColumn, parentColumn);
                    modifiedNode = fun(copiedNode);
                    copiedTree.insertNode(modifiedNode, modifiedNode['filtered']);
                    nextNode = this.next(nextNode);
                }
                
                return copiedTree;
            },
            
            // Returns new tree with filtered nodes.
            filter: function(fun) {
                var nextNode = this.next(root());
                var copiedNode;
                var copiedTree = new Tree(idColumn, parentColumn);
                var isFiltered;
                
                while (!!nextNode) {
                    copiedNode = deepCopy(nextNode, idColumn, parentColumn);
                    isFiltered = !fun(copiedNode);
                    copiedTree.insertNode(copiedNode, !!isFiltered);
                    nextNode = this.next(nextNode);
                }
                
                return copiedTree;
            },
            
            // Returns number of nodes in subtree with root specified by elem(node or its id).
            countSubtree: function(elem) {
                var elem = elem || root();
                var subtreeRoot;
                var counter;
                var nextNode;
                
                isIdType(elem) ? assertId(elem, 'countSubtree') : assertNodeInTree(this, this.nodeId(elem), false, 'countSubtree');
                
                subtreeRoot = isIdType(elem) ? this.getNode(elem) : elem;
                if (!subtreeRoot) return 0;
                
                counter = isRoot(subtreeRoot) ? 0 : 1;
                nextNode = this.next(subtreeRoot);
                
                while (!!nextNode && this.isAncestor(subtreeRoot, nextNode)) {
                    counter += 1;
                    nextNode = this.next(nextNode);
                }
                
                return counter;
            },
            
            // Returns number of nodes on level of elem(node or its id).
            countLevel: function(elem) {
                var siblings;
                var parentNode;
                
                isIdType(elem) ? assertId(elem, 'countLevel') :
                                 assertNodeInTree(this, this.nodeId(elem), false, 'countLevel');

                if (isRoot(elem)) return 0;
                
                parentNode = this.parent(elem);
                if (!parentNode) return 0;
                siblings = this.children(parentNode);
                
                return siblings.length;
            },
            
            // Returns id of a node.
            nodeId: function(node) {
                return node.id;
            },
            
            // Returns copied tree.
            copy: function() {
                return new monkey.createTree(this.toList(), idColumn, parentColumn);
            },
            
            // Copies nodes' values(no hierarchy information) from this tree to
            // a list in order specified by next function.
            // Returns created list.
            toList: function() {
                var saveInList = function(node) {
                    if (!node['filtered'])
                        list.push(nodeToValue(node, idColumn, parentColumn));
                };
                
                var list = [];
                
                this.forEach(saveInList);
                
                return list;
            }
        
        };
    };
    
    // Creates new node in tree. Value will be inserted, parentNode will be parent
    // of new node, idMap is map: userId -> innerId, idColumn specifies id,
    // parentNode(optional) is id of node's parent, isFiltered specifies
    // if node is filtered.
    var Node = function(value, parentNode, idMap, idColumn, parentColumn, isFiltered) {
        var property;
        var valueCopy = deepCopy(value, idColumn, parentColumn);
        
        var _id = valueCopy[idColumn];
        var _parent = parentNode;
        var _filtered = isFiltered;
        var _children = new Children(_id, idMap);
        
        Object.defineProperty(this, 'parent', {
            get: function() { return _parent; }
        });
        Object.defineProperty(this, 'children', {
            get: function() { return _children; }
        });
        Object.defineProperty(this, 'filtered', {
            get: function() { return _filtered; }
            ,set: function(newValue) { _filtered = !!newValue; }
        });
        Object.defineProperty(this, 'id', {
            get: function() { return _id; },
            set: function(newValue) {
                if (!idMap[newValue]) {
                    idMap[newValue] = idMap[_id];
                    delete idMap[_id];
                    _id = newValue;
                }
            }
        });
        
        for (property in valueCopy) {
            if (valueCopy.hasOwnProperty(property) && property !== 'parent' &&
                property !== 'children' && property !== 'id' && property !== 'filtered') {
                    this[property] = valueCopy[property];
            }
        }
        
        if (!!parentNode) {
            parentNode.children.add(this, idMap);
        } else {
            idMap['__root__'] = '';
        }
    };
    
    // Children wraps list of children nodes.
    // parentId is userId of parent node, idMap is map: userId -> innerId,
    // data is list of children nodes.
    var Children = function(parentId, idMap, data) {
        var generateInnerId = function(parentId, idMap) {
            var lastChild;
            var lastChildId;
            var idParts;
            var len;
            var idMap = idMap;
            
            len = nodes.length;
            
            if (len === 0)
                return (idMap[parentId] === '') ? '0' : idMap[parentId] + '-0';
            
            lastChild = nodes[len - 1];
            lastChildId = idMap[ lastChild.id ];
            idParts = lastChildId.split('-');
            idParts[idParts.length - 1] = (parseInt(idParts[idParts.length - 1]) + 1) + '';
            return idParts.join('-');
        };
        var nodes = [];
        var i;
        var len;
        
        this.add = function(node, idMap) {
            if (!idMap[node.id]) {
                idMap[node.id] = generateInnerId(parentId, idMap);
                nodes.push(node);
            } else {
                for (i = 0; i < nodes.length; ++i) {
                    if (nodes[i].id === node.id) {
                        if (!nodes[i].removed) break;
                        
                        nodes[i].get().forEach(function(e) {
                            node.children.add(e, parentId, idMap);
                            e.parent = node;
                        });
                        nodes[i].parent = undefined;
                        nodes[i] = node;
                        break;
                    }
                }
            }
        };
        this.remove = function(id) {
            for (i = 0; i < nodes.length; ++i) {
                if (nodes[i].id === id) {
                    nodes[i].parent = undefined;
                    nodes.splice(i, 1);
                    break;
                }
            }
        };
        this.get = function(nr) {
            return (nr === undefined) ? nodes : nodes[nr];
        };
        this.length = function() {
            return nodes.length;
        };
        
        if (!!data) {
            assertList(data, 'Children');
            data.forEach(function(e) {
                this.add(node, parentId, idMap);
            });
        }
        
        return this;
    };
    
    
    ///////////////////////////////////////////////////////////////////////////
    //                       TREE CREATION HELPER FUNCTIONS                  //
    ///////////////////////////////////////////////////////////////////////////
    
    // Returns childNode with id = childId from node's children collection,
    // idMap is map: userId -> treeId
    var getChild = function(node, childId, idMap) {
        var childrenList;
        
        assertNode(node, 'getChild');
        assertNonEmptyString(childId, 'getChild');
        
        childrenList = node.children.get().filter(function(e) {
            var realId = idMap[e.id];
            var level = count(realId, '-');
            var levelId = getIdOnLevel(childId, level);
            return realId === levelId;
        });
        
        return (childrenList.length > 0) ? childrenList[0] : undefined;
    };
    
    // Creates tree hierarchy with root node,
    // idColumn is name of attribute with node's ids.
    var createTreeData = function(idColumn) {
        var root = {};
        
        root[idColumn] = null;
        root['name'] = 'root';
        root['children'] = [];
        root['parent'] = undefined;
        
        return { 'root': root };
    };
    
    ///////////////////////////////////////////////////////////////////////////
    //                      OTHER HELPER FUNCTIONS                           //
    ///////////////////////////////////////////////////////////////////////////
    
    // Returns number of occurences of letter in string str.
    var count = function(str, letter) {
        var counter;
        var i;
        var len;
        
        assertString(str, 'count');
        
        counter = 0;
        len = str.length;
        
        for (i = 0; i < len; ++i) {
            if (str[i] === letter) {
                ++counter;
            }
        }
        
        return counter;
    };
    
    // Returns id that will have the closest possible parent of node
    // with id = id.
    var getParentId = function(id) {
        var lastIndex = id.lastIndexOf('-');
        
        return (lastIndex !== -1) ? id.substring(0, lastIndex) : '__root__';
    };
    
    // Returns id on specified level(returns id cut off in place when
    // separator number level+1 starts, separator is "-")
    var getIdOnLevel = function(id, level) {
        var i;
        var len;
        
        assertNonEmptyString(id, 'getIdOnLevel');
        
        len = id.length;
        for (i = 0; i < len; ++i) {
            if (id[i] === '-') {
                --level;
                if (level < 0) break;
            }
        }
        
        return id.substring(0, i);        
    };
    
    // Returns deep copy of value(with some changes for node).
    var deepCopy = function(value, idColumn, parentColumn) {
        var property;
        var objectCopy;
        var arrayCopy;
        
        if (value === undefined || value === null)
            return value;
        else if (value.constructor !== Object && value.constructor !== Array &&
                 value.constructor !== Node && value.constructor !== Children &&
                 value.constructor !== Tree) {
            return value;
        }
        else if (value.constructor === Array) {
            arrayCopy = [];
            value.forEach(function(e) {
                arrayCopy.push(deepCopy(e, idColumn, parentColumn));
            });
            
            return arrayCopy;
        }
        else {
            objectCopy = {};
            for (property in value) {
                if (value.hasOwnProperty(property)) {
                    objectCopy[property] = deepCopy(value[property], idColumn, parentColumn);
                }
            }
            if (value.constructor === Node) {
                objectCopy[idColumn] = value['id'];
                if (!!parentColumn)
                    if (value['parent']['id'] === '__root__')
                        objectCopy[parentColumn] = '';
                    else
                        objectCopy[parentColumn] = value['parent']['id'];
            }
            return objectCopy;
        }
    };
    
    // Returns true if elem can be id, otherwise false.
    var isIdType = function(elem) {
        return elem !== undefined && elem.constructor === String;
    };
    
    // Returns value of node, does not contain children collection and parent node.
    // IdColumn(and parentColumn) is column with id in original data.
    var nodeToValue = function(node, idColumn, parentColumn) {
        return deepCopy(node, idColumn, parentColumn);
    };
    
    // Sorts nodes by their ids, that are kept in idColumn attribute in each node.
    var sortNodes = function(nodes, idColumn) {
        var compareId = function(id1, id2) {
            var i;
            var idPart1;
            var idPart2;
            var minLength = Math.min(id1.length, id2.length);
            
            for (i = 0; i < minLength; ++i) {
                idPart1 = parseInt(id1[i]);
                idPart2 = parseInt(id2[i]);
                if (idPart1 !== idPart2) {
                    return idPart1 - idPart2;
                }
            }
            return 0;
        };
        
        assertList(nodes, 'sortNodes');
        
        nodes.sort(function(node1, node2) {
            var idNr1 = node1[idColumn].split('-');
            var idNr2 = node2[idColumn].split('-');
            
            return compareId(idNr1, idNr2);
        });
    };
    
    ///////////////////////////////////////////////////////////////////////////
    //                            ASSERTIONS                                 //
    ///////////////////////////////////////////////////////////////////////////
    var assertList = function(list, msg) {
        if (list.constructor !== Array) {
            throw 'assertList(list=' + list + '): ' + msg;
        }
    };
    
    var assertString = function(str, msg) {
        if (str.constructor !== String) {
            throw 'assertString(str=' + str + '): ' + msg;
        }
    };
    
    var assertNonEmptyString = function(str, msg) {
        if (str.constructor !== String && str !== '') {
            throw 'assertNonEmptyString(str=' + str + '): ' + msg;
        }
    };
    
    var assertNumber = function(number, msg) {
        if (number.constructor != Number) {
            throw 'assertNumber(number=' + number + '): ' + msg;
        }
    };
    
    var assertNodeInTree = function(tree, id, ignoreRemoved, msg) {
        if ( !tree.getNode(id, ignoreRemoved) ) {
            throw 'assertNodeInTree(id=' + id + '): ' + msg;
        }
    };
    
    var assertNode = function(node, idColumn, msg) {
        if ( !node.hasOwnProperty(idColumn) && !node.hasOwnProperty('parent') &&
             assertList(node['children'], msg + '->assertNode') ) {
            throw 'assertNode(idColumn=' + idColumn + ')' + msg;
        }
    };
    
    var assertId = function(id, msg) {
        if (id !== null) {
            assertNonEmptyString(id, 'assertId( ' + msg + ' )');
        }
    };
    
    var assertRemoveType = function(type, msg) {
        if (type !== 'node' && type !== 'subtree') {
            throw 'assertRemoveType(type=' + type + ') ' + msg;
        }
    };
    
    global.monkey = monkey;
    
})(this);
