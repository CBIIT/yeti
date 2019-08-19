# yedit - sort-of yaml editor

## Handles on data structure

Mark up a yaml document (or any scalar/array/object structure) with CSS classes, so that each element can be operated on.

| element | class name |
| ------- | ---------- |
| document | yaml |
| header | yaml-hdr |
| plain text | yaml-ptext |
| number | yaml-number |
| boolean | yaml-bool |
| yaml entity (arr or obj) | yaml-entity |
| array container | yaml-arr |
| array element | yaml-arr-elt |
| object container | yaml-obj |
| object entry | yaml-obj-ent |
| object entry key | yaml-obj-key |
| object entry value | yaml-obj-val |

Syntax markers:

| syntax | class name |
| ------ | ---------- |
| \| (plain text marker) | yaml-ptext-mrk |
| - (array element marker) | yaml-arr-elt-mrk |
| : (obj entry value marker) | yaml-obj-val-mrk |

Control areas

| control | class name |
| ------- | ---------- |
| yaml type insertion | yaml-type-sel |
| object entry control area | yaml-obj-ent-control |
| array element control area | yaml-arr-elt-control |
| status area | yaml-status |

So let the classes impart a structure that is independent of the DOM elements that are forming the layout.

In general, use following DOM elements for the yaml classes

| class name | possible DOM element |
| ---------- | -------------------- |
| yaml | div |
| yaml-hdr | div, span |
| yaml-ptext | div, span (containing the text), input |
| yaml-number | div, span, input |
| yaml-arr | div |
| yaml-arr-elt | div, span, input | 
| yaml-obj | div |
| yaml-obj-ent | div |
| yaml-obj-key | div, span, input |
| yaml-obj-val | div, span, input |

Collapse/expand - on yaml, yaml-arr, yaml-obj divs

obj-key
- must encompass single ptext only
arr-elt, obj-val
- can encompass ptext, number, arr, or obj
yaml
- unique
- must encompass hdr and _either_ arr _or_ obj only
yaml-hdr
- unique

## Layout
### Read and markup object

## Editing

### Create 

Add new elements
- object
- object entry
- object entry value
- array
- array element

### Update
cut, paste, insert, delete

Content updates: edit single entities

Structure updates: paste/insert substructures

### Delete

Cut/delete substructures

## Navigation

### Forward/back

- by character
- by sibling entity
- by ancestor/descendant

### Collapse/Expand

## Document actions

### Read from external source (e.g. disk)
### Write to external location (e.g. disk)
