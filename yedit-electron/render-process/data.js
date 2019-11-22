const d3 = require('d3')
const $ = require('jquery')
const yaml = require('yaml')
console.log(__dirname, __filename)
const ydoci = require('./ydoci.js')
const ytypes = require('yaml/types')
const _ = require('lodash')

// ydoc isa yaml.Document

// the ff are nodes that have ids:
// YAMLMap
// Pair
// -- neither the key nor the value slots are nodes, nor do they have a node id
// YAMLSeq
// Scalar leaves

// therefore the following divs should have a data-node-id attr:
// yaml-obj <-> YAMLMap
// yaml-obj-ent <-> Pair
// yaml-array <-> YAMLSeq
// yaml-scalar <-> leaf
// no yaml-obj-key, yaml-obj-val, or yaml-arr-elt should have a data-node-id attr.


// create new document
function render_data(ydoc) {
  console.debug("Enter data:render_data")
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "render_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.instrumented) {
    ydoci.instrument_ydoc(ydoc)
  }
  // let yh = d3.hierarchy( ydoc.contents, children )

  d3.select('div[data-node-id="container"')
    .datum({id: 'container',parent_id:'container'})
  ydoc.order.forEach( (d) => {
    d3.selectAll(`div[data-node-id=${d.parent_id}`) // this one exists
      .select('.insert-here')
      .each( function () {
        let cls = this.closest('div[data-node-id]').className
        if (cls.includes('yaml-obj-ent'))
          this.className = 'yaml-obj-val insert-here'
        else if (cls.includes('yaml-arr-elt insert-here'))
          this.className = 'yaml-arr-elt-val'
      } )
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

// update current document and return list of new dom nodes
function update_data(ydoc) {
  console.debug("Enter data:update_data")
  let new_nodes = []
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "update_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.instrumented) {
    console.error( "update_data() - yaml.Document not instrumented for id updates (use instrument_ydoc())");
    return
  }
  d3.selectAll('div[data-node-id]')
    .data(ydoc.order, d => { return d.id })
    .join(
      enter => {
        enter
          .each(
            function (d) {
              let p, ptype
              if (d.parent_id=='container') {
                ptype = 'CONTAINER'
              }
              else {
                p = ydoc.get_parent_by_id(d.id)
                ptype = p ? p.type : null
              }
              let node = create_from_yaml_node(d,ptype)
              if (d.sib_id) {
                d3.select(`div[data-node-id='${d.sib_id}'`)
                  .each( function () {
                    let sib = this
                    // note, select() in next call, plus the insert(),
                    // will push the data
                    // from the parent MAP down to the PAIR - yaml-obj-ent
                    // -- this is not desired, want 'node' to preserve
                    // the data already assigned to it in create_node_from_yaml
                    // d3.selectAll(`div[data-node-id='${d.parent_id}'`)
                    if (node.className.includes('yaml-arr-elt')) {
                      sib.closest('.insert-here').insertBefore(node, sib.closest('.yaml-arr-elt'))
                    }
                    else {
                      sib.parentNode.insertBefore(node, sib)
                    }

                    // kludge it by resetting .__data__,
                    // although this is done in create_from_yaml_node
                  })
              }
              else {
                d3.selectAll(`div[data-node-id='${d.parent_id}'`)
                  .select('.insert-here')
                  .each( function () {
                    let cls = this.closest('div[data-node-id]').className
                    if (cls.includes('yaml-obj-ent'))
                      this.className = 'yaml-obj-val insert-here'
                    else if (cls.includes('yaml-arr-elt'))
                      this.className = 'yaml-arr-elt-val insert-here'
                  } )
                  .append(() => {return node})
                // kludge it by resetting .__data__,
                // although this is done in create_from_yaml_node
              }
              node.__data__ = d
              new_nodes.push(node)
              return true
            }
          )        
      },
      update => { return },
      exit => {
        exit
          .filter(":not([data-node-id='container'])")
          .each( function (d,i,n) {
            if (this.parentNode.className.includes('yaml-arr-elt')) {
              n[i] = this.parentNode
            }
          })
          .remove()
      }
    )
  return new_nodes
}

function create_from_yaml_node(d, parentType) {
  console.debug("Enter data:create_from_yaml_node")
  elt = document.createElement("div")
  elt.setAttribute('data-node-id',d.id)
  let sel = '<select style="display:inline"><option value="">select</option>'+
      '        <option value="scalar">scalar</option>'+
      '        <option value="array">array</option>' +
      '        <option value="object">object</option>'+
      '</select>'
  switch (d.type) {
  case 'PAIR':
    elt.setAttribute('class','yaml-obj-ent')
    elt.innerHTML =
      '<span class="yaml-obj-ent-control"></span>'+
      `<input class="yaml-obj-key" value="${d.key.value}">`+
      '<span class="yaml-obj-val-mrk">:</span>'+
      '<div class="insert-here"></div>'+
      '<span class="yaml-status"></span>'
    $(elt).find('input')
      .change( function () {
        d.key.value = $(this).val()
      })
    break
  case 'SEQ':
  case 'MAP':
    if (d.type == 'SEQ') {
      elt.setAttribute('class', 'yaml-arr yaml-entity')
    } else {
      elt.setAttribute('class', 'yaml-obj yaml-entity')
    }
    switch (parentType) {
    case 'CONTAINER':
      elt.innerHTML = '<span class="insert-here"></span>'
      break
    case 'PAIR':
      elt.innerHTML = '<span class="insert-here"></span>'
      break
    case 'SEQ':
      elt.innerHTML = '<span class="insert-here"></span>'
      let wrap = document.createElement('div')
      wrap.setAttribute('class', 'yaml-arr-elt')
      wrap.innerHTML = '<span class="yaml-arr-elt-mrk">-</span>'+
        '<span class="yaml-status"></span>'+
        '<span class="yaml-arr-elt-control"></span>'
      wrap.insertBefore(elt, wrap.querySelector('.yaml-status'))
      elt = wrap
      break
    }
    break
  case 'PLAIN':
    let scl;
    switch (parentType) {
    case 'SEQ':
      elt.setAttribute('class','yaml-scalar')
      wrap = document.createElement('div')
      wrap.setAttribute('class', 'yaml-arr-elt')
      wrap.innerHTML =
        '<span class="yaml-arr-elt-mrk">-</span>'+
        '<span class="yaml-status"></span>'+
        '<span class="yaml-arr-elt-control"></span>'
      elt.innerHTML = ( d.value == 'SELECT' ? sel :
                        `<input class="yaml-ptext" value="${d.value}">`)
      wrap.insertBefore(elt, wrap.querySelector('.yaml-status'))
      elt = wrap
      $(elt).find('input')
        .change(function () {
          d.value = $(this).val()
        })
                              
      break
    case 'PAIR':
      elt.setAttribute('class','yaml-scalar')
      elt.innerHTML = (d.value == 'SELECT' ? sel :
                       `<input class="yaml-ptext" value="${d.value}">`)
      $(elt).find('input')
        .change( function () {
          d.value = $(this).val()
        })
      break
    default:
      console.error(`Can't handle PLAIN scalar at this position`)
    }
    break
  default:
    console.error(`Can't handle ${d.type} at this position`)
  }
  // does following work for yaml-arr-elts?
  elt.__data__ = d
  for ( let i=0; i<elt.children.length ; i++) {
    elt.children[i].__data__ = d
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
    return n.items
  case 'SEQ':
    return n.items
  default:
    return null
  }
}



exports.render_data=render_data
exports.update_data=update_data
