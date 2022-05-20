import requests
url = "http://localhost:3000/bangkok"
r = requests.get(url)
print(r.json())