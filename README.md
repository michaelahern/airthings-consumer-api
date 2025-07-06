# Airthings Consumer API Client

[![npm](https://badgen.net/npm/v/airthings-consumer-api)](https://www.npmjs.com/package/airthings-consumer-api)
[![node](https://badgen.net/npm/node/airthings-consumer-api)](https://www.npmjs.com/package/airthings-consumer-api)
[![downloads](https://badgen.net/npm/dt/airthings-consumer-api)](https://www.npmjs.com/package/airthings-consumer-api)
[![types](https://badgen.net/npm/types/airthings-consumer-api)](https://www.npmjs.com/package/airthings-consumer-api)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/michaelahern/airthings-consumer-api)

An unofficial Node.js client library for Airthings Air Quality Monitors via the [Airthings Consumer API](https://consumer-api-doc.airthings.com/).

## Docs

https://michaelahern.github.io/airthings-consumer-api/

## Installing

```bash
$ npm install airthings-consumer-api
```

## Example

```javascript
import { AirthingsClient, SensorUnits } from 'airthings-consumer-api';

async function main() {
    // Create an Airthings Client ID & Secret at
    // https://consumer-api-doc.airthings.com/dashboard
    const client = new AirthingsClient({
        clientId: '[CLIENT_ID]',
        clientSecret: '[CLIENT_SECRET]'
    });

    const devicesResponse = await client.getDevices();
    devicesResponse.devices.forEach((device) => {
        console.log(device);
    });

    // {
    //   serialNumber: '2960000000',
    //   home: 'My Home',
    //   name: 'My Airthings',
    //   type: 'VIEW_PLUS',
    //   sensors: [
    //     'radonShortTermAvg',
    //     'temp',
    //     'humidity',
    //     'pressure',
    //     'co2',
    //     'voc',
    //     'pm1',
    //     'pm25'
    //   ]
    // }

    const sensorsResponse = await client.getSensors(SensorUnits.Imperial);
    sensorsResponse.results.forEach((sensor) => {
        console.log(sensor);
    });

    // {
    //   serialNumber: '2960000000',
    //   sensors: [
    //     { sensorType: 'radonShortTermAvg', value: 1.2, unit: 'pci' },
    //     { sensorType: 'humidity', value: 40, unit: 'pct' },
    //     { sensorType: 'temp', value: 68.8, unit: 'f' },
    //     { sensorType: 'co2', value: 678, unit: 'ppm' },
    //     { sensorType: 'voc', value: 234, unit: 'ppb' },
    //     { sensorType: 'pressure', value: 78178, unit: 'pa' },
    //     { sensorType: 'pm25', value: 0, unit: 'mgpc' },
    //     { sensorType: 'pm1', value: 0, unit: 'mgpc' }
    //   ],
    //   recorded: '2025-01-01T12:34:56',
    //   batteryPercentage: 100
    // }
}

main().catch(err => console.error(err));
```
