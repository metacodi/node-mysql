#!/bin/sh

FIRST_ARGUMENT="$1"
SECOND_ARGUMENT="$2"
THIRD_ARGUMENT="$3"
CURDIR="$(pwd)"


if [ $FIRST_ARGUMENT == "pub" ] 
then
  pnpm exec ts-node publish/publish.ts
fi


if [ $FIRST_ARGUMENT == "metacodi" ] 
then
  pnpm exec ts-node publish/upgrade-metacodi-dependencies.ts
fi

