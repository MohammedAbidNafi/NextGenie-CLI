# Contributing to NextGenie

First off, thanks for taking the time to contribute! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include Node.js version and OS details

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Explain why this enhancement would be useful to most NextGenie users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Make sure your code passes our automated tests
6. Update the documentation

## Development Setup

1. Clone your fork of the repo
```bash
git clone https://github.com/MohammedAbidNafi/Next-Genie.git
cd next-cli
```

2. Install dependencies
```bash
npm install
```

3. Create a branch for your feature
```bash
git checkout -b feature/your-feature-name
```

## Project Structure

```
next-cli/
├── src/
│   └── index.ts        # Main CLI implementation
├── tests/              # Test files
├── README.md          # Project documentation
└── package.json       # Project metadata and dependencies
```

## Commit Messages

- Use the present tense ("add feature" not "added feature")
- Use the imperative mood ("move cursor to..." not "moves cursor to...")
- Limit the first line to 72 characters or less
- Avoid capital letters
- Reference issues and pull requests liberally after the first line
- Use of GitWit Extension is recommended https://marketplace.visualstudio.com/items?itemName=MohammedAbidNafi.gitwit

## Testing

Before submitting a pull request, run the same checks as CI:

```bash
bun install
bunx tsc --noEmit
```

Then try your change by running the CLI in a Next.js project (or any folder with an `app/` directory):

```bash
bun /path/to/NextGenie-CLI/src/index.ts create about
```

## Releasing

Publishing is automatic when a new version is merged into `main`:

1. Bump `version` in `package.json` in a pull request.
2. Merge it.

The **Publish** workflow then type-checks and publishes the version to:

- npmjs.com as `nextgenie-cli`
- GitHub Packages as `@mohammedabidnafi/nextgenie-cli` (GitHub's npm registry only accepts scoped names)

Finally, it tags the commit `v<version>` and creates a GitHub release with generated notes. Merges that don't change the version publish nothing. If a run fails partway, re-running it publishes only what's missing.

For npm, the workflow authenticates with trusted publishing, or with an `NPM_TOKEN` secret if one is set. GitHub Packages uses the workflow's own token. See the comments at the top of `.github/workflows/publish.yml`.

## Style Guide

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## License

By contributing to NextGenie, you agree that your contributions will be licensed under GNU General Public License v3.0.
