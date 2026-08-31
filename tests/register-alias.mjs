import { registerHooks } from 'node:module'

const repositoryRoot = new URL('../', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) {
      return nextResolve(specifier, context)
    }

    const relativePath = specifier.slice(2)
    const targetPath = /\.[^/]+$/.test(relativePath) ? relativePath : `${relativePath}.ts`

    return {
      url: new URL(targetPath, repositoryRoot).href,
      shortCircuit: true,
    }
  },
})
