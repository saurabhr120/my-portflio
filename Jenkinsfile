pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'sonar-server'
    }

    stages {

        stage('DEBUG') {
            steps {
                echo "NEW JENKINSFILE LOADED"
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
                    flyctl deploy --remote-only
                    '''
                }
            }
        }

    }

    post {

        success {
            echo "Pipeline successful 🚀"

            emailext (
                subject: "SUCCESS: Jenkins Build ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                Good news!

                The Jenkins pipeline completed successfully.

                Job: ${env.JOB_NAME}
                Build Number: ${env.BUILD_NUMBER}

                View Build:
                ${env.BUILD_URL}

                """,
                to: "contact@saurabhadvani.online"
            )
        }

        failure {
            echo "Pipeline failed ❌"

            emailext (
                subject: "FAILED: Jenkins Build ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                Attention!

                The Jenkins pipeline has FAILED.

                Job: ${env.JOB_NAME}
                Build Number: ${env.BUILD_NUMBER}

                Check logs:
                ${env.BUILD_URL}

                """,
                to: "contact@saurabhadvani.online"
            )
        }

    }
}
