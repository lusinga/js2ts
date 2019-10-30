from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    print('index')
    return "<h1>It works!</h1>"

@app.route('/code/<code>')
def complete(code):
    print('Received code:%s' % code)
    return 'Hello, %s' % code

app.run(port=30000,debug=True)
