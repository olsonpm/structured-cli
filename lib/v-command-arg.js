'use strict'

//---------//
// Imports //
//---------//

const common = require('./common'),
  fp = require('lodash/fp'),
  madonna = require('madonna-fp/es6'),
  utils = require('./utils')

//------//
// Init //
//------//

const createError = common.createError,
  isDefined = utils.isDefined,
  jstring = utils.jstring

const safeArgMarg = getSafeArgMarg()

//------//
// Main //
//------//

const vCommandArg = madonna.createValidator(safeArgMarg)

//-------------//
// Helper Fxns //
//-------------//

function getSafeArgMarg() {
  return {
    schema: {
      alias: {
        flags: ['isCharacter'],
        matchesRegex: /^[^\s-]$/,
      },
      argCompletionText: ['isLadenString'],
      completionDesc: ['isLadenString'],
      default: ['isDefined'],
      desc: ['require', 'isLadenString'],
      example: ['isLadenString'],
      flags: {
        flags: ['isLadenArray'],
        allContainedIn: ['require'], // this will likely grow to more than a single element
      },
      name: {
        flags: ['require', 'isString'],
        matchesRegex: /^[^\s-][^\s]+$/,
      },
      type: {
        flags: ['require'],
        containedIn: ['boolean', 'string', 'number'],
      },
    },
    opts: {
      cb: furtherValidateArg,
      name: 'vCommandArg',
    },
  }
}

function furtherValidateArg(argsObj) {
  // ensure require and default aren't both declared
  if (fp.includes('require', argsObj.flags) && argsObj.default) {
    throw createError(
      'Invalid Input',
      "Since the 'default' option implies an optional parameter," +
        " it is not allowed alongside the 'require' flag\n" +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_requireWithDefault',
      {
        argsObj: argsObj,
      }
    )
  }

  // ensure require isn't declared on a boolean arg
  if (fp.includes('require', argsObj.flags) && argsObj.type === 'boolean') {
    throw createError(
      'Invalid Input',
      "The 'require' flag doesn't apply to boolean arguments.  The presence of" +
        " a boolean argument indicates the value 'true', thus if it were required the value would always be true\n" +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_requireWithBoolean',
      {
        argsObj: argsObj,
      }
    )
  }

  // ensure default isn't declared on a boolean arg
  if (isDefined(argsObj.default) && argsObj.type === 'boolean') {
    throw createError(
      'Invalid Input',
      "Default values don't apply to boolean arguments since their presence" +
        " should always indicate the value 'true'\n" +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_defaultWithBoolean',
      {
        argsObj: argsObj,
      }
    )
  }

  // ensure example IS NOT declared on a BOOLEAN arg
  if (isDefined(argsObj.example) && argsObj.type === 'boolean') {
    throw createError(
      'Invalid Input',
      "Examples don't apply to boolean arguments since examples are used to " +
        "generate the usage string.  It wouldn't make sense to have an " +
        'example in place of the flag.\n' +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_exampleWithBoolean',
      {
        argsObj: argsObj,
      }
    )
  }

  // ensure example IS declared on a NON-BOOLEAN arg
  if (fp.isUndefined(argsObj.example) && argsObj.type !== 'boolean') {
    throw createError(
      'Invalid Input',
      'Examples must be provided to non-boolean arguments.  The usage string ' +
        'depends on them\n' +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_exampleRequiredForNonBooleans',
      {
        argsObj: argsObj,
      }
    )
  }

  // ensure argCompletionText is not declared on a boolean arg
  if (argsObj.type === 'boolean' && argsObj.argCompletionText) {
    throw createError(
      'Invalid Input',
      "argCompletionText can't apply to booleans since booleans are never" +
        'passed a value\n' +
        'argsObj: ' +
        jstring(argsObj),
      'vCommandArg_argCompletionTextWithBoolean',
      {
        argsObj: argsObj,
      }
    )
  }

  return { isValid: true }
}

//---------//
// Exports //
//---------//

module.exports = vCommandArg
