# SNMP Node for n8n - Setup & Testing Guide

This guide provides comprehensive instructions for setting up, testing, and publishing the SNMP node for n8n.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Testing in n8n](#testing-in-n8n)
- [Validation Checklist](#validation-checklist)
- [Publishing to npm](#publishing-to-npm)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** v18.10.0 or higher
- **npm** v8 or higher
- **n8n** installed locally (for testing)
- **Git** for version control
- **SNMP-enabled devices** or SNMP simulator for testing

## Local Development Setup

### 1. Install Dependencies

```bash
# Navigate to the project directory
cd /path/to/n8n-node

# Install all dependencies
npm install

# Install n8n packages globally for testing
npm install -g n8n
npm install -g n8n-node-dev
```

### 2. Build the Node

```bash
# Build the TypeScript files
npm run build

# Watch mode for development
npm run dev
```

### 3. Run Tests

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
npm run lint:fix
```

## Testing in n8n

### Method 1: Using npm link (Recommended for Development)

1. **Link the node package:**

```bash
# In your SNMP node directory
npm link

# Navigate to your n8n installation
cd ~/.n8n
npm link n8n-nodes-snmp

# Or if n8n is installed globally
npm link n8n-nodes-snmp -g
```

2. **Start n8n:**

```bash
# Start n8n with tunnel for webhook testing (optional)
n8n start --tunnel

# Or just start normally
n8n start
```

3. **Access n8n:**
   - Open browser: http://localhost:5678
   - Create new workflow
   - Search for "SNMP" in the node panel
   - The node should appear under "Network" category

### Method 2: Using n8n-node-dev (Best for Testing)

1. **Run the development server:**

```bash
# In your SNMP node directory
n8n-node-dev

# This starts n8n with your node loaded
# Default URL: http://localhost:5678
```

2. **Test the node:**
   - Create a new workflow
   - Add the SNMP node
   - Configure credentials
   - Test operations

### Method 3: Manual Installation

1. **Copy files to n8n custom folder:**

```bash
# Build the node first
npm run build

# Create custom nodes directory if it doesn't exist
mkdir -p ~/.n8n/custom

# Copy the built files
cp -r dist ~/.n8n/custom/n8n-nodes-snmp
cp package.json ~/.n8n/custom/n8n-nodes-snmp/

# Install dependencies in custom folder
cd ~/.n8n/custom/n8n-nodes-snmp
npm install --production
```

2. **Start n8n:**

```bash
n8n start
```

## Setting Up SNMP Credentials

1. **In n8n UI:**
   - Go to **Credentials** (left sidebar)
   - Click **Add Credential**
   - Search for **"SNMP Community"**
   - Fill in the credential form:

```json
{
  "host": "192.168.1.1",      // Your device IP or hostname
  "port": 161,                // SNMP port (default: 161)
  "community": "public",       // Community string
  "version": "2c",            // SNMP version: "1" or "2c"
  "timeout": 5000,            // Timeout in milliseconds
  "retries": 2                // Number of retry attempts
}
```

2. **Test the connection:**
   - Click **"Test Connection"**
   - Should return "Connection successful" if device is reachable

## Validation Checklist

Before considering the node ready for production, validate:

### ✅ Basic Functionality
- [ ] Node appears in n8n node panel
- [ ] Node icon displays correctly
- [ ] Node can be added to workflow
- [ ] Node parameters load properly
- [ ] Credentials can be created and saved

### ✅ SNMP Operations
- [ ] **GET operation** - Query single OID
  ```
  Test OID: 1.3.6.1.2.1.1.1.0 (System Description)
  ```
- [ ] **WALK operation** - Retrieve MIB branch
  ```
  Test OID: 1.3.6.1.2.1.2.2.1 (Interface Table)
  ```
- [ ] **Bulk operations** - Query multiple OIDs
  ```
  Test OIDs: 
  - 1.3.6.1.2.1.1.1.0 (System Description)
  - 1.3.6.1.2.1.1.3.0 (System Uptime)
  - 1.3.6.1.2.1.1.5.0 (System Name)
  ```

### ✅ Error Handling
- [ ] Invalid OID returns proper error
- [ ] Timeout handling works correctly
- [ ] Invalid credentials show clear error
- [ ] Network errors are caught and reported

### ✅ Advanced Features
- [ ] Caching works when enabled
- [ ] Rate limiting functions properly
- [ ] Retry logic works on failures
- [ ] Binary data handling (if applicable)

### ✅ Testing
- [ ] All unit tests pass (`npm test`)
- [ ] Coverage > 90% (`npm run test:coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run build`)

## Example Workflows

### Basic System Information Query

1. **Add SNMP node to workflow**
2. **Configure:**
   - Resource: `Device Query`
   - Operation: `GET`
   - OID: `1.3.6.1.2.1.1.1.0`
3. **Add credentials**
4. **Execute workflow**

Expected output:
```json
{
  "oid": "1.3.6.1.2.1.1.1.0",
  "type": "OctetString",
  "value": "Linux router 5.4.0-42-generic..."
}
```

### Network Interface Monitoring

1. **Add SNMP node**
2. **Configure:**
   - Resource: `Device Query`
   - Operation: `WALK`
   - OID: `1.3.6.1.2.1.2.2.1.2`
3. **Execute to get all interface names**

### Bulk Performance Query

1. **Add SNMP node**
2. **Configure:**
   - Resource: `Bulk Operations`
   - OIDs: Add multiple OIDs
   - Max Repetitions: `10`
3. **Execute for efficient bulk retrieval**

## Publishing to npm

### 1. Prepare for Publishing

```bash
# Ensure clean build
npm run clean
npm run build

# Run all tests
npm test

# Check for vulnerabilities
npm audit

# Update version
npm version patch  # or minor/major
```

### 2. Package Configuration

Ensure `package.json` has:

```json
{
  "name": "n8n-nodes-snmp",
  "version": "1.0.0",
  "keywords": ["n8n-community-node-package"],
  "n8n": {
    "credentials": [
      "dist/credentials/SnmpCommunity.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Snmp/Snmp.node.js"
    ]
  },
  "files": ["dist/**/*"],
  "main": "index.js"
}
```

### 3. Publish to npm

```bash
# Login to npm (first time only)
npm login

# Publish the package
npm publish

# View published package
npm info n8n-nodes-snmp
```

### 4. Install from npm

After publishing, users can install:

```bash
# In n8n custom folder
cd ~/.n8n/custom
npm install n8n-nodes-snmp

# Restart n8n
n8n start
```

## Troubleshooting

### Node Not Appearing in n8n

**Problem:** SNMP node doesn't show up in node panel

**Solutions:**

1. **Check n8n logs:**
```bash
n8n start --tunnel
# Look for loading errors
```

2. **Verify installation:**
```bash
# Check if linked
npm ls -g | grep n8n-nodes-snmp

# Check custom folder
ls ~/.n8n/custom/
```

3. **Rebuild and restart:**
```bash
npm run clean
npm run build
npm link
# Restart n8n
```

### Credential Test Fails

**Problem:** "Connection failed" when testing credentials

**Solutions:**

1. **Verify SNMP on device:**
```bash
# Test with snmpwalk command line tool
snmpwalk -v2c -c public 192.168.1.1 system
```

2. **Check firewall:**
   - Ensure UDP port 161 is open
   - Check both host and device firewalls

3. **Verify community string:**
   - Confirm correct read community
   - Check SNMP version compatibility

### Build Errors

**Problem:** TypeScript compilation errors

**Solutions:**

1. **Clean and rebuild:**
```bash
npm run clean
rm -rf node_modules
npm install
npm run build
```

2. **Check TypeScript version:**
```bash
npx tsc --version
# Should be 5.x.x
```

### Test Failures

**Problem:** Unit tests failing

**Solutions:**

1. **Run specific test:**
```bash
npm test -- --testNamePattern="SNMP GET"
```

2. **Check mock data:**
   - Verify test/mocks/snmpSimulator.ts
   - Ensure mock responses match expected format

## Performance Tips

### For Development

- Use `npm run dev` for watch mode
- Test with local SNMP simulator first
- Use `n8n-node-dev` for rapid testing

### For Production

- Enable caching for frequently queried OIDs
- Set appropriate timeouts based on network latency
- Use bulk operations for multiple OIDs
- Implement rate limiting for device protection

## Security Considerations

1. **Never commit credentials** - Use n8n credential system
2. **Validate all inputs** - OIDs, hostnames, ports
3. **Use read-only community strings** when possible
4. **Implement SSRF protection** - Validate IP addresses
5. **Error message sanitization** - Don't expose sensitive info

## Support & Resources

- **n8n Documentation:** https://docs.n8n.io
- **n8n Community Forum:** https://community.n8n.io
- **SNMP Protocol Specs:** RFC 1157 (v1), RFC 3411-3418 (v3)
- **Node Issues:** Report in GitHub repository

## Next Steps

1. ✅ Complete local testing with real SNMP devices
2. ✅ Add more comprehensive error handling
3. ✅ Implement SNMPv3 support (future version)
4. ✅ Add SNMP trap receiver functionality
5. ✅ Create video tutorial for setup
6. ✅ Submit to n8n community nodes list

---

**Happy automating with n8n and SNMP!** 🚀