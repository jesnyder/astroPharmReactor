#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_BME680.h>

// =====================================================
// SENSORS
// =====================================================

Adafruit_SHT31 sht30 = Adafruit_SHT31();
Adafruit_BME680 bme688;

// =====================================================
// MOTOR PINS
// =====================================================

const int STEP_PIN = 2;
const int DIR_PIN  = 3;

// =====================================================
// SERIAL CONTROL
// =====================================================

String inputString = "";
bool commandReady = false;

int speedPercent = 0;
unsigned long stepDelayUs = 0;

const int MIN_DELAY_US = 100;
const int MAX_DELAY_US = 5000;

// =====================================================
// TIMERS
// =====================================================

unsigned long lastLogTime = 0;
unsigned long lastDirSwitch = 0;

bool direction = true;

// =====================================================
// SETUP
// =====================================================

void setup() {

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);

  digitalWrite(DIR_PIN, direction);

  Serial.begin(115200);
  Wire.begin();

  Wire.setClock(100000);

  Serial.println();
  Serial.println("===== SYSTEM START =====");

  // =====================================================
  // SHT30
  // =====================================================

  if (!sht30.begin(0x44)) {
    Serial.println("ERROR: SHT30 not found at 0x44");
  } else {
    Serial.println("SHT30 OK at 0x44");
  }

  // =====================================================
  // BME688
  // =====================================================

  if (!bme688.begin(0x77)) {
    Serial.println("ERROR: BME688 not found at 0x77");
    Serial.println("Check wiring / CS / SDO");
  } else {

    Serial.println("BME688 OK at 0x77");

    // Stable configuration (IMPORTANT)
    bme688.setTemperatureOversampling(BME680_OS_8X);
    bme688.setHumidityOversampling(BME680_OS_2X);
    bme688.setPressureOversampling(BME680_OS_4X);
    bme688.setIIRFilterSize(BME680_FILTER_SIZE_3);

    // Gas heater MUST be enabled
    bme688.setGasHeater(320, 150);

    delay(2000); // warm-up stabilization
  }

  // =====================================================
  // COMMANDS
  // =====================================================

  Serial.println();
  Serial.println("Commands:");
  Serial.println("M0 - M100");
  Serial.println("STOP");
  Serial.println();

  // =====================================================
  // CSV HEADER
  // =====================================================

  Serial.println(
    "ms,"
    "sht_temp,"
    "sht_hum,"
    "bme_temp,"
    "bme_hum,"
    "bme_press,"
    "bme_gas,"
    "speed"
  );
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  // ---------------- SERIAL INPUT ----------------

  while (Serial.available()) {

    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (inputString.length() > 0) commandReady = true;
    } else {
      inputString += c;
    }
  }

  // ---------------- COMMAND PARSE ----------------

  if (commandReady) {

    inputString.trim();

    if (inputString.startsWith("M")) {

      speedPercent = constrain(inputString.substring(1).toInt(), 0, 100);

      if (speedPercent == 0) {
        stepDelayUs = 0;
        Serial.println("Motor STOP");
      } else {
        stepDelayUs = map(speedPercent, 1, 100, MAX_DELAY_US, MIN_DELAY_US);
        Serial.print("Speed % = ");
        Serial.println(speedPercent);
      }
    }

    if (inputString.equalsIgnoreCase("STOP")) {
      speedPercent = 0;
      stepDelayUs = 0;
      Serial.println("Motor STOP");
    }

    inputString = "";
    commandReady = false;
  }

  // ---------------- STEPPER CONTROL ----------------

  if (stepDelayUs > 0) {

    if (millis() - lastDirSwitch > 100000UL) {
      direction = !direction;
      digitalWrite(DIR_PIN, direction);
      lastDirSwitch = millis();
    }

    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(stepDelayUs);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(stepDelayUs);
  }

  // ---------------- SENSOR LOGGING ----------------

  if (millis() - lastLogTime >= 1000) {

    // ----- SHT30 -----
    float shtTemp = sht30.readTemperature();
    float shtHum  = sht30.readHumidity();

    // ----- BME688 -----
    float bmeTemp = NAN;
    float bmeHum  = NAN;
    float bmePress = NAN;
    float bmeGas = NAN;

    if (bme688.performReading()) {

      bmeTemp = bme688.temperature;
      bmeHum  = bme688.humidity;
      bmePress = bme688.pressure / 100.0;
      bmeGas = bme688.gas_resistance;

    } else {
      Serial.println("BME688 read failed");
    }

    // ----- OUTPUT -----

    Serial.print(millis()); Serial.print(",");

    Serial.print(shtTemp); Serial.print(",");
    Serial.print(shtHum); Serial.print(",");

    Serial.print(bmeTemp); Serial.print(",");
    Serial.print(bmeHum); Serial.print(",");
    Serial.print(bmePress); Serial.print(",");
    Serial.print(bmeGas); Serial.print(",");

    Serial.println(speedPercent);

    lastLogTime = millis();
  }
}
