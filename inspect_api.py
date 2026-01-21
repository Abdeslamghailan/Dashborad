import urllib.request
import json

url = "https://abdelgh9.pythonanywhere.com/api/all-data"
with urllib.request.urlopen(url) as response:
    raw_data = response.read()
    data = json.loads(raw_data).get('data', {})

def print_fields(name, items):
    if items:
        print(f"--- {name} fields ---")
        print(list(items[0].keys()))
    else:
        print(f"--- {name} is empty ---")

print_fields("combined_actions", data.get('combined_actions'))
print_fields("inbox_domains", data.get('inbox_domains'))
print_fields("spam_domains", data.get('spam_domains'))
print_fields("inbox_actions", data.get('inbox_actions'))
print_fields("inbox_relationships", data.get('inbox_relationships'))
