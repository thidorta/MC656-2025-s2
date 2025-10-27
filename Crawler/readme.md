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
   - Windows PowerShell:
     ```powershell
     scripts/run_all.ps1
     ```
   - Or via Python module directly:
     ```bash
     python -m src.crawler_app.cli run-all
     # steps individually
     python -m src.crawler_app.cli collect
     python -m src.crawler_app.cli build-db
     ```
