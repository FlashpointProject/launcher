pipeline {
    agent {
        docker { image 'vibbioinfocore/rust-node-ci' }
    }
    stages {
        stage('Test') {
            steps {
                sh 'node --version'
            }
        }
    }
}