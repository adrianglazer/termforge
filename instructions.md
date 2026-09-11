# PROJECT: Terminal Workstation for iOS/iPadOS

You are the principal engineer responsible for designing, implementing, testing, and preparing a production-quality iOS/iPadOS application.

The application is a powerful Linux-style terminal workstation for iPhone and iPad.

The user experience should be inspired by:

- Linux Terminator
- tmux
- modern SSH clients
- SFTP clients
- terminal multiplexers
- developer/DevOps workstations

The goal is NOT to build a simple SSH client.

The goal is to build a full-featured terminal workstation where the user can manage multiple remote Linux machines, open multiple interactive terminal sessions, split them into panes, transfer files, manage SSH keys, use useful developer/DevOps tools, and customize their terminal environment.

The application must be implemented using:

- Expo
- React Native
- TypeScript
- Expo development builds
- Expo Modules API for custom native functionality
- Swift for iOS-specific native functionality where required
- EAS Build
- EAS Submit
- EAS Workflows where useful

Do NOT design the application around Expo Go.

The application requires custom native functionality and must therefore use Expo development builds.

---

# 1. PRODUCT VISION

The application should feel like a professional Linux terminal workstation in the user's pocket.

When the user opens the application, they should be able to:

1. Create an SSH server profile.
2. Add or generate an SSH key.
3. Connect to the server.
4. Open a real interactive shell.
5. Use the terminal exactly like a normal SSH terminal.
6. Split the terminal into panes.
7. Open multiple sessions.
8. Switch between servers.
9. Open SFTP.
10. Upload/download files.
11. Search terminal output.
12. Copy/paste.
13. Use a terminal keyboard toolbar.
14. Use hardware keyboards.
15. Use Ctrl/Alt/Escape/Tab/function keys.
16. Reconnect sessions.
17. Save terminal layouts.
18. Create command snippets.
19. Create reusable commands.
20. Manage port forwarding.
21. Use jump hosts.
22. Manage known_hosts.
23. Protect private keys using iOS Keychain.
24. Unlock sensitive functionality with Face ID/Touch ID/passcode where appropriate.

The application should feel substantially more capable than a basic SSH app.

---

# 2. IMPORTANT PLATFORM CONSTRAINT

Do NOT assume that iOS provides a general-purpose Linux shell.

The application cannot simply execute arbitrary Linux commands locally as though it were Ubuntu.

There are two distinct execution environments:

## Local environment

The iPhone/iPad can run functionality explicitly bundled or implemented for iOS.

Examples:

- terminal UI
- SSH client
- SFTP client
- SSH key generation
- cryptographic operations
- configuration management
- local snippets
- local text editing
- local networking functions permitted by iOS
- selected portable developer utilities if legally and technically appropriate

## Remote environment

When connected over SSH, commands execute on the remote machine.

Examples:

- bash
- zsh
- fish
- python
- node
- git
- docker
- kubectl
- systemctl
- journalctl
- apt
- yum
- grep
- awk
- sed
- htop
- vim
- nano
- tmux
- etc.

The terminal must clearly distinguish local and remote sessions.

---

# 3. HIGH-LEVEL ARCHITECTURE

Use this architecture:

React Native / Expo
|
+-- UI
|
+-- navigation
|
+-- state management
|
+-- session manager
|
+-- terminal model
|
+-- SSH abstraction
|
+-- SFTP abstraction
|
+-- settings
|
+-- snippets
|
+-- workspace manager
|
v
Custom Expo Native Modules
|
+-- Terminal / PTY
+-- SSH
+-- SFTP
+-- Keychain
+-- Secure storage
+-- networking primitives
|
v
iOS native implementation

Keep the React Native layer independent from the low-level SSH/terminal implementation.

Do not put the SSH protocol implementation directly into random React components.

Create clean interfaces.

---

# 4. REPOSITORY STRUCTURE

Use a scalable monorepo-style structure if appropriate.

Suggested structure:

/app
/src
/components
/screens
/navigation
/terminal
/ssh
/sftp
/sessions
/workspaces
/servers
/keys
/snippets
/settings
/themes
/storage
/state
/hooks
/utils
/types

/modules
/terminal
/ssh
/sftp
/secure-storage

/ios

/assets

/tests

/scripts

/.github

/.eas

Keep native modules isolated and documented.

---

# 5. TERMINAL ENGINE

The terminal is the heart of the application.

Do NOT implement a fake terminal using a normal React Native Text component.

The terminal must support an actual terminal emulator architecture.

The terminal needs to support:

- PTY concepts
- ANSI escape sequences
- VT100-compatible behavior
- xterm-compatible behavior where practical
- cursor movement
- cursor visibility
- cursor styles
- text attributes
- colors
- 256-color mode
- true-color mode
- bold
- dim
- underline
- inverse
- blink where supported
- strikethrough where supported
- Unicode
- wide characters
- line wrapping
- scrolling
- alternate screen buffer
- terminal resize
- terminal dimensions
- application cursor keys
- application keypad where relevant
- bracketed paste
- mouse reporting where supported
- OSC sequences where safe
- title updates
- bell handling

