#include <Arduino.h>
#include <Wire.h>
#include "LM73.h"
#define I2C_SDA 4
#define I2C_SCL 5
#define I2C_ADDR 0x4D
#define CS_REG 0x04
#define CS_REG_RES0 5
#define CS_REG_RES1 6
#define DATA_REG 0x00

LM73::LM73(){};

void LM73::begin(){
    Wire.begin(I2C_SDA, I2C_SCL);
}

void LM73::i2cWrite(uint8_t reg, uint8_t write_data){
  Wire.beginTransmission(I2C_ADDR);
  Wire.write(reg);
  Wire.write(write_data);
  Wire.endTransmission();
}

void LM73::i2cWrite(uint8_t reg){
  Wire.beginTransmission(I2C_ADDR);
  Wire.write(reg);
  Wire.endTransmission();
}


void LM73::i2cRead(uint8_t reg, uint8_t byte_request_len, void* buff){
  i2cWrite(reg);
  Wire.requestFrom(I2C_ADDR, byte_request_len);
  uint8_t i = 0;
  while(Wire.available() > 0) ((uint8_t*)buff)[i++] = Wire.read();
}

void LM73::setRes(uint8_t res){
  uint8_t buff_data;
  i2cRead(CS_REG, sizeof(buff_data), &buff_data);
  buff_data &= ~(3 << CS_REG_RES0);
  buff_data |= (((res + 1 ) % 4) << CS_REG_RES0);
  #ifdef DEBUG
    Serial.print("CS_REG value now set to: ");
    Serial.println(buff_data, HEX);
  #endif

  i2cWrite(CS_REG, buff_data);
}

float LM73::getVal(uint8_t resolution){
  static uint8_t res_old = 0;
  if(resolution != res_old){
    setRes(resolution);
    res_old = resolution;
  }

  uint8_t raw_data[2];
  i2cRead(DATA_REG, sizeof(raw_data), &raw_data);

  float temp_value = (int16_t)((raw_data[0]<<8)|raw_data[1])/128.0f;
  #ifdef DEBUG
    Serial.print("(MSB) :");
    Serial.println(raw_data[0], HEX);
    Serial.print("(LSB) :");
    Serial.println(raw_data[1], HEX); 
    Serial.printf("(Float) : %.5f", temp_value);
    Serial.println("///////////////////////////");
  #endif
  return temp_value;
}