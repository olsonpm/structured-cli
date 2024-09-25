# Structured CLI

This module allows you to easily create a clean command line interface. You can
think of it as a framework that sacrifices (arguably harmful) flexibility for
consistency and user-friendliness.

## Table of Contents

- [Why does this library exist?](#why-does-this-library-exist)
- [Simple Example](#example)
- [Public API](#public-api)

## Why does this library exist?

I believe the general purpose cli libraries out there are harmful to the
usability of cli's in general. This library enforces structures that should
come by default in every cli: help, version, obvious optional vs required
arguments, a simple and predictable format `<entry> <command> <arguments...>`,
enforced argument types, and simple command/argument validation.

## Example

Assuming you configure [the package.json bin property](https://docs.npmjs.com/files/package.json#bin)
, `structured-cli` turns an intuitive configuration such as:

```js
// bin/hello-world.js
require('structured-cli').create({
  description: "a simple 'hello world' cli",
  commands: [
    {
      name: 'print',
      fn({ loudly, times }) {
        const out = loudly ? 'HELLO WORLD!' : 'hello world'

        console.log((out + '\n').repeat(times))
      },
      desc: "prints 'hello world'",
      args: [
        {
          name: 'loudly',
          alias: 'l',
          desc: 'print in all caps followed by an exclamation point',
          type: 'boolean',
        },
        {
          name: 'times',
          desc: 'repeat the string a given number of times',
          type: 'number',
          example: '<a number>',
          flags: ['require'],
        },
      ],
    },
  ],
})
```

into this

**help**

```sh
$ hello-world --help

Description: a simple 'hello world' cli

Usage
  hello-world <optional argument>
  hello-world <command>

Arguments
  -h, --help      {boolean} print this
  -v, --version   {boolean} print version of hello-world

Commands
  print           prints 'hello world'

To get help for a command, type 'hello-world <command> --help'
```

**print help**

```sh
$ hello-world print --help

Description: prints 'hello world'

Usage: hello-world print [--loudly]  --times <a number>

Required Arguments
  --times        {number}  repeat the string a given number of times

Optional Arguments
  -l, --loudly   {boolean} print in all caps followed by an exclamation point

```

**print**

```sh
$ hello-world print --times 1
hello world

$ hello-world print --times 2 --loudly
HELLO WORLD!
HELLO WORLD!

```

**invalid command handling**

```sh
$ hello-world invalid

Error: Invalid command 'invalid'

# then displays help text
```

**invalid argument type handling**

```sh
$ hello-world print --times a

Error: Argument must be passed a valid number.
Argument: --times
Value: a

# then displays help text
```

**and finally invalid argument handling**

```sh
$ hello-world print --times 1 --loudly --invalid

Error: Stopped parsing due to the invalid argument '--invalid'

# then displays help text
```

## Public API

_An asterisk (_\*_) indicates an optional property_

`require('structured-cli')` exposes one method `create` that takes a single
[Entry](#entry) object and returns `undefined`. The `create` method handles
argv and logs to stdout appropriately.

### Entry

```js
{
  description: <string>
  , commands: <an array of 'Command's>
}
```

### Command

```js
{
  name: <string>
  , alias*: <character>
  , desc: <string>
  , fn: <function taking a single 'Function Argument'>
  , args*: <array of 'Command Argument's>
}
```

#### Function Argument

A command's `fn` will be called with the passed validated arguments via an
object. The keys will be the full name of the argument mapping to their
passed value. Refer to the hello-world example above for clarification.

### Command Argument

```js
{
  name: <string>
  , alias*: <character>
  , default*: <string or number depending on 'type'>
  , desc: <string>
  , example: <string>
  , flags: <array of strings contained in 'Valid Argument Flags'>
  , type: <either 'boolean', 'string', or 'number'>
}
```

The Command Arguments will pass through some validation including:

- `default` cannot be declared for type 'boolean' since a boolean argument's
  presence indicates the value 'true'. If you want it to default to true, then
  rename the boolean to its complement.
- `example` is required for types 'string' and 'number' because it is used
  to create the command usage string.
- Likewise, `example` must not be declared for type 'boolean' since an example
  is not applicable for boolean arguments.

### Valid Argument Flags

Currently the only valid flag is `require`. I expect this to grow.