The terminal must correctly support programs such as:

- bash
- zsh
- fish
- vim
- neovim
- nano
- htop
- less
- top
- tmux
- git interactive commands
- ssh
- python interactive shell

Do not implement terminal rendering naïvely.

Evaluate mature existing terminal-emulation libraries before writing a terminal emulator from scratch.

Prefer mature, maintained, permissively licensed libraries when possible.

Document all third-party dependencies and licenses.

---

# 6. TERMINAL UI

The terminal should support:

- smooth scrolling
- large scrollback buffer
- configurable scrollback size
- text selection
- copy
- paste
- select all
- search
- clear screen
- clear scrollback
- font size controls
- line spacing
- configurable font
- cursor style
- cursor blinking
- terminal themes
- light/dark themes
- custom colors

Default terminal appearance should resemble a professional Linux terminal.

Do not make the UI look like a toy terminal.

---

# 7. MOBILE TERMINAL KEYBOARD

iOS keyboards do not expose all keys needed for terminal usage.

Implement a terminal accessory keyboard toolbar.

Default keys should include:

ESC
TAB
CTRL
ALT
SHIFT
↑
↓
←
→
HOME
END
PGUP
PGDN
DEL

Also support:

- CTRL+C
- CTRL+D
- CTRL+Z
- CTRL+L
- CTRL+A
- CTRL+E
- CTRL+R
- CTRL+W
- ALT combinations
- function keys where practical

Allow the user to customize the toolbar.

For example:

[ESC] [TAB] [CTRL] [ALT] [↑] [↓] [←] [→]

On iPad, optimize the keyboard interaction for hardware keyboards.

---

# 8. TERMINATOR-STYLE PANES

This is a core feature.

The user must be able to create multiple terminal panes.

Support:

- split vertical
- split horizontal
- resize panes
- focus pane
- close pane
- maximize/zoom pane
- restore pane
- move between panes
- create a new pane
- duplicate a session
- rename pane
- assign a server to a pane

Example:

+----------------------+----------------------+
| | |
| SERVER A | SERVER B |
| | |
+----------------------+----------------------+
| | |
| LOCAL | LOGS |
| | |
+----------------------+----------------------+

Pane layout must be represented as a tree rather than a collection of arbitrary views.

Example conceptual model:

Workspace
Split
Split
TerminalSession
TerminalSession
TerminalSession

This will allow arbitrary nested layouts.

---

# 9. WORKSPACES

Implement persistent workspaces.

Example:

"Production"

contains:

- production SSH session
- production logs
- production Docker terminal
- monitoring terminal

"Development"

contains:

- dev server
- database server
- local tools

A workspace should remember:

- pane layout
- server
- terminal settings
- working directory if possible
- pane titles
- session configuration

The application should be able to restore the workspace.

---

# 10. TABS

Support multiple workspace/session tabs.

Example:

[Production] [Staging] [Development] [+]

Each tab can contain multiple panes.

Allow:

- rename
- duplicate
- close
- reorder
- restore

---

# 11. SSH SERVER MANAGEMENT

Create a server manager.

Each server profile should support:

- name
- hostname
- IP address
- port
- username
- authentication method
- SSH key
- password where appropriate
- passphrase
- host key policy
- jump host
- connection timeout
- keepalive
- terminal type
- startup command
- environment configuration

Example:

Server:

Production

Host:

server.example.com

Port:

22

Username:

deploy

Authentication:

Ed25519 key

Terminal:

xterm-256color

---

# 12. SSH AUTHENTICATION

Support:

- Ed25519
- ECDSA where supported
- RSA where supported
- encrypted private keys
- passphrase-protected private keys

Do not store private keys in plain AsyncStorage.

Private keys must be protected using iOS Keychain or another appropriate secure native storage mechanism.

The app must never log private keys.

The app must never send private keys to an analytics service.

The app must never upload private keys to a remote backend.

---

# 13. SSH KEY MANAGEMENT

Create a dedicated SSH Keys screen.

Features:

- generate key
- import key
- export public key
- copy public key
- rename key
- delete key
- view fingerprint
- passphrase protection
- biometric protection
- identify which servers use a key

Generate modern keys by default.

Prefer Ed25519 where supported.

Display:

Name
Type
Fingerprint
Created
Servers using key

Example:

my-production-key
ED25519
SHA256:xxxxxxxx
Used by: Production, Staging

---

# 14. KNOWN HOSTS

Implement secure host-key verification.

Support:

- first connection confirmation
- known host storage
- fingerprint display
- host-key mismatch warning
- ability to remove/update a known host

Never silently ignore host-key changes.

If the server's host key changes:

STOP THE CONNECTION OR REQUIRE EXPLICIT USER ACTION.

Display a serious warning.

