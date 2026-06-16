from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time

app = Flask(__name__)

# Cache variables
CACHE_DURATION = 300  # 5 minutes in seconds
cache_data = None
cache_time = 0

def fetch_and_parse_feed(force_refresh=False):
    global cache_data, cache_time
    current_time = time.time()
    
    # Return cache if valid and not forced to refresh
    if cache_data and (current_time - cache_time < CACHE_DURATION) and not force_refresh:
        return cache_data

    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            raise Exception(f"HTTP error {response.status_code} when fetching feed")
    except Exception as e:
        # Fallback to cache if request fails but cache exists
        if cache_data:
            return cache_data
        raise Exception(f"Failed to fetch feed: {str(e)}")

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as e:
        raise Exception(f"Failed to parse XML feed: {str(e)}")
        
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    entries = []
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_str = updated_elem.text if updated_elem is not None else ""
        
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        if link_elem is None:
            link_elem = entry.find('atom:link', ns)
        link_url = link_elem.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        html_content = content_elem.text if content_elem is not None else ""
        
        # Parse HTML within entry using BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        updates = []
        current_type = "Update"
        current_elements = []
        
        for element in soup.contents:
            if element.name == 'h3':
                # Save previous update if any
                if current_elements or current_type != "Update":
                    html_str = "".join(str(e) for e in current_elements).strip()
                    text_str = BeautifulSoup(html_str, 'html.parser').get_text().strip()
                    updates.append({
                        'type': current_type,
                        'html': html_str,
                        'text': text_str
                    })
                current_type = element.get_text().strip()
                current_elements = []
            else:
                current_elements.append(element)
                
        # Save last update
        if current_elements or current_type != "Update":
            html_str = "".join(str(e) for e in current_elements).strip()
            text_str = BeautifulSoup(html_str, 'html.parser').get_text().strip()
            updates.append({
                'type': current_type,
                'html': html_str,
                'text': text_str
            })
            
        entries.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_url,
            'updates': updates
        })
        
    cache_data = entries
    cache_time = current_time
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            'status': 'success',
            'data': data,
            'cached_at': cache_time
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
