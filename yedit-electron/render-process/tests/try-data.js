const yaml = require('yaml')
const ytypes = require('yaml/types')
const d3 = require('d3')
const fs = require('fs')
const {JSDOM} = require('jsdom')
const { document, window } = (new JSDOM()).window

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

ydoc = yaml.parseDocument( fs.readFileSync("../../icdc-model.yml","utf-8") )
yh = d3.hierarchy(ydoc.contents, children)
document.documentElement.innerHTML = '<html><head></head><body><div data-node-id="0"></div></body></html>'

// create 'node id':
elet i = 0
yh.each( (n) => { n.value=i ; i=i+1 } )
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
