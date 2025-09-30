# Azure Deployment Quick Start Guide

## 🎯 Choose Your Deployment Method

### Method 1: Azure Container Instances (Simplest - 5 minutes)
**Best for**: Development, testing, proof of concept
**Cost**: ~$63/month
**Complexity**: ⭐ Easy

```bash
# Prerequisites: Azure CLI installed and logged in
az login

# Run the automated script
cd azure/scripts
./deploy-aci.sh
```

**That's it!** The script will:
- Create resource group
- Create Azure Container Registry (ACR)
- Build and push Docker images
- Create storage account
- Deploy both backend and frontend containers
- Show you the URLs to access your app

---

### Method 2: Azure App Service (Recommended for Production)
**Best for**: Production applications
**Cost**: ~$65/month
**Complexity**: ⭐⭐ Medium

```bash
# Prerequisites: Azure CLI installed and logged in
az login

# Run the automated script
cd azure/scripts
./deploy-appservice.sh
```

**Benefits**:
- Automatic HTTPS
- Custom domains
- Auto-scaling
- Continuous deployment from ACR
- Free managed SSL certificates

---

### Method 3: Azure Kubernetes Service (Advanced)
**Best for**: Large-scale production, microservices
**Cost**: ~$175/month
**Complexity**: ⭐⭐⭐ Advanced

```bash
# Prerequisites: Azure CLI and kubectl installed
az login

# Run the automated script
cd azure/scripts
./deploy-aks.sh
```

**Benefits**:
- Horizontal pod autoscaling
- Rolling updates with zero downtime
- Advanced networking
- Full Kubernetes features

---

## 📋 Prerequisites

### Install Azure CLI

**macOS:**
```bash
brew update && brew install azure-cli
```

**Windows:**
```powershell
winget install Microsoft.AzureCLI
```

**Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Verify Installation
```bash
az --version
az login
```

---

## 🚀 Step-by-Step Deployment (Method 1 - ACI)

### Step 1: Clone and Navigate
```bash
git clone <your-repo>
cd image-app
```

### Step 2: Login to Azure
```bash
az login
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

### Step 3: Deploy
```bash
cd azure/scripts
chmod +x deploy-aci.sh
./deploy-aci.sh
```

### Step 4: Access Your App
After deployment completes (3-5 minutes), you'll see:
```
✅ Deployment complete!

📍 Backend URL: http://image-processor-backend.eastus.azurecontainer.io:3001
📍 Frontend URL: http://image-processor-frontend.eastus.azurecontainer.io
📍 Health Check: http://image-processor-backend.eastus.azurecontainer.io:3001/health
```

Open the Frontend URL in your browser and start processing images!

---

## 🔧 Manual Deployment (Step by Step)

If you prefer manual control:

### 1. Create Resource Group
```bash
az group create \
  --name image-processor-rg \
  --location eastus
```

### 2. Create Container Registry
```bash
az acr create \
  --resource-group image-processor-rg \
  --name imageprocessoracr \
  --sku Basic \
  --admin-enabled true

az acr login --name imageprocessoracr
```

### 3. Build and Push Images
```bash
# From project root
cd backend
docker build -t imageprocessoracr.azurecr.io/backend:latest .
docker push imageprocessoracr.azurecr.io/backend:latest

cd ../frontend
docker build -t imageprocessoracr.azurecr.io/frontend:latest .
docker push imageprocessoracr.azurecr.io/frontend:latest
```

### 4. Deploy Backend Container
```bash
ACR_USERNAME=$(az acr credential show --name imageprocessoracr --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name imageprocessoracr --query "passwords[0].value" -o tsv)

az container create \
  --resource-group image-processor-rg \
  --name backend \
  --image imageprocessoracr.azurecr.io/backend:latest \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label image-processor-backend \
  --ports 3001 \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3001 \
    CORS_ORIGIN=http://image-processor-frontend.eastus.azurecontainer.io
