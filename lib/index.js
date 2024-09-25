'use strict'

//---------//
// Imports //
//---------//

const Command = require('./command'),
  CommandArg = require('./command-arg'),
  common = require('./common'),
  madonnaFunction = require('madonna-function/es6'),
  fp = require('lodash/fp'),
  parseCommandArgs = require('./parse-command-args'),
  path = require('path'),
  vCommand = require('./v-command'),
  vCommandArg = require('./v-command-arg'),
  utils = require('./utils')

//------//
// Init //
//------//

const createCliMarg = getCliMarg(),
  createMadonnaFn = madonnaFunction.create,
  {
    createError,
    getDuplicateArgProps,
    getDuplicateArgsMatching,
    VIEW_WIDTH,
    wrapText,
  } = common,
  { createNew, jstring, keyToVal } = utils
//------//
// Main //
//------//

const safeCreateCli = createMadonnaFn({
  marg: createCliMarg,
  fn: createCli,
  argMap: {
    commands: fp.map(createNew(Command)),
  },
})

//-------------//
// Helper Fxns //
//-------------//

function createCli(argsObj) {
  const entryCommand = fp.flow(fp.split(path.sep), fp.last)(process.argv[1])
  argsObj.entryCommand = entryCommand

  argsObj.options = getEntryCommandOptions(entryCommand, argsObj)

  const argv = process.argv.slice(2)

  if (!argv.length || argv[0] === '') {
    showHelp(argsObj, 2)
    return
  }

  const validFirstArgs = getValidFirstArgs(argsObj)

  if (!fp.includes(argv[0], validFirstArgs)) {
    const argType = argv[0][0] === '-' ? 'option' : 'command'

    console.error(`\nError: Invalid ${argType} '${argv[0]}'`)
    showHelp(argsObj, 2)
    return
  }

  if (fp.includes(argv[0], getValidOptionArgs(argsObj.options))) {
    // runOption shouldn't make sense semantically, but nor should options doing
    //   anything without a command.
    // There are no semantics in CLI land.
    if (argv.length > 1) {
      console.warn(
        "\nWarning: Arguments past '" +
          argv[0] +
          "' are invalid and were not parsed"
      )
    }
    runOption(argv[0], argsObj)
  } else {
    // if it's a valid first argument but not help nor version, then it's a command
    runCommand(argv[0], argsObj)
  }
}

function showHelp(argsObj, std) {
  const out = std === 1 ? console.log : console.error

  // 3 = the number of spaces between the longest command/entry option and their
  //   corresponding description
  const padLength = getMaxLength(argsObj) + 3

  const commandDescriptions = fp.flow(
    fp.invokeArgsMap('getDescLine', [padLength]),
    fp.join('\n')
  )(argsObj.commands)

  const description = wrapText(`Description: ${argsObj.description}`)

  out(
    `
${description}

Usage
  ${argsObj.entryCommand} <optional argument>
  ${argsObj.entryCommand} <command>

Arguments
${argsObj.options.h.getDescLine(padLength)}
${argsObj.options.v.getDescLine(padLength)}

Commands
${commandDescriptions}

To get help for a command, type '${argsObj.entryCommand} <command> --help'
`
  )
}

function showVersion(entryCommand, cliArgsObj) {
  console.log(
    '\nYou are using ' + entryCommand + ' version: ' + cliArgsObj.version + '\n'
  )
}

// gets the maximum string length between the command names and entry command
//   options (help/version)
function getMaxLength(argsObj) {
  const commandAliasBarNames = fp.invokeMap(
    'getAliasCommaName',
    argsObj.commands
  )

  return fp.flow(
    fp.map(anOption => anOption.getAliasCommaName().length),
    fp.concat(fp.map('length', commandAliasBarNames)),
    fp.max
  )(argsObj.options)
}

