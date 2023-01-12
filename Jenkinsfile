pipeline {
    agent {
        docker { image 'cimg/rust:1.65.0-node' }
    }
    stages {
        stage('Test') {
            steps {
                sh 'rustup default stable'
                sh 'rustup target add i686-pc-windows-msvc'
                sh 'npm install --force'
                sh 'npm run build'
            }
        }
    }
}