```

### 5. Deploy Frontend Container
```bash
az container create \
  --resource-group image-processor-rg \
  --name frontend \
  --image imageprocessoracr.azurecr.io/frontend:latest \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label image-processor-frontend \
  --ports 80 \
  --cpu 1 \
  --memory 2
```

---

## 🔍 Monitoring & Management

### View Container Logs
```bash
# Backend logs
az container logs --resource-group image-processor-rg --name backend --follow

# Frontend logs
az container logs --resource-group image-processor-rg --name frontend --follow
```

### Check Container Status
```bash
az container show \
  --resource-group image-processor-rg \
  --name backend \
  --output table
```

### Restart Container
```bash
az container restart \
  --resource-group image-processor-rg \
  --name backend
```

### Update Container (New Version)
```bash
# Rebuild and push new image
docker build -t imageprocessoracr.azurecr.io/backend:latest ./backend
docker push imageprocessoracr.azurecr.io/backend:latest

# Delete old container
az container delete --resource-group image-processor-rg --name backend --yes

# Recreate with new image (use same create command as before)
```

---

## 🔒 Security Configuration

### Enable HTTPS (Recommended)

For production, use Azure Front Door or Application Gateway:

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

### Use Azure Key Vault for Secrets

```bash
# Create Key Vault
az keyvault create \
  --name image-processor-kv \
  --resource-group image-processor-rg \
  --location eastus

# Store ACR password
az keyvault secret set \
  --vault-name image-processor-kv \
  --name acr-password \
  --value $ACR_PASSWORD
```

---

## 📊 Cost Optimization

### Use Azure Cost Management
```bash
# Set budget
az consumption budget create \
  --budget-name image-processor-budget \
  --amount 100 \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2025-12-31
```

### Scale Down for Development
```bash
# Use smaller instances for dev/test
az container create ... --cpu 1 --memory 2  # Instead of 2/4
```

---

## 🧹 Cleanup

### Delete Everything
```bash
# Delete the entire resource group (CAUTION!)
az group delete --name image-processor-rg --yes --no-wait
```

### Delete Specific Resources
```bash
# Delete only containers
az container delete --resource-group image-processor-rg --name backend --yes
az container delete --resource-group image-processor-rg --name frontend --yes

# Keep ACR and storage for next deployment
```

---

## 🆘 Troubleshooting

### Container Won't Start
```bash
# Check events
az container show \
  --resource-group image-processor-rg \
  --name backend \
  --query instanceView.events

# Check logs
az container logs \
  --resource-group image-processor-rg \
  --name backend
```

### Can't Access Frontend
1. Check backend is running: `curl http://<backend-url>:3001/health`
2. Verify CORS origin in backend environment
3. Check browser console for errors

### Image Pull Failed
```bash
# Verify ACR credentials
az acr credential show --name imageprocessoracr

# Re-enable admin access
az acr update --name imageprocessoracr --admin-enabled true
```

---

## 🎓 Next Steps

1. **Custom Domain**: Configure custom domain with Azure DNS
2. **SSL Certificate**: Setup Let's Encrypt or use Azure managed certs
3. **Monitoring**: Enable Application Insights
4. **CI/CD**: Setup GitHub Actions (see `.github/workflows/azure-deploy.yml`)
5. **Scaling**: Move to App Service or AKS for auto-scaling

---

## 📚 Resources

- [Complete Azure Deployment Guide](./AZURE_DEPLOYMENT.md)
- [Azure Portal](https://portal.azure.com)
- [Azure Container Instances Docs](https://learn.microsoft.com/azure/container-instances/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)

---

## ✅ Deployment Checklist

- [ ] Azure CLI installed
- [ ] Logged in to Azure (`az login`)
- [ ] Subscription selected
- [ ] Docker installed (for manual builds)
- [ ] Run deployment script
- [ ] Verify deployment with health check
- [ ] Test image upload/processing
- [ ] Setup monitoring (optional)
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (recommended)

---

**Ready to deploy? Run:**
```bash
cd azure/scripts && ./deploy-aci.sh
```
