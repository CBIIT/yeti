const YAML = require('yaml')
const ytypes = require('yaml/types')
const ydoci = require('../ydoci.js')

yd = new YAML.Document()
yd.contents = YAML.createNode({ this:"that" })
ydoci.instrument_ydoc(yd)

test('tiny MAP correctly indexed', () => {
  expect(yd._type_ynode(yd.contents)).toBeTruthy()
  expect(yd._add_ynode_ids(yd.contents)).toBeTruthy()
  let a = []
  yd.__walk(yd.contents, (n) => { a.push(n.id) }, true)
  expect(a).toStrictEqual(['n0','n1','n2'])
})
