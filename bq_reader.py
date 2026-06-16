#!/usr/bin/env python3
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import sys

# Terminal Colors
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
BOLD = '\033[1m'
ENDC = '\033[0m'

def fetch_and_print_notes(limit=5):
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    print(f"{BOLD}Fetching BigQuery release notes...{ENDC}\n")
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            return
    except Exception as e:
        print(f"Error fetching notes: {e}")
        return

    try:
        root = ET.fromstring(response.content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    for idx, entry in enumerate(entries[:limit]):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        print(f"{BOLD}{BLUE}=== Release Date: {date_str} ==={ENDC}")
        
        content_elem = entry.find('atom:content', ns)
        html_content = content_elem.text if content_elem is not None else ""
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        current_type = "Update"
        current_text = []
        
        for element in soup.contents:
            if element.name == 'h3':
                if current_text or current_type != "Update":
                    print_update(current_type, "".join(current_text).strip())
                current_type = element.get_text().strip()
                current_text = []
            else:
                text = element.get_text() if hasattr(element, 'get_text') else str(element)
                current_text.append(text)
                
        if current_text or current_type != "Update":
            print_update(current_type, "".join(current_text).strip())
            
        print() # Spacer

def print_update(update_type, text):
    if not text:
        return
        
    # Standardize spaces/newlines
    text = " ".join(text.split())
    
    # Format according to type
    type_lower = update_type.lower()
    if type_lower == 'feature':
        badge = f"{GREEN}[FEATURE]{ENDC}"
    elif type_lower == 'issue':
        badge = f"{RED}[ISSUE]{ENDC}"
    else:
        badge = f"{BLUE}[{update_type.upper()}]{ENDC}"
        
    print(f"  {badge} {text}")

if __name__ == "__main__":
    limit = 5
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            pass
    fetch_and_print_notes(limit)
