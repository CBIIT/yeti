const d3 = require('d3')
const yaml = require('yaml')
const ytypes = require('yaml/types')
const _ = require('lodash')


// ydoc isa yaml.Document

function render_data(ydoc) {
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "create_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.instrumented) {
    instrument_ydoc(ydoc)
  }
  // let yh = d3.hierarchy( ydoc.contents, children )

  d3.select('div[data-node-id="container"')
    .datum({id: 'container',parent_id:'container'})
  ydoc.order.forEach( (d) => {
    d3.selectAll(`div[data-node-id=${d.parent_id}`) // this one exists
      .selectAll(`div[data-node-id=${d.id}`) // this one doesn't yet
      .data([d], dd => dd.id)
      .enter()
      .append(
        function (d) {
          let p, ptype
          if (d.parent_id=='container') {
            ptype = 'CONTAINER'
          }
          else {
            p = ydoc.get_parent_by_id(d.id)
            ptype = p ? p.type : null
          }
          return create_from_yaml_node(d,ptype)
        }
      )
  })
}

function create_from_yaml_node(d, parentType) {
  elt = document.createElement("div")
  elt.setAttribute('data-node-id',d.id)
  switch (d.type) {
  case 'PAIR':
    elt.innerHTML =
      '<span class="yaml-obj-ent-control"></span>'+
      `<input class="yaml-obj-key" value="${d.key.value}">`+
      '<span class="yaml-obj-val-mrk">:</span>'+
      '<span class="yaml-status"></span>'
    elt.setAttribute('class','yaml-obj-ent')
    break
  case 'SEQ':
    elt.setAttribute('class', 'yaml-arr yaml-entity')
    if (parentType == 'PAIR') {
      let wrap = document.createElement("div")
      wrap.setAttribute('class','yaml-obj-val')
      wrap.append(elt)
      elt = wrap
    }
    break
  case 'MAP':
    elt.setAttribute('class','yaml-obj yaml-entity')
    if (parentType == 'PAIR') {
      let wrap = document.createElement("div")
      wrap.setAttribute('class','yaml-obj-val')
      wrap.append(elt)
      elt = wrap
    }
    break
  case 'PLAIN':
    let scl;
    switch (parentType) {
    case 'SEQ':
      elt.innerHTML =
        '<span class="yaml-arr-elt-mrk">-</span>'+
        `<input class="yaml-ptext" value="${d.value}">`+
        '<span class="yaml-status"></span>'+
        '<span class="yaml-arr-elt-control"></span>'
      elt.setAttribute('class','yaml-arr-elt')
      break
    case 'PAIR':
      elt.innerHTML =
        `<input class="yaml-ptext" value="${d.value}">`
      elt.setAttribute('class','yaml-scalar')
      break
    default:
      console.error(`Can't handle PLAIN scalar at this position`)
    }
    break
  default:
    console.error(`Can't handle ${d.type} at this position`)
  }
  return elt
}

function children (n) {
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

// yaml Document mod by id API
// create_node(obj|arr|scal) - create a new node with an id
// create_pair_node(key, obj|arr|scal) - create a new pair (key, value) for inserting into a MAP
// get_node_by_id(id)
// get_parent_by_id(id) - get parent of node 'id'
// remove_node_by_id(id) - remove node 'id' from document
// append_to_id(id, node, [prepend]) - append/prepend a node to a MAP or SEQ of 'id'
// insert_at_id(id, node, [before])  - insert after/before node 'id' as a sibling in a MAP or SEQ
//
// __walk(pnode, function, first) - apply function to each node, starting at and including pnode
//                                - (call as ydoc.__walk(pnode, function, true))

function instrument_ydoc(ydoc) {
  function* idgen() {
    i = 0;
    while (true) {
      yield `n${i}`
      i++
    }
  }
  ydoc.instrumented = true
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
  ydoc.create_node = function (...args) {
    let n = yaml.createNode(...args,true)
    this._type_ynode(n)
    this._add_ynode_ids(n)
    this._set_parent_ids(n)
    this._index_ynode_ids(n)
    return n
  }
  
  ydoc.create_pair_node = function (key,...args) {
    let n = this.create_node(...args)
    let k = new ytypes.Scalar()
    k.type = 'PLAIN'
    k.value = key
    let pr = new ytypes.Pair(k,n)
    this._add_ynode_ids(pr)
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
      console.log(i_d)
      if (i_d >= 0) {
        this.order.splice(i_d,1)
      }
      delete this.index[cid]
    } )
    console.log("counts:", Object.keys(this.index).length, this.order.length)
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
      pn.items.splice(i,0,node)
    }
    else {
      if (i == pn.items.length-1) {
        pn.items.splice(pn.items.length,0,node)
      }
      else {
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
}


exports.render_data=render_data
exports.instrument_ydoc=instrument_ydoc
