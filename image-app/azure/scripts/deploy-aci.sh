#!/bin/bash

# Azure Container Instances Deployment Script
# This script deploys the image processor app to Azure Container Instances

set -e

# Configuration
RESOURCE_GROUP="image-processor-rg"
LOCATION="eastus"
ACR_NAME="imageprocessoracr"
STORAGE_ACCOUNT="imageprocessorstore"
BACKEND_CONTAINER="backend"
FRONTEND_CONTAINER="frontend"
DNS_LABEL_BACKEND="image-processor-backend"
DNS_LABEL_FRONTEND="image-processor-frontend"

echo "🚀 Starting Azure Container Instances deployment..."

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

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

# Login to ACR
echo "🔐 Logging in to ACR..."
az acr login --name $ACR_NAME

# Build and push images
echo "🏗️ Building and pushing backend image..."
az acr build \
    --registry $ACR_NAME \
    --image backend:latest \
    ../../backend

echo "🏗️ Building and pushing frontend image..."
az acr build \
    --registry $ACR_NAME \
    --image frontend:latest \
    ../../frontend

# Create storage account for persistent storage
echo "💾 Creating storage account..."
az storage account create \
    --resource-group $RESOURCE_GROUP \
    --name $STORAGE_ACCOUNT \
    --location $LOCATION \
    --sku Standard_LRS \
    --output table

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
    --resource-group $RESOURCE_GROUP \
    --account-name $STORAGE_ACCOUNT \
    --query "[0].value" -o tsv)

# Create file shares
echo "📁 Creating file shares..."
az storage share create \
    --name uploads \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY

az storage share create \
    --name logs \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY

# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
    --name $ACR_NAME \
    --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
    --name $ACR_NAME \
    --query "passwords[0].value" -o tsv)

# Deploy backend container
echo "🚢 Deploying backend container..."
FRONTEND_URL="http://${DNS_LABEL_FRONTEND}.${LOCATION}.azurecontainer.io"

az container create \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_CONTAINER \
    --image ${ACR_NAME}.azurecr.io/backend:latest \
    --registry-login-server ${ACR_NAME}.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label $DNS_LABEL_BACKEND \
    --ports 3001 \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
        NODE_ENV=production \
        PORT=3001 \
        HOST=0.0.0.0 \
        UPLOAD_DIR=/app/uploads \
        CORS_ORIGIN=$FRONTEND_URL \
        MAX_FILE_SIZE=52428800 \
        CLEANUP_TTL_HOURS=24 \
        CLEANUP_INTERVAL_HOURS=6 \
        RATE_LIMIT_WINDOW_MS=900000 \
        RATE_LIMIT_MAX_REQUESTS=100 \
        MAX_DISK_QUOTA=10737418240 \
    --azure-file-volume-account-name $STORAGE_ACCOUNT \
    --azure-file-volume-account-key $STORAGE_KEY \
    --azure-file-volume-share-name uploads \
    --azure-file-volume-mount-path /app/uploads \
    --output table

# Deploy frontend container
echo "🚢 Deploying frontend container..."
BACKEND_URL="http://${DNS_LABEL_BACKEND}.${LOCATION}.azurecontainer.io:3001"

az container create \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_CONTAINER \
    --image ${ACR_NAME}.azurecr.io/frontend:latest \
    --registry-login-server ${ACR_NAME}.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label $DNS_LABEL_FRONTEND \
    --ports 80 \
    --cpu 1 \
    --memory 2 \
    --environment-variables \
        BACKEND_URL=$BACKEND_URL \
    --output table

# Get URLs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Backend URL: http://${DNS_LABEL_BACKEND}.${LOCATION}.azurecontainer.io:3001"
echo "📍 Frontend URL: http://${DNS_LABEL_FRONTEND}.${LOCATION}.azurecontainer.io"
echo "📍 Health Check: http://${DNS_LABEL_BACKEND}.${LOCATION}.azurecontainer.io:3001/health"
echo ""
echo "🔍 View backend logs: az container logs --resource-group $RESOURCE_GROUP --name $BACKEND_CONTAINER"
echo "🔍 View frontend logs: az container logs --resource-group $RESOURCE_GROUP --name $FRONTEND_CONTAINER"
echo ""
echo "🗑️ To delete: az group delete --name $RESOURCE_GROUP --yes --no-wait"
