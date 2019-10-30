from flask import Flask

@app.route('/')
def index():
    return "<h1>It works!</h1>"

app = Flask(__name__)

