const yaml = require('yaml')
const ytypes = require('yaml/types')
const fs = require('fs')
const ydoci = require('./ydoci.js')

yf = fs.readFileSync('test.yaml','utf-8')
yd = yaml.parseDocument(yf)
ydoci.instrument_ydoc(yd)

// get_node_by_id
// create_node
// index_node
// remove_node_by_id
// insert_at_id
// append_to_id


// yd.__walk( yd.contents, (d) => { console.log(d.type, d.id, d.parent_id,
//                                             d.key ? d.key.value : (d.value ? d.value : "")) })
// yields following test structure:
// PAIR n1 n0 red
// PAIR n2 n0 blue
// PAIR n3 n0 yellow
// MAP n4 n1 
// PAIR n5 n4 rojo
// PAIR n6 n4 azul
// PAIR n7 n4 amarillo
// PLAIN n8 n5 1
// SEQ n9 n6 
// PLAIN n10 n9 a
// PLAIN n11 n9 b
// PLAIN n12 n9 c
// PLAIN n13 n7 
// MAP n14 n2 
// PAIR n15 n14 blau
// PAIR n16 n14 rot
// PAIR n17 n14 gelb
// PLAIN n18 n15 5
// PLAIN n19 n16 6
// SEQ n20 n17 
// MAP n21 n20 
// MAP n22 n20 
// PAIR n23 n21 gruen
// PAIR n24 n21 braun
// PLAIN n25 n23 7
// PLAIN n26 n24 8
// PAIR n27 n22 schwarz
// PLAIN n28 n27 kopf
// MAP n29 n3 
// PAIR n30 n29 bleu
// SEQ n31 n30 
// PLAIN n32 n31 rose
// PLAIN n33 n31 violette
// PLAIN n34 n31 brun

test('yd root is n0', () => {
  expect(yd.contents.id).toBe('n0')
})
test('yd root parent is container', () => {
  expect(yd.contents.parent_id).toBe('container')
})
test('ordered index is correct', () => {
  expect(yd.order.map(d => d.id)).toStrictEqual(['n0','n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24', 'n25', 'n26', 'n27', 'n28', 'n29', 'n30', 'n31', 'n32', 'n33', 'n34','n35', 'n36', 'n37', 'n38', 'n39', 'n40', 'n41', 'n42', 'n43', 'n44','n45','n46'])
})
test('order same length as index', () => {
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})
test('yd is yaml Doc', () =>{
  expect(yd).toBeInstanceOf(yaml.Document)
})
test('ydoc has red toplevel', () => {
  expect(yd.contents.has('red')).toBeTruthy()
})
test('all elts have an id', () => {
  expect( () => {
    yd.__walk( yd.contents, (d) => { if (!d.id) { throw new Error('no id found on elt') } }, true)
  } ).not.toThrow()
})
test('all non-root elts have a parent_id', () => {
  expect( () => {
    yd.__walk( yd.contents, (d) => { if (!d.parent_id) { throw new Error(`no parent_id found on elt ${d.id}`) } })
  } ).not.toThrow()
})
test('n0 is MAP', () => {
  expect( yd.get_node_by_id('n0').type ).toBe('MAP')
})
test('n1-n3 red, blue, yellow', () => {
  expect( ['n1','n2','n3'].map( n => yd.get_node_by_id(n).key.value) ).toStrictEqual(['red','blue','yellow'])
})
test('n23: gruen', () => {
  expect( yd.get_node_by_id('n23').key.value ).toBe('gruen')
})
test('gruen grandparent is SEQ', () => {
  expect( yd.get_parent_by_id(yd.get_parent_by_id('n23').id).type ).toBe('SEQ')
})
test('remove violette node (mbr of SEQ)', () => {
  let pn = yd.get_parent_by_id('n34')
  expect(pn.type).toBe('SEQ')
  expect(yd.get_node_by_id('n33').value).toBe('violette')
  expect(pn.get(1)).toBe('violette')
  expect(yd.remove_node_by_id('n33')).toBeTruthy()
  expect(yd.get_node_by_id('n33')).toBeFalsy()
  expect(pn.get(1)).toBe('brun')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})
  
