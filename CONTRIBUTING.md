# Contributing to RehearseKit

Thank you for your interest in contributing to RehearseKit! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, professional, and inclusive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/RehearseKit.git`
3. Follow the [Local Development Guide](docs/local-development.md) to set up your environment
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Process

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(frontend): add stem preview player`
- `fix(backend): resolve tempo detection accuracy`
- `docs: update deployment guide`

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add tests for new features
4. Request review from maintainers
5. Address review feedback
6. Squash commits before merging (if requested)

## Project Structure

See [Local Development Guide](docs/local-development.md) for detailed project structure.

## Testing

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

### Backend Tests

```bash
cd backend
pytest
pytest --cov=app
```

## Code Style

### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components
- Use descriptive variable names

### Backend (Python)

- Follow PEP 8
- Use Black for formatting
- Use type hints
- Write docstrings for public functions
- Keep functions focused and small

## Documentation

- Update relevant documentation for any changes
- Add JSDoc/docstrings for new functions
- Keep README and guides up to date
- Document API changes

## Questions?

- Check [docs/](docs/) directory
- Open a GitHub Discussion
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

