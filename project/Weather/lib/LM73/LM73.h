#ifndef LM73_H_
#define LM73_H_

#include <Arduino.h>
#include <Wire.h>

class LM73
{
    private:
        void i2cWrite(uint8_t reg, uint8_t write_data);
        void i2cWrite(uint8_t reg);
        void i2cRead(uint8_t reg, uint8_t byte_request_len, void* buff);
    public:
        LM73();
        void begin();
        void setRes(uint8_t res);
        float getVal(uint8_t resolution);
};

#endif