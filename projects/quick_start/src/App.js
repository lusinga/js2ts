"use strict";
const Page = require("yunos/page/Page");
const StackRouter = require("yunos/appmodel/StackRouter");
class App extends Page {
    get theme() {
        return "default";
    }
    onStart() {
        let router = new StackRouter();
        router.container = this.window;
        router.navigate("home");
    }
}
module.exports = App;