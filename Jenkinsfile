pipeline {
    agent {
        docker { image 'cimg/rust:1.65.0' }
    }
    stages {
        stage('Test') {
            steps {
                sh 'npm install --force'
                sh 'npm build'
            }
        }
    }
}