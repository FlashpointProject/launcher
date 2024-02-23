import { exec } from 'child_process';
import { platform } from 'os';

// Function to check if the current platform is Windows
function isWindows() {
  return platform() === 'win32';
}

// Function to run npm install with specific architecture and force flag
function runNpmInstall() {
  // Command to run npm install with architecture and force flag
  const command = 'npm install --arch=ia32 --force --package-lock-only --ignore-scripts';

  // Execute the command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running npm install: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`npm install output: ${stdout}`);
  });
}

// Check if the platform is Windows and run npm install if true
if (isWindows()) {
  console.log('Installing additional ia32 Windows libraries...');
  runNpmInstall();
}
