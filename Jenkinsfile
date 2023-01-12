pipeline {
    agent {
        docker { image 'cimg/rust:1.65.0-node' }
    }
    environment { 
        NODE_ENV = 'production'
        PACK_ARCH = 'ia32'
        // This can be nexus3 or nexus2
        NEXUS_VERSION = "nexus3"
        // This can be http or https
        NEXUS_PROTOCOL = "http"
        // Where your Nexus is running
        NEXUS_URL = "nexus-dev:8081"
        // Repository where we will upload the artifact
        NEXUS_REPOSITORY = "launcher"
        // Jenkins credential id to authenticate to Nexus OSS
        NEXUS_CREDENTIAL_ID = "nexus-credentials"
    }
    stages {
        stage('Test') {
            steps {
                sh 'rustup default stable'
                sh 'rustup target add i686-pc-windows-msvc'
                sh 'npm install -g electron-builder'
                sh 'npm install --force'
                sh 'npm run build'
            }
        }
        stage('Package') {
            steps {
                sh 'npm run pack:win32'
                script {
                    packageInfo = readJSON file: 'package.json';
                    filesByGlob = findFiles(glob: 'dist/Flashpoint*.7z');
                    // Print some info from the artifact found
                    echo "${filesByGlob[0].name} ${filesByGlob[0].path} ${filesByGlob[0].directory} ${filesByGlob[0].length} ${filesByGlob[0].lastModified}"
                    // Extract the path from the File found
                    artifactPath = filesByGlob[0].path;
                    // Assign to a boolean response verifying If the artifact name exists
                    artifactExists = fileExists artifactPath;

                    if (artifactExists) {
                        nexusArtifactUploader(
                            nexusVersion: NEXUS_VERSION,
                            protocol: NEXUS_PROTOCOL,
                            nexusUrl: NEXUS_URL,
                            groupId: 'launcher.launcher',
                            version: packageInfo.version,
                            repository: NEXUS_REPOSITORY,
                            credentialsId: NEXUS_CREDENTIAL_ID,
                            artifacts: [
                                [
                                    artifactId: 'launcher',
                                    classifier: '',
                                    type: '7z',
                                    file: artifactPath,
                                ],
                            ]
                        );
                    }
                }
            }
        }
    }
}