---

# 15. SSH CONNECTION LIFECYCLE

Implement:

CONNECTING
CONNECTED
DISCONNECTING
DISCONNECTED
RECONNECTING
FAILED

Handle:

- network loss
- Wi-Fi → cellular changes
- server disconnect
- authentication failure
- host-key mismatch
- timeout
- connection refused
- DNS failure

Provide useful error messages.

Example:

Unable to connect to production.example.com:22

Reason:
Connection timed out.

Actions:

[Retry] [Edit Server]

---

# 16. KEEPALIVE AND RECONNECT

Implement configurable SSH keepalive.

Example:

Keepalive:
30 seconds

Reconnect:
Enabled

Maximum retries:
5

Use exponential backoff.

Do not create an infinite aggressive reconnect loop.

---

# 17. BACKGROUND BEHAVIOR

Respect iOS background execution restrictions.

Do not promise that arbitrary SSH sessions will remain permanently active while the app is suspended.

Design the session architecture so that:

- foreground sessions work normally
- suspension is handled gracefully
- the app can reconnect when reopened
- the user understands when a session was lost

Do not violate Apple's background execution rules.

---

# 18. SFTP

Implement an SFTP file browser.

Features:

- browse directories
- upload
- download
- rename
- delete
- create directory
- move
- copy
- file information
- permissions display where available
- sort
- search
- refresh

Use:

Local
vs
Remote

layout.

Example:

LOCAL REMOTE
Documents /var/www
Downloads app
project logs
config

Allow selecting a file and:

[Download]
[Upload]
[Rename]
[Delete]
[Open]

---

# 19. REMOTE FILE EDITOR

Implement a basic remote text editor.

Workflow:

Remote file
↓
Download/open
↓
Edit
↓
Save
↓
Upload/write back

Support at minimum:

- text files
- syntax highlighting where practical
- search
- replace
- line numbers
- save
- discard changes

Do not attempt to replace VS Code initially.

This should be a lightweight emergency/server editor.

---

# 20. PORT FORWARDING

Support:

Local → Remote

Remote → Local

Dynamic SOCKS where technically feasible.

Create a port forwarding screen.

Example:

Name:
Database

Type:
Local

Local port:
5432

Remote host:
127.0.0.1

Remote port:
5432

Status:
ACTIVE

Implement strong validation.

---

# 21. JUMP HOSTS

Support SSH jump hosts / bastion hosts.

Example:

iPhone
↓
Bastion
↓
Production

Allow a server profile to specify:

Jump host:
bastion

Target:
production

The user should not need to manually open a separate terminal just to establish the jump.

---

# 22. SNIPPETS

Create a command snippet system.

Example:

Docker cleanup

docker system prune

Git status

git status && git branch --show-current

Logs

journalctl -u myservice -f

Allow:

- name
- command
- description
- category
- variables
- favorite

Example:

Deploy

git pull && docker compose pull && docker compose up -d

---

# 23. COMMAND PALETTE

Implement a command palette similar to professional developer applications.

Possible commands:

New Terminal
New SSH Connection
Split Right
Split Down
Close Pane
Zoom Pane
Reconnect
Open SFTP
Upload File
Download File
Search Terminal
Clear Terminal
Copy
Paste
Open Snippets
Open Server
New Workspace
Settings

Support keyboard shortcut where possible.

---

# 24. SEARCH TERMINAL

Implement terminal search.

Features:

- search text
- next
- previous
- case sensitivity
- match highlighting

Search should work against the scrollback buffer.

---

# 25. THEMES

Ship several professional themes.

At minimum:

- Default Dark
- Default Light
- Solarized Dark
- Solarized Light
- Dracula-style theme
- Monokai-style theme

Do not copy copyrighted theme assets without verifying licenses.

Allow custom themes later.

---

# 26. SERVER DASHBOARD

Create a server list.

Example:

SERVERS

Production
● Connected
server.example.com

Staging
○ Offline
staging.example.com

Development
○ Offline
192.168.1.50

Actions:

Connect
Edit
Duplicate
Delete
Open SFTP

Show connection status.

---

# 27. SESSION MANAGER

Create a central session manager.

It must know:

- session ID
- server ID
- connection state
- terminal size
- pane ID
- workspace ID
- created time
- last activity
- terminal title

Do not tightly couple sessions to React component lifecycles.

A terminal connection must not accidentally disconnect merely because a React component rerendered.

---

# 28. STATE MANAGEMENT

Use a predictable state architecture.

Separate:

Persistent state
from
Runtime state.

Persistent:

- servers
- keys metadata
- settings
- themes
- snippets
- workspaces
- preferences

Runtime:

- SSH connections
- terminal buffers
- connection state
- pane focus
- temporary errors

Never put sensitive private key material into ordinary application state unnecessarily.

---

# 29. SECURITY REQUIREMENTS

Security is a first-class requirement.

Never:

