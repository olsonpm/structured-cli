'use strict'

//---------//
// Imports //
//---------//

const CommandArg = require('./command-arg'),
  common = require('./common'),
  fp = require('lodash/fp'),
  madonna = require('madonna-fp/es6'),
  utils = require('./utils')

//------//
// Init //
//------//

const mapWithKey = utils.mapWithKey,
  wrapString = utils.wrapString,
  wrapText = common.wrapText

//------//
// Main //
//------//

function parseCommandArgs(aCommand) {
  const passedArgs = process.argv.slice(3)

  const helpArg = new CommandArg({
    name: 'help',
    alias: 'h',
    type: 'boolean',
    desc: 'unused',
    example: 'unused',
  })
  aCommand.args = fp.concat([helpArg], aCommand.args)

  // handle showHelp first
  const requiredArgs = fp.filter(fp.invoke('isRequired'), aCommand.args)

  // just call the function if there aren't any args
  if (!requiredArgs.length && !passedArgs.length) return aCommand.fn({})

  if (
    (requiredArgs.length && !passedArgs.length) ||
    helpArg.isCliAliasOrName(passedArgs[0])
  ) {
    const std = passedArgs.length === 0 ? 2 : 1
    if (std === 2) {
      const errMsg =
        requiredArgs.length === 1
          ? `Error: Please provide the required argument '${requiredArgs[0].name}'`
          : 'Error: Please provide the required arguments listed below'
      console.error('\n' + errMsg)
    }
    showHelp(aCommand, std)
    return
  }

  // parseArgs mutates the command args by assigning the passed value to each
  //   arg (or in the case of flags, assigns true)
  // Eventually I want to learn facebook's "immutable" library, but for now I
  //   just want to move forward
  const argsParsedSuccessfully = parseArgs(aCommand, passedArgs)

  // if success is falsey, that means it ran into an error and showed the
  //   help text
  if (!argsParsedSuccessfully) return

  const resultingArgsObj = aCommand.getArgsResult()

  // if marg was passed,
  if (aCommand.marg) {
    const res = madonna.validate(aCommand.marg, resultingArgsObj)
    if (!res.isValid) {
      // TODO: Prior to this point, we should ensure that the marg schema
      //   matches arguments declared in the command.  Really only name and
      //   (non-boolean) require should need checking.  By doing so, it will be
      //   impossible to get any error besides 'criterionFailed'.  This is
      //   necessary complexity because I don't want to impose madonna
      //   onto consumers.
      const mapFailedCustomCriterion = val => {
        let res = fp.keys(val)
        if (val.flags) {
          res = fp.without(res, ['flags']).concat(val.flags)
        }
        if (val.custom) {
          res = fp.without(res, ['custom']).concat(val.custom)
        }
        return res
      }
      const failedCriterionDisplay = fp.flow(
        mapWithKey(
          (val, key) => key + ': ' + mapFailedCustomCriterion(val).join(', ')
        ),
        fp.map(wrapText),
        fp.join('\n')
      )(res.err.data.failedCriterion)
      console.error(
        '\nError: The following arguments failed to meet their ' +
          'criterion\n' +
          failedCriterionDisplay +
          '\n\n' +
          'Please refer to the argument descriptions below.'
      )
      showHelp(aCommand, 2)
      return
    }
  }

  // otherwise let's run the command function
  aCommand.fn(resultingArgsObj)
}

//-------------//
// Helper Fxns //
//-------------//

