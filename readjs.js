"use strict";
const ts = require("typescript");
const fs = require("fs");
const path = require("path");
function print(x) { console.log(x); }
const removableLexicalKinds = [
    ts.SyntaxKind.EndOfFileToken,
    ts.SyntaxKind.NewLineTrivia,
    ts.SyntaxKind.WhitespaceTrivia
];
const templateKinds = [
    ts.SyntaxKind.TemplateHead,
    ts.SyntaxKind.TemplateMiddle,
    ts.SyntaxKind.TemplateSpan,
    ts.SyntaxKind.TemplateTail,
    ts.SyntaxKind.TemplateExpression,
    ts.SyntaxKind.TaggedTemplateExpression,
    ts.SyntaxKind.FirstTemplateToken,
    ts.SyntaxKind.LastTemplateToken,
    ts.SyntaxKind.TemplateMiddle
];

const manifest_json = 'manifest.json';

// 默认的工程目录
let projects = "./projects";
let out = "./out";

// 读取projects下的工程
for (let project of fs.readdirSync(projects)) {
    let dir = projects + "/" + project;
    traverse(dir);
}

function traverse(dir) {
    var children = fs.readdirSync(dir);

    if (children.find(value => value == manifest_json)) {
        print("Found manifest.json in: " + dir);
        extractAlignedSequences(dir);
    }
    else {
        children.forEach(function (file) {
            let fullPath = dir + "/" + file;
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    if (fullPath.indexOf("DefinitelyTyped") < 0 && fullPath.indexOf("TypeScript/tests") < 0 && file != ".git") {
                        traverse(fullPath);
                    }
                    else {
                        print("Skipping: " + fullPath);
                    }
                }
            }
            catch (err) {
                print("Error processing " + fullPath)
            }
        });
    }
}

function extractAlignedSequences(inputDirectory) {
    const keywords = ["async", "await", "break", "continue", "class", "extends", "constructor", "super", "extends", "const", "let", "var", "debugger", "delete", "do", "while", "export", "import", "for", "each", "in", "of", "function", "return", "get", "set", "if", "else", "instanceof", "typeof", "null", "undefined", "switch", "case", "default", "this", "true", "false", "try", "catch", "finally", "void", "yield", "any", "boolean", "null", "never", "number", "string", "symbol", "undefined", "void", "as", "is", "enum", "type", "interface", "abstract", "implements", "static", "readonly", "private", "protected", "public", "declare", "module", "namespace", "require", "from", "of", "package"];
    let files = [];
    walkSync(inputDirectory, files);
    let program = ts.createProgram(files, { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.CommonJS, checkJs: true, allowJs: true });
    let checker = null;
    try {
        checker = program.getTypeChecker();
    }
    catch (err) {
        console.log("Checker error!"+err)
        return null;
    }
    for (const sourceFile of program.getSourceFiles()) {
        let filename = sourceFile.getSourceFile().fileName;
        if (filename.endsWith('.d.ts'))
            continue;
        try {
            let relativePath = path.relative(inputDirectory, filename);
            if (relativePath.startsWith(".."))
                continue;
            let memSource = [];
            let memToken = [];
            let memGoldToken = [];
            extractTokens(sourceFile, checker, memSource, memToken, memGoldToken);
            if (memSource.length != memToken.length)
                console.log(memSource.length + ", " + memToken.length);
            let outFile = sourceFile.fileName.replace("projects", "out")
            console.log('outFile=',outFile);
            fs.writeFileSync(outFile, memSource.filter(val => val.length > 0).join(" "), 'utf-8');
            fs.writeFileSync(outFile + ".ttokens", memToken.filter(val => val.length > 0).join(" "), 'utf-8');
            fs.writeFileSync(outFile + ".ttokens.gold", memGoldToken.filter(val => val.length > 0).join(" "), 'utf-8');
        }
        catch (e) {
            console.log(e);
            console.log("Error parsing file " + filename);
        }
    }
}

