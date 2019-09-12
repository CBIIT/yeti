const d3 = require('d3')
const yaml = require('yaml')
const ytypes = require('yaml/types')

// ydoc isa yaml.Document
function render_data(ydoc) {
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "create_data() - arg must be yaml.Document object")
    return
  }
  let yh = d3.hierarchy( ydoc.contents, children )
  let i = 0
  yh.each( (n) => { n.value=i ; i=i+1 } ) // ids
  yh.each( (n) => {
    if (n.children == null)
      return
    d3.selectAll(`div[data-node-id="${n.value}"`) // has to be selectAll
      .selectAll("div")
      .data(n.children)
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
          cls = "yaml-scalar"
          break
        default:
          1
        }
        return cls
      })  
      .attr("data-node-id", d => d.value)
      .text( d => d.data.type )
      .each( (d) => {
        switch (d.data.type) {
        case 'PAIR':
          this.innerHTML =
	    '<span class="yaml-obj-ent-control"></span>'+
	    '<input class="yaml-obj-key" value="'+d.data.key.value+'">'+
	    '<span class="yaml-obj-val-mrk">:</span>'+
	    '<span class="yaml-status"></span>'+
            '<div class="yaml-obj-val"></div>'
          break
        case 'SEQ':
          break
        case 'MAP':
          break
        case 'PLAIN':
          switch (n.data.type) {
          case 'SEQ':
            this.innerHTML =
              '<div class="yaml-arr-elt>'+
              '<span class="yaml-arr-elt-mrk">-</span>'+
              '<input class="yaml-ptext yaml-scalar" value="'+ d.data.value+'>'+
              '<span class="yaml-status"></span>'+
              '<span class="yaml-arr-elt-control"></span>'+
              '</div>'
            break
          case 'MAP':
            this.innerHTML =
              '<div class="yaml-obj-val">'+
              '<input class="yaml-ptext yaml-scalar" value="'+d.data.value+'>'+
              '</div>'
            break
          }
          break
        default:
          1
        }
        console.log(d.data.type)
        return
      })  
  })
}

export render_data as render_data




function children (n) {
  if (n instanceof ytypes.Pair) {
    console.log('pair')
    return [n.value]
  }
  else if (n instanceof ytypes.YAMLMap) {
    console.log('map')
    return n.items
  }

  else if (n instanceof ytypes.YAMLSeq) {
    console.log('seq')
    return n.items
  }
  else {
    console.log('>>',n.type)
    return null
  }
}

function renderYAML (container, hier) {
  let yroot = d3.select(container)
      .append("div")
      .classed("yaml",true)
  yroot.selectAll(".yaml-obj")

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


export create_data as create_data
