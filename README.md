# Bitsave🛡️

**Bitsave** is a secure, lightweight password management solution designed to provide a centralized vault for your digital credentials. It bridges the gap between complex enterprise tools and insecure browser storage, offering a clean, distraction-free environment to manage and access your secrets.

### ⚠️ Security Notice (Development Status)

> IMPORTANT: This project is currently in active development. It is mainly intended for educational purposes. The encryption and security measures are not yet audited for production use. Do not use this with real data.
> 


## **🛠 Tech Stack**

- **Frontend & Framework:** Angular (SPA) & TypeScript
- **UI Library:** Spartan NG
- **Styling:** TailwindCSS
- **Backend & API:** Java & Spring Boot (REST)
- **Security:** Spring Security & JWT (Stateless Auth)
- **Database:** PostgreSQL
- **Containerization:** Docker & Docker Compose


## **🐋 Deploy**

You can deploy BitSave using Docker containers on Windows, macOS, and Linux distributions.

### **Requirements**

- [**Docker**](https://www.docker.com/pricing/#/download)
- [**Docker Compose**](https://docs.docker.com/compose/install/)

If you download and install **Docker Desktop**, both Docker and Docker Compose are included and ready to use out of the box. 

- Ensure that your Docker Engine is running.
- Ensure that no processes are running on ports **80** and **8080**

```docker
# Clone the repository
git clone https://github.com/....
cd Bitsave

# Execute Docker Compose command
docker compose up -d --build
```

**Note:** Run without `-d` to use the terminal as your **"Virtual Inbox"**. Since no real emails  are sent in this demo, find your login codes directly in the backend logs.

- **Frontend:** http://localhost/
- **Backend**: http://localhost:8080


If you want to stop it, use the following command:

```docker
# Stop all running services
docker-compose down

# Stop all running services and permanently delete all stored database data
docker-compose down -v
```


## ⚙️ Custom Configuration

- **Disable Demo Mode:** Set `showDemo: false` in `bitsave-frontend/src/environments/environment.ts`.
- **Real SMTP Mail:**
    1. Set `SPRING_PROFILES_ACTIVE: prod` in `docker-compose.yml`.
    2. Create `application-prod.yml` in the backend with your SMTP credentials:

       ```yaml
       spring:
         mail:
           host: smtp.gmail.com
           username: your-email@gmail.com
           password: your-app-password # 16-digit code
       ```
    


## 📺 Demo


## **✨ Features**

- **Zero-Knowledge Architecture:** Features local client-side encryption using AES-256-GCM and Argon2id key derivation, ensuring your master keys and raw data never leave your device.
- **Email-based 2FA:** Implements two-factor authentication exclusively via email-delivered verification codes to secure every login attempt.
- **Customizable Password Generator:** Create high-entropy passwords with adjustable length and character sets (uppercase, lowercase, numbers, and symbols) to meet any security requirement.
- **Light & Dark Mode Support**


## **🚀 Roadmap**

- **FIDO2/WebAuthn Support:** Moving beyond email-based 2FA to support hardware security keys (like YubiKeys) and biometrics for phishing-resistant authentication.
- **Expanded Vault Item Types:** Implementing specialized templates for Credit Cards, Secure Notes, and Personal Identities.
- **Data Portability (Import):** Migration tools to import data from other managers (via CSV/JSON).
- **System Optimization & Security Hardening:** Focus on continuous performance tuning, high code-coverage testing, and architectural audits to ensure a fast, robust, and industry-standard security environment.

--- 

Built with ❤️