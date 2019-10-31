from flask import Flask
from flask import request
import json

app = Flask(__name__)

@app.route('/')
def index():
    print('index')
    return "<h1>It works!</h1>"

@app.route('/code/<code>')
def complete(code):
    print('Received code:%s' % code)
    return 'Hello, %s' % code

@app.route('/complete', methods=['POST'])
def code_complete():
    print('Received complete post')
    #code2 = request.args.get('code')
    #print ('Received code %s' % code2)
    #for key1 in request.args.keys():
    #    print(key1)
    #for value in request.values:
    #    print(value)
    #print(request)
    #print(request.method)
    #print(request.data)
    code = request.data.decode()
    code2 = json.loads(code)
    return 'Hello'+code2.get('code')


app.run(port=30000,debug=True)
