# 📚 MC656-2025-s2

Repository for the **MC656 – Software Engineering** course project at **UNICAMP**.  
This project implements a crawler to collect and organize information from the **DAC / GDE system**, which provides public academic data (courses, prerequisites, curriculum trees, etc.).

## 👥 Team
- **250502** – Johatan dos Reis Lima  
- **219255** – José Mauricio de Vasconcellos Junior  
- **231413** – Thiago Salvador Teixeira Dorta  
- **250453** – Chris Araújo Felipe Souza  
- **183611** – Maria Eduarda Xavier Messias  

---

## 🚀 What the Crawler Does
The crawler automates access to the **GDE (Grade DAC Online)** platform and extracts structured information such as:
- Courses and their descriptions  

---

## ⚙️ How to Run the Crawler

1. **Prepare the environment**  
   Inside the `crawler/` folder, create a `.env` file with your login credentials:
   ```env
   GDE_LOGIN=your_login
   GDE_SENHA=your_password
   ```
2. **Open terminal and navigate to the crawler folder**  
   ```env
   cd crawler
   ```
3. **Allow script execution (only needed once on Windows PowerShell)**  
   ```env
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
4. **Run the crawler pipeline**  
   ```env
   scripts/run_all.ps1
   ```

The script will:

- Start a session with GDE/DAC.  
- Fetch course and curriculum data.  
- Store results in the database/catalog.  

---