function extractTokens(tree, checker, memSource, memToken, memTokenGold) {
    var justPopped = false;
    for (var i in tree.getChildren()) {
        var ix = parseInt(i);
        var child = tree.getChildren()[ix];
        if (removableLexicalKinds.indexOf(child.kind) != -1 ||
            ts.SyntaxKind[child.kind].indexOf("JSDoc") != -1) {
            continue;
        }
        // Tentatively remove all templates as these substantially hinder type/token alignment; to be improved in the future
        else if (templateKinds.indexOf(child.kind) != -1) {
            memSource.push("`template`");
            memToken.push("O");
            memTokenGold.push("O");
            continue;
        }
        if (child.getChildCount() == 0) {
            var source = child.getText();
            var target = "O";
            switch (child.kind) {
                case ts.SyntaxKind.Identifier:
                    try {
                        let symbol = checker.getSymbolAtLocation(child);
                        if (!symbol) {
                            target = "$any$"
                            break;
                        }
                        let type = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, child));
                        if (checker.isUnknownSymbol(symbol) || type.startsWith("typeof"))
                            target = "$any$";
                        else if (type.startsWith("\""))
                            target = "O";
                        else if (type.match("[0-9]+"))
                            target = "O";
                        else
                            target = '$' + type + '$';
                        break;
                    }
                    catch (e) { }
                    break;
                case ts.SyntaxKind.NumericLiteral:
                    target = "O";
                    break;
                case ts.SyntaxKind.StringLiteral:
                    target = "O";
                    break;
                case ts.SyntaxKind.RegularExpressionLiteral:
                    target = "O";
                    break;
            }
            target = target.trim();
            if (target.match(".+ => .+")) {
                target = "$" + target.substring(target.lastIndexOf(" => ") + 4);
            }
            if (target.match("\\s")) {
                target = "$complex$";
            }
            if (source.length == 0 || target.length == 0) {
                continue;
            }
            if (target != "O") {
                var parentKind = ts.SyntaxKind[tree.kind];
                if (parentKind.toLowerCase().indexOf("template") >= 0)
                    target = "O";
            }
            if (memSource.length > 0 && memSource[memSource.length - 1] == ":" && Boolean(source.match("[a-zA-Z$_][0-9a-zA-Z$_\[\]]*"))) {
                var k = tree.kind;
                var t = tree;
                var valid = k == ts.SyntaxKind.FunctionDeclaration || k == ts.SyntaxKind.MethodDeclaration || k == ts.SyntaxKind.Parameter || k == ts.SyntaxKind.VariableDeclaration;
                if (!valid && k == ts.SyntaxKind.TypeReference) {
                    k = tree.parent.kind;
                    t = tree.parent;
                    valid = k == ts.SyntaxKind.FunctionDeclaration || k == ts.SyntaxKind.MethodDeclaration || k == ts.SyntaxKind.Parameter || k == ts.SyntaxKind.VariableDeclaration;
                }
                if (valid) {
                    memSource.pop();
                    memToken.pop();
                    memTokenGold.pop();
                    if (k == ts.SyntaxKind.FunctionDeclaration || k == ts.SyntaxKind.MethodDeclaration) {
                        let toFind = t.name.escapedText;
                        let index = -1;
                        for (let i = memSource.length - 1; i >= 0; i--) {
                            if (toFind == memSource[i] || toFind.substring(1) == memSource[i]) {
                                index = i;
                                break;
                            }
                        }
                        memToken[index] = "$" + source + "$"
                        memTokenGold[index] = "$" + source + "$"
                    }
                    else {
                        memToken[memToken.length - 1] = "$" + source + "$";
                        memTokenGold[memTokenGold.length - 1] = "$" + source + "$";
                    }
                    justPopped = true;
                    continue;
                }
            }
            else if (justPopped) {
                if (source == "[" || source == "]")
                    continue;
                else
                    justPopped = false;
            }
            memSource.push(source);
            memToken.push(target);
            memTokenGold.push("O");
        }
        else {
            extractTokens(child, checker, memSource, memToken, memTokenGold);
        }
    }
}
function walkSync(dir, filelist) {
    var fs = fs || require('fs'), files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        let fullPath = path.join(dir, file);
        try {
            if (fs.statSync(fullPath).isDirectory()) {
                if (file != ".git")
                    filelist = walkSync(dir + '/' + file, filelist);
            }
            else if (file.endsWith('.js') || file.endsWith('.ts')) {
                if (fs.statSync(fullPath).size < 1*1000*1000)
                    filelist.push(fullPath);
            }
        }
        catch (e) {
            console.error("Error processing " + file);
        }
    });
    return filelist;
}