- log private keys
- send private keys to a backend
- store private keys in plain JSON
- transmit credentials to analytics
- hardcode credentials
- commit secrets
- expose secrets in debug screens
- print passwords in error messages

Use:

- iOS Keychain
- secure native storage
- TLS where network services are used
- host-key verification
- secure memory practices where practical
- biometric authentication where useful

Make the app usable without any cloud backend.

The core SSH functionality should be local/client-side.

---

# 30. NO REQUIRED CLOUD BACKEND

The first production version should NOT require an account on our servers.

A user should be able to:

Install app
↓
Add SSH key
↓
Add server
↓
Connect
↓
Use terminal

without creating an account with us.

This is important for privacy and security.

---

# 31. OPTIONAL BACKEND

Do not add a backend unless a future feature genuinely requires it.

Potential future features:

- encrypted sync
- server profile sync
- workspace sync
- encrypted snippets
- subscription management

But these must be completely separate from the core SSH functionality.

---

# 32. OFFLINE FUNCTIONALITY

The application should still open without internet.

The user should be able to:

- view saved servers
- view saved snippets
- view settings
- manage keys
- view workspaces
- inspect connection history

Obviously, SSH/SFTP require network connectivity.

---

# 33. UI NAVIGATION

Use a professional navigation structure.

Suggested:

Servers
Terminal
Files
Workspaces
Keys
Snippets
Settings

For iPhone, use an adaptive layout.

For iPad, take advantage of larger screens.

Use split-view/navigation patterns appropriate for iPad.

---

# 34. RESPONSIVE UI

The application must support:

- iPhone portrait
- iPhone landscape
- iPad portrait
- iPad landscape

Do not simply stretch the iPhone UI onto iPad.

On iPad, make use of:

- sidebars
- multi-column navigation
- larger terminal layouts
- hardware keyboards
- trackpads/mouse where available

---

# 35. ACCESSIBILITY

Implement:

- Dynamic Type where appropriate
- VoiceOver labels
- sufficient contrast
- accessible controls
- reduced motion consideration
- keyboard navigation where applicable

Do not sacrifice terminal usability for accessibility, but provide sensible accessibility behavior.

---

# 36. PERFORMANCE

This app may display enormous terminal output.

Optimize aggressively.

Do not render every terminal character as an individual React Native component.

Use a performant native or GPU-friendly terminal rendering architecture where necessary.

Avoid:

- unnecessary React renders
- unbounded JS terminal buffers
- massive React state updates
- blocking the JS thread
- expensive string operations on every keystroke

The terminal must remain responsive during:

- htop
- logs
- compilation output
- docker logs
- large command output
- vim/neovim

---

# 37. LARGE OUTPUT

Test with:

yes

and:

for i in $(seq 1 100000); do echo "line $i"; done

The application must remain responsive.

Implement bounded scrollback.

Example default:

10,000 lines

Allow user configuration:

1,000
5,000
10,000
50,000
100,000

Use memory-conscious structures.

---

# 38. TERMINAL RESIZE

When the terminal pane changes size:

calculate:

columns
rows

and send the appropriate resize operation to the remote PTY.

This is critical for:

vim
tmux
htop
less
top

---

# 39. TERMINAL ENVIRONMENT

When opening a remote PTY, negotiate an appropriate terminal type.

Default:

xterm-256color

Make this configurable if necessary.

Send correct terminal dimensions.

---

# 40. MULTIPLE SIMULTANEOUS CONNECTIONS

The app must support many concurrent sessions.

For example:

Production
Staging
Development
Database
Monitoring

Avoid assuming only one SSH connection exists.

Use a connection/session manager with explicit lifecycle ownership.

---

# 41. DATA MODEL

Create typed models.

Example:

ServerProfile

id
name
hostname
port
username
authenticationMethod
keyId
jumpHostId
terminalType
keepAliveInterval
reconnectEnabled
createdAt
updatedAt

SSHKey

id
name
type
fingerprint
createdAt
keychainReference

Workspace

id
name
layout
createdAt
updatedAt

TerminalSession

id
workspaceId
serverId
paneId
state
createdAt

Snippet

id
name
command
description
category
variables

Use TypeScript types and validation.

---

# 42. STORAGE

Use SQLite or another appropriate structured local database for non-secret metadata.

Use Keychain for secrets.

Do not store private keys in SQLite.

Do not store passwords in AsyncStorage.

Use migrations.

The database must survive app updates.

---

# 43. IMPORT / EXPORT

Allow exporting non-secret configuration.

For example:

server profiles
snippets
workspace definitions

But exports must NOT accidentally include private keys.

If secret export is ever implemented, it must require explicit user action and strong protection.

---

# 44. BACKUP / RESTORE

Design the data model so future encrypted backup/sync can be added.

Do not implement cloud sync in v1 unless necessary.

---

# 45. ERROR HANDLING

Every major operation must have structured errors.

Do not expose raw native exceptions directly to users.

Convert them to meaningful errors.

