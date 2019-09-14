const d3 = require('d3')
const yaml = require('yaml')
const ytypes = require('yaml/types')
const _ = require('lodash')

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

// ydoc isa yaml.Document
// return d3.hierarchy
function render_data(ydoc) {
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "create_data() - arg must be yaml.Document object")
    return
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
      .attr("data-node-id", d => { return d.data.type == 'PAIR' ? `${d.data.id}p` : d.data.id })
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

function instrument_ydoc(ydoc) {
  function* idgen() {
    i = 0;
    while (true) {
      yield `n${i}`
      i++
    }
  }
  ydoc._idgen = idgen()
  ydoc.__walk = function (n,fn) {
    fn(n)
    switch (n.type) {
    case 'PAIR':
      this.__walk(n.value,fn)
      break
    case 'MAP':
      n.items.forEach( (d) => { this.__walk(d, fn) })
      break
    case 'SEQ':
      n.items.forEach( (d) => { this.__walk(d, fn) })
      break
    default:
      1;
    }
  }
  ydoc._add_ynode_ids = function (node) {
    this.__walk(node, (n) => {n.id = this._idgen.next().value})
    return true
  }
  ydoc._index_ynode_ids = function (node) {
    if (!this.index)
      this.index = {}
    this.__walk(node, (n) => {this.index[n.id] = n})
    return true
  }
  ydoc._add_ynode_ids(ydoc.contents)
  ydoc._index_ynode_ids(ydoc.contents)
  
  ydoc.node_by_id = function (id) { return this.index[id] }
  ydoc.create_node = function () { let n = yaml.createNode(...arguments) ; this._add_ynode_ids(n); return n }
  ydoc.index_node = function (node) { this._index_ynode_ids(node) }
}



exports.render_data=render_data
