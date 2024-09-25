'use strict'

//
// README
// - common holds domain-specific functionality.  Utils holds non-domain-specific
//   functionality.  Both files contain unscoped logic.
//

//---------//
// Imports //
//---------//

const fp = require('lodash/fp'),
  utils = require('./utils'),
  wordWrap = require('word-wrap')

//------//
// Init //
//------//

const defineProp = utils.defineProp,
  gt = utils.gt,
  isDefined = utils.isDefined,
  mSet = getMutableSet(),
  VIEW_WIDTH = 80 // chars

//------//
// Main //
//------//

const createError = (name, msg, id, data) => {
  return fp.flow(
    mSet('name', name),
    defineProp('id', { enumerable: true, value: 'map_' + id }),
    data ? defineProp('data', { enumerable: true, value: data }) : fp.identity
  )(new Error(msg))
}

const getDuplicateArgProps = (str, props) => {
  return fp.flow(
    fp.pickBy(str),
    fp.countBy(str),
    fp.pickBy(gt(1)),
    fp.keys
  )(props)
}

const getDuplicateArgsMatching = (propKey, dupes, args) => {
  return fp.flow(
    fp.pickBy(anArg => fp.includes(anArg[propKey], dupes)),
    fp.values
  )(args)
}

function getMutableSet() {
  return fp.set.convert({ immutable: false })
}

const wrapText = (str, multiLineLeftIndent) => {
  multiLineLeftIndent = isDefined(multiLineLeftIndent) ? multiLineLeftIndent : 2

  const wrapWidth = VIEW_WIDTH - multiLineLeftIndent
  const lines = fp.split(
    '\n',
    wordWrap(str, { width: wrapWidth, indent: '', amendOrphan: true })
  )
  const firstLine = lines.shift()

  return fp.flow(
    fp.map(
      fp.flow(fp.concat(fp.repeat(multiLineLeftIndent, ' ')), fp.join(''))
    ),
    fp.concat(firstLine),
    fp.join('\n')
  )(lines)
}

//---------//
// Exports //
//---------//

module.exports = {
  createError: createError,
  getDuplicateArgProps: getDuplicateArgProps,
  getDuplicateArgsMatching: getDuplicateArgsMatching,
  VIEW_WIDTH: VIEW_WIDTH,
  wrapText: wrapText,
}