Example:

SSH_AUTHENTICATION_FAILED

Display:

Authentication failed.

Check your username or SSH key.

Do not say:

Error code 47 / native exception XYZ.

---

# 46. LOGGING

Implement development logging.

Production logging must be privacy-conscious.

Never log:

- passwords
- private keys
- passphrases
- complete authentication tokens
- sensitive command output unless explicitly enabled by the user

Create log levels:

debug
info
warning
error

---

# 47. TESTING

Create unit tests for:

- server profile validation
- key metadata
- workspace layout
- pane tree
- terminal resize
- snippets
- storage migrations
- connection state machine
- host-key validation
- configuration parsing

Create integration tests for:

- SSH connection
- authentication
- terminal input/output
- SFTP
- reconnect
- known_hosts
- port forwarding

Create UI tests for:

- adding server
- connecting
- opening terminal
- splitting panes
- opening SFTP
- importing key
- generating key
- searching terminal

---

# 48. LOCAL TEST SSH SERVER

Create a development/testing setup.

Use Docker or another safe development environment to run a disposable SSH server.

Example:

tests/ssh-server/

Provide scripts to launch:

- OpenSSH server
- test user
- test key
- test files
- test shell

This allows automated testing without depending on an external production server.

Do not commit real credentials.

---

# 49. SECURITY TESTING

Test:

- wrong password
- invalid key
- encrypted key
- wrong passphrase
- host-key mismatch
- server disconnect
- connection timeout
- malformed server response
- interrupted connection
- rapid reconnect
- malicious terminal escape sequences
- enormous output
- malformed SFTP filenames
- path traversal attempts in the SFTP UI
- unexpected Unicode
- very long lines

Never trust remote server output.

Terminal escape sequences must be parsed safely.

---

# 50. SFTP SECURITY

Never allow the remote server to cause unintended access to local files.

Use explicit user-selected paths.

Do not implement automatic arbitrary filesystem access.

Sanitize filenames.

Prevent path traversal.

---

# 51. APP STORE CONSIDERATIONS

The app must be a legitimate general-purpose developer/administration tool.

Do not include malware functionality.

Do not include credential theft.

Do not include covert persistence.

Do not include unauthorized surveillance.

Do not implement functionality intended to bypass security controls.

SSH functionality must be normal user-controlled remote administration functionality.

Provide clear privacy documentation.

Do not claim that the application can keep arbitrary background SSH connections alive indefinitely on iOS.

---

# 52. PRIVACY

The app should have a privacy-first architecture.

Default:

No analytics.

No remote logging.

No account required.

No telemetry containing terminal commands.

No uploading terminal contents.

No uploading private keys.

If analytics are added later, make them opt-in or carefully privacy-preserving.

---

# 53. EXPO ARCHITECTURE

Use Expo with native modules.

Do NOT force everything into JavaScript.

Create custom Expo Modules where native functionality is required.

Likely native modules:

TerminalModule
SSHModule
SFTPModule
SecureStorageModule

Example conceptual API:

SSHModule.connect(config)

SSHModule.disconnect(sessionId)

SSHModule.write(sessionId, data)

SSHModule.resize(sessionId, columns, rows)

SSHModule.onData(sessionId, callback)

SSHModule.onStateChange(sessionId, callback)

SFTPModule.list(...)
SFTPModule.download(...)
SFTPModule.upload(...)

SecureStorageModule.store(...)
SecureStorageModule.retrieve(...)

Use the Expo Modules API appropriately.

---

# 54. NATIVE TERMINAL RENDERING

Before implementing this, research current mature terminal emulator libraries that can be used in React Native/iOS.

Do not immediately invent a terminal renderer.

Evaluate:

- maintenance
- license
- iOS compatibility
- React Native compatibility
- performance
- ANSI support
- Unicode
- xterm compatibility
- PTY integration
- accessibility
- long-term viability

Document the decision in:

docs/terminal-engine.md

If a suitable existing renderer is unavailable, implement the minimum required native terminal rendering layer carefully.

---

# 55. SSH IMPLEMENTATION

Before choosing an SSH library, evaluate mature maintained implementations.

Requirements:

- iOS compatibility
- React Native/Expo integration
- modern SSH algorithms
- key handling
- PTY support
- SFTP support
- port forwarding
- known_hosts support
- licensing
- security track record
- maintenance status

Document the selected library and alternatives.

Do not implement SSH cryptography from scratch.

Do not write cryptographic primitives yourself.

---

# 56. BUILD SYSTEM

The project must build using Expo/EAS.

Create:

app.json or app.config.ts

eas.json

package.json

TypeScript configuration

ESLint configuration

Prettier configuration

tests

native module configuration

Use a development build for development.

Do not depend on Expo Go for the production application.

---

# 57. EAS PROFILES

Create at least:

development
preview
production

Development:

developmentClient: true

Preview:

internal testing build

Production:

App Store distribution

