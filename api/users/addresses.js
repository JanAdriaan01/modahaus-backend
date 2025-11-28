// ------------------- users/addresses.js -------------------
const db = require('../db');
module.exports = async function handler(req,res){
const userId = req.headers['x-user-id'];
if(!userId) return res.status(401).json({message:'unauthorized'});
if(req.method==='GET'){
const addresses = (await db.query('SELECT * FROM user_addresses WHERE user_id=$1',[userId])).rows;
return res.status(200).json({addresses});
} else if(req.method==='POST'){
const {label,address,isDefaultShipping,isDefaultBilling} = req.body;
const newAddr = (await db.query('INSERT INTO user_addresses(user_id,label,address,is_default_shipping,is_default_billing) VALUES($1,$2,$3,$4,$5) RETURNING *',[userId,label,address,isDefaultShipping||false,isDefaultBilling||false])).rows[0];
return res.status(201).json({address:newAddr});
} else if(req.method==='PATCH'){
const { id,label,address,isDefaultShipping,isDefaultBilling } = req.body;
await db.query('UPDATE user_addresses SET label=$1,address=$2,is_default_shipping=$3,is_default_billing=$4 WHERE id=$5 AND user_id=$6',[label,address,isDefaultShipping||false,isDefaultBilling||false,id,userId]);
const updated = (await db.query('SELECT * FROM user_addresses WHERE id=$1',[id])).rows[0];
return res.status(200).json({address:updated});
} else if(req.method==='DELETE'){
const { id } = req.body;
await db.query('DELETE FROM user_addresses WHERE id=$1 AND user_id=$2',[id,userId]);
return res.status(200).json({message:'deleted'});
} else return res.status(405).end();
};