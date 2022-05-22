var express = require('express')
var bodyParser = require('body-parser')
const request = require('request')
var cron = require('node-cron');
var app = express();
var mqtt = require('mqtt');
var mysql = require("mysql");
const cluster = require('cluster');
const { nextTick } = require('process');
// Check the number of available CPU.
const numCPUs = require('os').cpus().length;
var router = express.Router();
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
  insertPerson(uid,temp,province,second=null,min=null,hour=null,noti=true){
    let person = new Promise ((resolve,reject)=>{this.conn.query('INSERT INTO user_info(uid,open_noti,temp,province,schedule_second,schedule_min,schedule_hour) VALUES ("'+uid+'",'+noti+','+temp+',"'+province+'",'+second+','+min+','+hour+')'),(err,result,field)=>{
      if(err) throw err
      resolve(result)}
    })
  }
  async setTask(){
    let userData = await this.userInfo()
    if(userData.length > 0){
      for(let user of userData){
        if(user.uid){
          let userTask = new Task(user.uid,user.temp,user.province,user.open_noti,user.schedule_second,user.schedule_min,schedule.hour)
          let province = user.province
          if(schedule.hasOwnProperty(user.uid)){
            schedule[user.uid][province] = userTask
          }else
            schedule[user.uid] = {[province]:userTask}
          }
        }
      } 
    }
  
  async manage_notification(uid,temp,province,status="",schedule_second=null,schedule_min=null,schedule_hour=null){
    if(status=="1" || status == "0"){
      let update = new Promise ((resolve,reject)=>{
        this.conn.query("UPDATE user_info SET open_noti="+status+" WHERE uid='"+uid+"' AND province='"+province+"'",(err,result,field)=>{
        if(err) throw err
        resolve(result)})
      })
    }else if(status == "change_time"){
        let update = new Promise ((resolve,reject)=>{
          this.conn.query("UPDATE user_info SET schedule_second="+schedule_second+",schedule_min="+schedule_min+",schedule_hour="+schedule_hour+" WHERE uid='"+uid+"' AND province='"+province+"'" ,(err,result,field)=>{
          if(err) throw err
          resolve(result)})
        })
    }
    else if(status == "change_temp"){
      let update = new Promise ((resolve,reject)=>{
        this.conn.query("UPDATE user_info SET temp="+temp+" WHERE uid='"+uid+"'AND province='"+`${province}'` ,(err,result,field)=>{
        if(err) throw err
        resolve(result)})
      })
    }
  }
}
class Task{
  constructor(uid,temp,province,stat=false,second=null,min=null,hour=null){
    this.second = second
    this.min = min
    this.hour = hour
    this.uid = uid
    this.province = province
    this.condition_temp = temp
    this.main_task = this.setJob(this.second,this.min,this.hour)
    if(stat){
      this.main_task.start()
    }
    else{
      this.main_task.stop()
    }
  }
  setStringTime(second,min,hour){
    if(second){
      return `${'*/'+second} * * * * *`
    }
    else if(min){
      return `${'*/'+min} * * * *`
    } else if(hour){
      return `* ${'*/'+hour} * * *`
    }
  }
  setJob(second,min,hour){
      try{
        return cron.schedule(this.setStringTime(second,min,hour),()=>{
          this.notify(this.uid,this.province)
        },{schedule:false})
      } catch(err){
        console.error(err)
      }
  }
  notify(uid){
      console.log(schedule)
      let data = {
        userId : uid,
        messages: `ขณะนี้อุณหภูมิที่ ${this.province} อยู่ที่ ${temp[this.province]}`
      }
      request({
        headers: {
          'Content-Type': 'application/json',
        },
        url: 'https://shielded-retreat-51765.herokuapp.com/line/push',
        method: 'POST',
        body: data,
        json:true
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
  change_time(second=null,min=null,hour=null){
    this.main_task.stop()
    this.second = second
    this.min = min
    this.hour = hour
    this.main_task = this.setJob(this.second,this.min,this.hour)
    this.main_task.start()
  }
  destroy(){
    this.main_task.destroy()
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

app.post('/noti/config_notify',async(req,res,next)=>{
  /*{
    "uid":"r",
    "status":"1"
    "province":"กรุงเทพ"
  }*/
  this.sender = req.body.uid
  this.stat = req.body.status
  try{
    if(this.stat == "1" || this.stat == "0"){ //เปิดหรือปิดแจ้งเตือน
      if(req.body.province!="ทุกจังหวัด"){
        schedule[this.sender][req.body.province].manageJob(this.stat)
        usr.manage_notification(this.sender,null,province=req.body.province,this.stat)
      }
      else{
        Object.keys(schedule[this.sender]).forEach((province)=>{
          schedule[this.sender][province].manageJob(this.stat)
          usr.manage_notification(this.sender,null,province,this.stat)
        })
      }
    }
    res.json(req.body)
    res.status(200)
  }catch(err){
    console.log(err)
    next(err)
    res.status(500).send('Something broke!')
  }
  
  
})
app.post('/noti/config_time',async(req,res)=>{
  /*{
    "uid":"r",
    "time":7
    "unit":วินาที
    "province":"กรุงเทพ"
  }*/

  this.sender = req.body.uid
  if(req.body.province!="ทุกจังหวัด"){
    if(req.body.unit=="วินาที"){
      schedule[this.sender][req.body.province].change_time(second=req.body.time)
      usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=req.body.time)
    }
    else if(req.body.unit=="นาที"){
      schedule[this.sender][req.body.province].change_time(second=null,min=req.body.time)
      usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=null,min=req.body.time)
    }
    else if(req.body.unit=="ชั่วโมง"){
      
      schedule[this.sender][req.body.province].change_time(second=null,min=null,hour=req.body.time)
      usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=null,min=null,hour=req.body.time)
    }
    
  }
  else{
    Object.keys(schedule[this.sender]).forEach((province)=>{
      if(req.body.unit=="วินาที"){
        schedule[this.sender][province].change_time(second=req.body.time)
        usr.manage_notification(this.sender,null,province,status="change_time",second=req.body.time)
      }
      else if(req.body.unit=="นาที"){
        schedule[this.sender][province].change_time(second=null,min=req.body.time)
        usr.manage_notification(this.sender,null,province,status="change_time",second=null,min=req.body.time)
      }
      else if(req.body.unit=="ชั่วโมง"){
        schedule[this.sender][province].change_time(second=null,min=null,hour=req.body.time)
        usr.manage_notification(this.sender,null,province,status="change_time",second=null,min=null,hour=req.body.time)
      }
    })
  }
  res.json(req.body)
  res.status(200)
})

app.post('/noti/config_temp',async(req,res)=>{
  /*{
    "uid":"r",
    "temp":32.5
    "province":"กรุงเทพ"
  }*/
  this.sender = req.body.uid
  if(req.body.province!=="ทุกจังหวัด"){
      schedule[this.sender][req.body.province].condition_temp = req.body.temp
      usr.manage_notification(this.sender,req.body.temp,province=req.body.province,status="change_temp")
  }
  else{
    Object.keys(schedule[this.sender]).forEach((province)=>{
      schedule[this.sender][province].condition_temp = req.body.temp
      usr.manage_notification(this.sender,req.body.temp,province,status="change_temp")
    })
  }
  res.json(req.body)
  res.status(200)
})
app.post('/noti/set',async(req,res)=>{
  /*
  {
    "uid":"r",
    "time":5,
    "unit":"นาที"
    "temp":32.5
    "province":"กรุงเทพ"
  }
  */
  console.log(res.body)
  this.sender = req.body.uid
  if(schedule.hasOwnProperty(req.body.uid)){
    console.log(req.body.province in schedule[req.body.uid])
    if(req.body.province in schedule[req.body.uid]){
      if(req.body.unit=="วินาที"){
        schedule[this.sender][req.body.province].change_time(second=req.body.time)
        usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=req.body.time)
      }
      else if(req.body.unit=="นาที"){
        schedule[this.sender][req.body.province].change_time(second=null,min=req.body.time)
        usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=null,min=req.body.time)
      }
      else if(req.body.unit=="ชั่วโมง"){
        schedule[this.sender][req.body.province].change_time(second=null,min=null,hour=req.body.time)
        usr.manage_notification(this.sender,null,province=req.body.province,status="change_time",second=null,min=null,hour=req.body.time)
      }
      schedule[this.sender][req.body.province].condition_temp = req.body.temp
      usr.manage_notification(this.sender,req.body.temp,province=req.body.province,status="change_temp")
      usr.manage_notification(this.sender,null,province=req.body.province,status="1")
    }else{
      if(req.body.unit=="วินาที"){
        usr.insertPerson(uid=req.body.uid,req.body.temp,province=req.body.province,second=req.body.time)
        schedule[req.body.uid][req.body.province] = new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=req.body.time)
      }else if(req.body.unit=="นาที"){
        usr.insertPerson(req.body.uid,req.body.temp,province=req.body.province,second=null,min=req.body.time)
        schedule[req.body.uid][req.body.province] = new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=null,min=req.body.time)
      }else if(req.body.unit=="ชั่วโมง"){
        usr.insertPerson(req.body.uid,req.body.temp,province=req.body.province,hour=req.body.time,)
        schedule[req.body.uid][req.body.province] = new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=null,min=null,hour=req.body.time)
      }
    }
  }else{
    let province = req.body.province
    if(req.body.unit=="วินาที"){ 
      usr.insertPerson(req.body.uid,req.body.temp,province=req.body.province,second=req.body.time)
      schedule[req.body.uid] == {province:new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=req.body.time)}
    }else if(req.body.unit=="นาที"){
      usr.insertPerson(req.body.uid,req.body.temp,province=req.body.province,second=null,min=req.body.time)
      schedule[req.body.uid] =={province:new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=null,min=req.body.time)}
    }else if(req.body.unit="ชั่วโมง"){
      usr.insertPerson(req.body.uid,req.body.temp,province=req.body.province,second=null,min=null,hour=req.body.time,)
      schedule[req.body.uid]= {province:new Task(uid=req.body.uid,req.body.temp,province=req.body.province,stat=true,second=null,min=null,hour=req.body.time)}
    }
  }
  res.json(req.body)
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
/*if(cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
}
else{*/
  app.listen(app.get('port'), function () {
    console.log('run at port', app.get('port'))
  })
//}

