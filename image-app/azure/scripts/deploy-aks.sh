#!/bin/bash

# Azure Kubernetes Service Deployment Script
# This script deploys the image processor app to AKS

set -e

# Configuration
RESOURCE_GROUP="image-processor-rg"
LOCATION="eastus"
ACR_NAME="imageprocessoracr"
AKS_CLUSTER="image-processor-aks"
NODE_COUNT=2
NODE_SIZE="Standard_B2s"

echo "🚀 Starting Azure Kubernetes Service deployment..."

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

# Create AKS cluster
echo "☸️ Creating AKS cluster (this may take 10-15 minutes)..."
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER \
    --node-count $NODE_COUNT \
    --node-vm-size $NODE_SIZE \
    --enable-managed-identity \
    --attach-acr $ACR_NAME \
    --generate-ssh-keys \
    --location $LOCATION \
    --network-plugin azure \
    --enable-addons monitoring \
    --output table

# Get AKS credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER \
    --overwrite-existing

# Verify connection
echo "✅ Verifying cluster connection..."
kubectl get nodes

# Install NGINX Ingress Controller
echo "📦 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
echo "⏳ Waiting for ingress controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Apply Kubernetes manifests
echo "🚢 Deploying application..."
kubectl apply -f ../k8s/namespace.yaml
kubectl apply -f ../k8s/configmap.yaml
kubectl apply -f ../k8s/persistent-volume.yaml
kubectl apply -f ../k8s/backend-deployment.yaml
kubectl apply -f ../k8s/frontend-deployment.yaml
kubectl apply -f ../k8s/hpa.yaml

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --namespace image-processor \
  --for=condition=available \
  --timeout=300s \
  deployment/backend

kubectl wait --namespace image-processor \
  --for=condition=available \
  --timeout=300s \
  deployment/frontend

# Get service endpoints
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Cluster Info:"
kubectl cluster-info

echo ""
echo "📍 Application Status:"
kubectl get pods -n image-processor
kubectl get services -n image-processor

echo ""
FRONTEND_IP=$(kubectl get service frontend-service -n image-processor -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -n "$FRONTEND_IP" ]; then
    echo "📍 Frontend URL: http://$FRONTEND_IP"
    echo "📍 Backend URL: http://$FRONTEND_IP/api"
else
    echo "⏳ Waiting for LoadBalancer IP..."
    echo "Run: kubectl get service frontend-service -n image-processor -w"
fi

echo ""
echo "🔍 Useful commands:"
echo "  kubectl get pods -n image-processor"
echo "  kubectl logs -f deployment/backend -n image-processor"
echo "  kubectl logs -f deployment/frontend -n image-processor"
echo "  kubectl get hpa -n image-processor"
echo "  kubectl top nodes"
echo "  kubectl top pods -n image-processor"
echo ""
echo "🗑️ To delete: az group delete --name $RESOURCE_GROUP --yes --no-wait"
