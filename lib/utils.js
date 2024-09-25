'use strict'

//
// README
// - common holds domain-specific functionality.  Utils holds non-domain-specific
//   functionality.  Both files contain unscoped logic.
//

//---------//
// Imports //
//---------//

const fp = require('lodash/fp')

//------//
// Main //
//------//

//
// Flipped fp fxns
//

const gt = fp.curry((b, a) => fp.gt(a, b))

//
// Others
//

const defineProp = fp.curry((name, desc, obj) =>
  Object.defineProperty(obj, name, desc)
)

const filteredInvokeMap = fp.curry((aFilter, invokePath, coll) =>
  fp.flow(fp.filter(aFilter), fp.invokeMap(invokePath))(coll)
)

const filteredMap = fp.curry((iteratee, col) =>
  fp.flow(fp.filter(iteratee), fp.map(iteratee))(col)
)

const isDefined = fp.negate(fp.isUndefined)

function jstring(toStr) {
  return JSON.stringify(toStr, null, 2)
}

const keyToVal = fp.curry((keyProp, valProp, arr) =>
  fp.flow(
    fp.filter(keyProp),
    fp.reduce((res, cur) => fp.set(cur[keyProp], cur[valProp], res), {})
  )(arr)
)

const mutableAssign = fp.assign.convert({ immutable: false })

const mutableAssignAll = fp.curry((src, objArr) =>
  fp.reduce(mutableAssign, src, objArr)
)

const createNew = fp.curry((fn, argsObj) => new fn(argsObj))

const mapWithKey = fp.ary(2, fp.map.convert({ cap: false }))

const prepend = fp.curry((str, val) => str + val)

function printArgs() {
  console.log(jstring(arguments))
}

function tee(val) {
  console.dir(val)
  return val
}

const wrapString = fp.curry((left, right, str) => left + str + right)

//---------//
// Exports //
//---------//

module.exports = {
  defineProp: defineProp,
  filteredInvokeMap: filteredInvokeMap,
  filteredMap: filteredMap,
  createNew: createNew,
  gt: gt,
  isDefined: isDefined,
  keyToVal: keyToVal,
  mapWithKey: mapWithKey,
  mutableAssign: mutableAssign,
  mutableAssignAll: mutableAssignAll,
  prepend: prepend,
  jstring: jstring,
  printArgs: printArgs,
  tee: tee,
  wrapString: wrapString,
}