function showHelp(aCommand, std) {
  const out = std === 1 ? console.log : console.error

  // 3 = the number of spaces between the longest command/entry option and their
  //   corresponding description
  const padLength = getMaxLength(aCommand) + 3,
    maxTypeStrLength = fp.flow(
      fp.reject(anArg => anArg.name === 'help'),
      fp.map(fp.get('type.length')),
      fp.max
    )(aCommand.args)

  const requiredAndOptionalArgs = fp.flow(
    fp.reject({ name: 'help' }),
    fp.partition(anArg => fp.includes('require', anArg.flags))
  )(aCommand.args)

  const requiredArgs = requiredAndOptionalArgs[0],
    optionalArgs = requiredAndOptionalArgs[1]

  let argDescriptions = ''

  if (requiredArgs.length) {
    argDescriptions +=
      '\n\n' +
      fp.flow(
        fp.invokeArgsMap('getDescLine', [padLength, maxTypeStrLength]),
        fp.concat('Required Arguments'),
        fp.join('\n')
      )(requiredArgs)
  }

  if (optionalArgs.length) {
    argDescriptions +=
      '\n\n' +
      fp.flow(
        fp.invokeArgsMap('getDescLine', [padLength, maxTypeStrLength]),
        fp.concat('Optional Arguments'),
        fp.join('\n')
      )(optionalArgs)
  }

  const description = wrapText(`Description: ${aCommand.desc}`),
    commandArgsUsage = getCommandArgsUsage(requiredArgs, optionalArgs),
    usage = wrapText(
      `Usage: ${aCommand.entryCommand} ${aCommand.name} ${commandArgsUsage}`
    )

  let outStr = `
${description}

${usage}${argDescriptions}
`

  if (out === console.error) {
    outStr += `\nTo display this help text, type '${aCommand.entryCommand} ${aCommand.name} --help\n`
  }

  out(outStr)
}

// gets the maximum string length between the command names and entry command
//   options (help/version)
function getMaxLength(aCommand) {
  return fp.flow(
    fp.map(anArg => anArg.getAliasCommaName().length),
    fp.max
  )(aCommand.args)
}

function getCommandArgsUsage(requiredArgs, optionalArgs) {
  const requiredCliNameExamplePairs = fp.flow(
    fp.over([fp.invokeMap('getCliName'), fp.map('example')]),
    fp.spread(fp.zip)
  )(requiredArgs)

  const optionalCliNameExamplePairs = fp.flow(
    fp.map(optArg => {
      const res = [optArg.getCliName()]
      if (optArg.example) res.push(optArg.example)
      return res
    }),
    fp.map(aPair => [wrapString('[', ']', aPair.join(' '))])
  )(optionalArgs)

  return fp.flow(
    fp.concat(optionalCliNameExamplePairs),
    fp.map(fp.join(' ')),
    fp.join('  ')
  )(requiredCliNameExamplePairs)
}

function parseArgs(aCommand, passedArgs) {
  const getCurArg = createGetCurArg(aCommand)
  let curArg, curPassedArg, val // val is only used in case 'number';

  while (passedArgs.length) {
    // eslint throws a fit when I place this assignment inside the while
    curPassedArg = passedArgs[0]
    curArg = getCurArg(curPassedArg)
    if (!curArg) break
    else passedArgs.shift()

    switch (curArg.type) {
      case 'string':
        if (!passedArgs.length) {
          console.error(
            "\nError: Argument '" +
              curPassedArg +
              "' requires a string argument to be passed"
          )
          showHelp(aCommand, 2)
          return
        }
        curArg.setValue(passedArgs.shift())
        break

      case 'number':
        if (!passedArgs.length) {
          console.error(
            "\nError: Argument '" +
              curPassedArg +
              "' requires a number argument to be passed"
          )
          showHelp(aCommand, 2)
          return
        }
        val = passedArgs.shift()
        if (isNaN(fp.toNumber(val))) {
          console.error(
            '\nError: Argument must be passed a valid number.\n' +
              'Argument: ' +
              curPassedArg +
              '\n' +
              'Value: ' +
              val
          )
          showHelp(aCommand, 2)
          return
        }
        curArg.setValue(fp.toNumber(val))
        break

      case 'boolean':
        curArg.setValue(true)
        break
    }
  }

  if (passedArgs.length && !curArg) {
    console.error(
      "\nError: Stopped parsing due to the invalid argument '" +
        curPassedArg +
        "'"
    )
    showHelp(aCommand, 2)
    return false
  }

  const missingArgs = getMissingArguments(aCommand.args)
  if (missingArgs.length) {
    console.error(
      '\nError: Not all required arguments were passed\n' +
        'Missing arguments: ' +
        missingArgs.join(' ')
    )
    showHelp(aCommand, 2)
    return false
  }

  return true
}

function getMissingArguments(args) {
  return fp.flow(
    fp.pickBy(fp.invoke('isMissing')),
    fp.invokeMap('getCliName')
  )(args)
}

function createGetCurArg(aCommand) {
  return curPassedArg =>
    fp.find(fp.invokeArgs('isCliAliasOrName', [curPassedArg]), aCommand.args)
}

//---------//
// Exports //
//---------//

module.exports = parseCommandArgs
