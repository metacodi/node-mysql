#!/bin/sh

FIRST_ARGUMENT="$1"
SECOND_ARGUMENT="$2"
THIRD_ARGUMENT="$3"
CURDIR="$(pwd)"


if [ "$FIRST_ARGUMENT" = "i" ] || [ "$FIRST_ARGUMENT" = "install" ]
then
  pnpm cache delete '@metacodi/*' --registry=https://npm.pkg.github.com &&
    find . -type d -name node_modules -prune -exec rm -rf -- {} + &&
    find . -type f \( -name pnpm-lock.yaml -o -name package-lock.json \) -exec rm -f -- {} + &&
    pnpm install
fi

if [ "$FIRST_ARGUMENT" = "pub" ]
then
  shift
  exec pnpm exec ts-node --project publish/tsconfig.json publish/publish.ts "$@"
fi


if [ "$FIRST_ARGUMENT" = "metacodi" ]
then
  pnpm exec ts-node publish/upgrade-metacodi-dependencies.ts
fi

