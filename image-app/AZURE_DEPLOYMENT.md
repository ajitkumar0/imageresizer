# Azure Deployment Guide - Image Processor App

This guide covers multiple deployment options for Azure infrastructure, from simple to production-ready.

## 📋 Prerequisites

- Azure account with active subscription
- Azure CLI installed ([Install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- Docker installed locally
- Git repository (GitHub recommended for CI/CD)

## 🔐 Initial Setup

### 1. Login to Azure

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create a resource group
az group create \
  --name image-processor-rg \
  --location eastus
```

### 2. Create Azure Container Registry (ACR)

```bash
# Create ACR (required for all deployment methods)
az acr create \
  --resource-group image-processor-rg \
  --name imageprocessoracr \
  --sku Basic \
  --location eastus

# Enable admin access (for simple deployments)
az acr update \
  --name imageprocessoracr \
  --admin-enabled true

# Login to ACR
az acr login --name imageprocessoracr

# Get ACR credentials
az acr credential show --name imageprocessoracr
```

### 3. Build and Push Docker Images

```bash
# Tag and push backend
docker build -t imageprocessoracr.azurecr.io/backend:latest ./backend
docker push imageprocessoracr.azurecr.io/backend:latest

# Tag and push frontend
docker build -t imageprocessoracr.azurecr.io/frontend:latest ./frontend
docker push imageprocessoracr.azurecr.io/frontend:latest

# Or use ACR build (recommended)
az acr build \
  --registry imageprocessoracr \
  --image backend:latest \
  ./backend

az acr build \
  --registry imageprocessoracr \
  --image frontend:latest \
  ./frontend
```

---

## 🚀 Deployment Option 1: Azure Container Instances (ACI)

**Best for**: Development, testing, simple deployments
**Cost**: ~$30-50/month
**Pros**: Simplest, no orchestration needed
**Cons**: Manual scaling, no built-in load balancing

### Deploy Backend

```bash
# Create Azure File Share for persistent storage
az storage account create \
  --resource-group image-processor-rg \
  --name imageprocessorstore \
  --location eastus \
  --sku Standard_LRS

export STORAGE_KEY=$(az storage account keys list \
  --resource-group image-processor-rg \
  --account-name imageprocessorstore \
  --query "[0].value" -o tsv)

az storage share create \
  --name uploads \
  --account-name imageprocessorstore \
  --account-key $STORAGE_KEY

az storage share create \
  --name logs \
  --account-name imageprocessorstore \
  --account-key $STORAGE_KEY

# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name imageprocessoracr \
  --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
  --name imageprocessoracr \
  --query "passwords[0].value" -o tsv)

# Deploy backend container
az container create \
  --resource-group image-processor-rg \
  --name backend \
  --image imageprocessoracr.azurecr.io/backend:latest \
  --registry-login-server imageprocessoracr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label image-processor-backend \
  --ports 3001 \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    UPLOAD_DIR=/app/uploads \
    CORS_ORIGIN=http://image-processor-frontend.eastus.azurecontainer.io \
    MAX_FILE_SIZE=52428800 \
    CLEANUP_TTL_HOURS=24 \
  --azure-file-volume-account-name imageprocessorstore \
  --azure-file-volume-account-key $STORAGE_KEY \
  --azure-file-volume-share-name uploads \
  --azure-file-volume-mount-path /app/uploads

# Get backend URL
az container show \
  --resource-group image-processor-rg \
  --name backend \
  --query "{FQDN:ipAddress.fqdn,IP:ipAddress.ip}" -o table
```

### Deploy Frontend

```bash
# Update frontend environment
BACKEND_URL="http://image-processor-backend.eastus.azurecontainer.io:3001"

az container create \
  --resource-group image-processor-rg \
  --name frontend \
  --image imageprocessoracr.azurecr.io/frontend:latest \
  --registry-login-server imageprocessoracr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label image-processor-frontend \
  --ports 80 \
  --cpu 1 \
  --memory 2 \
  --environment-variables \
    BACKEND_URL=$BACKEND_URL

# Get frontend URL
az container show \
  --resource-group image-processor-rg \
  --name frontend \
  --query "{FQDN:ipAddress.fqdn,IP:ipAddress.ip}" -o table
```

### Update CORS

```bash
# Update backend with correct CORS origin
az container delete \
  --resource-group image-processor-rg \
  --name backend \
  --yes

# Redeploy with correct CORS
FRONTEND_URL="http://image-processor-frontend.eastus.azurecontainer.io"

az container create \
  --resource-group image-processor-rg \
  --name backend \
  --image imageprocessoracr.azurecr.io/backend:latest \
  --registry-login-server imageprocessoracr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label image-processor-backend \
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
  --azure-file-volume-account-name imageprocessorstore \
  --azure-file-volume-account-key $STORAGE_KEY \
  --azure-file-volume-share-name uploads \
  --azure-file-volume-mount-path /app/uploads
```

---

## 🌐 Deployment Option 2: Azure App Service

**Best for**: Production, managed PaaS
**Cost**: ~$55-200/month (Basic to Standard tier)
**Pros**: Managed, auto-scaling, easy SSL
**Cons**: More expensive than ACI

### Deploy Backend

```bash
# Create App Service Plan
az appservice plan create \
  --name image-processor-plan \
  --resource-group image-processor-rg \
  --location eastus \
  --is-linux \
  --sku B2

# Create Web App for backend
az webapp create \
  --resource-group image-processor-rg \
  --plan image-processor-plan \
  --name image-processor-backend-api \
  --deployment-container-image-name imageprocessoracr.azurecr.io/backend:latest

# Configure container registry
az webapp config container set \
  --name image-processor-backend-api \
  --resource-group image-processor-rg \
  --docker-custom-image-name imageprocessoracr.azurecr.io/backend:latest \
  --docker-registry-server-url https://imageprocessoracr.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Configure environment variables
az webapp config appsettings set \
  --resource-group image-processor-rg \
  --name image-processor-backend-api \
  --settings \
    NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    UPLOAD_DIR=/home/uploads \
    CORS_ORIGIN=https://image-processor-frontend.azurewebsites.net \
    MAX_FILE_SIZE=52428800 \
    CLEANUP_TTL_HOURS=24 \
    WEBSITES_PORT=3001

# Enable continuous deployment
az webapp deployment container config \
  --name image-processor-backend-api \
  --resource-group image-processor-rg \
  --enable-cd true

# Get webhook URL for ACR
WEBHOOK_URL=$(az webapp deployment container show-cd-url \
  --name image-processor-backend-api \
  --resource-group image-processor-rg \
  --query "CI_CD_URL" -o tsv)

# Create ACR webhook
az acr webhook create \
  --registry imageprocessoracr \
  --name backendwebhook \
  --actions push \
  --uri $WEBHOOK_URL \
  --scope backend:latest
```

### Deploy Frontend

```bash
# Create Web App for frontend
az webapp create \
  --resource-group image-processor-rg \
  --plan image-processor-plan \
  --name image-processor-frontend \
  --deployment-container-image-name imageprocessoracr.azurecr.io/frontend:latest

# Configure container registry
az webapp config container set \
  --name image-processor-frontend \
  --resource-group image-processor-rg \
  --docker-custom-image-name imageprocessoracr.azurecr.io/frontend:latest \
  --docker-registry-server-url https://imageprocessoracr.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Configure settings
az webapp config appsettings set \
  --resource-group image-processor-rg \
  --name image-processor-frontend \
  --settings \
    WEBSITES_PORT=80 \
    BACKEND_URL=https://image-processor-backend-api.azurewebsites.net

# Enable continuous deployment
az webapp deployment container config \
  --name image-processor-frontend \
  --resource-group image-processor-rg \
  --enable-cd true
```

### Configure Custom Domain & SSL

```bash
# Map custom domain (after DNS configuration)
az webapp config hostname add \
  --webapp-name image-processor-frontend \
  --resource-group image-processor-rg \
  --hostname www.yourdomain.com

# Enable HTTPS only
az webapp update \
  --name image-processor-frontend \
  --resource-group image-processor-rg \
  --https-only true

# Bind SSL certificate (App Service Managed Certificate - FREE)
az webapp config ssl create \
  --resource-group image-processor-rg \
  --name image-processor-frontend \
  --hostname www.yourdomain.com

az webapp config ssl bind \
  --resource-group image-processor-rg \
  --name image-processor-frontend \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

---

## ☸️ Deployment Option 3: Azure Kubernetes Service (AKS)

**Best for**: Large-scale production, microservices
**Cost**: ~$150-500/month
**Pros**: Highly scalable, full orchestration, production-grade
**Cons**: Complex, requires K8s knowledge

### Create AKS Cluster

```bash
# Create AKS cluster
az aks create \
  --resource-group image-processor-rg \
  --name image-processor-aks \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr imageprocessoracr \
  --generate-ssh-keys \
  --location eastus

# Get credentials
az aks get-credentials \
  --resource-group image-processor-rg \
  --name image-processor-aks

# Verify connection
kubectl get nodes
```

### Deploy Application

```bash
# Apply Kubernetes manifests (see azure/k8s/ directory)
kubectl apply -f azure/k8s/namespace.yaml
kubectl apply -f azure/k8s/backend-deployment.yaml
kubectl apply -f azure/k8s/backend-service.yaml
kubectl apply -f azure/k8s/frontend-deployment.yaml
kubectl apply -f azure/k8s/frontend-service.yaml
kubectl apply -f azure/k8s/ingress.yaml

# Check deployment status
kubectl get pods -n image-processor
kubectl get services -n image-processor
kubectl get ingress -n image-processor
```

See `azure/k8s/` directory for detailed Kubernetes manifests.

---

## 🗄️ Azure Blob Storage (Optional)

For better scalability, replace local disk storage with Azure Blob Storage:

```bash
# Create storage account for blobs
az storage account create \
  --name imageprocessorblob \
  --resource-group image-processor-rg \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name imageprocessorblob \
  --resource-group image-processor-rg

# Create containers
az storage container create \
  --name raw-images \
  --account-name imageprocessorblob \
  --public-access off

az storage container create \
  --name processed-images \
  --account-name imageprocessorblob \
  --public-access off
```

Update backend environment variables:
```bash
STORAGE_TYPE=blob
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_RAW=raw-images
AZURE_STORAGE_CONTAINER_PROCESSED=processed-images
```

---

## 🔒 Security Best Practices

### 1. Use Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name image-processor-kv \
  --resource-group image-processor-rg \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name image-processor-kv \
  --name acr-password \
  --value $ACR_PASSWORD

az keyvault secret set \
  --vault-name image-processor-kv \
  --name storage-key \
  --value $STORAGE_KEY

# Grant access to App Service
BACKEND_IDENTITY=$(az webapp identity assign \
  --name image-processor-backend-api \
  --resource-group image-processor-rg \
  --query principalId -o tsv)

az keyvault set-policy \
  --name image-processor-kv \
  --object-id $BACKEND_IDENTITY \
  --secret-permissions get list
```

### 2. Configure Azure Front Door (CDN + WAF)

```bash
# Create Azure Front Door
az afd profile create \
  --profile-name image-processor-afd \
  --resource-group image-processor-rg \
  --sku Standard_AzureFrontDoor

# Add endpoint
az afd endpoint create \
  --resource-group image-processor-rg \
  --profile-name image-processor-afd \
  --endpoint-name image-processor \
  --enabled-state Enabled
```

### 3. Enable Azure Monitor & Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app image-processor-insights \
  --location eastus \
  --resource-group image-processor-rg

# Get instrumentation key
APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app image-processor-insights \
  --resource-group image-processor-rg \
  --query instrumentationKey -o tsv)

# Add to backend environment
az webapp config appsettings set \
  --resource-group image-processor-rg \
  --name image-processor-backend-api \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$APPINSIGHTS_KEY
```

---

## 📊 Monitoring & Logging

```bash
# View logs (App Service)
az webapp log tail \
  --name image-processor-backend-api \
  --resource-group image-processor-rg

# View container logs (ACI)
az container logs \
  --resource-group image-processor-rg \
  --name backend

# Enable diagnostics
az monitor diagnostic-settings create \
  --name backend-diagnostics \
  --resource $(az webapp show \
    --name image-processor-backend-api \
    --resource-group image-processor-rg \
    --query id -o tsv) \
  --logs '[{"category": "AppServiceHTTPLogs", "enabled": true}]' \
  --workspace /subscriptions/<subscription-id>/resourceGroups/image-processor-rg/providers/Microsoft.OperationalInsights/workspaces/image-processor-logs
```

---

## 💰 Cost Estimation

### Option 1: Azure Container Instances
- ACI Backend (2 CPU, 4GB): ~$35/month
- ACI Frontend (1 CPU, 2GB): ~$18/month
- Storage Account: ~$5/month
- ACR: ~$5/month
- **Total: ~$63/month**

### Option 2: Azure App Service
- App Service Plan (B2): ~$55/month
- Storage Account: ~$5/month
- ACR: ~$5/month
- **Total: ~$65/month**

### Option 3: Azure Kubernetes Service
- AKS (2 nodes, B2s): ~$140/month
- Load Balancer: ~$20/month
- Storage: ~$10/month
- ACR: ~$5/month
- **Total: ~$175/month**

---

## 🔄 CI/CD with GitHub Actions

See `.github/workflows/azure-deploy.yml` for automated deployment workflow.

To setup:

1. Create Azure Service Principal:
```bash
az ad sp create-for-rbac \
  --name "image-processor-sp" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/image-processor-rg \
  --sdk-auth
```

2. Add secrets to GitHub repository:
   - `AZURE_CREDENTIALS`: Output from above command
   - `ACR_USERNAME`: ACR username
   - `ACR_PASSWORD`: ACR password

3. Push to main branch to trigger deployment

---

## 🧹 Cleanup

```bash
# Delete entire resource group (CAUTION: This deletes everything!)
az group delete \
  --name image-processor-rg \
  --yes \
  --no-wait
```

---

## 📚 Additional Resources

- [Azure Container Instances Docs](https://docs.microsoft.com/en-us/azure/container-instances/)
- [Azure App Service Docs](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Kubernetes Service Docs](https://docs.microsoft.com/en-us/azure/aks/)
- [Azure Container Registry Docs](https://docs.microsoft.com/en-us/azure/container-registry/)

---

## 🆘 Troubleshooting

### Container won't start
```bash
# Check container logs
az container logs --resource-group image-processor-rg --name backend

# Check events
az container show --resource-group image-processor-rg --name backend --query instanceView.events
```

### App Service issues
```bash
# Stream logs
az webapp log tail --name image-processor-backend-api --resource-group image-processor-rg

# Check container settings
az webapp config show --name image-processor-backend-api --resource-group image-processor-rg
```

### AKS pod issues
```bash
# Check pod status
kubectl describe pod <pod-name> -n image-processor

# View logs
kubectl logs <pod-name> -n image-processor

# Check events
kubectl get events -n image-processor --sort-by='.lastTimestamp'
```
