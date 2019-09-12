const $ = require('jquery')
const _ = require('lodash')
const d3data = require('./data.js')
const {ipcRenderer} = require('electron')


const indent=12
const undo_max=10

// need undo
undo_stack = []
// elts-
//  { mark:"undo-marker-val",
//   action: before|after|append|remove
//   elt: <dom object> }

// delete the last arr-elt or obj-ent, need to present the entity selector
// need to delete scalar value and replace with entity selector
// fix padding-inline-start stuff

// need sort by key capability at each level

// how to preserve comments?
    
$(function () {
  ipcRenderer
    .on('selected-yaml', function (event, yobj) {
      $('#yaml-container')
        .append(markup_obj(yobj))
      yaml_doc_setup()
    })
})

function yaml_doc_setup () {
  $(".yaml-obj-key")
    .dblclick( hider )
  $(".yaml-obj-ent-control")
    .each( edit_control_setup )
  $(".yaml-arr-elt-control")
    .each( edit_control_setup )
  $(document).on("keydown", function (e) {
    if (e.key == 'z' && (e.metaKey || e.ctrlKey)) {
      if (!$( document.activeElement ).is("input")) {
        undo()
      }
      // else in input elt, regular undo
    }
  })
}

function insert_obj_ent (tgt) {
  // let ind = $(tgt.closest('.yaml-obj')).css('padding-inline-start')
  // ind = Number(ind.match(/^([0-9]+)px/)[1])
  // if (!ind) {
  //   console.error("Couldn't find an indent padding (insert_obj_ent)")
  // }
  let ent = create_obj_ent(indent)
      .insertBefore($(tgt)).first()
  ent.find('input').trigger('focus')
  push_to_undo('creation', ent)
}

function insert_arr_elt (tgt) {
  // let ind = $(tgt.closest('.yaml-arr')).css('padding-inline-start')
  // ind = Number(ind.match(/^([0-9]+)px/)[1])
  // if (!ind) {
  //   console.error("Couldn't find an indent padding (insert_obj_ent)")
  // }
  console.log(tgt)
  let ent = create_arr_elt(indent)
  ent.insertAfter($(tgt))
  push_to_undo('creation', ent)
}

function create_obj (ind, scalar) {
  let obj = $( '<div class="yaml-obj yaml-entity" style="padding-inline-start:'+ind+'px">'+
	       '<span class="yaml-status"></span></div></div>' )
  create_obj_ent(ind).insertBefore(obj.find('.yaml-status'))
  return obj
}

function create_obj_ent (ind) {
  let elt = $('<div class="yaml-obj-ent">' +
	      '<span class="yaml-obj-ent-control">+</span>' +
	      '<input class="yaml-obj-key" value="">'+
	      '<span class="yaml-obj-val-mrk">: </span>'+
	      '<span class="yaml-status></span>'+
	      '</div>');
  create_obj_val(ind).insertAfter(elt.find('.yaml-obj-val-mrk'))
  $(elt).find(".yaml-obj-key")
    .dblclick( hider )
  $(elt).find(".yaml-obj-ent-control").each( edit_control_setup )
  return elt
}

function create_obj_val (ind, val) {
  let elt = $('<div class="yaml-obj-val"></div>')
  if (val) {
    val.appendTo(elt)
  }
  else {
    create_type_select(ind).appendTo(elt)
  }
  return elt
}

function create_arr (ind) {
  let arr = $( '<div class="yaml-arr yaml-entity" style="padding-inline-start:'+ind+'px">'+
	       '<span class="yaml-status"></span></div></div>' )
  create_arr_elt(ind).insertBefore(arr.find('.yaml-status'))
  return arr
}

function create_arr_elt (ind, val) {
  let elt = $('<div class="yaml-arr-elt">' +
	      '<span class="yaml-arr-elt-mrk">- </span>'+
	      '<span class="yaml-arr-elt-control"></span>' +
	      '<span class="yaml-status"></span>'+
	      '</div>');
  if (val) {
    val.insertAfter(elt.find('.yaml-arr-elt-mrk'))    
  }
  else {
    create_type_select(ind).insertAfter(elt.find('.yaml-arr-elt-mrk'))
  }
  $(elt).find(".yaml-arr-elt-control").each( edit_control_setup )
  return elt
}

