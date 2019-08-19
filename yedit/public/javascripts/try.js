const fs = require('fs')
const YAML = require('yaml')

var inf = fs.readFileSync('../../../icdc-model.yml','utf8')
var obj = YAML.parse(inf)
console.log(markup_obj(obj))

function markup_obj(obj) {
  let doc = '<div class="yaml">\n'
  let tabch = " "
  markup(obj,"")
  doc = doc + '</div>'
  return doc
  function markup(o,tab) {
    if ( Array.isArray(o) ) {
      doc = doc + tab + '<div class="yaml-arr">\n'
      for (let elt of o) {
	doc = doc + tab + tabch + '<span class="yaml-arr-elt-mrk">-</span> ' +
	  '<div class="yaml-arr-elt">\n'
	markup(elt,tab+tabch+tabch)
	doc = doc + tab + tabch + '</div>\n'
      }
      doc = doc + tab + '</div>\n'
    }
    //else if (o instanceof Object) {
    else if (typeof(o) == 'object') {
      doc = doc + tab + '<div class="yaml-obj">\n'
      for (let key in o) {
	doc = doc + tab + tabch + '<div class="yaml-obj-ent">\n'
	doc = doc + tab + tabch + '<span class="yaml-obj-key">'+key+'</span>'+
	  '<span class="yaml-obj-val-mrk">:</span>'+
	  '<div class="yaml-obj-val">\n'
	markup(o[key],tab + tabch + tabch)
	doc = doc + tab + tabch + "</div>\n"
	doc = doc + tab + tabch + "</div>\n"
      }
      doc = doc + tab + "</div>\n"    
    }
    else {
      if (typeof(o) == 'string') {
	doc = doc + '<span class="yaml-ptext">'+o+'</span>\n'
      }
      else if (typeof(o) == 'number') {
	doc = doc + '<span class="yaml-number">'+o+'</span>\n'
      }
      else if (typeof(o) == 'boolean') {
	doc = doc + '<span class="yaml-bool">'+o+'</span>\n'
      }
      else {
	console.error( "Hey, I don't understand type '"+typeof(o)+"'" )
      }
    }
  }
}



