# Services

## Overview

Flashpoint Launcher supports a few methods of running background processes:
- **Watch** - Starts a watcher for a file and prints the new content to the logs page
- **Server** - A single server can run at a time, this can be selected on the Config page or forced by a Game's launch parameters
- **Start** - Runs when the launcher starts
- **Stop** - Runs when the launcher is about to close
- **Daemon** - Runs when the launcher starts as a managed process and killed when the launcher is about to close

### Watch

Watch is a list of file paths. A tail will be started on each and any changed will be printed to the logs page under the Log Watcher source. This is useful for tracking log files from external applications.

### Server

A server is started alongside the launcher. Multiple servers can be defined but a single one is chosen via the Config page.

**Name** - Name that is shown in the Config page

**Path** - Path to set as the working directory when executing.

**Filename** - Filename relative to the Path to execute.

**Arguments** - A list of arguments to pass to the process on execution.

**Kill** - Whether to kill the process when the launcher closes or not.

**MAD4FP** - (Optional) - Whether this is a MAD4FP enabled server. This server will be used when `Run With MAD4FP` is used from the Curate page.

```json
{
  "name": "NameInConfigPage",
  "path": "DirectoryToRunIn",
  "filename": "FileToRun",
  "arguments": ["arguments", "to", "pass"],
  "kill": true,
  "mad4fp": true
}
```

### Stop / Start / Daemon

Stop / Start processes and Daemon services can be given to run with the launcher. Start / Stop processes are run exactly once during startup and shutdown of the launcher. Daemon processes and started at startup can be controlled via the Developer page.

**Path** - Path to set as the working directory when executing.

**Filename** - Filename relative to the Path to execute.

**Arguments** - A list of arguments to pass to the server on execution.

```json
{
  "path": "DirectoryToRunIn",
  "filename": "FileToRun",
  "arguments": ["arguments", "to", "pass"]
}
```

### Substitutions

The `path`, `filename` and `arguments` fields of all of these also support a few subtitutions:
- `<fpPath>` - Flashpoint Path as defined in the Config page
- `<cwd>` - Working directory of the Launcher executable
- `<os>` - Operating system of the host (`win32`, `darwin` or `linux`)

e.g. `<fpPath>/Server/config.yaml` can be a useful tool when passing a config file as an argument.


## Example Configuration
```json title="/Data/services.json"
{
  "watch": [
    "<fpPath>/Server/logs/stripped.log"
  ],
  "server": [
    {
      "name": "PHP Router",
      "path": "Server",
      "filename": "php",
      "arguments": ["-S", "127.0.0.1:22500", "router.php"],
      "kill": true
    },
    {
      "name": "Apache Webserver",
      "path": "Server",
      "filename": "httpd",
      "arguments": ["-f", "<fpPath>/Server/conf/httpd.conf", "-X"],
      "kill": true
    }
  ],
  "start": [
    {
      "path": "Server",
      "filename": "php",
      "arguments": ["-f", "update_httpdconf_main_dir.php"]
    }
  ],
  "stop": [
    {
      "path": "Server",
      "filename": "php",
      "arguments": ["-f", "reset_httpdconf_main_dir.php"]
    },
    {
      "path": "FPSoftware/Redirector",
      "filename": "Redirect.exe",
      "arguments": ["/close"]
    },
    {
      "path": "FPSoftware/Fiddler2Portable/App/Fiddler",
      "filename": "ExecAction.exe",
      "arguments": ["quit"]
    }
  ]
}
```