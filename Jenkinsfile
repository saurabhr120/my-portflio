pipeline {
    agent any

    stages {

        stage('Clone Repository') {
            steps {
                git branch: 'cicd-pipeline',
                url: 'https://github.com/saurabhr120/my-portflio.git'
            }
        }

        stage('Build Website') {
            steps {
                sh '''
                echo "Building portfolio"
                mkdir build
                cp -r * build/
                '''
            }
        }

        stage('Test') {
            steps {
                sh '''
                echo "Checking files"
                ls -la build
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo "Deploying portfolio"
            }
        }
    }

    post {

        success {
            echo "Deployment successful"
        }

        failure {
            echo "Deployment failed"
        }
    }
}
