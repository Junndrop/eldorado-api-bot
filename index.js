const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

Amplify.configure({
Auth:{
Cognito:{
userPoolId:"us-east-2_M1nzCFgHK",
userPoolClientId:"1956req5ro9drdtbf5i6kis4la"
}
}
});

async function sendTelegram(text){

await axios.post(
`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
{
chat_id:CHAT_ID,
text:text
});

}

async function getToken(){

console.log("LOGIN...");

await signIn({
username:EMAIL,
password:PASSWORD
});

const session=await fetchAuthSession();

const token=
session.tokens.idToken.toString();

console.log("TOKEN OK");

return token;

}

async function checkOrders(){

try{

const token=await getToken();

const res=await axios.get(
"https://www.eldorado.gg/api/orders/me/seller/orders",
{
headers:{
"User-Agent":BOT_KEY,
"Cookie":
`__Host-EldoradoIdToken=${token}`,
"Accept":"application/json"
}
}
);

console.log(
"TOTAL:",
res.data.data.length
);

await sendTelegram(
"Bot hidup ✅\nOrder: "+
res.data.data.length
);

}catch(err){

console.log(
"ERROR:",
err.response?.status
);

console.log(
err.response?.data
);

}

}

checkOrders();
