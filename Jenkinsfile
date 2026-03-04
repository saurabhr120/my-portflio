pipeline {
    agent any

    environment {
        FLY_API_TOKEN = credentials('fly-token')
    }

    stages {

        stage('Clone Repository') {
            steps {
                git branch: 'cicd-pipeline',
                url: 'git@github.com:saurabhr120/my-portflio.git'
            }
        }

        stage('Build Website') {
            steps {
                sh '''
                echo "Building portfolio"

                rm -rf build
                mkdir build

                rsync -av --exclude build . build
                '''
            }
        }

        stage('Test') {
            steps {
                sh '''
                echo "Testing website structure"
                ls -la build
                '''
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('sonarserver') {
                    sh '''
                    sonar-scanner \
                    -Dsonar.projectKey=portfolio \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=$SONAR_HOST_URL \
                    -Dsonar.login=$SONAR_AUTH_TOKEN
                    '''
                }
            }
        }

        stage('Deploy to Fly.io') {
            steps {
                sh '''
                flyctl deploy --remote-only
                '''
            }
        }
    }

    post {

        success {
            echo "Deployment successful"
        }

        failure {
            echo "Pipeline failed"
        }
    }
}