Configure appropriate iOS bundle identifiers.

Use a placeholder bundle identifier initially, clearly marked for the developer to replace.

Example:

com.example.terminalworkstation

Do not invent Apple's credentials.

---

# 58. DEVELOPMENT WORKFLOW

The project must be usable from Linux.

The developer should be able to do:

npm install

npx expo start

and use the appropriate development workflow.

Because custom native modules are required, document the development build workflow.

Provide:

scripts/dev.sh

scripts/build-ios.sh

scripts/submit-ios.sh

where appropriate.

---

# 59. EAS BUILD

Configure EAS so that iOS builds can be produced in the cloud.

The developer should ultimately be able to run:

eas build --platform ios --profile development

and:

eas build --platform ios --profile production

The production build should generate a valid iOS distribution artifact suitable for App Store Connect.

---

# 60. APP STORE SUBMISSION

Configure the project for:

EAS Build

- EAS Submit

The intended release workflow is:

git commit
↓
git push
↓
EAS build
↓
TestFlight
↓
testing
↓
App Store Connect
↓
App Review
↓
App Store

Document exactly which actions require the developer's Apple credentials and which can be automated.

Do not store Apple credentials in the repository.

---

# 61. CI/CD

Create optional GitHub Actions / EAS Workflow configuration.

Possible workflow:

main branch
↓
tests
↓
EAS iOS build
↓
TestFlight submission

Do NOT automatically submit to public App Store review without an explicit release step.

Production release should require deliberate human approval.

---

# 62. APP STORE METADATA

Create a docs/app-store.md file containing:

App name
Subtitle
Description
Keywords
Privacy policy requirements
Support URL
Marketing URL
Age rating considerations
Screenshot checklist
App Review notes

Do not claim features that do not exist.

---

# 63. APP REVIEW NOTES

Create an App Review notes template explaining:

This application is a general-purpose SSH terminal and server administration client.

Reviewers can test the application using the provided demo server credentials if we decide to provide them.

Do not provide real production credentials.

If Apple requires a test account, create a disposable test environment.

---

# 64. FIRST-RUN EXPERIENCE

When the user opens the app for the first time:

Show:

Welcome to Terminal

A professional terminal and SSH workstation for iPhone and iPad.

Buttons:

[Add Server]
[Generate SSH Key]
[Explore Demo]

Consider providing an optional local/demo environment that does not require the user to configure a server immediately.

---

# 65. DEMO MODE

Build a safe demo mode.

The demo should demonstrate:

- terminal UI
- panes
- tabs
- snippets
- command palette
- themes
- SFTP interface

without requiring real credentials.

Do not simulate security-sensitive functionality in a way that could confuse users about whether they are connected to a real server.

Clearly label demo content.

---

# 66. SETTINGS

Settings should include:

Appearance
Terminal
Keyboard
SSH
Security
SFTP
Connections
Notifications
Privacy
About

Terminal settings:

Font
Font size
Scrollback
Cursor
Cursor blink
Terminal type
Theme

SSH settings:

Keepalive
Reconnect
Connection timeout
Host key behavior

Security:

Biometric unlock
Auto-lock
Key protection

---

# 67. NOTIFICATIONS

Do not overuse notifications.

Potential useful notifications:

SSH connection unexpectedly disconnected

but only if technically appropriate under iOS rules.

Do not claim persistent background monitoring.

---

# 68. COMMAND SNIPPET VARIABLES

Eventually support:

{{server}}
{{user}}
{{port}}
{{directory}}

Example:

cd {{directory}} && git pull

Prompt the user for variables before execution.

Never execute arbitrary snippets automatically without explicit user action.

---

# 69. DANGEROUS COMMAND UX

Do not prevent normal Linux administration.

However, consider confirmation for commands pasted through special UI actions if the user explicitly enables safety warnings.

Do not try to classify every Linux command as dangerous.

The terminal should behave like a real terminal.

The user remains responsible for commands they execute on their servers.

---

# 70. TERMINAL COPY/PASTE

Implement:

tap/hold selection
copy
paste
select all
share

Support large clipboard contents efficiently.

For paste, provide optional confirmation for extremely large pasted content.

---

# 71. FILE TRANSFER UX

Show transfer progress.

Example:

Uploading:

deploy.tar.gz

██████████████████░░ 87%

234 MB / 268 MB

Allow cancel.

Handle network interruption gracefully.

---

# 72. CONNECTION STATUS

Display status subtly.

Example:

● Connected

or:

○ Disconnected

or:

↻ Reconnecting...

Do not constantly consume screen space with connection information.

---

# 73. THEMING ARCHITECTURE

Create a theme abstraction rather than hardcoding colors throughout the UI.

Theme:

background
foreground
cursor
selection
black
red
green
yellow
blue
magenta
cyan
white
bright variants

Use this for terminal rendering and application UI where appropriate.

---

# 74. DOCUMENTATION

Create:

README.md

docs/architecture.md