function getEntryCommandOptions(entryCommand, cliArgsObj) {
  const help = new CommandArg({
    name: 'help',
    alias: 'h',
    type: 'boolean',
    desc: 'print this',
    example: 'unused',
  })
  const version = new CommandArg({
    name: 'version',
    alias: 'v',
    type: 'boolean',
    desc: 'print version of ' + entryCommand,
    example: 'unused',
  })

  // these options kind of act like commands.  I'm choosing to keep them as options
  //   for sake of conforming, so fn is the resulting hack.
  help.fn = showHelp.bind(null, cliArgsObj, 1)
  version.fn = showVersion.bind(null, entryCommand, cliArgsObj)

  return {
    h: help,
    v: version,
  }
}

function getCliMarg() {
  return {
    schema: {
      commands: {
        flags: ['require', 'isLaden'],
        passEachTo: vCommand,
      },
      description: ['require', 'isLadenString'],
      version: ['require', 'isLadenString'],
    },
    opts: {
      cb: furtherValidateCreateCli,
    },
  }
}

function furtherValidateCreateCli(argsObj) {
  let errMsg

  // map all commands since createSafeFn doesn't have this functionality
  const commands = fp.map(createNew(Command), argsObj.commands)

  // test for unique arg names
  const duplicateNames = getDuplicateArgProps('name', commands)
  if (duplicateNames.length) {
    const commandsWithDuplicateNames = fp.map(
      compactProps,
      getDuplicateArgsMatching('name', duplicateNames, commands)
    )
    errMsg =
      "'createCli' requires command names to be unique.\n" +
      'The following names are duplicate: ' +
      duplicateNames.join(', ') +
      '\n\n' +
      'Commands with duplicate names: ' +
      jstring(commandsWithDuplicateNames)

    throw createError('Invalid Input', errMsg, 'createCli_duplicateNames', {
      duplicateNames: duplicateNames,
      commandsWithDuplicateName: commandsWithDuplicateNames,
    })
  }

  // test for unique arg aliases
  const duplicateAliases = getDuplicateArgProps('alias', commands)
  if (duplicateAliases.length) {
    const commandsWithDuplicateAliases = fp.map(
      compactProps,
      getDuplicateArgsMatching('alias', duplicateAliases, commands)
    )
    errMsg =
      'Invalid Input: createCli requires command aliases to be unique.\n' +
      'The following aliases are duplicate: ' +
      duplicateAliases.join(', ') +
      '\n\n' +
      'Commands with duplicate aliases: ' +
      jstring(commandsWithDuplicateAliases)

    throw createError('Invalid Input', errMsg, 'createCli_duplicateAliases', {
      duplicateAliases: duplicateAliases,
      commandsWithDuplicateAliases: commandsWithDuplicateAliases,
    })
  }
}

function getValidFirstArgs(cliArgsObj) {
  return getValidOptionArgs(cliArgsObj.options).concat(
    getValidCommands(cliArgsObj.commands)
  )
}

function getValidOptionArgs(options) {
  return fp.concat(
    fp.map(opt => '-' + opt.alias, options),
    fp.map(opt => '--' + opt.name, options)
  )
}

function getValidCommands(commands) {
  return fp.flow(
    fp.filter('alias'),
    fp.map('alias'),
    fp.concat(fp.map('name', commands))
  )(commands)
}

function compactProps(val) {
  if (val.args.length) val = fp.set('args', '[...]', val)
  // 15 is the number of characters printed as part of
  //   the error and not included in the description.
  return fp.set('desc', fp.truncate({ length: VIEW_WIDTH - 15 }, val.desc), val)
}

function runOption(opt, cliArgsObj) {
  const alias = opt.replace(/-/g, '')[0]
  cliArgsObj.options[alias].fn()
}

function runCommand(cmd, cliArgsObj) {
  const commands = cliArgsObj.commands
  let runName = cmd.replace(/^-+/, '')
  if (runName.length === 1) {
    runName = keyToVal('alias', 'name', commands)[runName]
  }

  // runName should now be the full name of the command
  const commandToRun = fp.find({ name: runName }, commands)
  commandToRun.entryCommand = cliArgsObj.entryCommand

  parseCommandArgs(commandToRun)
}

//---------//
// Exports //
//---------//

module.exports = {
  create: safeCreateCli,
  Command,
  CommandArg,
  vCommand,
  vCommandArg,
}
