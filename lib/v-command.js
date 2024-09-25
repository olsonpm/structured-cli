'use strict'

//---------//
// Imports //
//---------//

const common = require('./common'),
  fp = require('lodash/fp'),
  madonna = require('madonna-fp/es6'),
  utils = require('./utils'),
  vCommandArg = require('./v-command-arg')
//------//
// Init //
//------//

const createError = common.createError,
  getDuplicateArgProps = common.getDuplicateArgProps,
  getDuplicateArgsMatching = common.getDuplicateArgsMatching,
  jstring = utils.jstring,
  gt = madonna.CRITERION_FNS.gt,
  nameRegex = /^[a-zA-Z][a-zA-Z0-9_]+$/
const safeCommandMarg = getSafeCommandMarg()

//------//
// Main //
//------//

const vCommand = madonna.createValidator(safeCommandMarg)

//-------------//
// Helper Fxns //
//-------------//

function furtherValidateCommand(argsObj) {
  let errMsg

  // ensure we have a command name
  if (!argsObj.name && (!argsObj.fn.name || !nameRegex.test(argsObj.fn.name))) {
    errMsg =
      'Invalid Input: Command requires either name to be defined ' +
      'or for the\nfunction name to pass the following regex: ' +
      nameRegex.toString() +
      '\n\n' +
      'The function name that was passed: ' +
      (argsObj.fn.name || "''") +
      '\n'

    throw createError('Invalid Input', errMsg, 'vCommand_mustHaveValidName', {
      fnName: argsObj.fn.name,
    })
  }

  // ensure unique arg names
  const duplicateNames = getDuplicateArgProps('name', argsObj.args)
  if (duplicateNames.length) {
    const argsWithDuplicateNames = getDuplicateArgsMatching(
      'name',
      duplicateNames,
      argsObj.args
    )
    errMsg =
      'Command requires argument names to be unique.\n' +
      'The following names are duplicate: ' +
      duplicateNames.join(', ') +
      '\n\n' +
      'Args with duplicate names: ' +
      jstring(argsWithDuplicateNames)

    throw createError('Invalid Input', errMsg, 'vCommand_duplicateArgNames', {
      duplicateArgNames: duplicateNames,
      argsWithDuplicateNames: argsWithDuplicateNames,
    })
  }

  // ensure unique arg aliases
  const duplicateAliases = getDuplicateArgProps('alias', argsObj.args)
  if (duplicateAliases.length) {
    const argsWithDuplicateAliases = getDuplicateArgsMatching(
      'alias',
      duplicateAliases,
      argsObj.args
    )
    errMsg =
      'Command requires argument aliases to be unique.\n' +
      'The following aliases are duplicate: ' +
      duplicateAliases.join(', ') +
      '\n\n' +
      'Args with duplicate aliases: ' +
      jstring(argsWithDuplicateAliases)

    throw createError('Invalid Input', errMsg, 'vCommand_duplicateArgAliases', {
      duplicateAliases,
      argsWithDuplicateAliases,
    })
  }

  return { isValid: true }
}

function getSafeCommandMarg() {
  return {
    schema: {
      alias: ['isCharacter'],
      args: {
        flags: ['isLaden'],
        passEachTo: vCommandArg,
      },
      completionDesc: ['isLadenString'],
      desc: ['require', 'isLadenString'],
      fn: ['require', 'isFunction'],
      marg: ['isLadenPlainObject'],
      name: {
        flags: ['require', 'isString'],
        custom: {
          hasSizeGt1: fp.flow(fp.size, gt(1)),
        },
      },
    },
    opts: {
      name: 'vCommand',
      cb: furtherValidateCommand,
    },
  }
}

//---------//
// Exports //
//---------//

module.exports = vCommand