docs/terminal-engine.md

docs/ssh.md

docs/security.md

docs/development.md

docs/testing.md

docs/eas.md

docs/app-store.md

docs/troubleshooting.md

The README must explain how to run the project.

---

# 75. CODE QUALITY

Use strict TypeScript.

Avoid any unless genuinely required.

Use interfaces and typed APIs.

Use dependency inversion between UI and native modules.

Use small focused modules.

Do not put 2,000-line components into the project.

Do not create giant singleton objects.

Avoid circular dependencies.

---

# 76. DEVELOPMENT PRINCIPLE

Do not attempt to implement every feature in one giant change.

Build incrementally.

The development sequence should be:

PHASE 1
Project foundation

PHASE 2
Terminal UI

PHASE 3
Native terminal engine

PHASE 4
SSH

PHASE 5
Server management

PHASE 6
SSH keys and Keychain

PHASE 7
Multiple sessions

PHASE 8
Pane splitting

PHASE 9
Workspaces

PHASE 10
SFTP

PHASE 11
File editor

PHASE 12
Port forwarding

PHASE 13
Jump hosts

PHASE 14
Snippets

PHASE 15
Command palette

PHASE 16
Security hardening

PHASE 17
Performance

PHASE 18
Testing

PHASE 19
TestFlight

PHASE 20
App Store release

---

# 77. PHASE COMPLETION RULE

At the end of every phase:

1. Run tests.
2. Run lint.
3. Run TypeScript checks.
4. Build the development application if native code changed.
5. Fix all errors.
6. Update documentation.
7. Commit changes.
8. Do not continue to the next phase if the current phase is broken.

Never knowingly leave the repository in a broken state.

---

# 78. CODEX WORKING RULES

You are an autonomous coding agent working on this repository.

Before modifying architecture:

- inspect the repository
- inspect package versions
- inspect existing Expo configuration
- inspect native modules
- inspect tests
- inspect documentation

Do not blindly overwrite existing work.

Before adding a dependency:

- determine whether it is actually necessary
- check compatibility with the current Expo/React Native version
- check maintenance status
- check license
- check whether it works in an Expo development build
- document why it is needed

Prefer stable dependencies over experimental ones.

---

# 79. WEB RESEARCH RULE

When a technical decision depends on current library/API behavior, research current official documentation.

Prioritize:

- Expo documentation
- React Native documentation
- Apple developer documentation
- official library documentation
- official GitHub repositories

Do not rely on outdated Stack Overflow answers when official documentation exists.

Record important architecture decisions in documentation.

---

# 80. DO NOT GUESS NATIVE APIS

If an API is uncertain, investigate it.

Do not invent:

- Expo module APIs
- iOS APIs
- EAS configuration
- entitlements
- SSH library APIs
- React Native APIs

Verify current versions.

---

# 81. NO FAKE IMPLEMENTATIONS

Do not create fake functions that claim to support functionality.

Bad:

connectSSH() {
return Promise.resolve()
}

Good:

Implement the actual connection or clearly mark an unfinished interface as TODO and explain it.

The application should never show "Connected" when there is no real connection.

---

# 82. NO PLACEHOLDER TERMINAL

Do not build a UI that merely displays:

$ hello world

and call it a terminal.

The terminal must eventually communicate with an actual PTY.

The terminal must be capable of running real interactive programs on a real SSH server.

---

# 83. ACCEPTABLE TEMPORARY STUBS

During early development, stubs are acceptable only when they are clearly isolated.

For example:

TerminalEngine interface

MockTerminalEngine

RealTerminalEngine

The UI can initially use MockTerminalEngine for development.

But the final production build must use RealTerminalEngine.

---

# 84. DEVELOPMENT DEMO SERVER

Create a repeatable local development server.

Use Docker where appropriate.

Provide:

scripts/start-test-server.sh

scripts/stop-test-server.sh

The test environment should allow us to test:

SSH
PTY
SFTP
known_hosts
authentication
large output
interactive commands

---

# 85. TERMINAL ACCEPTANCE TEST

The following must work against the test SSH server:

ssh connection

echo hello

pwd

ls

cd /tmp

export TEST=123

echo $TEST

clear

top

htop if available

vim

nano

less

python3

tmux

Ctrl+C

Ctrl+D

Ctrl+Z

Tab completion

arrow keys

history

resize

colors

Unicode

large output

If any of these fail, investigate before declaring the terminal complete.

---

# 86. PERFORMANCE ACCEPTANCE TEST

Test:

100,000 lines of output

rapid output

vim

tmux

htop

tail -f

multiple simultaneous sessions

4-pane layout

8-pane layout

SFTP transfer

large file transfer

The application must remain responsive.

---

# 87. SECURITY ACCEPTANCE TEST

Verify:

private keys never appear in logs

private keys never appear in React state unnecessarily

private keys are protected in Keychain

host-key mismatch is detected

invalid server certificate/network behavior is handled