function create_type_select(indent) {
  let sel = $('<select><option value="">select</option>'+
	      '        <option value="scalar">scalar</option>'+
	      '        <option value="array">array</option>' +
	      '        <option value="object">object</option>'+
	      '</select>');
  sel.change( function (e) {
    $(e.target).each(replace_select)
  })
  return sel
}

function replace_select () {
  let value = this.value;
  let container = $(this).parent().first()
  let new_elt=null

  if (container.hasClass('yaml-obj-val')) {
    switch (value) {
    case 'scalar':
      new_elt=create_obj_val(indent, $('<input class="yaml-ptext yaml-scalar" value="">'))
      break
    case 'array':
      new_elt=create_obj_val(indent, create_arr(indent))
      break
    case 'object':
      new_elt=create_obj_val(indent, create_obj(indent))
      break
    }
  }
  else if (container.hasClass('yaml-arr-elt')) {
    switch (value) {
    case 'scalar':
      new_elt=create_arr_elt(indent, $('<input class="yaml-ptext yaml-scalar" value="">'))
      break
    case 'array':
      new_elt=create_arr_elt(indent, create_arr(indent))
      break
    case 'object':
      new_elt=create_arr_elt(indent, create_obj(indent))
      break
    }
  }
  let marker = push_to_undo('deletion',container);
  container.detach()
  switch (marker.action) {
  case 'before':
    new_elt.insertBefore(marker.marked)
    break
  case 'after':
    new_elt.insertAfter(marker.marked)
    break
  case 'append':
    new_elt.appendTo(marker.marked)
    break
  default:
    1
  }
  if (value == 'scalar') {
    new_elt.find('input').trigger('focus')
  }
  push_to_undo('creation',new_elt)
  return true
}

function hider (e) {
  e.stopPropagation()
  let tgt = e.target
  let hid = tgt.closest(".yaml-obj-ent").querySelector(".yaml-obj-val")
  let stat = tgt.closest(".yaml-obj-ent").querySelector(".yaml-status")
  
  $(hid)
    .fadeToggle(function () {
      console.log($(this).css("display"),"< disp val")
      if ($(this).css("display") == 'none') {
	$(stat).text(" ...") // stuff hidden here
          .dblclick(hider)
      }
      else {
	$(stat).text("")
      }
    })
}

function edit_control_setup () {
  let cls;
  if ($(this).hasClass('yaml-obj-ent-control')) cls='yaml-obj-ent'
  if ($(this).hasClass('yaml-arr-elt-control')) cls='yaml-arr-elt'
  $(this)
    .text("•")
    .hover(
      function (e) {
        if (e.metaKey)
	  $(this).attr('style','color:red').text("⊗")
        else
          $(this).text("⊕")          
	let $elt = $(this)
	$(document).on(
	  "keydown.yaml",
	  function (f) {
	    if (f.key == 'Meta') $elt.attr('style','color:red').text("⊗")
	  }).on(
	    "keyup.yaml",
	    function (f) {
	      if (f.key == 'Meta') $elt.removeAttr('style').text("⊕")
	    })
      },
      function (e) {
	$(this).removeAttr('style').text("•")
	$(document).off("keydown.yaml").off("keyup.yaml")
      } )
    .click( (e) => {
      e.preventDefault()
      if ($(e.target).text() == "⊕") {
	switch (cls) {
	case 'yaml-obj-ent':
	  insert_obj_ent(e.target.closest('.'+cls))
	  break
	case 'yaml-arr-elt':
	  insert_arr_elt(e.target.closest('.'+cls))
	  break
	default:
	  break
	}
      }
      else if ($(e.target).text() == "⊗") {
        $(e.target).trigger('mouseout')
	$(e.target).closest('.'+cls).each(delete_entity)
      }
    })
}

