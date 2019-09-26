const d3 = require('d3')
const yaml = require('yaml')
const ytypes = require('yaml/types')
const _ = require('lodash')


// ydoc isa yaml.Document
// return d3.hierarchy
function render_data(ydoc) {
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "create_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.node_by_id) {
    instrument_ydoc(ydoc)
  }
  let yh = d3.hierarchy( ydoc.contents, children )
  yh.each( (n) => {
    if (n.children == null) 
      return

    d3.selectAll(`div[data-node-id="${n.data.id}"`) // has to be selectAll
      .selectAll("div")
      .data(n.children, d => { d ? d.data.id : null } )
      .enter()
      .append("div")
      .attr("class", (d) => {
        let cls = ""
        switch (d.data.type) {
        case 'PAIR':
          cls = "yaml-obj-ent"
          break
        case 'SEQ':
          cls = "yaml-arr yaml-entity"
          break
        case 'MAP':
          cls = "yaml-obj yaml-entity"
          break
        case 'PLAIN':
          if (n.data.type=='SEQ')
            cls = "yaml-arr-elt"
          else
            cls = "yaml-scalar"
          break
        default:
          1;
        }
        return cls
      })  
      .attr("data-node-id", d => d.data.id ) // return d.data.type == 'PAIR' ? `${d.data.id}p` : d.data.id })
      .each( function (d) { create_from_yaml_node(d,n.data.type,this) } )  
  })
  return yh
}



function create_from_yaml_node(d, parentType, elt) {
  switch (d.data.type) {
  case 'PAIR':
    elt.innerHTML =
      '<span class="yaml-obj-ent-control"></span>'+
      `<input class="yaml-obj-key" value="${d.data.key.value}">`+
      '<span class="yaml-obj-val-mrk">:</span>'+
      '<span class="yaml-status"></span>'
    let ov = document.createElement("div")
    ov.setAttribute('class','yaml-obj-val')
    ov.setAttribute('data-node-id',d.data.id)
    elt.append(ov)
    break
  case 'SEQ':
    // let ae = document.createElement("div")
    // ae.setAttribute('class','yaml-arr-elt')
    // ae.setAttribute('data-node-id',d.data.id)
    // this.append(ae)
    break
  case 'MAP':
    // let ob = document.createElement("div")
    // ob.setAttribute('class', 'yaml-obj-ent boog')
    // ob.setAttribute('data-node-id',d.data.id)
    // this.append(ob)
    break
  case 'PLAIN':
    let scl;
    switch (parentType) {
    case 'SEQ':
      elt.innerHTML =
        '<span class="yaml-arr-elt-mrk">-</span>'+
        `<input class="yaml-ptext" value="${d.data.value}">`+
        '<span class="yaml-status"></span>'+
        '<span class="yaml-arr-elt-control"></span>'
      break
    case 'PAIR':
      elt.innerHTML =
        `<input class="yaml-ptext" value="${d.data.value}">`
      break
    default:
      console.error(`Can't handle PLAIN scalar at this position`)
    }
    break
  default:
    console.error(`Can't handle ${d.data.type} at this position`)
  }

  return
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
    if (!this.index)
      this.index = {}
    // this.index[node.id] = node
    this.__walk(node, (n) => {this.index[n.id] = n}, true)
    return true
  }
  ydoc._add_ynode_ids(ydoc.contents)
  ydoc._type_ynode(ydoc.contents)
  ydoc._set_parent_ids(ydoc.contents)
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
    let child_ids=[]
    this.__walk(n, (nn) => { let c = this.__children(nn) ; if (c) c.forEach( (d) => { child_ids.push(d.id) } ) },true )
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
    delete this.index[id]
    child_ids.forEach( (cid) => { delete this.index[cid] } )
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
