# opensea-market-listener



### **Init**
```bash
npm install
```

### **Build**
```bash
make publish
```

### **Run**
```bash
sudo curl -fsSL https://get.docker.com | sh

sudo docker run -d \
    --name opensea-market-listener \
    -v '/home/ubuntu/opensea-market-listener/config.yaml':'/root/config.yaml' \
    cejay/opensea-market-listener:latest
```
