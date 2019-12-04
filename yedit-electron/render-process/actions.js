const $ = require('jquery')
const _ = require('lodash')
const path = require('path')
const d3 = require('d3')

const d3data = require('../data.js')
const YAML=require('yaml')
const {ipcRenderer} = require('electron')


const indent=12
const icon = {
  control:'•',
  ins_above:'↖︎',
  ins_below:'↘︎',
  sort_down:'▽',
  sort_up:'△',
  del:'⊗',
  add:"⊕"
}
  


// need sort by key capability at each level

// how to preserve comments?

var ydoc = null;
var topent = [];

$(function () {
  ipcRenderer
    .on('selected-yaml', function (event, inf) {
      ydoc = YAML.parseDocument(inf, { prettyErrors: true })
      d3data.render_data(ydoc)
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
  $(".yaml-scalar-value-ctl")
    .each( scalar_control_setup )
  $(document).on("keydown", function (e) {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
      case 'z':
        if (!$( document.activeElement ).is("input")) {
          undo()
        }
        // else in input elt, regular undo
      default:
        return
      }
    }
    else {
      switch (e.key) {
      case 'F7':
        if (topent.length) {
          console.log("sort")
          if (ydoc.sort_at_id( topent[0].__data__.id )) d3data.update_data(ydoc)
        }
        break
      default:
        return
      }
    }
  })
  $(".yaml-obj-ent, .yaml-arr-elt").focusin( function (e) {
    e.stopPropagation()
    let ent = this.closest(".yaml-obj, .yaml-arr")
    $(ent).addClass("yaml-border-hilite")
    topent.forEach( (elt) => { $(elt).removeClass("yaml-border-hilite") } )
    topent.unshift(ent)
  })
  $(".yaml-obj-ent, .yaml-arr-elt").focusout( function (e) {
    e.stopPropagation()    
    $(topent.shift()).removeClass("yaml-border-hilite")
    if (topent.length) {
      $(topent[0]).addClass("yaml-border-hilite")
    }
  })
}

function insert_obj_ent (sib_id, before) {
  console.debug("Enter actions:insert_obj_ent")
  let new_node = ydoc.create_pair_node('new_key', 'SELECT')
  new_node.key.value = new_node.key.value+new_node.id
  // add to node - return sib id and "before" flag
  new_node.sib_id = sib_id
  new_node.before = before
  ydoc.insert_at_id(sib_id,new_node,before)
}

function insert_arr_elt (sib_id,before) {
  console.debug("Enter actions:insert_arr_elt")
  let new_node = ydoc.create_node('SELECT')
  // add to node - return sib id and "before" flag
  new_node.sib_id = sib_id
  new_node.before = before
  ydoc.insert_at_id(sib_id,new_node,before)
}

function do_select () {
  let selected = this.querySelector('select').value;
  let data = this.__data__;
  if (!ydoc.stub_out(data.id, selected)) {
    console.error('error in do_select() - stub not created')
    return false
  }
  d3data.update_data(ydoc)
    .forEach( function (n) {
      $(n).find("span[class$='control']")
        .each( edit_control_setup )
      $(n).find("span[class$='scalar-value-ctl']")
        .each( scalar_control_setup )
      $(n).find("select")
        .off('change')
        .change( function (e) {
          $(e.target).closest('div[class^="yaml"]').each(do_select)
        })
    })
  return true
}

function do_sort () {
  let data = this.__data__;
  if (ydoc.sort_at_id(data.id)) {
    d3data.update_data(ydoc)
  }
  // else ignore
}

function hider (e) {
  e.stopPropagation()
  let tgt = e.target
  let hid = tgt.closest(".yaml-obj-ent").querySelector(".yaml-obj-val")
  let stat = tgt.closest(".yaml-obj-ent").querySelector(".yaml-obj-val-mrk")
  $(hid)
    .fadeToggle(function () {
      if ($(this).css("display") == 'none') {
	$(stat).text(": ...") // stuff hidden here
          .dblclick(hider)
      }
      else {
	$(stat).text(":")
      }
    })
}

function edit_control_setup () {
  let cls;
  if ($(this).hasClass('yaml-obj-ent-control')) cls='yaml-obj-ent'
  if ($(this).hasClass('yaml-arr-elt-control')) cls='yaml-arr-elt'
  $(this)
    .text(icon.control)
    .off('hover')
    .hover(
      function (e) {
        if (e.metaKey || e.ctrlKey)
	  $(this).attr('style','color:red').text(icon.del)
        else {
          $(this).text(icon.ins_above)
        }
	let $elt = $(this)
	$(document).on(
	  "keydown.yaml",
	  function (f) {
            if (!(f.metaKey || f.ctrlKey)) {
              if (f.key == 'Shift') $elt.removeAttr('style').text(icon.ins_below) 
              else if (f.key == 'Meta' || f.key == 'Control') $elt.attr('style','color:red').text(icon.del)
            }
            else if (f.key == 'Meta' || f.key == 'Control') $elt.attr('style','color:red').text(icon.del)

	  }).on(
	    "keyup.yaml",
	    function (f) {
              if (!f.metaKey)
                if (f.key == 'Shift' || f.key == 'Meta' || f.key == 'Control') $elt.removeAttr('style').text(icon.ins_above)
              else {
                if (f.key == 'Shift') $elt.attr('style','color:red').text(icon.del)
                else if (f.key == 'Meta' || f.key == 'Control') $elt.attr('style','color:red').text(icon.del)
              }
	    })
      },
      function (e) {
	$(this).removeAttr('style').text(icon.control)
	$(document).off("keydown.yaml").off("keyup.yaml")
      } )
    .off('click') // make sure there is only one handler (a kludge)
    .click( (e) => {
      e.preventDefault()
      let new_nodes = []
      let node_id = ( cls == 'yaml-obj-ent' ?
                      $(e.target.closest('[data-node-id]')).attr('data-node-id') :
                      // yaml-arr-elt
                      $(e.target).parent().find('[data-node-id]').attr('data-node-id') )
      if ([icon.ins_above,icon.ins_below].indexOf($(e.target).text()) >= 0 ) {
        let bef = ($(e.target).text() == icon.ins_above ? true : false)
	switch (cls) {
	case 'yaml-obj-ent':
          insert_obj_ent(node_id,bef)
	  break
	case 'yaml-arr-elt':
          insert_arr_elt( node_id,bef)
	  break
	default:
	  break
	}
      }
      else if ($(e.target).text() == icon.del) {
        $(e.target).trigger('mouseout')
        ydoc.delete_and_replace_with_SELECT(node_id)
 
      }
      d3data.update_data(ydoc)
        .forEach( function (n) {
          $(n).find("span[class$='control']")
            .each( edit_control_setup )
          $(n).find("span[class$='scalar-value-ctl']")
            .each( scalar_control_setup )
          $(n).find("select")
            .off('change') // make sure there is only one handler (a kludge)
            .change( function (e) {
              $(e.target).closest('div[class^="yaml"]').each(do_select)
            })
        })
      // clean up kludge
      if (!$(e.target).parent().find('[data-node-id]').length) {
        $(e.target).parent().remove()
      }
    })
}

function scalar_control_setup() {
  $(this)
    .text(icon.del)
    .off('click')
    .click( (e) => {
      e.preventDefault()
      let node_id = $(e.target.closest('[data-node-id]')).attr('data-node-id')
      ydoc.delete_and_replace_with_SELECT(node_id)
      d3data.update_data(ydoc)
        .forEach( function (n) {
          $(n).find("select")
            .off('change') // make sure there is only one handler (a kludge)
            .change( function (e) {
              $(e.target).closest('div[class^="yaml"]').each(do_select)
            })
        })
    })
}

function undo() {
  console.debug("Enter actions:undo")
  if (ydoc.undo()) {
    d3data.update_data(ydoc)
      .forEach( function (n) {
        $(n).find("span[class$='control']")
          .each( edit_control_setup )
        $(n).find("span[class$='scalar-value-ctl']")
          .each( scalar_control_setup )
        $(n).find("select")
          .off('change')
          .change( function (e) {
            $(e.target).closest('div[class^="yaml"]').each(do_select)
          })
      })    
    return true
  }
  return false
}

////// deprec

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


// deprec
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
