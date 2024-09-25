'use strict'

//---------//
// Imports //
//---------//

const common = require('./common'),
  fp = require('lodash/fp'),
  utils = require('./utils'),
  madonna = require('madonna-fp/es6')

//------//
// Init //
//------//

const isDefined = madonna.FLAG_FNS.isDefined,
  { mutableAssign } = utils,
  { wrapText } = common
//------//
// Main //
//------//

function CommandArg(aSafeCommandArg) {
  mutableAssign(this, aSafeCommandArg)

  // all boolean args should default to false
  if (this.type === 'boolean') this.value = false

  // set value if default is defined
  if (isDefined(this.default)) this.value = this.default
}

mutableAssign(CommandArg.prototype, {
  getCliAlias() {
    return '-' + this.alias
  },
  getCliName() {
    return '--' + fp.kebabCase(this.name)
  },
  getCompletionDescription() {
    return this.completionDesc || fp.truncate({ length: 60 }, this.desc)
  },
  isCliAliasOrName(cliArg) {
    return fp.get('length', cliArg) === 2
      ? this.getCliAlias() === cliArg
      : this.getCliName() === cliArg
  },
  isMissing() {
    return this.isRequired() && fp.isUndefined(this.value)
  },
  isRequired() {
    return fp.includes('require', this.flags)
  },
  getAliasCommaName() {
    return this.alias
      ? `-${this.alias}, ${this.getCliName()}`
      : `${this.getCliName()}`
  },
  getDescLine(padLength, maxTypeStrLength) {
    // padLength is the padding required between command name and description.
    //   multiLineLeftIndent is the padding required for subsequent wrapped lines,
    //   which ends up being padLength plus the initial two space tab
    const multiLineLeftIndent = padLength + 2
    const desc =
      '{' +
      this.type +
      '} ' +
      fp.repeat(maxTypeStrLength - this.type.length, ' ') +
      this.desc
    return (
      '  ' + // two space tab
      fp.padEnd(padLength, this.getAliasCommaName()) + // name + padding
      wrapText(desc, multiLineLeftIndent)
    ) // properly wrapped description
  },
  setValue(val) {
    this.value = val
    return this
  },
})

//---------//
// Exports //
//---------//

module.exports = CommandArg
