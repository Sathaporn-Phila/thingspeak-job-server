var express = require('express')
var bodyParser = require('body-parser')
var request = require('request')
const cluster = require('cluster');

// Check the number of available CPU.
const numCPUs = require('os').cpus().length;
var app = express()

var mqtt = require('mqtt');
//var line = require('@line/bot-sdk')

// Your Channel access token (long-lived) 
//const CH_ACCESS_TOKEN = 'JMyS5Kv3PIXoYz00wL1BVr43Rm7NBqwfiGqgP5k0rC5+ZBAhN4br3Oo3xFj+7QaDn2tbx5g4sYPG2bSZdsTYs/EycE2ZgLNS8+ByPPWaRwY9wCQ8CHuzo6Xrj8apbLZ1WIMjC1ZtDJSaGkmQR3MMiwdB04t89/1O/w1cDnyilFU=';

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

app.set('port', (process.env.PORT || 4000))
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())


app.get('/:id', async(req, res) => {
  req.acceptsLanguages('th','en')
  if(req.params.id==1){  
    body_data = {"ฺกรุงเทพ":temp[`field${req.params.id}`]}
    res.json(body_data)
  }
  else if(req.params.id==2){
    body_data = {"นครปฐม":temp[`field${req.params.id}`]}
    res.json(body_data)
  }
  else{
    res.sendStatus(404)
  }
})

var temp = {}
let setTemp = (data)=>{
    temp[data['field']] = data['temp']
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
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
}
else{
  app.listen(app.get('port'), function () {
    console.log('run at port', app.get('port'))
  })
}