function delete_entity() {
  let cls = $(this).hasClass('yaml-obj-ent') ?
      'yaml-obj-ent' :
      ( $(this).hasClass('yaml-arr-elt') ?
        'yaml-arr-elt' :
        null )
  if (!cls)
    return
  let $parent = $(this).closest('.yaml-entity')
  
  if ($parent.children('.'+cls).length == 1) {
//    let ind = $parent.css('padding-inline-start')
    let marker = push_to_undo('deletion',$parent)
    $parent.detach()
    let sel = create_type_select(indent)
    switch (marker.action) {
    case 'before':
      sel.insertBefore(marker.marked)
      break
    case 'after':
      sel.insertAfter(marker.marked)
      break
    case 'append':
      sel.appendTo(marker.marked)      
      break
    default:
      console.error("Marked action '"+marker.action+"' unknown")
    }
    push_to_undo('creation', sel)
  }
  else {
    push_to_undo('deletion',$(this))
    $(this).detach()
  }
}

function undo() {
  if (_.isEmpty(undo_stack))
    return
  let a = undo_stack.pop()
  let marked_elt = $(".yaml").find("[_undo_mark='"+a.mark+"']").first();
  if (!marked_elt) {
    undo_stack=[]
    return
  }
  marked_elt.removeAttr('_undo_mark')
  if (a.elt) a.elt.removeAttr('_undo_mark')
  switch (a.action) {
  case 'before':
    a.elt.insertBefore(marked_elt)
    break
  case 'after':
    a.elt.insertAfter(marked_elt)
    break
  case 'append':
    a.elt.appendTo(marked_elt)
    break
  case 'remove':
    marked_elt.remove()
    break
  default:
    console.error("undo: action '"+a.action+"' unknown")
  }
  return true
}

function push_to_undo(action, elt) {
  let undo_mark = "undo-"+_.toString(_.random(1,1000))
  let marked_elt;
  let marked_action;
  switch (action) {
  case 'deletion':
    if (elt.next().length > 0) {
      marked_elt = elt.next().attr('_undo_mark',undo_mark).first()
      marked_action = 'before'
    }
    else if (elt.prev().length > 0) {
      marked_elt=elt.prev().attr('_undo_mark',undo_mark).first()
      marked_action = 'after'
    }
    else if (elt.parent().length > 0) {
      marked_elt=elt.parent().attr('_undo_mark',undo_mark).first()
      marked_action = 'append'
    }
    else {
      console.error("Can't find an element to mark")
    }
    break
  case 'creation':
    elt.attr('_undo_mark',undo_mark)
    marked_elt=elt
    marked_action='remove'
    break
  default:
    console.error('push_to_undo: Action "'+action+'" unknown')
  }
  undo_stack.push( { mark:undo_mark, action:marked_action,elt:elt })
  return { marked:marked_elt, action:marked_action }
}

function parse_dom() {
  return visit($(document).find('.yaml'))
  function visit($jq) {
    if ($jq.hasClass('yaml')) {
      return visit($($jq.get(0).querySelector('.yaml-entity')))
    }
    else if ($jq.hasClass('yaml-obj')) {
      let o = {}
      for (let ent of $jq.children('.yaml-obj-ent')) {
	let key = ent.querySelector('.yaml-obj-key').value;
	let val = ent.querySelector('.yaml-obj-val')
	o[key] = visit($(val.querySelector('.yaml-entity') ||
			 val.querySelector('.yaml-scalar')));
      }
      return o
    }
    else if ($jq.hasClass('yaml-arr')) {
      let a = []
      for (let elt of $jq.children('.yaml-arr-elt')) {
	let val = elt.querySelector('.yaml-scalar')
	a.push( visit( $(val) ) )
      }
      return a
    }
    else if ($jq.hasClass('yaml-ptext') ||
	     $jq.hasClass('yaml-bool') ||
	     $jq.hasClass('yaml-number')) {
      return $jq.get(0).value;
    }
    else {
      1 //ignore
    }

  }
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

function markup_doc(ydoc) {
  // ydoc is a yaml Document object from yaml package
  let config = {
    tabch: " ",
    pxindent: indent
  }
  let doc = '<div class="yaml">\n'
  let tabch = config.tabch
  markup(ydoc,"",0)
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
