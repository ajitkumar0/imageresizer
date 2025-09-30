#!/bin/bash

# Azure App Service Deployment Script for Cloud Shell
# This script uses ACR Build instead of local Docker

set -e

# Configuration
RESOURCE_GROUP="image-processor-rg"
LOCATION="eastus"
ACR_NAME="imageprocessoracr$(date +%s)"  # Add timestamp for uniqueness
APP_SERVICE_PLAN="image-processor-plan"
BACKEND_APP="image-processor-backend-$(date +%s)"
FRONTEND_APP="image-processor-frontend-$(date +%s)"

echo "🚀 Starting Azure App Service deployment from Cloud Shell..."
echo "📝 Using unique names:"
echo "   ACR: $ACR_NAME"
echo "   Backend: $BACKEND_APP"
echo "   Frontend: $FRONTEND_APP"
echo ""

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get current directory (should be in azure/scripts)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

echo "📂 Project root: $PROJECT_ROOT"

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output table

# Create Azure Container Registry
echo "📦 Creating Azure Container Registry..."
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --location $LOCATION \
    --admin-enabled true \
    --output table

echo "⏳ Waiting for ACR to be ready..."
sleep 10

# Build and push backend using ACR Build (no local Docker required!)
echo "🏗️ Building backend image in Azure (this may take 5-10 minutes)..."
az acr build \
    --registry $ACR_NAME \
    --image backend:latest \
    --file "$PROJECT_ROOT/backend/Dockerfile" \
    "$PROJECT_ROOT/backend"

# Build and push frontend using ACR Build
echo "🏗️ Building frontend image in Azure (this may take 5-10 minutes)..."
az acr build \
    --registry $ACR_NAME \
    --image frontend:latest \
    --file "$PROJECT_ROOT/frontend/Dockerfile" \
    "$PROJECT_ROOT/frontend"

# Get ACR credentials
echo "🔐 Getting ACR credentials..."
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show \
    --name $ACR_NAME \
    --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
    --name $ACR_NAME \
    --query "passwords[0].value" -o tsv)

# Create App Service Plan
echo "📋 Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --is-linux \
    --sku B2 \
    --output table

# Create backend Web App
echo "🌐 Creating backend Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $BACKEND_APP \
    --deployment-container-image-name ${ACR_LOGIN_SERVER}/backend:latest \
    --output table

# Configure backend container
echo "⚙️ Configuring backend container..."
az webapp config container set \
    --name $BACKEND_APP \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name ${ACR_LOGIN_SERVER}/backend:latest \
    --docker-registry-server-url https://${ACR_LOGIN_SERVER} \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# Configure backend environment
FRONTEND_URL="https://${FRONTEND_APP}.azurewebsites.net"

echo "⚙️ Configuring backend environment..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP \
    --settings \
        NODE_ENV=production \
        PORT=3001 \
        HOST=0.0.0.0 \
        UPLOAD_DIR=/home/uploads \
        CORS_ORIGIN=$FRONTEND_URL \
        MAX_FILE_SIZE=52428800 \
        CLEANUP_TTL_HOURS=24 \
        CLEANUP_INTERVAL_HOURS=6 \
        RATE_LIMIT_WINDOW_MS=900000 \
        RATE_LIMIT_MAX_REQUESTS=100 \
        MAX_DISK_QUOTA=10737418240 \
        WEBSITES_PORT=3001 \
    --output table

# Enable continuous deployment for backend
echo "🔄 Enabling continuous deployment for backend..."
az webapp deployment container config \
    --name $BACKEND_APP \
    --resource-group $RESOURCE_GROUP \
    --enable-cd true

# Create frontend Web App
echo "🌐 Creating frontend Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $FRONTEND_APP \
    --deployment-container-image-name ${ACR_LOGIN_SERVER}/frontend:latest \
    --output table

# Configure frontend container
echo "⚙️ Configuring frontend container..."
az webapp config container set \
    --name $FRONTEND_APP \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name ${ACR_LOGIN_SERVER}/frontend:latest \
    --docker-registry-server-url https://${ACR_LOGIN_SERVER} \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# Configure frontend environment
BACKEND_URL="https://${BACKEND_APP}.azurewebsites.net"

echo "⚙️ Configuring frontend environment..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP \
    --settings \
        WEBSITES_PORT=80 \
        BACKEND_URL=$BACKEND_URL \
    --output table

# Enable continuous deployment for frontend
echo "🔄 Enabling continuous deployment for frontend..."
az webapp deployment container config \
    --name $FRONTEND_APP \
    --resource-group $RESOURCE_GROUP \
    --enable-cd true

# Enable HTTPS only
echo "🔒 Enabling HTTPS only..."
az webapp update \
    --name $BACKEND_APP \
    --resource-group $RESOURCE_GROUP \
    --https-only true

az webapp update \
    --name $FRONTEND_APP \
    --resource-group $RESOURCE_GROUP \
    --https-only true

# Restart apps
echo "🔄 Restarting applications..."
az webapp restart --name $BACKEND_APP --resource-group $RESOURCE_GROUP
az webapp restart --name $FRONTEND_APP --resource-group $RESOURCE_GROUP

# Wait for apps to start
echo "⏳ Waiting for applications to start (30 seconds)..."
sleep 30

# Get URLs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 IMPORTANT: Save these URLs!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend URL: https://${FRONTEND_APP}.azurewebsites.net"
echo "🔧 Backend URL:  https://${BACKEND_APP}.azurewebsites.net"
echo "❤️ Health Check: https://${BACKEND_APP}.azurewebsites.net/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resource Information:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Container Registry: $ACR_NAME"
echo "   Location: $LOCATION"
echo ""
echo "🔍 Useful commands:"
echo "   View backend logs:  az webapp log tail --name $BACKEND_APP --resource-group $RESOURCE_GROUP"
echo "   View frontend logs: az webapp log tail --name $FRONTEND_APP --resource-group $RESOURCE_GROUP"
echo "   Check backend health: curl https://${BACKEND_APP}.azurewebsites.net/health"
echo ""
echo "🗑️ To delete everything:"
echo "   az group delete --name $RESOURCE_GROUP --yes --no-wait"
echo ""
echo "⏰ Note: Apps may take 2-3 minutes to fully start up."
echo "━━━━━━━━━━━━━���━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
