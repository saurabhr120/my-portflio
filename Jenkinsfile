pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'sonar-scanner'
    }
    stage('DEBUG') {
    steps {
        echo "NEW JENKINSFILE LOADED"
    }
}

    stages {

        stage('Verify Files') {
            steps {
                sh '''
                echo "Checking repository"
                ls -la
                '''
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''
                    $SCANNER_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=my-portfolio \
                    -Dsonar.sources=. \
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker Image"
                docker build -t portfolio .
                '''
            }
        }

        stage('Deploy to Fly.io') {
            steps {
                withCredentials([string(credentialsId: 'fly-token', variable: 'FLY_API_TOKEN')]) {
                    sh '''
                    echo "Deploying to Fly.io"
                    flyctl deploy --remote-only
                    '''
                }
            }
        }

    }

    post {
        success {
            echo "Pipeline successful 🚀"
        }

        failure {
            echo "Pipeline failed ❌"
        }
    }
}
