require("dotenv").config();
const { handleMessage } = require("./src/parser/aiParser");
async function test() {
    const aiParser = require("./src/parser/aiParser");
    const parsed = await aiParser.__get__("parseWithAI")("mera pending kitna hai", "kashifshaikh4204@gmail.com");
    console.log(parsed);
}
test();
