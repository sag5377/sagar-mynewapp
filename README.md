# BigQuery Release Hub

BigQuery Release Hub is a modern, responsive web dashboard and command-line utility for fetching, segmenting, searching, and sharing Google BigQuery release notes. 

Built with **Python Flask** on the server side and **Vanilla HTML, CSS, and JavaScript** on the client side, the project is designed to run in sandboxed or standard environments and features direct integration with X (Twitter) for sharing updates.

---

## Key Features

1. **Dual-Interface Reader**: 
   * **Web Dashboard**: A beautiful, glassmorphic dark-theme dashboard (defaulting to port `8080`).
   * **CLI Utility**: A terminal utility (`bq_reader.py`) that fetches and prints notes directly to your shell with ANSI formatting and custom badge colorations.
2. **Compound Entry Segmentation**: Google Cloud's RSS feed groups all updates for a single day into one XML `<entry>`. The system parses this composite block and segments it into individual filterable cards (e.g. splitting multiple Features or Issues that occurred on the same day).
3. **In-Memory Caching**: Caches parsed results for 5 minutes (`300` seconds) to prevent API rate-limiting and accelerate page-load times.
4. **Live Search & Category Filtering**: Instantly filters release notes by search keywords (matching text, dates, or types) or category capsules (Features, Issues, and Others).
5. **Interactive X (Twitter) Post Composer**: Features an X post composer mockup with a live circular progress bar character counter (`0 / 280`), text limits warnings, automated URL spacing, and X Web Intent publishing.
6. **Zero-Git GitHub Publisher**: An API-driven Python push utility (`github_push.py`) that creates a repository on your account and pushes your files directly via HTTPS, bypassing the need for a local system `git` installation.

---

## Project Structure

```
├── .gitignore               # Ignores local environments, CLI dependencies, and caching
├── app.py                   # Flask server backend (caching, parsing, and API endpoints)
├── bq_reader.py             # Command-line release notes terminal reader
├── github_push.py           # API-based direct upload script to push code to GitHub
├── requirements.txt         # Project package requirements
├── static/
│   ├── app.js               # Frontend JavaScript state manager and controllers
│   └── style.css            # Custom glassmorphic CSS design system
└── templates/
    └── index.html           # Main web dashboard interface layout
```

---

## Installation & Setup

This project is configured to run using a portable standalone Python environment to avoid system version conflicts.

### 1. Set Up Portable Python Environment (Optional)
If your macOS lacks Xcode developer tools, you can download a standalone build:
```bash
mkdir -p .python-standalone
curl -L -s https://github.com/astral-sh/python-build-standalone/releases/download/20260610/cpython-3.11.15+20260610-aarch64-apple-darwin-install_only_stripped.tar.gz -o python.tar.gz
tar -C .python-standalone -xzf python.tar.gz
rm python.tar.gz
```

### 2. Install Dependencies
Install Flask, requests, and beautifulsoup4 using the standalone python environment:
```bash
./.python-standalone/python/bin/pip3 install Flask requests beautifulsoup4
```

---

## How to Run

### A. Start the Web Server
Launch the Flask development server (runs on `http://localhost:8080`):
```bash
./.python-standalone/python/bin/python3 app.py
```

### B. Run the CLI Reader
Run the terminal reader to print notes directly to the shell (defaults to last 5 entries):
```bash
./.python-standalone/python/bin/python3 bq_reader.py
```
To print a custom number of releases (e.g., last 3 days):
```bash
./.python-standalone/python/bin/python3 bq_reader.py 3
```

---

## Pushing to GitHub

If you do not have a working system `git` installation, you can push this project directly using the provided `github_push.py` script:

1. **Log in to GitHub CLI** (downloads and auth wrapper available locally):
   ```bash
   ./gh_2.94.0_macOS_arm64/bin/gh auth login
   ```
2. **Push the files**:
   ```bash
   ./.python-standalone/python/bin/python3 github_push.py
   ```
   *The script will automatically retrieve your login token, create the repository `sagar-mynewapp` on your GitHub account, and upload all files (complying with `.gitignore` rules).*
