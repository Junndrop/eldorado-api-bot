const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

Amplify.configure({
Auth: {
Cognito: {
userPoolId: "us-east-2_MlnzCFgHk",
userPoolClientId: "1956req5ro9drdtbf5i6kis4la",
loginWith: {
email: true
}
}
}
});

async function getToken(){

console.log("LOGIN...");

await signIn({
username: EMAIL.trim(),
password: PASSWORD.trim()
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

const orders = res.data.results;

const activeOrders = orders.filter(
x => ![
"Canceled",
"Completed",
"Delivered"
].includes(x.state.state)
);

console.log(
"TOTAL ORDER AKTIF:",
activeOrders.length
);

return activeOrders;
}catch(err){

}

checkOrders();
