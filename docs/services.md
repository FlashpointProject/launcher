# Services

The launcher provides multiple ways to run programs alongside. An example config is provided at the bottom of the page.

`<fpPath>` can be used in any file path. These will be substituted out for the absolute Flashpoint path as defined in Config.

### File Layout

```json
{
  "watch": [
    "logFile", "anotherLogFile"
  ],
  "server": [
    {
      ...
    }
  ],
  "start": [
    {
      ...
    }
  ],
  "stop": [
    {
      ...
    }
  ],
  "daemon": [

  ]
}
```

### Watch

Watch is a list of file paths. A tail will be started on each and any changed will be printed to the logs page under the Log Watcher source. This is useful for tracking log files from external applications.

### Server

A server is started alongside the launcher. Multiple servers can be defined but a single one is chosen via the Config page.

**Name** - Name that is shown in the Config page

**Path** - Path to set as the working directory when executing.

**Filename** - Filename relative to the Path to execute.

**Arguments** - A list of arguments to pass to the server on execution.

**Kill** - Whether to kill the process when the launcher closes or not.

**MAD4FP** - (Optional) - Whether this is a MAD4FP enabled server. If you're unsure what this means, leave as false.

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

## Example 
```json
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