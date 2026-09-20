"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sendMessage}=require('../src/domain/customer-mail');
test('Cloudflare email uses configured credentials, sender and reply-to', async()=>{
 let sent;
 const result=await sendMessage({recipient:'client@example.test',subject:'Código',text:'Tu código <123456>'},async(url,options)=>{sent={url,...options};return Response.json({success:true,result:{queued:['client@example.test'],message_id:'test-message'}});},{mailReady:true,CLOUDFLARE_ACCOUNT_ID:'account-id',CLOUDFLARE_EMAIL_API_TOKEN:'private-token',NOTIFICATION_EMAIL_FROM:'info@nataliasanchez.com.ar',NOTIFICATION_EMAIL_REPLY_TO:'nabrizka@hotmail.com'});
 assert.equal(result.status,'sent');
 assert.equal(sent.url,'https://api.cloudflare.com/client/v4/accounts/account-id/email/sending/send');
 assert.equal(sent.headers.Authorization,'Bearer private-token');
 const body=JSON.parse(sent.body);assert.equal(body.from,'info@nataliasanchez.com.ar');assert.equal(body.reply_to,'nabrizka@hotmail.com');assert.match(body.html,/&lt;123456&gt;/);assert.match(body.html,/Natalia Sánchez Estética/);
});

