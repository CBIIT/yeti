const d3 = require('d3')
const yaml = require('yaml')
const ytypes = require('yaml/types')
const _ = require('lodash')
yh = {}

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
function render_data(ydoc) {
  console.log("HEY")
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "create_data() - arg must be yaml.Document object")
    return
  }
   yh = d3.hierarchy( ydoc.contents, children )
  let i = 0
  yh.each( (n) => { n.value='n'+_.trim(_.toString(i)) ; i=i+1 } ) // ids
  yh.each( (n) => {
    if (n.children == null) 
      return

    d3.selectAll(`div[data-node-id="${n.value}"`) // has to be selectAll
      .selectAll("div")
      .data(n.children, d => { d ? d.value : null } )
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
      .attr("data-node-id", d => { return d.data.type == 'PAIR' ? `${d.value}p` : d.value })
      .each( function (d) {
        switch (d.data.type) {
        case 'PAIR':
          let kid = _.trim(d.children[0].value);
          this.innerHTML =
	    '<span class="yaml-obj-ent-control"></span>'+
	    `<input class="yaml-obj-key" value="${d.data.key.value}">`+
	    '<span class="yaml-obj-val-mrk">:</span>'+
	    '<span class="yaml-status"></span>'
          let ov = document.createElement("div")
          ov.setAttribute('class','yaml-obj-val')
          ov.setAttribute('data-node-id',d.value)
          this.append(ov)
          break
        case 'SEQ':
          // let ae = document.createElement("div")
          // ae.setAttribute('class','yaml-arr-elt')
          // ae.setAttribute('data-node-id',d.value)
          // this.append(ae)
          break
        case 'MAP':
          // let ob = document.createElement("div")
          // ob.setAttribute('class', 'yaml-obj-ent boog')
          // ob.setAttribute('data-node-id',d.value)
          // this.append(ob)
          break
        case 'PLAIN':
          let scl;
          switch (n.data.type) {
          case 'SEQ':
            this.innerHTML =
              '<span class="yaml-arr-elt-mrk">-</span>'+
              `<input class="yaml-ptext" value="${d.data.value}">`+
              '<span class="yaml-status"></span>'+
              '<span class="yaml-arr-elt-control"></span>'
            break
          case 'PAIR':
            this.innerHTML =
              `<input class="yaml-ptext" value="${d.data.value}">`
            break
          }
          break
        default:
          console.error(`Can't handle PLAIN scalar at this position`)
        }

        return
      })  
  })
}



// markup input object for display
function markup_obj(obj) {
  let config = {
    tabch: " ",
    pxindent: indent
  }
  let doc = '<div class="yaml">\n'
  let tabch = config.tabch
  markup(obj,"",0)
  doc = doc + '</div>'
  return doc
  function markup(o,tab,ind) {
    let indent="";
    if (ind > 0) {
      indent='style="padding-inline-start:'+ind+'px"'
    }
    if ( Array.isArray(o) ) {
      doc = doc + tab + '<div class="yaml-arr yaml-entity" '+indent+' >\n'
      for (let elt of o) {
	doc = doc + tab + tabch + '<div class="yaml-arr-elt">' + 
	  '<span class="yaml-arr-elt-mrk">-</span>'
	markup(elt,tab+tabch+tabch,ind+config.pxindent)
	doc = doc + tab + tabch + '<span class="yaml-status">' +
	  '</span><span class="yaml-arr-elt-control"></span>' +
	  '</div>\n'
      }
      doc = doc + tab + '</div>\n'
    }
    //else if (o instanceof Object) {
    else if (typeof(o) == 'object') {
      doc = doc + tab + '<div class="yaml-obj yaml-entity" '+indent+' >\n'
      for (let key in o) {
	let cls='class="yaml-obj-val"'
	let str=typeof o[key]
	if (str.match(/^[a-z]/)) { //is a scalar
	  cls='class="yaml-obj-val yaml-obj-sc-val"'
	}
	doc = doc + tab + tabch + '<div class="yaml-obj-ent">\n'
	doc = doc + tab + tabch +
	  '<span class="yaml-obj-ent-control"></span>'+
	  '<input class="yaml-obj-key" value="'+key+'">'+
	  '<span class="yaml-obj-val-mrk">:</span>'+
	  '<span class="yaml-status"></span>' +
	  '<div '+cls+' >\n'
	markup(o[key],tab + tabch + tabch,ind+config.pxindent)
	doc = doc + tab + tabch + "</div>\n"
	doc = doc + tab + tabch + "</div>\n"
      }
      doc = doc + tab + "</div>\n"    
    }
    else {
      if (typeof(o) == 'string') {
	doc = doc + '<input class="yaml-ptext yaml-scalar" value="'+o+'">\n'
      }
      else if (typeof(o) == 'number') {
	doc = doc + '<input class="yaml-number yaml-scalar" value=">'+o+'">\n'
      }
      else if (typeof(o) == 'boolean') {
	doc = doc + '<input class="yaml-bool yaml-scalar" value=">'+o+'">\n'
      }
      else {
	console.error( "Hey, I don't understand type '"+typeof(o)+"'" )
      }
    }
  }
}

exports.render_data=render_data
