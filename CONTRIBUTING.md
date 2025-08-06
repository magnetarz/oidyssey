# Contributing to OIDyssey

Thank you for your interest in contributing to OIDyssey! 🎉 This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.10.0 or higher
- npm or yarn
- Git
- A basic understanding of SNMP protocol
- Familiarity with n8n and TypeScript

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/oidyssey.git
   cd oidyssey
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## 🛠️ Development Workflow

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows our style guidelines:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### TypeScript

OIDyssey is written in TypeScript. Please ensure:
- All code is properly typed
- Avoid using `any` type when possible
- Add JSDoc comments for public functions
- Export interfaces and types for reusability

### Testing

We maintain high test coverage. When adding new features:

1. **Write unit tests** for new functions
2. **Add integration tests** for SNMP operations
3. **Test edge cases** and error conditions
4. **Mock external dependencies** appropriately

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🧪 Testing with Real SNMP Devices

### Docker Test Environment

We provide a Docker-based SNMP test environment:

```bash
# Start test SNMP agent
docker run -d --name oidyssey-test -p 161:161/udp polinux/snmpd

# Run integration tests
npm run test:integration
```

### Testing Guidelines

- Test against multiple SNMP versions (v1, v2c, v3)
- Test timeout and error conditions
- Verify credential handling security
- Test with various OID formats
- Validate response parsing

## 📝 Commit Guidelines

We follow conventional commits for better changelog generation:

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi colons, etc)
- `refactor`: Code refactoring without functional changes
- `perf`: Performance improvements
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools

### Examples

```bash
feat(snmp): add SNMP v3 authentication support
fix(validation): handle malformed OID strings properly  
docs(readme): add troubleshooting section
test(integration): add bulk-get operation tests
```

## 🐛 Reporting Issues

When reporting issues, please include:

### Bug Reports

- **Environment details** (n8n version, Node.js version, OS)
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **SNMP device details** (version, vendor) if applicable
- **Error messages** and logs
- **Network configuration** if relevant

### Feature Requests

- **Clear description** of the proposed feature
- **Use case** - why is this feature needed?
- **Implementation ideas** if you have any
- **Breaking changes** considerations

## 🔒 Security

### Security Guidelines

- **Never commit credentials** or sensitive information
- **Validate all inputs** thoroughly
- **Implement SSRF protection** for network requests
- **Follow secure coding practices** for credential handling
- **Test security features** thoroughly

### Security Issues

Please report security vulnerabilities privately:
- Email: security@oidyssey.dev
- Do not create public issues for security vulnerabilities

## 📋 Pull Request Process

### Before Submitting

1. **Create an issue** for discussion (for major changes)
2. **Fork the repository** and create a feature branch
3. **Write tests** for your changes
4. **Ensure all tests pass** and linting is clean
5. **Update documentation** if needed

### PR Requirements

- ✅ All tests pass
- ✅ Code coverage maintained
- ✅ Linting passes
- ✅ TypeScript compilation successful
- ✅ Documentation updated
- ✅ CHANGELOG.md updated (for user-facing changes)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] Integration tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)
```

## 📚 Documentation

### Documentation Standards

- **Clear and concise** explanations
- **Code examples** for complex features
- **Updated README.md** for user-facing changes
- **API documentation** for public functions
- **Troubleshooting guides** for common issues

### Documentation Locations

- **README.md**: Main user documentation
- **docs/**: Detailed documentation and guides
- **examples/**: Sample workflows and use cases
- **Code comments**: Inline documentation

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version** in package.json
2. **Update CHANGELOG.md** with changes
3. **Create release tag** with notes
4. **Publish to npm** registry
5. **Update GitHub release** with binaries

## 🤝 Code of Conduct

### Our Standards

- **Be respectful** and inclusive
- **Be patient** with newcomers
- **Give constructive feedback**
- **Focus on the code**, not the person
- **Help others learn** and grow

### Enforcement

- Issues will be addressed promptly
- Violations may result in temporary or permanent bans
- Report issues to: conduct@oidyssey.dev

## 🎉 Recognition

Contributors are recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page
- **npm package** author list (for regular contributors)

## 📞 Getting Help

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Email**: developers@oidyssey.dev
- **Community Chat**: Join our Discord server

---

Thank you for contributing to OIDyssey! Every contribution, no matter how small, helps make network monitoring better for everyone. 🚀