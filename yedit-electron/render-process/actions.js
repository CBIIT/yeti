const $ = require('jquery')
const fs = require('fs')
const d3 = require('d3')
const d3data = require('../data.js')
const ydoci = require('../ydoci.js')
const YAML=require('yaml')
const {ipcRenderer, dialog} = require('electron')


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

var ydoc = null;
var topent = [];
var comments_to_check = [];

$(function () {
  ipcRenderer
    .on('selected-yaml', function (event, inf) {
      try {
        ydoc = YAML.parseDocument(inf, { prettyErrors: true })
        console.log(ydoc)
      }
      catch (e) {
        console.error(e)
        return
      }
      d3data.render_data(ydoc)
      yaml_doc_setup()
    })
    .on('selected-save-yaml', function (event, pth) {
      fs.writeFile(pth, ydoc.toString(), {encoding:'utf8',flag:'w'}, (err) => {
        if (err) {
          console.error(err)
        }
        else {
          console.log(`Saved ${pth}`)
          ipcRenderer.send('clean')
        }
      })
    })
    .on('create-new-yaml', function (event) {
      ydoc = new YAML.Document()
      ydoc.contents = YAML.createNode('SELECT')
      d3data.render_data(ydoc)
      yaml_doc_setup()
      $('#yaml-container').find("option")
        .filter( function () {
          return $(this).text().match(/scalar/) ? true : false
        })
        .remove()
      $('#yaml-container').find("select")
        .off('change')
        .change( function (e) {
          $(e.target).closest('div[class^="yaml"]').each(
            function () {
              let nd;
              switch (this.querySelector('select').value) {
              case 'object':
                nd = YAML.createNode({ key: 'value' })
                break
              case 'array':
                nd = YAML.createNode(['value'])
                break
              default:
                console.error('Unknown option')
                return
              }
              $('#yaml').find('.insert-here')
                .children()
                .remove()
              ydoc = new YAML.Document()
              ydoc.contents = nd
              d3data.render_data(ydoc)
              yaml_doc_setup()
            }
          )
        })
    })
    .on('dispatch-yaml-string', function (event) {
      console.log('received dispatch-yaml-string')
      ipcRenderer.send('yaml-string', ydoc.toString())
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
  $("[class$='comment']")
    .each( comment_setup )
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
      case 'F7': // sort at level
        if (topent.length) {
          if (ydoc.sort_at_id( topent[0].__data__.id )) d3data.update_data(ydoc)
        }
        break
      case 'F8': // collapse at level
        if (topent.length) {
          let elt = topent[0]
          $(elt).find('.insert-here')
            .children('.yaml-obj-ent')
            .find('.yaml-obj-val')
            .fadeToggle()
        }
        break
      case 'F12': // open comment locations
        console.log('hey f12')
        console.log(e.target)
        $(e.target)
          .each(open_comment_locations)
        break
      default:
        return
      }
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
      $(n).find("[class$='comment']")
        .each( comment_setup )
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
          $(n).find("[class$='comment']")
            .each( comment_setup )
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

function comment_setup() {
  $(this)
    .off('mouseover')
    .off('mouseout')
    .off('click')
    .off('focusout')
    .hover(
      function () {
        $(this).attr('style','color: blue')
      },
      function () {
        $(this).attr('style','')
      }
    )
    .click( function () {
      let comment_elt = this
      let txt = $(this).find('.yaml-comment-content').text()
      let loc = $(this).find('.yaml-comment-content').attr('data-comment-loc')
      let d_id = this.__data__.id
      if (!txt)
        return
      let ht = $(this).height()
      let wd = 0.95*$(this).width()
      let fsz = $(this).css('font-size')
      $(this).find('.yaml-comment-content').replaceWith(`<textarea class="yaml-comment-textarea" data-comment-loc="${loc}">${txt}</textarea>`)
      $(this).find('textarea')
        .height(ht)
        .width(wd)
        .css('font-size',fsz)
        .css('font-style','italic')
        .trigger('focus')
        .each( function () {
          if ($(this).val() == 'add comment')
            this.setSelectionRange(0, $(this).val().length)
        })
        .focusout( function () {
          let val = $(this).val()
          $(this).replaceWith(`<span class="yaml-comment-content" data-comment-loc="${loc}">${val}</span>`)
          // update data structure
          let nd = ydoc.get_node_by_id(d_id)
          switch (loc) {
          case 'before':
            nd.commentBefore = val
            break;
          case 'on':
            nd.comment = val
            break;
          default:
            console.error("Comment content element - data-loc attribute problem")
          }
          comments_to_check.push(comment_elt)
          clean_up_comments()
        })
      })
}

function open_comment_locations() {
  console.debug("Enter actions:open_comment_locations")
  // only work on input elements
  if (this.tagName != 'INPUT') {
    return false
  }
  let belongs = this.closest('.yaml-obj,.yaml-arr')
  if ($(belongs).hasClass('yaml-obj')) {
    // in MAP
    let ent = this.closest('.yaml-obj-ent')
    let val = $(ent).children('.yaml-obj-val').get(0)
    if ($(val).children(':first-child').hasClass('yaml-scalar')) {
      $(ent).children('.yaml-comment')
        .each(turn_on_comment)
      $(val).find('.yaml-item-comment')
        .each(turn_on_comment)
    }
    else {
      $(ent)
        .children('.yaml-comment,.yaml-item-comment')
        .each(turn_on_comment)
    }
    $(belongs)
      .children('.yaml-comment,.yaml-item-comment')
      .each(turn_on_comment)
  }
  else if ($(belongs).closest('.yaml-arr')) {
    let elt = this.closest('.yaml-arr-elt')
    $(elt)
      .children('.yaml-comment,.yaml-item-comment')
      .each(turn_on_comment)
    $(belongs)
      .children('.yaml-comment,.yaml-item-comment')
      .each(turn_on_comment)
  }
  else {
    return false
  }
  function turn_on_comment() { 
    $(this).children('.yaml-comment-mrk')
      .each( function () {
        if (!this.innerHTML.match(/#/)) {
          this.innerHTML = '# '
          $(this).css('color','green')
        }
      })
    $(this).children('.yaml-comment-content')
      .each( function () {
        if (!this.innerHTML) {
          this.innerHTML = 'add comment'
        }
      })
    comments_to_check.push(this)
  }
}

function clean_up_comments () {
  for (let c = comments_to_check.pop(); c ; c = comments_to_check.pop()) {
    $(c).find('.yaml-comment-mrk').removeAttr('style')
    let content = c.querySelector('.yaml-comment-content').innerHTML
    if ( content == '' || content == 'add comment') {
      c.querySelector('.yaml-comment-content').innerHTML = ''
      c.querySelector('.yaml-comment-mrk').innerHTML = ''
    }
  }
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

