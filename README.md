# 🚀 OIDyssey

[![npm version](https://badge.fury.io/js/oidyssey.svg)](https://badge.fury.io/js/oidyssey)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Your Journey Through SNMP Networks Made Simple**

OIDyssey is a comprehensive n8n community node for SNMP (Simple Network Management Protocol) operations. Embark on your journey to monitor and interact with network devices, servers, and infrastructure components using SNMP v1, v2c, and v3 protocols.

![OIDyssey Logo](src/OIDyssey.png)

## ✨ Features

- **🌐 Full SNMP Protocol Support**: v1, v2c, and v3 with authentication and privacy
- **⚡ Multiple Operations**: GET, WALK, BULK-GET operations for all your network discovery needs
- **🔒 Security First**: Built-in input validation, SSRF protection, and credential hygiene
- **🚀 Performance Optimized**: Caching, connection pooling, and intelligent rate limiting
- **💪 Production Ready**: Comprehensive error handling, retry logic, and timeout management
- **📝 TypeScript**: Fully typed with comprehensive type definitions for better development experience

## 🎯 Installation

Install OIDyssey in your n8n instance:

```bash
# In n8n root directory
npm install oidyssey

# Or install globally
npm install -g oidyssey
```

Restart n8n to begin your OIDyssey!

## 📋 Prerequisites

- n8n version 0.220.0 or higher
- Node.js 18.10.0 or higher
- Network access to SNMP-enabled devices

## 🔧 Configuration

### Setting Up Credentials

Create SNMP credentials in n8n:

1. Navigate to **Settings** → **Credentials**
2. Create new **SNMP Community** credentials
3. Configure based on your SNMP version:

#### SNMP v1/v2c (Community-based)
```
Community String: public (or your custom community)
Version: v2c (recommended) or v1
Port: 161 (default SNMP port)
```

#### SNMP v3 (User-based Security)
```
Version: v3
Username: Your SNMP v3 username
Auth Protocol: sha, md5, sha256, sha384, or sha512
Auth Key: Your authentication key
Privacy Protocol: aes, des, or aes256
Privacy Key: Your privacy/encryption key
```

## 🗺️ Your OIDyssey Journey

OIDyssey provides three main expedition types:

### 🎯 Device Query Expeditions
- **GET Operation**: Retrieve single OID treasures
- **WALK Operation**: Explore entire OID territories from a root location

### ⚡ Bulk Operations
- **BULK-GET**: Efficiently collect multiple OID artifacts in one expedition

### 📡 Trap Receiver Station
- **Listen Mode**: Receive SNMP trap signals from network devices across your domain

## 📖 Navigation Examples

### 🏠 Basic System Information Discovery
```json
{
  "host": "192.168.1.1",
  "oid": "1.3.6.1.2.1.1.1.0",
  "credentials": "my_snmp_creds"
}
```

### 🌊 Network Interface Exploration
```json
{
  "host": "switch.mydomain.com", 
  "rootOid": "1.3.6.1.2.1.2.2.1.2",
  "maxVarbinds": 50
}
```

### 📦 Multiple OID Treasure Hunt
```json
{
  "host": "server.example.com",
  "oids": [
    "1.3.6.1.2.1.1.1.0",
    "1.3.6.1.2.1.1.3.0", 
    "1.3.6.1.2.1.1.5.0"
  ]
}
```

## 🗺️ OID Treasure Map (Common Destinations)

| 🏆 Treasure | OID Coordinates |
|-------------|-----------------|
| System Description | `1.3.6.1.2.1.1.1.0` |
| System Uptime | `1.3.6.1.2.1.1.3.0` |
| System Name | `1.3.6.1.2.1.1.5.0` |
| System Location | `1.3.6.1.2.1.1.6.0` |
| Interface Table | `1.3.6.1.2.1.2.2.1` |
| CPU Usage (Linux) | `1.3.6.1.4.1.2021.11.11.0` |
| Memory Usage (Linux) | `1.3.6.1.4.1.2021.4.6.0` |
| Disk Usage (Linux) | `1.3.6.1.4.1.2021.9.1.9.1` |

## 🛡️ Security Features (Your Safety Gear)

- **🔍 Input Validation**: Comprehensive validation of hosts, OIDs, and parameters
- **🚫 SSRF Protection**: Prevents requests to internal/private networks
- **🔐 Credential Security**: Secure handling and storage of SNMP credentials  
- **⏱️ Rate Limiting**: Prevents overwhelming target devices
- **⏰ Timeout Management**: Configurable timeouts with intelligent retry logic

## 🛠️ Development & Contributing

### 🏗️ Local Development Setup

```bash
# Clone your OIDyssey
git clone https://github.com/magnetarz/oidyssey.git
cd oidyssey

# Prepare your expedition tools
npm install

# Build your compass
npm run build

# Test your equipment
npm test

# Start exploring in development mode
npm run dev
```

### 🐳 Testing with Docker

A test SNMP agent is included for your practice expeditions:

```bash
# Start your practice target
docker run -d --name snmp-practice -p 161:161/udp polinux/snmpd

# Test your connection
npm run test:integration
```

### 🏛️ Project Architecture

```
oidyssey/
├── src/
│   ├── nodes/Snmp/           # Main expedition headquarters
│   ├── credentials/          # Your security vault
│   ├── types/               # TypeScript navigation charts
│   └── utils/               # Essential expedition tools
├── test/                    # Equipment testing ground
├── examples/                # Sample expedition routes
└── docs/                   # Detailed maps and guides
```

## 🧪 Testing Your Equipment

```bash
# Unit tests (test your tools)
npm test

# Integration tests (full expedition simulation)
npm run test:integration

# Coverage report (equipment reliability check)
npm run test:coverage

# Code quality check
npm run lint
```

## 📚 Expedition Guide (API Reference)

### 🎯 SNMP GET Expedition

Retrieves a specific OID treasure from your target.

**Navigation Parameters:**
- `host` (string): Target device coordinates (IP/hostname)
- `oid` (string): Treasure location (e.g., "1.3.6.1.2.1.1.1.0")
- `credentials` (object): Your access credentials

**Treasure Report:**
```json
{
  "host": "192.168.1.1",
  "operation": "get", 
  "timestamp": 1699123456789,
  "varbinds": [{
    "oid": "1.3.6.1.2.1.1.1.0",
    "type": "OctetString",
    "value": "Linux server 5.4.0"
  }]
}
```

### 🌊 SNMP WALK Expedition

Explores an entire OID territory from your starting point.

**Navigation Parameters:**
- `host` (string): Target device coordinates
- `rootOid` (string): Starting exploration point
- `maxVarbinds` (number): Maximum treasures to collect
- `credentials` (object): Your access credentials

## 🚨 Expedition Troubleshooting

### Common Navigation Issues

#### ⏰ Connection Timeouts
- Verify network path to target device
- Check if SNMP service is active on target
- Confirm correct port (default: 161)
- Validate community string or v3 credentials

#### 🔐 Authentication Failures
- Verify community string for v1/v2c expeditions
- Check username/password for v3 journeys
- Ensure authentication protocol matches device configuration

#### 📡 No Response from Target
- Device may not support SNMP protocol
- SNMP service may be disabled or inactive
- Firewall blocking SNMP traffic (UDP 161)
- Incorrect community string or credentials

### 🔧 Debug Mode

Enable detailed expedition logging:

```bash
export N8N_LOG_LEVEL=debug
n8n start
```

## 🤝 Join the OIDyssey Community

We welcome fellow network explorers! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on joining our expedition.

1. Fork the OIDyssey repository
2. Create your expedition branch (`git checkout -b expedition/amazing-discovery`)
3. Document your findings (`git commit -m 'Discovered amazing network treasure'`)
4. Share your route (`git push origin expedition/amazing-discovery`)
5. Request to join the main expedition (Open a Pull Request)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [net-snmp](https://github.com/markabrahams/node-net-snmp) - The foundation of our expedition tools
- [n8n](https://n8n.io/) - The platform that makes our journeys possible
- SNMP Community - The cartographers who mapped these protocols

## 📞 Expedition Support

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/magnetarz/oidyssey/issues)
- 💬 **Community Discussions**: [GitHub Discussions](https://github.com/magnetarz/oidyssey/discussions)
- 📧 **Direct Contact**: Send a message to our expedition leaders

---

**🗺️ Begin Your OIDyssey Today - Every Network Has Stories to Tell! 🚀**

*Made with ❤️ for network explorers and the n8n community*