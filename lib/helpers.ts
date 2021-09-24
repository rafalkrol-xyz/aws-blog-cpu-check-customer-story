/**
 * Take a kebab-case string and turn it into a PascalCase string, e.g.: my-cool-function -> MyCoolFunction
 * 
 * @param kebab
 * @returns string
 */
export function capitalizeAndRemoveDashes(kebab: string): string {
  const kebabSplit = kebab.split('-')

  for (const i in kebabSplit) {
    kebabSplit[i] = kebabSplit[i].charAt(0).toUpperCase() + kebabSplit[i].slice(1)
  }

  return kebabSplit.join('')
}
