# Webhook Configuration for All Branches

## Setup Instructions

### 1. Update `/etc/webhook/hooks.json`

Replace your existing hook configuration with this one to support all branches:

```json
{
  "id": "deploy-backend-all-branches",
  "execute-command": "/var/www/backend/ticket-backend/deploy.sh",
  "command-working-directory": "/var/www/backend/ticket-backend",
  "response-message": "🚀 Deploying from any branch...",
  "pass-arguments-to-command": [
    {
      "source": "payload",
      "name": "ref"
    }
  ],
  "trigger-rule": {
    "match": {
      "type": "regex",
      "value": "^refs/heads/.*$",
      "parameter": {
        "source": "payload",
        "name": "ref"
      }
    }
  }
}
```

### 2. Key Changes from Original Config

| Setting | Original | New |
|---------|----------|-----|
| **ID** | `deploy-backend-master` | `deploy-backend-all-branches` |
| **Trigger** | `^refs/heads/master$` | `^refs/heads/.*$` |
| **Response** | "🚀 Deploying from master..." | "🚀 Deploying from any branch..." |
| **Arguments** | None | Passes `ref` to deploy.sh |

### 3. How It Works

1. **Any branch push** triggers the webhook
2. **Branch name** is extracted from `refs/heads/branch-name`
3. **deploy.sh** automatically switches to the correct branch
4. **Deployment** proceeds with the pushed branch

### 4. Webhook URL

Update your GitHub webhook URL to:
```
http://43.229.133.51:4100/hooks/deploy-backend-all-branches
```

### 5. Testing

Test with any branch:
```bash
# Test webhook manually
curl -X POST http://43.229.133.51:4100/hooks/deploy-backend-all-branches \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/feature/newfunction"}'

# Test deploy script directly
/var/www/backend/ticket-backend/deploy.sh "refs/heads/feature/newfunction"
```

### 6. Branch Support

- ✅ `master`
- ✅ `main` 
- ✅ `feature/newfunction`
- ✅ `develop`
- ✅ Any branch name

The script will automatically:
- Extract branch name from webhook
- Checkout the correct branch
- Pull latest changes
- Deploy the specific branch
