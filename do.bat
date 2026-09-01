
if [%1]==[pub] (
  pnpm exec ts-node publish\publish.ts %*
)

if [%1]==[metacodi] (
  pnpm exec ts-node publish\upgrade-metacodi-dependencies.ts %*
)

if [%1]==[docs] (
  typedoc --out docs src/code --readme README.md
)