SSH credentials aren't sent anywhere except the intended SSH server

no secrets are committed

no credentials exist in test fixtures

---

# 88. APP STORE BUILD ACCEPTANCE TEST

Before release:

npm test

npm run lint

npx tsc --noEmit

eas build --platform ios --profile production

Then:

eas submit --platform ios

The exact commands may be adjusted to the current EAS configuration, but the production workflow must remain reproducible.

---

# 89. RELEASE DOCUMENTATION

Create:

docs/release-checklist.md

Checklist:

[ ] Tests passing
[ ] TypeScript passing
[ ] Lint passing
[ ] Security review
[ ] No secrets in repository
[ ] Production bundle identifier configured
[ ] Apple Developer account configured
[ ] App Store Connect app created
[ ] Privacy information completed
[ ] Screenshots prepared
[ ] App description prepared
[ ] TestFlight build uploaded
[ ] TestFlight tested
[ ] App Review notes prepared
[ ] Production build submitted

---

# 90. FINAL PRODUCT REQUIREMENT

The final product should feel like:

"Terminator + SSH client + SFTP + tmux-style workspaces + mobile terminal keyboard + developer utilities"

rather than:

"an SSH connection screen with a textbox."

The terminal itself is the primary product.

SSH is the transport.

Workspaces/panes/sessions are the productivity layer.

SFTP/files/snippets/tools are the productivity addons.

Security is fundamental.

---

# 91. IMPLEMENTATION ORDER — START HERE

Do not immediately implement everything.

Start with Phase 0.

## Phase 0 — Repository and technical investigation

First:

1. Inspect the current repository.
2. Determine whether this is already an Expo project.
3. Determine Expo SDK version.
4. Determine React Native version.
5. Determine TypeScript version.
6. Determine whether native directories exist.
7. Determine whether EAS is configured.
8. Determine package manager.
9. Determine existing dependencies.

Then research and select:

1. terminal emulator implementation
2. SSH implementation
3. SFTP implementation
4. secure Keychain implementation
5. local persistence
6. navigation
7. state management

Create:

docs/architecture.md

docs/terminal-engine.md

docs/ssh.md

docs/security.md

with the decisions and reasons.

Do not start implementing the complete application until this investigation is complete.

---

# 92. FIRST CODING MILESTONE

After Phase 0, build:

Expo application

- professional UI shell
- Servers screen
- Terminal screen
- Settings screen
- navigation
- theme system
- persistent server metadata

Then create:

MockTerminalEngine

so the UI can be developed independently.

After that, replace the mock with the real terminal engine.

---

# 93. SECOND MILESTONE

Implement the real native terminal engine.

Acceptance:

A terminal session can connect to the development/test environment and display:

$ echo hello

Then:

$ ls

Then:

$ vim

Then:

$ htop

Then:

$ tmux

The terminal must handle resizing and keyboard input.

---

# 94. THIRD MILESTONE

Implement real SSH.

Acceptance:

User can:

Generate key
↓
save securely
↓
create server
↓
connect
↓
authenticate
↓
open PTY
↓
use interactive shell
↓
disconnect
↓
reconnect

---

# 95. FOURTH MILESTONE

Implement:

multiple sessions

- tabs
- split panes
- workspaces

Acceptance:

User can create:

+--------------------+--------------------+
| Production | Staging |
| | |
+--------------------+--------------------+
| Logs | Monitoring |
| | |
+--------------------+--------------------+

with four independent real terminal sessions.

---

# 96. FIFTH MILESTONE

Implement:

SFTP

- remote file browser
- upload/download
- basic editor

  ***

# 97. SIXTH MILESTONE

Implement:

port forwarding

- jump hosts
- snippets
- command palette
- search
- themes
- custom keyboard toolbar

  ***

# 98. FINAL MILESTONE

Security hardening.

Performance testing.

TestFlight.

App Store preparation.

Production build.

---

# 99. IMPORTANT: DO NOT OVERENGINEER THE FIRST VERSION

Version 1 should prioritize:

1. Excellent terminal
2. Excellent SSH
3. Excellent pane/session system
4. SSH keys
5. SFTP
6. Security
7. Performance

Do not spend weeks building:

- cloud sync
- AI assistant
- social features
- complicated account systems
- unnecessary analytics
- huge plugin marketplace

until the terminal itself is excellent.

---

# 100. FINAL DEFINITION OF DONE

The application is considered production-ready only when a real user can install it on an iPhone/iPad, create/import an SSH key, configure a Linux server, connect securely, open an interactive shell, use vim/tmux/htop, split multiple terminal sessions into panes, transfer files over SFTP, manage multiple servers, disconnect/reconnect, and use the application reliably without needing a proprietary cloud backend.

The application must build through Expo/EAS and be suitable for TestFlight and App Store submission.

Do not declare the project complete merely because the UI looks finished.

The underlying terminal, SSH, SFTP, security, performance, and native functionality must actually work.
