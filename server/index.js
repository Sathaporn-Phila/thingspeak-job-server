var express = require('express')
var bodyParser = require('body-parser')
const request = require('request')
var cron = require('node-cron');
var app = express();
var mqtt = require('mqtt');
var mysql = require("mysql");
require('dotenv').config()
// Your Channel access token (long-lived) 
const CH_ACCESS_TOKEN = 'uvcXHrNx3zpXG97Fg9+tMj0ozEVTw80+7IuOJZDO03pH7c9WosPhJ7RbYh5IJQpen2tbx5g4sYPG2bSZdsTYs/EycE2ZgLNS8+ByPPWaRwbey9452XWER8WNsShmtidqskn5r+EIHcWn00DFUj9fEAdB04t89/1O/w1cDnyilFU=';

class DB{
  constructor(){
      this.conn = mysql.createConnection({
        host: "eyvqcfxf5reja3nv.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
        port: 3306,
        user: "vpaujh2dm6th5y6p",
        password: process.env.DB_PASS,
        database: "phkoi2j2pdfzxsid"
      })
  }
  userInfo(){
    this.conn.connect()
    return new Promise ((resolve,reject)=>{this.conn.query("SELECT * FROM user_info",(err,result)=>{
      if(err) throw err
      resolve(result)})
    })
  }
  insertPerson(uid){
    let person = new Promise ((resolve,reject)=>{this.conn.query('INSERT INTO user_info(uid,open_noti,schedule_min,schedule_hour) VALUES ("'+uid+'",true,5,NULL)',(err,result,field)=>{
      if(err) throw err
      resolve(result)})
    })
  }
  async setTask(){
    let userData = await this.userInfo()
    if(userData.length > 0){
      for(let user of userData){
        if(user.uid){
          let userTask = new Task(user.schedule_min,schedule.hour,user.open_noti,user.uid)
          schedule[user.uid] = userTask
        }
      } 
    }
  }
  async manage_notification(uid,status,schedule_min=null,schedule_hour=null){
    if(status=="1" || status == "0"){
      let update = new Promise ((resolve,reject)=>{
        this.conn.query("UPDATE user_info SET open_noti="+status+" WHERE uid='"+uid+"'" ,(err,result,field)=>{
        if(err) throw err
        resolve(result)})
      })
    }else if(status == "change_time"){
      let update = new Promise ((resolve,reject)=>{
        this.conn.query("UPDATE user_info SET schedule_min='"+schedule_min+"',schedule_hour='"+schedule_hour+"' WHERE uid='"+uid+"'" ,(err,result,field)=>{
        if(err) throw err
        resolve(result)})
      })
    }
  }
}
class Task{
  constructor(min=null,hour=null,stat=false,uid){
    this.min = min
    this.hour = hour
    this.uid = uid
    this.main_task = this.setJob(this.min,this.hour)
    if(stat){
      this.main_task.start()
    }
    else{
      this.main_task.stop()
    }
  }
  setStringTime(min,hour){
    if(min){
      return `${'*/'+min} * * * *`
    } else if(hour){
      return `* ${'*/'+hour} * * *`
    }
  }
  setJob(min,hour){
      try{
        return cron.schedule(this.setStringTime(min,hour),()=>{
          this.notify(this.uid)
        },{schedule:false})
      } catch(err){
        console.error(err)
      }
  }
  notify(uid){
    let data = {
      to: uid,
      messages: []
    }
    Object.keys(temp).forEach((distinct) => {
      data.messages.push({
        type: 'text',
        text: 'อุณหภูมิ'+distinct+' ณ ตอนนี้อยู่ที่ '+temp[distinct]
      })
    });
    request({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+CH_ACCESS_TOKEN+''
      },
      url: 'https://api.line.me/v2/bot/message/push',
      method: 'POST',
      body: data,
      json: true
    }, function (err, res, body) {
      if (err) console.log('error')
      if (res) console.log('success')
      if (body) console.log(body)
    })
  }
  manageJob(status){
    if(status=="1"){
      this.main_task.start()
      console.log("Task start")
    }
    else if(status=="0"){
      this.main_task.stop()
      console.log("Task stop")
    }
  }
  change_time(min=null,hour=null){
    this.main_task.stop()
    this.min = min
    this.hour = hour
    this.main_task = this.setJob(this.min,this.hour)
    this.main_task.start()
  }
}

