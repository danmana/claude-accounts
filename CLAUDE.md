# CLAUDE.md - Guidelines for Claude Accounts Codebase

## Commands
- Build: `npm run build` (Babel compilation from source/ to dist/)
- Dev: `npm run dev` (watches and rebuilds)
- Test: `npm test` (runs prettier, xo linter, and ava tests)
- Run single test: `npx ava test.js -m "test name pattern"`
- Lint: `npx xo` (uses XO linter)
- Format: `npx prettier --write .`
- Remember: Never run "npm run build" unless the user asks

## Code Style
- **Formatting**: Uses Prettier with tabs, semicolons, single quotes
- **Modules**: ES modules format (type: "module" in package.json)
- **Framework**: React with Ink for terminal UI components
- **Environment**: Node.js 16+ required
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Imports**: Group imports by external/internal, alphabetize
- **Error handling**: Use try/catch blocks with descriptive error messages

## Project Structure
- Source code in `source/` directory
- Built code in `dist/` directory
- Tests are written with AVA in React testing style