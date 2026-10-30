#!/bin/bash
cd "$(dirname "$0")/.."
exec node bin/cli.mjs menubar