var schedule = {}
var usr = new DB();
usr.setTask()
// MQTT Host
var mqtt_host = 'mqtt://mqtt3.thingspeak.com';

// MQTT Topic
var mqtt_topic = 'channels/1688771/subscribe/fields/+';

// MQTT Config
var options = {
    port: 1883,
    host: 'mqtt3.thingspeak.com',
    clientId: 'MAYZBhkHAAMjMgMJBRcUDic',
    username: 'MAYZBhkHAAMjMgMJBRcUDic',
    password: '+F2TX79+vO+RHMlqtJ6CU66A',
    keepalive: 60,
    reconnectPeriod: 1000,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    encoding: 'utf8'
};


app.use(bodyParser.json())

app.set('port', (process.env.PORT || 3000))
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())


app.get('/:distinct', async(req, res) => {
  req.acceptsLanguages('th','en')
  if(req.params["distinct"]=='bangkok'){
    body_data = temp['กรุงเทพ']
    res.json(body_data)
  }
  else if(req.params["distinct"]=='nakhonpathom'){
    body_data = temp['นครปฐม']
    res.json(body_data)
  }
  else if(req.params["distinct"]=='getall'){
    body_data = temp
    res.json(body_data)
  }
  else{
    res.sendStatus(404)
  }
})
app.post('/person/insert',async(req,res)=>{ //เพิ่มคนใน db เมื่อใส่ข้อความครั้งแรก
  this.sender = req.body.events[0].source.userId
  try{
    usr.insertPerson(this.sender);
  }finally{
    schedule[this.sender]=new Task(5,null,true)
  }
  res.status(200)
});
app.post('/noti/:status',async(req,res)=>{
  req.acceptsLanguages('th','en')
  this.sender = req.body.events[0].source.userId
  this.stat = req.params["status"]
  if(this.stat == "1" || this.stat == "0"){ //เปิดหรือปิดแจ้งเตือน
    schedule[this.sender].manageJob(this.stat)
    usr.manage_notification(this.sender,this.stat)
  }
  else if(this.stat == "change_time"){ //เปลี่ยนเวลาแจ้งเตือน
    this.message = req.body.events[0].message.text
    if(this.message.search("นาที")!=-1){
      t_min = this.message.match(/\d+/g)[0]
      usr.manage_notification(this.sender,this.stat,schedule_min=t_min)
      schedule[this.sender].change_time(min=t_min)
    }
    else if (this.message.search("ชั่วโมง")!=-1){
      t_hour = this.message.match(/\d+/g)[0]
      usr.manage_notification(this.sender,this.stat,schedule_hour=t_hour)
      schedule[this.sender].change_time(hour=t_hour)
    }
  }
  res.status(200)
})

var temp = {}
let setTemp = (data)=>{
  if(data['field']=='field1'){
    temp['กรุงเทพ'] = data['temp']
  }else if(data['field']=='field2'){
    temp['นครปฐม'] = data['temp']
  }
}

var client = mqtt.connect(mqtt_host, options);
client.on('connect', function() { // When connected
  // subscribe to a topic
  client.subscribe(mqtt_topic, function() {
      client.on('message', async(topic, message, packet) => {
            let data = {
                  field: topic.replace("channels/1688771/subscribe/fields/",""),
                  temp: `${message}`
              }
            setTemp(data)
      })
  });
});
app.listen(app.get('port'), function () {
  console.log('run at port', app.get('port'))
})

