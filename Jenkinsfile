pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'sonar-server'
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

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
                    -Dsonar.sources=.
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
                withCredentials([string(credentialsId: 'Fly-token', variable: 'FLY_API_TOKEN')]) {
                    sh '''
                    echo "Deploying to Fly.io"
                    flyctl deploy --remote-only -a webv
                    '''
                }
            }
        }
    }

    post {

        success {
            emailext(
                subject: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
Build Successful 🚀

Project: ${env.JOB_NAME}
Build Number: ${env.BUILD_NUMBER}

Check Deployment:
${env.BUILD_URL}
""",
                to: "contact@saurabhadvani.online"
            )
        }

        failure {
            emailext(
                subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
Build Failed ❌

Project: ${env.JOB_NAME}
Build Number: ${env.BUILD_NUMBER}

Check Logs:
${env.BUILD_URL}
""",
                to: "contact@saurabhadvani.online"
            )
        }
    }
}
