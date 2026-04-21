/**
 * Custom Jest resolver that handles Prisma v7's .js extension imports.
 *
 * Prisma v7 generates TypeScript files that import each other with .js
 * extensions (ESM-style). Jest with ts-jest can't resolve these because
 * the actual files on disk are .ts. This resolver intercepts those
 * imports and tries stripping the .js extension when the default
 * resolution fails.
 */
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    // Only attempt .js → .ts remapping for relative imports
    if (request.endsWith('.js') && (request.startsWith('.') || request.startsWith('/'))) {
      const tsRequest = request.replace(/\.js$/, '.ts');
      try {
        return options.defaultResolver(tsRequest, options);
      } catch {
        // Also try without extension entirely
        const noExtRequest = request.replace(/\.js$/, '');
        return options.defaultResolver(noExtRequest, options);
      }
    }
    throw error;
  }
};