test('remove yellow node (PAIR of MAP)', () => {
  expect( yd.get_node_by_id('n3').key.value ).toBe('yellow')
  expect( yd.remove_node_by_id('n3') ).toBeTruthy()
  expect( yd.get_node_by_id('n3')).toBeFalsy()
  expect( yd.get_node_by_id('n30')).toBeFalsy() // 'bleu' node a child of deleted 'yellow' Pair
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

test('create node', () =>{
  nod = yd.create_node( { new: 'before b' })
  expect(nod).toBeTruthy()
  expect(nod.id).toBeTruthy()
  expect(nod.type).toBe('MAP')
})

test('insert node before azul/b', () => {
  let nod = yd.create_node( { new: 'before b' })
  let at = yd.get_node_by_id('n9')
  expect( at.type ).toBe('SEQ')
  expect( at.get(1) ).toBe('b')
  expect( yd.insert_at_id('n11',nod,true)).toBeTruthy()
  expect( yd.get_parent_by_id('n6').getIn(['azul',1]).get('new') ).toBe('before b')
  expect( at.get(2) ).toBe('b')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)  
})

test('insert node before azul/a', () => {
  let nod = yd.create_node( { new: 'before a' })
  let at = yd.get_node_by_id('n9')
  expect( at.type ).toBe('SEQ')
  expect( at.get(0) ).toBe('a')
  expect( yd.insert_at_id('n10',nod,true)).toBeTruthy()
  expect( yd.get_parent_by_id('n6').getIn(['azul',0]).get('new') ).toBe('before a')
  expect( at.get(1) ).toBe('a')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

test('insert node after azul/a', () => {
  let nod = yd.create_node( { new: 'after a' })
  let at = yd.get_node_by_id('n9')
  expect( at.type ).toBe('SEQ')
  expect( at.get(1) ).toBe('a')
  expect( yd.insert_at_id('n10',nod)).toBeTruthy()
  expect( yd.get_parent_by_id('n6').getIn(['azul',2]).get('new') ).toBe('after a')
  expect( at.get(1) ).toBe('a')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)  
})

test('insert pair node after amarillo', () => {
  let nod = yd.create_pair_node( 'new', { boog: 'after amarillo' })
  let at = yd.get_node_by_id('n7')
  let pn = yd.get_parent_by_id('n7')
  expect( at.type ).toBe('PAIR')
  expect( pn.type ).toBe('MAP')
  expect( at.key.value ).toBe('amarillo')
  expect( pn.items[2].key.value ).toBe('amarillo')
  expect( yd.insert_at_id('n7', nod) ).toBeTruthy()
  expect( pn.items[2].key.value ).toBe('amarillo')
  expect( pn.items[3].key.value ).toBe('new')
  expect( pn.items[3].value.type ).toBe('MAP')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

test('insert pair node before amarillo', () => {
  let nod = yd.create_pair_node( 'new_before', { boog: 'after amarillo' })
  let at = yd.get_node_by_id('n7')
  let pn = yd.get_parent_by_id('n7')
  expect( at.type ).toBe('PAIR')
  expect( pn.type ).toBe('MAP')
  expect( at.key.value ).toBe('amarillo')
  expect( pn.items[2].key.value ).toBe('amarillo')
  expect( yd.insert_at_id('n7', nod, true) ).toBeTruthy()
  expect( pn.items[2].key.value ).toBe('new_before')
  console.log( pn.items[2] )
  expect( pn.items[2].value.type).toBe('MAP')
  expect( pn.items[3].key.value ).toBe('amarillo')
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

test('append pair to blue (PAIR to MAP)', () => {
  let ato = yd.get_node_by_id('n2')
  let nod = yd.create_pair_node("new_append", [1,2,3])
  expect(ato.key.value).toBe('blue')
  expect(nod.value.type).toBe('SEQ')
  expect(ato.value.type).toBe('MAP')
  console.log(nod)
  expect( yd.append_to_id(ato.value.id, nod) ).toBeTruthy()
  expect( nod.parent_id).toBe(ato.value.id)
  expect( yd.get_parent_by_id(nod.id) ).toEqual( ato.value )
  expect( ato.value.items[ato.value.items.length-1] ).toEqual( nod )
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

test('prepend scalar to gelb (PLAIN to SEQ)', () => {
  let ato = yd.get_node_by_id('n17')
  let nod = yd.create_node("new_prepend")
  expect(ato.key.value).toBe('gelb')
  expect(nod.type).toBe('PLAIN')
  expect(ato.value.type).toBe('SEQ')
  expect( yd.append_to_id(ato.value.id, nod, true) ).toBeTruthy()
  expect( nod.parent_id).toBe(ato.value.id)
  expect( yd.get_parent_by_id(nod.id) ).toEqual( ato.value )
  expect( ato.value.items[0] ).toEqual( nod )
  expect(Object.keys(yd.index).length).toBe(yd.order.length)
})

// test('remove kopf (value of PAIR)', () => {
//   let pn = yd.get_parent_by_id('n28')
//   expect(pn.type).toBe('PAIR')
//   expect(yd.get_node_by_id('n28').value).toBe('kopf')
//   expect(yd.remove_node_by_id('n28')).toBeTruthy()
//   expect(yd.get_node_by_id('n28')).toBeFalsy()
//   expect(Object.keys(yd.index).length).toBe(yd.order.length)
// })

test('stub scalar at kopf (value of PAIR)', () => {
  let pn = yd.get_parent_by_id('n28')
  let oldn;
  expect(pn.type).toBe('PAIR')
  expect(yd.get_node_by_id('n28').value).toBe('kopf')
  expect(oldn = yd.stub_out('n28','scalar')).toBeTruthy()
  expect(oldn.value).toBe('kopf')
  expect(pn.value.value).toBe('new_value')
  expect(yd.index['n28']).toBeFalsy()
})

test('stub array at former kopf (value of PAIR)', () => {
  let pn = yd.get_node_by_id('n27')
  let id = pn.value.id
  let oldn;
  expect(pn.type).toBe('PAIR')
  expect(yd.get_node_by_id(id).value).toBe('new_value')
  expect(yd.index[id]).toBeTruthy()
  expect(oldn = yd.stub_out(id,'array')).toBeTruthy()
  expect(oldn.value).toBe('new_value')
  expect(pn.value.type).toBe('SEQ')
  expect(pn.value.items[0].value).toBe('SELECT')
  expect(yd.index[id]).toBeFalsy()
})

test('stub object at former kopf (value of PAIR)', () => {
  let pn = yd.get_node_by_id('n27')
  let id = pn.value.id
  let oldn;
  expect(pn.type).toBe('PAIR')
  expect(yd.index[id]).toBeTruthy()
  expect(oldn = yd.stub_out(id,'object')).toBeTruthy()
  expect(oldn.type).toBe('SEQ')
  expect(pn.value.type).toBe('MAP')
  expect(pn.value.items[0].key.value).toBe('new_key')
  expect(pn.value.items[0].value.value).toBe('SELECT')
  expect(yd.index[id]).toBeFalsy()
})

test('stub scalar at c (element of SEQ)', () => {
  let pn = yd.get_parent_by_id('n12')
  let oldn;
  expect(pn.type).toBe('SEQ')
  expect(yd.index['n12']).toBeTruthy()
  expect(yd.get_node_by_id('n12').value).toBe('c')
  let oldi = pn.items.findIndex( (n) => { return n.value == 'c' } )
  expect(oldn = yd.stub_out('n12','scalar')).toBeTruthy()
  expect(oldn.value).toBe('c')
  expect( pn.items.findIndex( (n) => { return n.value == 'new_value' } ) ).toBe(oldi)
  expect(yd.index['n12']).toBeFalsy()
})

test('stub array at old c (element of SEQ)', () => {
  let pn = yd.get_node_by_id('n9')
  let id = pn.items.find( (n) => { return n.value == 'new_value' } ).id
  expect(pn.type).toBe('SEQ')
  expect(yd.index[id]).toBeTruthy()
  let oldi = pn.items.findIndex( (n) => { return n.id == id } )
  expect(oldn = yd.stub_out(id,'array')).toBeTruthy()
  expect(oldn.value).toBe('new_value')
  expect( pn.items.findIndex( (n) => { return n.type == 'SEQ' } ) ).toBe(oldi)
  expect(yd.index[id]).toBeFalsy()
})

test('stub object at old c (element of SEQ)', () => {
  let pn = yd.get_node_by_id('n9')
  let id = pn.items.find( (n) => { return n.type == 'SEQ' } ).id
  expect(pn.type).toBe('SEQ')
  expect(yd.index[id]).toBeTruthy()
  let oldi = pn.items.findIndex( (n) => { return n.id == id } )
  expect(oldn = yd.stub_out(id,'object')).toBeTruthy()
  expect(oldn.type).toBe('SEQ')
  expect( pn.items.findIndex( (n) => { return n.type == 'MAP' && n.items[0].value == 'SELECT' } ) ).toBe(oldi)
  expect(yd.index[id]).toBeFalsy()
})

