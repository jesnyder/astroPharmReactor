#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_BME680.h>

// =====================================================
// TIME BASE (NO RTC)
// =====================================================

unsigned long startMillis = 0;

int startYear  = 2026;
int startMonth = 6;
int startDay   = 15;
int startHour  = 12;
int startMin   = 0;
int startSec   = 0;

// =====================================================
// SENSORS
// =====================================================

Adafruit_SHT31 sht30 = Adafruit_SHT31();

// BME688 #1 (0x76)
Adafruit_BME680 bme688_1;

// BME688 #2 (0x77)
Adafruit_BME680 bme688_2;

// =====================================================
// PUMP
// =====================================================

const int PUMP_PIN = 5;

int pumpSpeedPercent = 100;
bool pumpEnabled = true;

float PUMP_ON_TIME_MIN  = 1.0;
float PUMP_OFF_TIME_MIN = 1.0;

unsigned long pumpCycleStart = 0;
bool pumpCycleState = true;

// =====================================================
// STEPPER
// =====================================================

const int STEP_PIN = 2;
const int DIR_PIN  = 3;

int speedPercent = 0;

// =====================================================
// TIMING
// =====================================================

unsigned long lastLog = 0;

// =====================================================
// TIME HELPERS
// =====================================================

String two(int v) {
  if (v < 10) return "0" + String(v);
  return String(v);
}

void getDateTime(unsigned long ms, String &dateStr, String &timeStr) {

  unsigned long s = ms / 1000;

  int sec = (startSec + s) % 60;
  int min = (startMin + (startSec + s) / 60) % 60;
  int hour = (startHour + (startMin + (startSec + s) / 60) / 60) % 24;

  unsigned long days = (startHour + (startMin + (startSec + s) / 60) / 60) / 24;

  int day = startDay + days;

  dateStr = String(startYear) + "-" + two(startMonth) + "-" + two(day);
  timeStr = two(hour) + ":" + two(min) + ":" + two(sec);
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  pinMode(PUMP_PIN, OUTPUT);

  Serial.begin(115200);
  Wire.begin();

  startMillis = millis();
  pumpCycleStart = millis();

  Serial.println("\n===== SYSTEM START =====");

  if (!sht30.begin(0x44)) Serial.println("SHT30 ERROR");
  else Serial.println("SHT30 OK");

  if (!bme688_1.begin(0x76)) Serial.println("BME688 #1 ERROR (0x76)");
  else {
    Serial.println("BME688 #1 OK");
    bme688_1.setTemperatureOversampling(BME680_OS_8X);
    bme688_1.setHumidityOversampling(BME680_OS_2X);
    bme688_1.setPressureOversampling(BME680_OS_4X);
    bme688_1.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme688_1.setGasHeater(320, 150);
  }

  if (!bme688_2.begin(0x77)) Serial.println("BME688 #2 ERROR (0x77)");
  else {
    Serial.println("BME688 #2 OK");
    bme688_2.setTemperatureOversampling(BME680_OS_8X);
    bme688_2.setHumidityOversampling(BME680_OS_2X);
    bme688_2.setPressureOversampling(BME680_OS_4X);
    bme688_2.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme688_2.setGasHeater(320, 150);
  }

  // =====================================================
  // CSV HEADER
  // =====================================================

  Serial.println();
  Serial.println("DATE,TIME,UPTIME_S,"
                 "SHT30_T,SHT30_H,"
                 "BME688_1_T,BME688_1_H,BME688_1_P,BME688_1_G,"
                 "BME688_2_T,BME688_2_H,BME688_2_P,BME688_2_G,"
                 "STEPPER_SPEED,PUMP_SPEED,PUMP_STATE");
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  unsigned long now = millis();

  // =====================================================
  // PUMP CYCLE
  // =====================================================

  unsigned long onMs  = PUMP_ON_TIME_MIN * 60000;
  unsigned long offMs = PUMP_OFF_TIME_MIN * 60000;

  if (pumpCycleState) {
    if (now - pumpCycleStart >= onMs) {
      pumpCycleState = false;
      pumpCycleStart = now;
    }
  } else {
    if (now - pumpCycleStart >= offMs) {
      pumpCycleState = true;
      pumpCycleStart = now;
    }
  }

  if (!pumpCycleState) pumpSpeedPercent = 100;

  analogWrite(PUMP_PIN,
    pumpCycleState ? map(pumpSpeedPercent, 0, 100, 0, 255) : 0
  );

  // =====================================================
  // LOGGING
  // =====================================================

  if (millis() - lastLog >= 1000) {

    unsigned long uptime_s = millis() / 1000;

    String dateStr, timeStr;
    getDateTime(now, dateStr, timeStr);

    float shtT = sht30.readTemperature();
    float shtH = sht30.readHumidity();

    float b1T = NAN, b1H = NAN, b1P = NAN, b1G = NAN;
    float b2T = NAN, b2H = NAN, b2P = NAN, b2G = NAN;

    if (bme688_1.performReading()) {
      b1T = bme688_1.temperature;
      b1H = bme688_1.humidity;
      b1P = bme688_1.pressure / 100.0;
      b1G = bme688_1.gas_resistance;
    }

    if (bme688_2.performReading()) {
      b2T = bme688_2.temperature;
      b2H = bme688_2.humidity;
      b2P = bme688_2.pressure / 100.0;
      b2G = bme688_2.gas_resistance;
    }

    Serial.print(dateStr); Serial.print(",");
    Serial.print(timeStr); Serial.print(",");
    Serial.print(uptime_s); Serial.print(",");

    Serial.print(shtT); Serial.print(",");
    Serial.print(shtH); Serial.print(",");

    Serial.print(b1T); Serial.print(",");
    Serial.print(b1H); Serial.print(",");
    Serial.print(b1P); Serial.print(",");
    Serial.print(b1G); Serial.print(",");

    Serial.print(b2T); Serial.print(",");
    Serial.print(b2H); Serial.print(",");
    Serial.print(b2P); Serial.print(",");
    Serial.print(b2G); Serial.print(",");

    Serial.print(speedPercent); Serial.print(",");
    Serial.print(pumpSpeedPercent); Serial.print(",");
    Serial.println(pumpCycleState ? "ON" : "OFF");

    lastLog = millis();
  }
}
