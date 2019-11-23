const yaml = require('yaml')
const ytypes = require('yaml/types')

// yaml Document mod by id API
// create_node(obj|arr|scal) - create a new node with an id
// create_pair_node(key, obj|arr|scal) - create a new pair (key, value) for inserting into a MAP
// get_node_by_id(id)
// get_parent_by_id(id) - get parent of node 'id'
// remove_node_by_id(id) - remove node 'id' from document
// append_to_id(id, node, [prepend]) - append/prepend a node to a MAP or SEQ of 'id'
// insert_at_id(id, node, [before])  - insert after/before node 'id' as a sibling in a MAP or SEQ
// delete_and_replace_with_SELECT(node_id) - delete the node - if the node is the last item of a containing node (MAP/SEQ),
//  replace the containing item with a scalar node with value 'SELECT'; also replace a scalar value of a PAIR with 'SELECT'
// stub_out(id, type) -add a scalar, array or object stub to replace the value of a Pair or an Array element

//
// __walk(pnode, function, first) - apply function to each node, starting at and including pnode
//                                - (call as ydoc.__walk(pnode, function, true))
var max_undo = 10;
function instrument_ydoc(ydoc) {
  function* idgen() {
    i = 0;
    while (true) {
      yield `n${i}`
      i++
    }
  }
  ydoc.instrumented = true
  ydoc._undo_stack = []
  ydoc._idgen = idgen()
  ydoc.__children = function (n) {
    switch (n.type) {
    case 'PAIR':
      // console.log('pair')
      return [n.value]
      break
    case 'MAP':
      // console.log('map')
      return n.items
    case 'SEQ':
      // console.log('seq')
      return n.items
    default:
      // console.log('>>',n.type)
      return null
    }
  }

  // breadth-first walk 
  ydoc.__walk = function (n,fn,first) {
    if (first) {
      fn(n)
    }
    switch (n.type) {
    case 'PAIR':
      fn(n.value)
      this.__walk(n.value,fn)
      break
    case 'MAP':
      n.items.forEach( fn )
      n.items.forEach( (d) => { this.__walk(d, fn) })
      break
    case 'SEQ':
      n.items.forEach( fn )
      n.items.forEach( (d) => { this.__walk(d, fn) })
      break
    default:
      1;
    }
  }
  ydoc._add_ynode_ids = function (node) {
    // node.id = this._idgen.next().value
    this.__walk(node, (n) => {n.id = this._idgen.next().value}, true)
    return true
  }
  ydoc._set_parent_ids = function (node) {
    this.__walk(node, (n) => { let c = this.__children(n) ; if (c) c.forEach( (d) => {  if (d) d.parent_id = n.id } ) },true )
  }
  ydoc._type_ynode = function (node) {
    add_type(node)
    this.__walk(node, add_type )
    function add_type (n) {
      if (n.type)
        return
      if (n instanceof ytypes.YAMLMap)
        n.type='MAP'
      else if (n instanceof ytypes.YAMLSeq)
        n.type='SEQ'
      else if (n instanceof ytypes.Scalar)
        n.type='PLAIN'
      else if (n instanceof ytypes.Pair)
        n.type='PAIR'
      else
        console.error('bork')
    }
  }
  ydoc._index_ynode_ids = function (node) {
    if (!this.index) {
      this.index = {}
      this.order = []
    }
    // this.index[node.id] = node
      this.__walk(node, (n) => {this.index[n.id] = n; this.order.push(n);}, true)
    return true
  }
  ydoc._add_ynode_ids(ydoc.contents)
  ydoc._type_ynode(ydoc.contents)
  ydoc._set_parent_ids(ydoc.contents)
  ydoc.contents.parent_id='container'
  ydoc._index_ynode_ids(ydoc.contents)
  
  ydoc.get_node_by_id = function (id) {
    if (!this.index[id]) {
      console.error(`No node with id ${id}`)
    }
    return this.index[id] || false
  }
  ydoc.get_parent_by_id = function (id) {
    let n = this.get_node_by_id(id)
    if (!n) {
      console.error(`No node with id ${id}`)
      return false
    }
    let p_id = n.parent_id
    if (p_id)
      return this.get_node_by_id(p_id)
    return
  }
  ydoc.get_next_sib_by_id = function (id) {
    let n = this.get_node_by_id(id);
    if (!n) {
      console.error(`No node with id ${id}`)
      return false
    }
    let p = this.get_parent_by_id(id);
    if (!p) {
      console.error("No sibs: root node can't have siblings")
      return false
    }
    if (!p.items) {
      console.error(`No sibs: node ${id} (type ${n.type}) can't have siblings`)
      return false
    }
    let i = p.items.indexOf(n)
    if (i<0) {
      console.error(`Indexing error: node ${n.id} should be a child of node ${pn.id}, but isn't`)
      return false
    }
    if (i == p.items.length-1) {
      return null
    }
    else {
      return p.items[i+1]
    }
  }
  
  ydoc.create_node = function (...args) {
    let n = yaml.createNode(...args,true)
    this._type_ynode(n)
    this._add_ynode_ids(n)
    this._set_parent_ids(n)
    this._index_ynode_ids(n)
    return n
  }
  
  ydoc.create_pair_node = function (key,...args) {
    // create nodes and IDs "by hand"
    let n = yaml.createNode(...args,true)
    this._type_ynode(n)
    let k = new ytypes.Scalar()
    k.type = 'PLAIN'
    k.value = key
    let pr = new ytypes.Pair(k,n)
    this._add_ynode_ids(pr)
    this._set_parent_ids(pr)
    this._index_ynode_ids(pr)
    return pr
  }
    
  ydoc.index_node = function (node) { this._index_ynode_ids(node) }
  ydoc.remove_node_by_id = function (id) {
    let n=this.get_node_by_id(id) ;
    if (!n) return ;
    let child_ids=[id]
    this.__walk(n, (nn) => {
      let c = this.__children(nn)
      if (c) c.forEach( (d) => { child_ids.push(d.id) } )
    },true )
    if (!n.parent_id) {
      console.error("ydoc: can't remove root node")
      return
    }
    let pn = this.get_parent_by_id(id)
    if (n.type=='PAIR') {
      n.parent_id=null
      pn.delete(n.key) // n.key may be plain scalar, look out
    }
    else if (pn.type == 'SEQ') {
      let i = pn.items.indexOf(n);
      n.parent_id=null
      pn.delete(i)
    }
    child_ids.forEach( (cid) => {
      let i_d = this.order.findIndex( (n) => { return n.id == cid } )
      if (i_d >= 0) {
        this.order.splice(i_d,1)
      }
      delete this.index[cid]
    } )
    return true
  }
  ydoc.insert_at_id = function(id,node,before) {
    let n=this.get_node_by_id(id)
    if (!n) {
      console.error(`No node with id ${id}`)
      return false
    }
    if (!node) {
      console.error("Node to insert undefined")
      return false
    }
    if (!node.id) {
      console.error('Node to insert does not have an id')
      return false
    }
    let pn = this.get_parent_by_id(id)
    if (!pn) {
      console.error("Can't insert: root node can't have siblings")
      return false
    }
    if (!pn.items) {
      console.error(`Can't insert: node ${id} (type ${n.type}) can't have siblings`)
      return false
    }
    if (pn.type=='MAP' && !(node.type=='PAIR')) {
      console.error(`New node must be type 'PAIR' to insert into 'MAP'`)
      return false
    }
    let i = pn.items.indexOf(n)
    if (i<0) {
      console.error(`Indexing error: node ${n.id} should be a child of node ${pn.id}, but isn't`)
      return false
    }
    node.parent_id=pn.id
    if (before) {
      node.sib_id=pn.items[i].id
      pn.items.splice(i,0,node)
    }
    else {
      if (i == pn.items.length-1) {
        node.sib_id = null
        pn.items.splice(pn.items.length,0,node)
      }
      else {
        node.sib_id=pn.items[i+1].id
        pn.items.splice(i+1,0,node)
      }
    }
    return true
  }
  ydoc.append_to_id = function(id,node,prepend) {
    let n = this.get_node_by_id(id)
    if (!n || !node) {
      console.error(`No node with id ${id}`)
      return false
    }
    if (!node.id) {
      console.error('Node to insert does not have an id')
      return false
    }
    if ( ['MAP','SEQ'].indexOf(n.type) < 0 ) {
      console.error('can only append to nodes of type MAP or SEQ')
      return false
    }
    if (n.type=='MAP' && !(node.type == 'PAIR')) {
      console.error('can only append nodes of type PAIR to a MAP')
      return false
    }
    if (prepend) {
      n.items.splice(0,0,node)
    }
    else {
      n.items.splice(n.items.length,0,node)
    }
    node.parent_id = n.id
    return true
  }
  // add a scalar, array or object stub
  // to replace the cadr of a Pair or an Array element
  ydoc.stub_out = function( id, type ) {
    console.debug("Enter ydoci:stub_out")
    let oldn = this.get_node_by_id(id)
    let pn = this.get_parent_by_id(id)
    if (pn.type != 'PAIR' && pn.type != 'SEQ') {
      console.error('can only create stub from a Pair value or an Array element')
      return false
    }
    let newn;
    switch (type) {
    case 'scalar':
      newn = this.create_node('new_value')
      break
    case 'array':
      newn = this.create_node( [ 'SELECT' ] )
      break
    case 'object':
      newn = this.create_node( { new_key:'SELECT' } )
      break
    default:
      console.error(`arg 2 should scalar|array|object, not ${type}`)
      return false
    }
    switch (pn.type) {
    case 'PAIR':
      pn.value = newn
      newn.parent_id = pn.id
      // clean up index
      let i_d = this.order.findIndex( (n) => { return n.id == id } )
      if (i_d >= 0) {
        this.order.splice(i_d,1)
      }
      delete this.index[id]
      break
    case 'SEQ':
      this.insert_at_id(id,newn,true)
      this.remove_node_by_id(id)
      break
    default:
      console.error("Shouldn't be here")
      return false
    }
    return oldn
  }
  ydoc.delete_and_replace_with_SELECT = function (node_id) {
    console.debug("Enter ydoci:delete_and_replace_with_SELECT")
    let p = this.get_parent_by_id(node_id)
    let ntype = this.get_node_by_id(node_id).type
    if (!p) {
      console.error("Can't delete root element")
      return false
    }
    this.remove_node_by_id(node_id)
     if (p.type == 'SEQ' || p.type == 'MAP') {
      if (p.items.length == 0) {
        let pp = this.get_parent_by_id(p.id)
        let sib = false
        if (pp.type == 'SEQ' || pp.type == 'MAP') {
          sib = this.get_next_sib_by_id(p.id)
        }
        if (pp) {
          this.remove_node_by_id(p.id)
          let n = this.create_node('SELECT')
          if (sib !== false) {
            if (sib) {
              this.insert_at_id(sib.id, n, true)
            }
            else {
              this.append_to_id(pp.id, n, false)
            }
          }
          else {
            pp.value = n
            n.parent_id = pp.id
          }
        }
        else {
          // the root element is empty
          1
        }
      }

    }
    else if (p.type == 'PAIR' && ntype == 'PLAIN') {
      let n = this.create_node('SELECT')
      p.value = n
      n.parent_id = p.id
    }    
    return true
  }
}

exports.instrument_ydoc=instrument_ydoc