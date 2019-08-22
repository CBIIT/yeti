const $ = require('jquery')
const _ = require('lodash')
const indent_inc=0

$(function () {
  // collapse/expand value, dbl-click key
  $(".yaml-obj-key")
    .dblclick( hider )
  $(".yaml-obj-ent-control")
    .text("+")
    .click( (e) => {
      e.stopPropagation
      insert_obj_ent(e.target.closest(".yaml-obj-ent"))
    })
  $(".yaml-arr-elt-control")
    .text("+")
    .click( (e) => {
      e.stopPropagation
      insert_arr_elt(e.target)
    })
  console.log(parse_dom())
})

function insert_obj_ent (tgt) {
  let ind = $(tgt.closest('.yaml-obj')).css('padding-inline-start')
  ind = Number(ind.match(/^([0-9]+)px/)[1])
  if (!ind) {
    console.error("Couldn't find an indent padding (insert_obj_ent)")
  }
  create_obj_ent(ind).insertBefore($(tgt))
//  tgt.insertAdjacentElement('beforebegin',elt[0])
}

function insert_arr_elt (tgt) {
  let ind = $(tgt.closest('.yaml-arr')).css('padding-inline-start')
  ind = Number(ind.match(/^([0-9]+)px/)[1])
  if (!ind) {
    console.error("Couldn't find an indent padding (insert_obj_ent)")
  }
  create_arr_elt(ind).insertAfter($(tgt))
}

function create_obj_ent (indent) {
  let elt = $('<div class="yaml-obj-ent">' +
	      '<span class="yaml-obj-ent-control">+</span>' +
	      '<input class="yaml-obj-key" value="">'+
	      '<span class="yaml-obj-val-mrk">:</span>'+
	      '<div class="yaml-obj-val"></div>'+
	      '<span class="yaml-status></span>'+
	      '</div>');
  create_type_select(indent).appendTo(elt.find('.yaml-obj-val'))
  $(elt).find(".yaml-obj-key")
    .dblclick( hider )
  $(elt).find(".yaml-obj-ent-control")
    .click( (e) => {
      e.stopPropagation
      insert_obj_ent(e.target.closest(".yaml-obj-ent"))
    })
  return elt
}

function create_arr_elt (indent) {
  let elt = $('<div class="yaml-arr-elt">' +
	      '<span class="yaml-arr-elt-mrk">-</span>'+
	      '<span class="yaml-arr-elt-control"> +</span>' +
	      '<span class="yaml-status"></span>'+
	      '</div>');
  create_type_select(indent).insertAfter(elt.find('.yaml-arr-elt-mrk'))
  $(elt).find(".yaml-arr-elt-control")
    .click( (e) => {
      e.stopPropagation
      insert_arr_elt(e.target)
    })
  return elt
}
function create_obj (indent) {
  let obj = $( '<div class="yaml-obj yaml-entity" style="padding-inline-start:'+indent+'px">'+
	       '<span class="yaml-status"></span></div></div>' )
  create_obj_ent(indent).insertBefore(obj.find('.yaml-status'))
  return obj
}

function create_arr (indent) {
  let arr = $( '<div class="yaml-arr yaml-entity" style="padding-inline-start:'+indent+'px">'+
	       '<span class="yaml-status"></span></div></div>' )
  create_arr_elt(indent).insertBefore(arr.find('.yaml-status'))
  return arr
}

function create_type_select(indent) {
  let sel = $('<select><option value="">select</option>'+
	      '        <option value="scalar">scalar</option>'+
	      '        <option value="array">array</option>' +
	      '        <option value="object">object</option>'+
	      '</select>');
  sel.change(function () {
    switch (sel[0].value) {
    case 'scalar':
      $(this).replaceWith($('<input class="yaml-ptext" value="">'))
      break
    case 'array':
      $(this).replaceWith(create_arr(indent))
      break
    case 'object':
      $(this).replaceWith(create_obj(indent))
      break
    default:
      console.error("Type selection '"+sel[0].value+"' is unknown");
    }
  }) 
  return sel
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
      }
      else {
	$(stat).text("")
      }
    })
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
