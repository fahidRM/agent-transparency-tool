import json
import requests


LOG_FILE_PATH = "dump.json"
SERVER_ADDRESS = "localhost"
SERVER_PORT = 3700


with open(LOG_FILE_PATH) as file_reader:
    logs_as_text =  file_reader.read()
    log_entries =  json.loads(logs_as_text)
    for log_entry in log_entries:
        requests.post(("http://{}:{}/log").format(SERVER_ADDRESS, SERVER_PORT), json=log_entry)

