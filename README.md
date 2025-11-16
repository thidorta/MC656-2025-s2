# 📚 MC656-2025-s2

Repository for the **MC656 – Software Engineering** course project at **UNICAMP**.  
This project implements a crawler to collect and organize information from the **DAC / GDE system**, which provides public academic data (courses, prerequisites, curriculum trees, etc.).

## 👥 Team
- **250502** – Johatan dos Reis Lima  
- **219255** – José Mauricio de Vasconcellos Junior  
- **231413** – Thiago Salvador Teixeira Dorta
- **183611** – Maria Eduarda Xavier Messias  

---

## 🚀 What the Project Does
This project consists of three main components:

1. **Crawler**: Automates access to the **GDE (Grade DAC Online)** platform and extracts structured information such as:
   - Courses and their descriptions  

2. **Backend API**: A FastAPI-based REST API that provides structured access to the collected data with automatic documentation.

3. **Mobile App**: A React Native application built with Expo that provides a user interface to interact with the collected data.

## Arquitetura - Crawler
O crawler fecha o circuito App -> Backend -> Crawler/DB: o app aciona o backend, o backend consulta os dados coletados previamente e o crawler abastece o repositorio com HTML, JSON e SQLite obtidos do GDE.

- Pipeline/Dataflow (etapas: coleta -> parsing -> normalizacao -> persistencia)
- Ports & Adapters (coleta HTTP como port; parsers e DB writers como adapters)
- Config-Driven via `.env` (com `CrawlerSettings`)

Documentacao detalhada: [docs/crawler/ARCHITECTURE.md](docs/crawler/ARCHITECTURE.md)

---

## ⚙️ How to Run the Project

### 🕷️ Running the Crawler

1. **Prepare the environment**  
   Inside the `Crawler/` folder, create a `.env` file with your login credentials:
   ```env
   GDE_LOGIN=your_login
   GDE_SENHA=your_password
   ```
2. **Open terminal and navigate to the crawler folder**  
   ```env
   cd Crawler
   ```
3. **Allow script execution (only needed once on Windows PowerShell)**  
   ```env
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
4. **Run the crawler pipeline**  
   ```env
   scripts/run_all.ps1
   ```

The crawler script will:
- Start a session with GDE/DAC  
- Fetch course and curriculum data  
- Store results in the database/catalog  

### 🔗 Running the Backend API

1. **Navigate to the backend folder**  
   ```bash
   cd backend
   ```

2. **Create and activate Python virtual environment**  
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**  
   ```bash
   pip install fastapi uvicorn python-multipart python-dotenv
   ```

4. **Configure environment variables**  
   Copy `.env` file and configure your settings:
   ```bash
   cp .env.example .env
   ```

5. **Start the API server**  
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   
   Or use the provided script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

6. **Access the API**:
   - **API Base**: http://localhost:8000
   - **Interactive Documentation**: http://localhost:8000/docs
   - **Alternative Documentation**: http://localhost:8000/redoc

### 📱 Running the Mobile App

1. **Navigate to the app folder**  
   ```bash
   cd gde_app
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Start the development server**  
   ```bash
   npm start
   ```
   or
   ```bash
   npx expo start
   ```

4. **Run on different platforms**:
   - **Android**: `npm run android` or `npx expo start --android`
   - **iOS**: `npm run ios` or `npx expo start --ios`  
   - **Web**: `npm run web` or `npx expo start --web`

5. **Using Expo Go** (recommended for testing):
   - Install Expo Go app on your mobile device
   - Scan the QR code displayed in the terminal
   - The app will load directly on your device

### 📱 Important Notes for Expo Go

When testing with **Expo Go**, you need to make network configuration adjustments:

#### 🌐 Network Configuration for Mobile Testing

1. **Find your computer's IP address**:
   ```bash
   # On Linux/Mac:
   ip route get 1.1.1.1 | grep -oP 'src \K\S+' || hostname -I | awk '{print $1}'
   
   # On Windows:
   ipconfig | findstr /i "IPv4"
   ```

2. **Update API endpoint in the mobile app**:
   - Open `gde_app/App.tsx`
   - Replace `http://localhost:8000` with `http://YOUR_IP:8000`
   - Example: `http://192.168.1.100:8000`

3. **Start backend with proper host binding**:
   ```bash
   # Instead of just: uvicorn main:app --reload
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Ensure both devices are on the same network**:
   - Your computer and mobile device must be connected to the same Wi-Fi network
   - Disable any firewall that might block port 8000

#### 🔧 Quick Fix Example:
```typescript
// In gde_app/App.tsx, change:
const response = await fetch('http://localhost:8000/popup-message');

// To (replace with your actual IP):
const response = await fetch('http://192.168.1.100:8000/popup-message');
```

**💡 Tip**: For development, you can create an environment variable or configuration file to easily switch between localhost (for web testing) and your IP address (for Expo Go testing).

### 📋 Prerequisites
- **For Crawler**: Python 3.x
- **For Backend**: Python 3.8+ and pip
- **For Mobile App**: Node.js 18+ and npm
- **For mobile testing**: Expo Go app or Android Studio/Xcode for emulators

---



