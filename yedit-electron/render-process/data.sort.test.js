const yaml = require('yaml')
const ytypes = require('yaml/types')
const fs = require('fs')
const ydoci = require('./ydoci.js')

yf = fs.readFileSync('test.yaml','utf-8')
yd = yaml.parseDocument(yf)
ydoci.instrument_ydoc(yd)
yd._setup()

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

test('sort rose/violette/brun (SEQ)', () => {
  expect(yd.get_node_by_id('n31').type).toBe('SEQ')  
  expect(yd.sort_at_id('n31')).toBeTruthy()
  expect(yd.get_node_by_id('n31').items.map( x => x.value ).slice(0,4)).toEqual(['brun','rose','rouge','violette'])
})
test('sort rojo/azul/amarillo (MAP)', () => {
  expect(yd.get_node_by_id('n4').type).toBe('MAP')  
  expect(yd.sort_at_id('n4')).toBeTruthy()
  expect(yd.get_node_by_id('n4').items.map( x => x.key.value)).toEqual(['amarillo','azul','rojo'])
})
test('sort undo', () => {
  expect(yd.undo()).toBeTruthy()
  expect(yd.undo()).toBeTruthy()
  expect(yd.toJSON()).toMatchObject(org_json)  
})

yf = fs.readFileSync('test.yaml','utf-8')
yd = yaml.parseDocument(yf)
ydoci.instrument_ydoc(yd)
yd._setup()
org_json = yd.toJSON()

test('sort at violette (SEQ)', () => {
  expect(yd.get_node_by_id('n33').type).toBe('PLAIN')
  expect(yd.sort_at_id('n33')).toBeTruthy()
  expect(yd.get_node_by_id('n31').items.map( x => x.value ).slice(0,4)).toEqual(['brun','rose','rouge','violette'])
})
test('sort at amarillo (MAP)', () => {
  expect(yd.get_node_by_id('n7').type).toBe('PAIR')
  expect(yd.sort_at_id('n7')).toBeTruthy()
  expect(yd.get_node_by_id('n4').items.map( x => x.key.value)).toEqual(['amarillo','azul','rojo'])
})
