#include <Arduino.h>
#include <WiFi.h>
#include <LM73.h>
#include "ap_secrets.h"
#include "mqtt_secrets.h"
#include <PubSubClient.h>
#define mqtt_server "mqtt3.thingspeak.com"
#define mqtt_port 1883
LM73 lm73 = LM73();

String topic = "channels/1688771/publish";

const char* ssid = SECRET_SSID;
const char* password = SECRET_PASS;

const char* mqtt_user = MQTT_USER;
const char* mqtt_password = MQTT_PASSWORD;

WiFiClient client;
PubSubClient mqtt(client);

unsigned long lastTime = 0;
unsigned long timerDelay = 5000;

void callback(char* topic, byte* payload, unsigned int length);
void connectWifi(){
  /* Connect Access Point with SSID and password */
  /* If Wifi not connect then polling unitl it connect */
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.println("Connecting");
  while(WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(callback);
}
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  String distinct = "Bangkok";
  String msg = "";
  int i = 0;
  while (i < length) msg += (char)payload[i++];
  Serial.print(msg);
}
/*const char* stateControl(float temp){
  if(temp >= 30) return "It's so hot today ☀️";
  else if(temp < 30 && temp >= 20) return "It's a beautiful day 😎";
  else if (temp < 20) return "it's cold 🥶";
}*/


void setup() {
  Serial.begin(9600);
  connectWifi();
  lm73.begin();
}
void loop() {
  float val = lm73.getVal(14);
  int topic_len = topic.length() + 1;
  char topicSend[topic_len];
  topic.toCharArray(topicSend,topic_len);
  String distinct = "กรุงเทพ";
  String dataSend = "field1=" + String(val) + "&field2=" + distinct+"&status=MQTTPUBLISH";
  int str_len = dataSend.length() + 1;
  char fieldData[str_len];
  dataSend.toCharArray(fieldData,str_len);
  if ((millis() - lastTime) > timerDelay) {
    if(WiFi.status()== WL_CONNECTED){
      if (mqtt.connect(mqtt_user, mqtt_user, mqtt_password)) {
        mqtt.publish(topicSend,fieldData);
         
      }
    }
    lastTime = millis();
  }
}

/*void loop() {
  static uint32_t last_time;
  if
  if (millis() - last_time > 5000){
    if (WiFi.status() == WL_CONNECTED){
      float val = lm73.getVal(14);
      static const char* temp_message;
    }
    last_time = millis();
  }
}*/
