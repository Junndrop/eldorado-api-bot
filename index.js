const axios = require("axios");

const BOT_KEY = process.env.API_KEY;
const TOKEN = process.env.ID_TOKEN;

async function test(){

try{

const res = await axios.get(
"https://www.eldorado.gg/api/orders/me",
{
headers:{
"User-Agent":BOT_KEY,
"Authorization":"Bearer "+TOKEN,
"accept":"application/json"
}
}
);

console.log("SUCCESS");
console.log(JSON.stringify(res.data,null,2));

}catch(err){

console.log("STATUS:",
err.response?.status);

console.log("DATA:");
console.log(err.response?.data);

}

}

test();
