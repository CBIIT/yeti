const fs = require('fs')
const YAML = require('yaml')

var inf = fs.readFileSync('../icdc-model.yml','utf8')
var obj = YAML.parse(inf)
console.log(markup_obj(obj))

function markup_obj(obj) {
  let config = {
    tabch: " ",
    pxindent: 12
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



